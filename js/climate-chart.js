// 기후 4대 지표 연도별 추이 그래프 (모든 디자인 버전이 함께 쓴다)
// 화면에 <div data-climate-charts></div>를 두고, 화면을 그린 뒤 mountClimateCharts()를 부르면 그 자리에 그린다.
// 색·바탕은 각 버전 style.css의 .cc 변수(--cc-accent 등)로 정한다. 글자는 글자색, 선만 강조색.
import { CLIMATE_SERIES } from './climate-data.js';

const RANGES = [['all', '전체 기간'], ['30', '최근 30년']];
let range = 'all'; // 화면을 다시 그려도 고른 기간을 기억한다 (저장하지 않음)

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

function seriesInRange(s) {
  const last = s.data[s.data.length - 1][0];
  return range === 'all' ? s.data : s.data.filter(([y]) => y > last - 30);
}

export function mountClimateCharts(scope = document) {
  scope.querySelectorAll('[data-climate-charts]').forEach(draw);
}

function draw(el) {
  const sets = CLIMATE_SERIES.map((s) => ({ s, data: seriesInRange(s) }));
  el.classList.add('cc');
  el.innerHTML = `
    <div class="cc-range" role="group" aria-label="기간">
      ${RANGES.map(([id, label]) => `<button type="button" class="cc-chip" data-range="${id}" aria-pressed="${range === id}">${label}</button>`).join('')}
    </div>
    <div class="cc-list">
      ${sets.map(({ s, data }) => {
        const [y0, v0] = data[0];
        const [y1, v1] = data[data.length - 1];
        return `
          <figure class="cc-card">
            <figcaption class="cc-head">
              <span class="cc-label">${s.label}</span>
              <span class="cc-value">${fmt(s, v1)}</span>
              <span class="cc-meta">${y1}년 · ${s.base} · ${y0}년보다 ${fmtDelta(s, v1 - v0)}</span>
            </figcaption>
            <div class="cc-chart"></div>
            ${s.id === 'temp' ? '<p class="cc-note">가로선은 파리협정 목표 1.5℃예요. 목표는 한 해가 아니라 20년 평균으로 판단해요.</p>' : ''}
          </figure>`;
      }).join('')}
    </div>
    <details class="cc-table">
      <summary>표로 보기</summary>
      ${tableHtml(sets)}
    </details>
    <p class="cc-src">기온: Met Office HadCRUT5 · 해수면: NOAA 위성 고도계(Laboratory for Satellite Altimetry) · 해수 표면온도: NOAA Climate at a Glance · CO₂: NOAA 마우나로아 관측. 연평균이며, 해가 끝나지 않은 해는 넣지 않았어요. 위 숫자와 WMO 발표값은 쓰는 자료가 달라 조금 다를 수 있어요.</p>`;

  el.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    range = b.dataset.range;
    draw(el);
  }));
  el.querySelectorAll('.cc-chart').forEach((box, i) => plot(box, sets[i].s, sets[i].data));
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

function plot(box, s, data) {
  const W = Math.max(260, Math.round(box.clientWidth));
  const H = 140;
  const m = { l: 44, r: 14, t: 12, b: 24 };
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
  const tickDigits = Math.max(0, -Math.floor(Math.log10((hi - lo) / (ticks.length - 1)) + 1e-9));
  const path = data.map(([y, v], i) => `${i ? 'L' : 'M'}${X(y).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const [ly, lv] = data[data.length - 1];
  const midYear = Math.round((x0 + x1) / 2 / 10) * 10;

  box.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" tabindex="0" role="img"
      aria-label="${s.label} ${x0}년 ${fmt(s, data[0][1])}에서 ${x1}년 ${fmt(s, lv)}. 좌우 화살표로 연도별 값을 볼 수 있어요.">
      ${ticks.map((t) => `
        <line class="cc-grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/>
        <text class="cc-tick" x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end">${t.toFixed(tickDigits)}</text>`).join('')}
      ${s.id === 'temp' ? `<line class="cc-ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(1.5)}" y2="${Y(1.5)}"/>
        <text class="cc-tick" x="${m.l + 4}" y="${Y(1.5) - 5}">1.5℃ 목표</text>` : ''}
      <text class="cc-tick" x="${m.l}" y="${H - 6}">${x0}</text>
      ${midYear > x0 + 8 && midYear < x1 - 8 ? `<text class="cc-tick" x="${X(midYear)}" y="${H - 6}" text-anchor="middle">${midYear}</text>` : ''}
      <text class="cc-tick" x="${W - m.r}" y="${H - 6}" text-anchor="end">${x1}</text>
      <path class="cc-line" d="${path}"/>
      <circle class="cc-dot" cx="${X(ly)}" cy="${Y(lv)}" r="4"/>
      <g class="cc-hover" visibility="hidden">
        <line class="cc-cross" y1="${m.t}" y2="${H - m.b}"/>
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
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => mountClimateCharts(), 150);
});
