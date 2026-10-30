// '지구 지금' 위젯용 데이터: 공개 기후 자료를 모아 작게 줄여 주는 서버 함수 (API 키 불필요, Node 18+)
// Vercel: 이 파일을 api/earth-now.js에 두면 /api/earth-now 로 동작
// Express: app.get('/api/earth-now', require('./api/earth-now.js'))
// Next.js(App Router): const { collect } = require(...); export async function GET() { return Response.json(await collect(fetch)); }
'use strict';

const SOURCES = {
  temp: 'https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_2t_global.csv',
  sst: 'https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_sst_60S-60N_ocean.csv',
  co2: 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt',
  co2Monthly: 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt',
  sea: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv',
  ph: 'https://hahana.soest.hawaii.edu/hot/hotco2/HOT_surface_CO2.txt'
};
const DAYS = 30;
const YEARS = 30;

// 'YYYY-MM' 또는 'YYYY-MM-DD'를 소수 연도로 (달 단위는 그 달 가운데)
function decYear(d) {
  const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7));
  const day = d.length > 7 ? Number(d.slice(8, 10)) - 1 : 15;
  return y + (m - 1) / 12 + day / 365;
}

// 같은 달 값을 평균 내 [{ d: 'YYYY-MM', v }]로
function monthly(rows, digits) {
  const by = new Map();
  for (const r of rows) {
    const k = r.d.slice(0, 7), s = by.get(k) || [0, 0];
    s[0] += r.v; s[1] += 1; by.set(k, s);
  }
  return [...by].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, [sum, n]]) => ({ d, v: Number((sum / n).toFixed(digits)) }));
}

// 마지막 값에서 거꾸로 30년
function lastYears(rows) {
  if (!rows.length) return rows;
  const end = decYear(rows[rows.length - 1].d);
  return rows.filter((r) => decYear(r.d) > end - YEARS);
}

// Copernicus Climate Pulse 일별 CSV: date,값,clim_91-20,ano_91-20,status
function parseDaily(csv) {
  return csv.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('date')).map((l) => {
    const [date, t, clim, ano, status] = l.trim().split(',');
    return { date, t: Number(t), clim: Number(clim), ano: Number(ano), final: status === 'FINAL' };
  });
}

function dailyTrend(csv) {
  return lastYears(monthly(parseDaily(csv).map((r) => ({ d: r.date, v: r.ano })), 3));
}

// NOAA 마우나로아 일별: "  2026  10  20  2026.8000    426.65"
function parseCo2(txt) {
  const rows = txt.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => {
    const [y, m, d, , ppm] = l.trim().split(/\s+/);
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, ppm: Number(ppm) };
  }).filter((r) => r.ppm > 0);
  const last = rows[rows.length - 1];
  const target = (Number(last.date.slice(0, 4)) - 1) + last.date.slice(4);
  let yearAgo = null;
  for (const r of rows) { if (r.date <= target) yearAgo = r; else break; }
  return { rows: rows.slice(-DAYS), yearAgo };
}

// NOAA 마우나로아 월평균
function parseCo2Monthly(txt) {
  return lastYears(txt.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => {
    const [y, m, , avg] = l.trim().split(/\s+/);
    return { d: `${y}-${m.padStart(2, '0')}`, v: Number(avg) };
  }).filter((r) => r.v > 0));
}

// NOAA 위성 고도계 전 지구 평균 해수면(mm). 위성이 겹치는 기간은 같은 달 안에서 평균
function parseSea(csv) {
  const rows = [];
  for (const l of csv.split('\n')) {
    if (!/^\d/.test(l)) continue;
    const [yr, ...vals] = l.trim().split(',');
    const y = Number(yr), m = Math.min(Math.floor((y - Math.floor(y)) * 12) + 1, 12);
    const d = `${Math.floor(y)}-${String(m).padStart(2, '0')}`;
    for (const v of vals) if (v !== '') rows.push({ d, v: Number(v) });
  }
  return lastYears(monthly(rows, 1));
}

// 하와이 HOT(ALOHA 정점) 표층 pH: 탭 구분, date 'd-Mon-yy', pHcalc_insitu 열
function parsePh(txt) {
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const lines = txt.split('\n').map((l) => l.split('\t'));
  const head = lines.find((c) => c[0] === 'cruise');
  if (!head) throw new Error('HOT 머리줄 없음');
  const di = head.indexOf('date'), pi = head.indexOf('pHcalc_insitu');
  const rows = [];
  for (const c of lines) {
    const m = /^(\d+)-(\w{3})-(\d{2})$/.exec((c[di] || '').trim()), v = Number(c[pi]);
    if (!m || !(v > 0)) continue;
    const yy = Number(m[3]), y = yy < 50 ? 2000 + yy : 1900 + yy;
    rows.push({ d: `${y}-${String(MON[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`, v: Number(v.toFixed(4)) });
  }
  return lastYears(rows);
}

async function getText(fetchFn, url) {
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}

async function collect(fetchFn) {
  const out = { fetchedAt: new Date().toISOString(), errors: [], long: {} };
  const jobs = {
    temp: async () => {
      const csv = await getText(fetchFn, SOURCES.temp);
      out.long.temp = dailyTrend(csv);
      return parseDaily(csv).slice(-DAYS);
    },
    sst: async () => {
      const csv = await getText(fetchFn, SOURCES.sst);
      out.long.sst = dailyTrend(csv);
      return parseDaily(csv).pop();
    },
    co2: async () => parseCo2(await getText(fetchFn, SOURCES.co2)),
    co2Long: async () => { out.long.co2 = parseCo2Monthly(await getText(fetchFn, SOURCES.co2Monthly)); },
    seaLong: async () => { out.long.sea = parseSea(await getText(fetchFn, SOURCES.sea)); },
    phLong: async () => { out.long.ph = parsePh(await getText(fetchFn, SOURCES.ph)); }
  };
  // 한 곳이 실패해도 나머지는 보낸다 (위젯은 자료가 있는 장면만 보여 준다)
  await Promise.all(Object.entries(jobs).map(async ([k, job]) => {
    try {
      const v = await job();
      if (!k.endsWith('Long')) out[k] = v;
    } catch (e) {
      if (!k.endsWith('Long')) out[k] = null;
      out.errors.push(k + ': ' + e.message);
    }
  }));
  return out;
}

async function handler(req, res) {
  const data = await collect(fetch);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // CDN에 30분 캐시, 갱신 중에는 하루까지 이전 값 제공 (원본 자료는 하루 한 번 정도 바뀜)
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(JSON.stringify(data));
}

module.exports = handler;
module.exports.collect = collect;
