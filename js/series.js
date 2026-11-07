// 읽기 › 기초부터 읽기: 4단계 시리즈(js/series-data.js)를 읽기 화면 맨 위에 붙이고, 편을 누르면 전체 화면 읽기 창을 띄운다.
// 버전마다 색은 css/series.css의 --srs-* 변수만 바꾼다. 읽은 편은 store.markRead('s:편id')로 남겨 나의 성과 읽기 목표에 함께 센다.
// 클릭은 이 모듈이 document에서 직접 받는다(앱의 data-act와 겹치지 않게 data-srs-* 속성만 쓴다).
import { SERIES } from './series-data.js';
import { CARDS } from './data.js';
import * as store from './store.js';

const EPISODES = SERIES.flatMap((s) => s.episodes.map((e, i) => ({ ...e, series: s, n: i + 1 })));
const byId = Object.fromEntries(EPISODES.map((e) => [e.id, e]));
const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const num = (v) => Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const isRead = (id) => !!store.getState().reads[`s:${id}`];
const minutes = (e) => Math.max(2, Math.round(e.body.join('').length / 350)); // 학생 기준 분당 약 350자

let openSeries = null; // 펼친 시리즈 id 모음 (저장하지 않음)

// ───────── 목록 ─────────

export function seriesSection() {
  if (!openSeries) {
    const first = SERIES.find((s) => s.episodes.some((e) => !isRead(e.id))) || SERIES[0];
    openSeries = new Set([first.id]);
  }
  const readCount = EPISODES.filter((e) => isRead(e.id)).length;
  return `
    <section class="srs" data-srs aria-labelledby="srs-h">
      <div class="srs-head">
        <h2 id="srs-h" class="srs-h">기초부터 읽기</h2>
        <p class="srs-sub">입문에서 심화까지 4단계 · ${SERIES.length}개 시리즈 · ${EPISODES.length}편${readCount ? ` · ${readCount}편 읽음` : ''}</p>
      </div>
      <ol class="srs-list">${SERIES.map(seriesItem).join('')}</ol>
    </section>`;
}

function seriesItem(s) {
  const done = s.episodes.filter((e) => isRead(e.id)).length;
  const next = s.episodes.find((e) => !isRead(e.id));
  const nextN = next ? s.episodes.indexOf(next) + 1 : 1;
  return `
        <li>
          <details class="srs-series" data-srs-series="${s.id}"${openSeries.has(s.id) ? ' open' : ''}>
            <summary>
              <span class="srs-lv srs-lv${s.level}">${s.level}단계 · ${s.levelName}</span>
              <span class="srs-title">${esc(s.title)}</span>
              <span class="srs-meta">${done}/${s.episodes.length}편 읽음</span>
              <span class="srs-bar" aria-hidden="true"><i style="width:${(done / s.episodes.length) * 100}%"></i></span>
            </summary>
            <p class="srs-desc">${esc(s.desc)}</p>
            <ol class="srs-eps">
              ${s.episodes.map((e, i) => `
              <li><button type="button" class="srs-ep" data-srs-open="${e.id}">
                <span class="srs-n">${i + 1}</span>
                <span class="srs-ep-t">${esc(e.title)}<small>약 ${minutes(e)}분${isRead(e.id) ? ' · 읽음' : ''}</small></span>
                ${isRead(e.id) ? '<span class="srs-check" aria-label="읽음">✓</span>' : ''}
              </button></li>`).join('')}
            </ol>
            <button type="button" class="srs-go" data-srs-open="${(next || s.episodes[0]).id}">${!next ? '처음부터 다시 읽기' : done ? `이어 읽기 · ${nextN}편` : '1편부터 읽기'}</button>
          </details>
        </li>`;
}

// 화면을 그린 뒤 부른다. 펼침 상태만 기억한다.
export function mountSeries(scope = document) {
  scope.querySelectorAll('[data-srs-series]').forEach((d) => {
    d.addEventListener('toggle', () => { d.open ? openSeries.add(d.dataset.srsSeries) : openSeries.delete(d.dataset.srsSeries); });
  });
}

function refreshList() {
  const root = document.querySelector('[data-srs]');
  if (!root) return;
  root.outerHTML = seriesSection();
  mountSeries(document);
}

// ───────── 그림 ─────────

function figure(f) {
  const body = { bars, pairs, stack, timeline, art }[f.kind](f);
  return `
      <figure class="sf" role="group" aria-label="${esc(f.title)}">
        <figcaption class="sf-cap">${esc(f.title)}</figcaption>
        ${body}
        ${f.note ? `<p class="sf-note">${esc(f.note)}</p>` : ''}
      </figure>`;
}

function bars(f) {
  const vals = f.items.flatMap(([, v]) => [].concat(v));
  const neg = vals.some((v) => v < 0);
  const lo = neg ? 0 : (f.min ?? 0);
  const top = Math.max(...vals.map(Math.abs), f.ref ? f.ref.v : 0);
  const span = neg ? top : top - lo;
  const at = (v) => (neg ? 50 + (v / span) * 50 : ((v - lo) / span) * 100);
  const ref = f.ref ? `<i class="sf-ref" style="left:${at(f.ref.v)}%"><b>${esc(f.ref.label)}</b></i>` : '';
  return `<div class="sf-bars${neg ? ' neg' : ''}">${f.items.map(([label, v, o = {}]) => {
    const [a, b] = [].concat(v);
    const text = o.text || (b === undefined ? `${num(a)}${f.unit}` : `${num(a)}~${num(b)}${f.unit}`);
    const fill = neg
      ? `<i class="sf-fill" style="left:${Math.min(50, at(a))}%;width:${Math.abs(at(a) - 50)}%"></i>`
      : `<i class="sf-fill" style="width:${at(a)}%"></i>${b === undefined ? '' : `<i class="sf-range" style="left:${at(a)}%;width:${at(b) - at(a)}%"></i>`}`;
    return `
          <div class="sf-row${o.hl ? ' hl' : ''}">
            <span class="sf-lab">${esc(label)}</span>
            <span class="sf-track">${fill}${neg ? '<i class="sf-zero"></i>' : ''}${ref}</span>
            <span class="sf-val">${esc(text)}</span>
          </div>`;
  }).join('')}</div>`;
}

function pairs(f) {
  const top = Math.max(...f.items.flatMap(([, a, b]) => [a, b]));
  const row = (cls, key, v, t) => `<div class="sf-row ${cls}"><span class="sf-key">${esc(key)}</span><span class="sf-track"><i class="sf-fill" style="width:${(v / top) * 100}%"></i></span><span class="sf-val">${esc(t)}</span></div>`;
  return `<div class="sf-pairs">${f.items.map(([label, a, b, at, bt]) => `
          <div class="sf-pair">
            <span class="sf-lab">${esc(label)}</span>
            ${row('pa', f.keys[0], a, at)}
            ${row('pb hl', f.keys[1], b, bt)}
          </div>`).join('')}</div>`;
}

function stack(f) {
  return `<div class="sf-stack">
          <div class="sf-stackbar">${f.items.map(([, p], i) => `<i class="s${i}" style="width:${p}%"></i>`).join('')}</div>
          <ul class="sf-legend">${f.items.map(([label, , t], i) => `<li><i class="s${i}"></i>${esc(label)} <b>${esc(t)}</b></li>`).join('')}</ul>
        </div>`;
}

function timeline(f) {
  return `<ol class="sf-time">${f.items.map(([when, text]) => `<li><b>${esc(when)}</b><span>${esc(text)}</span></li>`).join('')}</ol>`;
}

function art(f) {
  return `<div class="sf-art">${ART[f.name]()}</div>`;
}

// 원리 그림: 색은 css의 .sa-* 클래스가 정한다 (라이트·다크 모두)
const svg = (label, inner) => `<svg viewBox="0 0 320 190" role="img" aria-label="${esc(label)}">${inner}</svg>`;
const arrow = '<defs><marker id="sa-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';

const ART = {
  weather() {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const pts = Array.from({ length: 60 }, (_, i) => {
      const x = 30 + i * 4.6;
      const trend = 120 - i * 0.9;
      return `${x.toFixed(1)},${(trend + (rand() - 0.5) * 70).toFixed(1)}`;
    }).join(' ');
    return svg('매일 크게 오르내리는 날씨 선과, 그 아래 천천히 오르는 30년 평균 기후 선', `
      <line class="sa-axis" x1="28" y1="168" x2="304" y2="168"/><line class="sa-axis" x1="28" y1="20" x2="28" y2="168"/>
      <polyline class="sa-cool" fill="none" stroke-width="1.4" points="${pts}"/>
      <path class="sa-warm" fill="none" stroke-width="4" stroke-linecap="round" d="M30 121 C120 112, 200 96, 302 68"/>
      <text class="sa-t" x="36" y="34">매일의 날씨 (크게 오르내림)</text>
      <text class="sa-t sa-bold" x="182" y="58">30년 평균 = 기후</text>
      <text class="sa-t sa-mute" x="34" y="184">과거</text><text class="sa-t sa-mute" x="276" y="184">현재</text>
      <text class="sa-t sa-mute" transform="translate(18 108) rotate(-90)">기온</text>`);
  },
  greenhouse() {
    return svg('햇빛은 대기를 통과해 지표를 데우고, 지표가 내보내는 열의 일부는 우주로 나가지만 일부는 온실가스 층에 붙잡혀 다시 지표로 돌아옵니다', `${arrow}
      <circle class="sa-sun" cx="40" cy="30" r="17"/>
      <rect class="sa-soft" x="0" y="70" width="320" height="34" rx="4"/>
      <text class="sa-t sa-bold" x="210" y="91">온실가스 층</text>
      <path class="sa-earth" d="M0 190 L0 160 Q160 132 320 160 L320 190 Z"/>
      <text class="sa-t sa-on" x="132" y="178">지구 (땅과 바다)</text>
      <path class="sa-sunray" stroke-width="3.5" fill="none" marker-end="url(#sa-ar)" d="M56 44 L120 146"/>
      <text class="sa-t" x="70" y="62">햇빛</text>
      <path class="sa-warm" stroke-width="2.5" fill="none" marker-end="url(#sa-ar)" d="M160 146 q6 -10 0 -20 q-6 -10 0 -20 q6 -10 0 -20 q-6 -10 0 -20 L160 22"/>
      <text class="sa-t" x="168" y="30">우주로 나가는 열</text>
      <path class="sa-warm" stroke-width="2.5" fill="none" marker-end="url(#sa-ar)" d="M222 146 q6 -10 0 -20 q-6 -10 0 -20 L230 96 q8 4 14 14 q6 10 6 30"/>
      <text class="sa-t" x="262" y="128">붙잡혀</text><text class="sa-t" x="262" y="141">돌아온 열</text>`);
  },
  bathtub() {
    return svg('수도꼭지에서 물(배출)이 들어오고 배수구로 물(흡수)이 빠져나가는 욕조. 들어오는 양과 나가는 양이 같으면 물 높이가 그대로인 상태가 탄소중립입니다', `${arrow}
      <path class="sa-line" fill="none" stroke-width="3" d="M40 48 L40 30 L92 30 L92 40"/>
      <rect class="sa-line-f" x="84" y="40" width="16" height="8" rx="2"/>
      <path class="sa-cool" stroke-width="6" stroke-linecap="round" d="M92 52 L92 92"/>
      <text class="sa-t sa-bold" x="108" y="34">배출 (수도꼭지)</text>
      <text class="sa-t sa-mute" x="108" y="48">먼저 잠그기: 줄이기</text>
      <path class="sa-water" d="M52 104 L268 104 L262 150 Q260 160 250 160 L70 160 Q60 160 58 150 Z"/>
      <path class="sa-line" fill="none" stroke-width="3" d="M44 80 L58 152 Q60 164 74 164 L246 164 Q260 164 262 152 L276 80"/>
      <line class="sa-dash" x1="40" y1="104" x2="284" y2="104"/>
      <text class="sa-t sa-mute" x="132" y="98">물 높이 = 대기 중 온실가스</text>
      <path class="sa-cool" stroke-width="3" fill="none" marker-end="url(#sa-ar)" d="M236 166 L236 184"/>
      <text class="sa-t sa-bold" x="118" y="182">흡수 (숲·바다·기술)</text>`);
  },
  sealevel() {
    return svg('왼쪽: 바닷물이 데워지면 부피가 늘어 수면이 오릅니다. 오른쪽: 육지의 빙하와 빙상이 녹아 바다로 흘러들면 수면이 오릅니다', `${arrow}
      <text class="sa-t sa-bold" x="14" y="20">① 열팽창</text>
      <path class="sa-line" fill="none" stroke-width="2.5" d="M24 40 L24 160 Q24 170 34 170 L124 170 Q134 170 134 160 L134 40"/>
      <rect class="sa-water" x="26" y="92" width="106" height="76"/>
      <line class="sa-dash" x1="26" y1="110" x2="132" y2="110"/>
      <path class="sa-warm" stroke-width="2" fill="none" marker-end="url(#sa-ar)" d="M79 104 L79 80"/>
      <text class="sa-t" x="20" y="186">데워지면 부피가 늘어나요</text>
      <text class="sa-t sa-bold" x="172" y="20">② 육지 얼음이 녹음</text>
      <path class="sa-land" d="M172 170 L172 96 L214 96 L232 170 Z"/>
      <path class="sa-ice" d="M172 96 L172 70 Q190 58 214 70 L214 96 Z"/>
      <rect class="sa-water" x="226" y="118" width="84" height="52"/>
      <line class="sa-dash" x1="226" y1="132" x2="310" y2="132"/>
      <path class="sa-cool" stroke-width="2.5" fill="none" marker-end="url(#sa-ar)" d="M216 82 Q240 86 250 112"/>
      <text class="sa-t" x="176" y="186">빙하·빙상 물이 바다로</text>`);
  },
  adapt() {
    return svg('기온이 1.5℃, 2℃, 3℃로 오를수록 적응할 수 있는 선택지의 폭이 좁아지고, 일부 생태계는 넘을 수 없는 한계에 다다릅니다', `
      <path class="sa-soft" d="M30 30 L290 82 L290 118 L30 170 Z"/>
      <path class="sa-line" fill="none" stroke-width="2" d="M30 30 L290 82 M30 170 L290 118"/>
      <text class="sa-t sa-bold" x="40" y="104">적응할 수 있는 선택지</text>
      <line class="sa-dash" x1="96" y1="20" x2="96" y2="178"/><line class="sa-dash" x1="182" y1="20" x2="182" y2="178"/><line class="sa-dash" x1="268" y1="20" x2="268" y2="178"/>
      <text class="sa-t" x="82" y="16">1.5℃</text><text class="sa-t" x="172" y="16">2℃</text><text class="sa-t" x="258" y="16">3℃</text>
      <text class="sa-t sa-warm-t" x="196" y="160">일부는 경성 한계</text>
      <text class="sa-t sa-mute" x="196" y="174">(산호초·극지 생태계 등)</text>`);
  }
};

// ───────── 읽기 창 ─────────

let reader = null;   // 열려 있는 읽기 창
let opener = null;   // 닫은 뒤 초점을 돌려줄 버튼
let pushed = false;  // 뒤로 가기로 닫히도록 기록을 하나 넣었는지

function episodeHTML(e) {
  const s = e.series;
  const total = s.episodes.length;
  const idx = EPISODES.indexOf(e);
  const prev = EPISODES[idx - 1];
  const next = EPISODES[idx + 1];
  const today = store.getPicks(store.dateKey());
  const cards = [...new Set(e.cards)].map((id) => cardById[id]).filter(Boolean).slice(0, 3);
  const figsAt = (i) => (e.figs || []).filter((f) => f.at === i).map(figure).join('');
  return `
    <div class="srs-r-bar">
      <button type="button" class="srs-x" data-srs-close aria-label="닫기">✕</button>
      <span class="srs-r-where">${esc(s.title)} · ${e.n}/${total}</span>
    </div>
    <article class="srs-r-body">
      <p class="srs-r-k"><span class="srs-lv srs-lv${s.level}">${s.level}단계 · ${s.levelName}</span> 약 ${minutes(e)}분</p>
      <h1 class="srs-r-h" id="srs-rt" tabindex="-1">${esc(e.title)}</h1>
      <div class="srs-nums">${e.nums.map(([v, t]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join('')}</div>
      ${figsAt(-1)}
      ${e.body.map((p, i) => `<p class="srs-p">${rich(p)}</p>${figsAt(i)}`).join('')}
      ${e.more?.length ? `<details class="srs-more"><summary>더 알아보기</summary>${e.more.map(([q, a]) => `<div class="srs-qa"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join('')}</details>` : ''}
      <div class="srs-think"><b>생각해 보기</b><p>${esc(e.think)}</p></div>
      ${cards.length ? `<div class="srs-cards"><b>이어지는 실천</b><div>${cards.map((c) => {
        const has = today.includes(c.id);
        return `<button type="button" class="srs-pick" data-srs-pick="${c.id}"${has ? ' disabled' : ''}>${esc(c.title)}<small>${has ? '오늘 카드에 있어요' : '오늘 카드에 담기'}</small></button>`;
      }).join('')}</div></div>` : ''}
      <div class="srs-src"><b>출처</b><ul>${e.src.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul></div>
      <nav class="srs-r-nav" aria-label="이전·다음 편">
        ${prev ? `<button type="button" data-srs-open="${prev.id}"><small>이전</small>${esc(prev.title)}</button>` : '<span></span>'}
        ${next ? `<button type="button" class="next" data-srs-open="${next.id}"><small>다음${next.series !== s ? ` · ${next.series.level}단계 「${esc(next.series.title)}」` : ''}</small>${esc(next.title)}</button>` : `<button type="button" class="next" data-srs-close><small>끝까지 읽었어요</small>목록으로</button>`}
      </nav>
    </article>`;
}

function openEpisode(id, from) {
  const e = byId[id];
  if (!e) return;
  store.markRead(`s:${id}`);
  if (!reader) {
    opener = from || document.activeElement;
    reader = document.createElement('div');
    reader.className = 'srs-reader';
    reader.setAttribute('role', 'dialog');
    reader.setAttribute('aria-modal', 'true');
    reader.setAttribute('aria-labelledby', 'srs-rt');
    document.body.appendChild(reader);
    document.documentElement.classList.add('srs-lock');
    try { history.pushState({ srs: true }, ''); pushed = true; } catch { pushed = false; }
  }
  reader.innerHTML = episodeHTML(e);
  reader.scrollTop = 0;
  reader.querySelector('#srs-rt').focus({ preventScroll: true });
}

function teardown() {
  if (!reader) return;
  reader.remove();
  reader = null;
  pushed = false;
  document.documentElement.classList.remove('srs-lock');
  refreshList();
  const back = opener && document.contains(opener) ? opener : document.querySelector('[data-srs] .srs-h');
  back?.focus?.({ preventScroll: true });
}

function close() {
  if (pushed) history.back(); // popstate에서 닫는다
  else teardown();
}

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-srs-open], [data-srs-close], [data-srs-pick]');
  if (!t) return;
  if (t.dataset.srsOpen) openEpisode(t.dataset.srsOpen, reader ? null : t);
  else if (t.hasAttribute('data-srs-close')) close();
  else if (t.dataset.srsPick) {
    store.addPick(store.dateKey(), t.dataset.srsPick);
    t.disabled = true;
    t.querySelector('small').textContent = '오늘 카드에 담았어요';
  }
});
document.addEventListener('keydown', (ev) => { if (reader && ev.key === 'Escape') close(); });
window.addEventListener('popstate', () => { if (reader) teardown(); });
