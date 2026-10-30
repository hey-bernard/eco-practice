// 기후 4대 지표 연도별 추이 그래프 (모든 디자인 버전이 함께 쓴다)
// 기상청 종합 기후변화감시정보(climate.go.kr/home/09_monitoring) 첫 화면처럼:
// 어두운 바다 배경 위에 지표 패널을 가로로 넘겨 보고, 선은 값이 클수록 파랑 → 노랑 → 빨강, 아래에 색 범례 막대.
// 화면에 <div data-climate-charts></div>를 두고, 화면을 그린 뒤 mountClimateCharts()를 부르면 그 자리에 그린다.
import { CLIMATE_SERIES } from './climate-data.js';

const RANGES = [['all', '전체 기간'], ['30', '최근 30년']];
const ORDER = ['co2', 'temp', 'sea', 'sst']; // 감시정보 첫 화면 순서
const RAMP = ['#3D8FD1', '#22B5C8', '#F3E04B', '#F7953A', '#EE4B37']; // 낮음 → 높음
const ICONS = {
  co2: '<path d="M7 18h10.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.2 9.6 4.2 4.2 0 0 0 7 18z"/><text x="12" y="16" text-anchor="middle" font-size="6.2" font-weight="700" fill="currentColor" stroke="none">CO₂</text>',
  temp: '<path d="M10 14.3V5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0z"/><path d="M12 9v8"/><circle cx="12" cy="17" r="1.6" fill="currentColor"/>',
  sea: '<path d="M2 8.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 13.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 18.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  sst: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M8.5 15c1.2 0 1.2-1 2.3-1s1.2 1 2.4 1 1.2-1 2.3-1"/>'
};

let range = 'all'; // 화면을 다시 그려도 고른 기간을 기억한다 (저장하지 않음)
let current = 0;   // 보고 있던 패널
let uid = 0;

const unitText = (s) => (s.unit === '℃' ? '℃' : ` ${s.unit}`);
const fmt = (s, v) => `${s.sign && v > 0 ? '+' : ''}${v.toFixed(s.digits)}${unitText(s)}`;
const fmtDelta = (s, d) => `${d > 0 ? '+' : ''}${d.toFixed(s.digits)}${unitText(s)}`;

// 1·2·5 단위로 떨어지는 눈금 3~5개
function niceTicks(lo, hi) {
  const raw = (hi - lo) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((k) => k >= raw);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + step * 0.001; v += step) ticks.push(+v.toFixed(6));
  if (ticks[ticks.length - 1] < hi) ticks.push(+(ticks[ticks.length - 1] + step).toFixed(6));
  return { ticks, step };
}
const digitsFor = (ticks) => Math.max(0, -Math.floor(Math.log10((ticks[ticks.length - 1] - ticks[0]) / (ticks.length - 1)) + 1e-9));

// 색 범위는 기간을 바꿔도 그대로(전체 자료 기준) — 같은 값은 늘 같은 색
function colorDomain(s) {
  const ys = s.data.map(([, v]) => v);
  return [Math.min(...ys), Math.max(...ys)];
}
// 범례 막대 아래 글자: 가장 낮은 값 · 가운데 · 가장 높은 값
function legendLabels(s, [a, b]) {
  const d = s.unit === 'ppm' ? 0 : 1;
  return [a, (a + b) / 2, b].map((v) => `${s.sign && v > 0 ? '+' : ''}${v.toFixed(d)}${s.unit}`);
}
function colorAt(t) {
  const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = RAMP[i].match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = RAMP[i + 1].match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * f)).join(' ')})`;
}
const rampCss = RAMP.map((c, i) => `${c} ${(i / (RAMP.length - 1)) * 100}%`).join(', ');

function seriesInRange(s) {
  const last = s.data[s.data.length - 1][0];
  return range === 'all' ? s.data : s.data.filter(([y]) => y > last - 30);
}

export function mountClimateCharts(scope = document) {
  scope.querySelectorAll('[data-climate-charts]').forEach(draw);
}

function draw(el) {
  const sets = ORDER.map((id) => CLIMATE_SERIES.find((s) => s.id === id)).map((s) => ({ s, data: seriesInRange(s), dom: colorDomain(s) }));
  el.classList.add('cc');
  el.innerHTML = `
    <div class="cc-range" role="group" aria-label="기간">
      ${RANGES.map(([id, label]) => `<button type="button" class="cc-chip" data-range="${id}" aria-pressed="${range === id}">${label}</button>`).join('')}
    </div>
    <div class="cc-list" aria-label="기후 지표 ${sets.length}개, 옆으로 넘겨 보세요">
      ${sets.map(({ s, data, dom }) => {
        const [y0, v0] = data[0];
        const [y1, v1] = data[data.length - 1];
        return `
          <figure class="cc-card">
            <figcaption class="cc-head">
              <svg class="cc-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.id]}</svg>
              <span class="cc-label">${s.label}</span>
              <span class="cc-value">${fmt(s, v1)}</span>
              <span class="cc-meta">${y1}년 · ${s.base} · ${y0}년보다 ${fmtDelta(s, v1 - v0)}</span>
            </figcaption>
            <div class="cc-chart"></div>
            <div class="cc-legend" aria-hidden="true">
              <i style="background: linear-gradient(90deg, ${rampCss})"></i>
              <div>${legendLabels(s, dom).map((t) => `<span>${t}</span>`).join('')}</div>
            </div>
            ${s.id === 'temp' ? '<p class="cc-note">점선은 파리협정 목표 1.5℃예요. 목표는 한 해가 아니라 20년 평균으로 판단해요.</p>' : ''}
          </figure>`;
      }).join('')}
    </div>
    <div class="cc-dots">
      ${sets.map(({ s }, i) => `<button type="button" data-go="${i}" aria-label="${s.label} 보기"${i === current ? ' aria-current="true"' : ''}></button>`).join('')}
    </div>
    <details class="cc-table">
      <summary>표로 보기</summary>
      ${tableHtml(sets)}
    </details>
    <p class="cc-src">CO₂: NOAA 마우나로아 관측 · 기온: Met Office HadCRUT5 · 해수면: NOAA 위성 고도계(Laboratory for Satellite Altimetry) · 해수 표면온도: NOAA Climate at a Glance. 연평균이며, 해가 끝나지 않은 해는 넣지 않았어요. WMO 발표값과는 쓰는 자료가 달라 조금 다를 수 있어요.</p>`;

  const list = el.querySelector('.cc-list');
  const cards = [...list.children];
  const dots = [...el.querySelectorAll('[data-go]')];
  const go = (i, smooth) => list.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: smooth ? 'smooth' : 'instant' });

  el.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    range = b.dataset.range;
    draw(el);
  }));
  dots.forEach((b) => b.addEventListener('click', () => go(+b.dataset.go, true)));
  list.addEventListener('scroll', () => {
    const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
    current = Math.max(0, Math.min(cards.length - 1, Math.round(list.scrollLeft / step)));
    dots.forEach((b, i) => b.toggleAttribute('aria-current', i === current));
  }, { passive: true });

  list.querySelectorAll('.cc-chart').forEach((box, i) => plot(box, sets[i].s, sets[i].data, sets[i].dom));
  go(current, false);
}

function tableHtml(sets) {
  const years = [...new Set(sets.flatMap(({ data }) => data.map(([y]) => y)))].sort((a, b) => b - a);
  const maps = sets.map(({ data }) => new Map(data));
  return `
    <div class="cc-table-wrap">
      <table>
        <thead><tr><th scope="col">연도</th>${sets.map(({ s }) => `<th scope="col">${s.label}<br><small>${s.unit}</small></th>`).join('')}</tr></thead>
        <tbody>${years.map((y) => `<tr><th scope="row">${y}</th>${maps.map((m, i) => `<td>${m.has(y) ? fmt(sets[i].s, m.get(y)).replace(unitText(sets[i].s), '') : '–'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// 연도 눈금: 화면 너비에 맞춰 5·10·20·25·50년 간격 중 4~6개가 되는 것
function yearTicks(x0, x1, maxCount) {
  const step = [5, 10, 20, 25, 50, 100].find((k) => (x1 - x0) / k <= maxCount);
  const out = [];
  for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) out.push(y);
  return out;
}

function plot(box, s, data, dom) {
  const W = Math.max(240, Math.round(box.clientWidth));
  const H = 170;
  const m = { l: 42, r: 10, t: 12, b: 26 };
  const ys = data.map(([, v]) => v);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (s.id === 'temp') hi = Math.max(hi, 1.5);
  const pad = (hi - lo) * 0.06 || 1;
  const { ticks } = niceTicks(lo - pad, hi + pad);
  lo = ticks[0];
  hi = ticks[ticks.length - 1];
  const x0 = data[0][0];
  const x1 = data[data.length - 1][0];
  const X = (y) => m.l + ((y - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = (v) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const tickDigits = digitsFor(ticks);
  const path = data.map(([y, v], i) => `${i ? 'L' : 'M'}${X(y).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const [ly, lv] = data[data.length - 1];
  const tone = (v) => colorAt((v - dom[0]) / (dom[1] - dom[0]));
  const gid = `cc-g${++uid}`;
  const bottom = H - m.b;

  box.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" tabindex="0" role="img"
      aria-label="${s.label} ${x0}년 ${fmt(s, data[0][1])}에서 ${x1}년 ${fmt(s, lv)}. 좌우 화살표로 연도별 값을 볼 수 있어요.">
      <defs>
        <linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${Y(dom[0])}" y2="${Y(dom[1])}">
          ${RAMP.map((c, i) => `<stop offset="${i / (RAMP.length - 1)}" stop-color="${c}"/>`).join('')}
        </linearGradient>
      </defs>
      ${ticks.map((t) => `
        <line class="cc-grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/>
        <line class="cc-axis" x1="${m.l - 4}" x2="${m.l}" y1="${Y(t)}" y2="${Y(t)}"/>
        <text class="cc-tick" x="${m.l - 7}" y="${Y(t) + 4}" text-anchor="end">${t.toFixed(tickDigits)}</text>`).join('')}
      <line class="cc-axis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${bottom}"/>
      <line class="cc-axis" x1="${m.l}" x2="${W - m.r}" y1="${bottom}" y2="${bottom}"/>
      ${yearTicks(x0, x1, W < 340 ? 4 : 6).map((y) => `
        <line class="cc-axis" x1="${X(y)}" x2="${X(y)}" y1="${bottom}" y2="${bottom + 4}"/>
        <text class="cc-tick" x="${X(y)}" y="${H - 6}" text-anchor="${X(y) > W - m.r - 14 ? 'end' : 'middle'}">${y}</text>`).join('')}
      ${s.id === 'temp' ? `<line class="cc-ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(1.5)}" y2="${Y(1.5)}"/>
        <text class="cc-tick" x="${m.l + 4}" y="${Y(1.5) - 5}">1.5℃ 목표</text>` : ''}
      <path class="cc-line" d="${path}" stroke="url(#${gid})"/>
      <circle class="cc-dot" cx="${X(ly)}" cy="${Y(lv)}" r="4" fill="${tone(lv)}"/>
      <g class="cc-hover" visibility="hidden">
        <line class="cc-cross" y1="${m.t}" y2="${bottom}"/>
        <circle class="cc-dot" r="4"/>
      </g>
      <rect class="cc-hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}"/>
    </svg>
    <div class="cc-tip" hidden><b></b><span></span></div>`;

  const svg = box.querySelector('svg');
  const hover = svg.querySelector('.cc-hover');
  const cross = hover.querySelector('line');
  const dot = hover.querySelector('circle');
  const tip = box.querySelector('.cc-tip');
  let idx = data.length - 1;

  // 가장 가까운 연도에 붙는 세로선 + 값 말풍선 (값을 먼저, 연도는 뒤에)
  const show = (i) => {
    idx = Math.max(0, Math.min(data.length - 1, i));
    const [y, v] = data[idx];
    const px = X(y);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    dot.setAttribute('cx', px);
    dot.setAttribute('cy', Y(v));
    dot.setAttribute('fill', tone(v));
    hover.setAttribute('visibility', 'visible');
    tip.querySelector('b').textContent = fmt(s, v);
    tip.querySelector('span').textContent = `${y}년`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(W - tw, Math.max(0, px - tw / 2))}px`;
    tip.style.top = `${Math.max(0, Y(v) - 44)}px`;
  };
  const hide = () => {
    hover.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  const nearest = (clientX) => {
    const r = svg.getBoundingClientRect();
    const year = x0 + ((clientX - r.left - m.l) / (W - m.l - m.r)) * (x1 - x0);
    let best = 0;
    data.forEach(([y], i) => { if (Math.abs(y - year) < Math.abs(data[best][0] - year)) best = i; });
    return best;
  };
  svg.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerdown', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('focus', () => show(idx));
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      show(idx + (e.key === 'ArrowLeft' ? -1 : 1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      show(e.key === 'Home' ? 0 : data.length - 1);
    }
  });
}

// 화면 너비가 바뀌면 다시 그린다
let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return; // 모바일 주소창이 접히는 높이 변화는 무시
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => mountClimateCharts(), 150);
});
