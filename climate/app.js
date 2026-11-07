// Stitch 샘플 '지구 기후 모니터 · Climate Home'을 입힌 네 번째 디자인. 첫 탭 '지구'에서 기후 지표를 보고 오늘 실천으로 이어진다.
// 지구 화면과 5칸 메뉴로 이루어진 하나뿐인 버전이다. 데이터·저장은 공용 모듈(../js)을 쓴다.
import { CARDS, LEVEL_LABEL, STAGES, TOPICS, POSTS, NEWSLETTER, PLEDGE, BEE_POST_ID, GROUPS, FEED, REACTIONS, PHRASES, REVIEW_DRAFT, COPY } from '../js/data.js';
import * as store from '../js/store.js';
import * as auth from '../js/auth.js';
import * as sync from '../js/sync.js';
import { mountClimateCharts } from '../js/climate-chart.js';
import { achievementsFold, mountAchievements } from '../js/achievements.js';
import { seriesSection, mountSeries } from '../js/series.js';
import { mountPlant, plantFrame } from '../js/practice-plant.js';

const $app = document.getElementById('screen');
const $nav = document.getElementById('nav');
const $layer = document.getElementById('layer');

// ?demo=1 로 열면 발표용 점수 버튼이 나온다
const DEMO = new URLSearchParams(location.search).has('demo');

// 화면을 오가도 유지할 임시 상태 (저장하지 않음)
const ui = {
  calMonth: null,
  todayArea: 'all',
  pickerArea: null,
  readTab: 'reflect',
  readTopic: 'all',
  groupMode: 'all',
  reviewEditing: false,
  reviewShared: false,
  reviewText: REVIEW_DRAFT,
  feedPicks: {},
  feedSent: ''
};

const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const IMG = '../images';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Material Symbols 아이콘 (Stitch 시안이 쓰는 아이콘 글꼴)
const ms = (name, cls = '', fill = false) => `<span class="ms${fill ? ' fill' : ''} ${cls}" aria-hidden="true">${name}</span>`;

// 실천 카드마다 붙일 아이콘
const CARD_ICON = {
  transit: 'directions_bus', walk8k: 'directions_walk', walk: 'directions_walk', onestop: 'transfer_within_a_station', bike: 'pedal_bike', stairs: 'stairs',
  carpool: 'airport_shuttle', vegmeal: 'eco', vegday: 'eco', meatless: 'no_meals', noleftover: 'restaurant', fridge: 'kitchen', seasonal: 'nutrition',
  coldwash: 'local_laundry_service', airdry: 'dry_cleaning', unplug: 'power', lightsoff: 'lightbulb', shortshower: 'shower', tapoff: 'water_drop',
  ereceipt: 'receipt_long', refill: 'autorenew', reusable: 'takeout_dining', sorting: 'recycling', secondhand: 'swap_horiz', repair: 'build',
  phone: 'smartphone', tumbler: 'local_cafe', bag: 'shopping_bag', nature: 'park', stroll: 'nature_people', pickup: 'cleaning_services',
  groupchal: 'groups', classchal: 'groups', bottle: 'water_bottle', snack: 'cookie', paper: 'description', aircon: 'sensor_door',
  milkpack: 'local_drink', stationery: 'edit', handkerchief: 'dry_cleaning', share: 'checkroom', market: 'storefront'
};

// 자주 쓰는 모양 (Stitch 샘플 '지구 기후 모니터'의 다크 카드·네온 강조에서 옮김)
const K = {
  screen: 'flex flex-col gap-5 px-4 pt-5 pb-28',
  card: 'rounded-xl bg-surface-container-lowest shadow-md',
  h1: 'font-serif text-headline-lg font-semibold tracking-tight text-on-surface',
  h2: 'font-serif text-headline-md font-medium tracking-tight text-on-surface',
  eyebrow: 'text-label-md font-medium text-secondary',
  meta: 'font-mono text-label-sm uppercase tracking-wider text-on-surface-variant',
  small: 'text-body-sm text-on-surface-variant',
  tiny: 'text-label-sm leading-relaxed text-outline',
  btn: 'tap inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-lg px-4 text-label-md font-semibold',
  solid: 'bg-primary-container text-on-primary glow hover:bg-primary',
  line: 'bg-surface-bright text-on-surface hover:bg-surface-container-highest',
  soft: 'border border-sage/40 bg-secondary-container/70 text-primary hover:bg-secondary-container',
  ghost: 'text-secondary hover:text-primary',
  pill: 'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-label-sm font-medium',
  bar: 'h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest',
  back: 'tap inline-flex items-center gap-0.5 self-start py-2 text-body-sm font-medium text-secondary hover:text-primary'
};
const btn = (kind, extra = '') => `${K.btn} ${K[kind] || ''} ${extra}`;
const bar = (pct, cls = '') => `<div class="${K.bar} ${cls}"><div class="h-full rounded-full bg-primary-container" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
const chev = ms('chevron_right', 'text-[20px] text-on-surface-variant');

// ───────── 공통 계산 ─────────

function forestInfo(points) {
  let si = 0;
  STAGES.forEach(([, need], i) => { if (points >= need) si = i; });
  const next = STAGES[si + 1];
  const pct = next ? Math.round(((points - STAGES[si][1]) / (next[1] - STAGES[si][1])) * 100) : 100;
  return {
    si,
    name: STAGES[si][0],
    pct,
    nextText: next ? `${next[0]}까지 ${next[1] - points}점 남았어요` : '숲을 가꾸고 있어요'
  };
}

// 성장 6단계 그림: 식물 일러스트
const stageImage = (si) => `${IMG}/forest/plant${si + 1}.svg`;

// 이번 주 카드: 주차마다 14편을 돌아가며 보여 준다
function weeklyPost() {
  const now = new Date();
  const week = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 864e5));
  return POSTS[week % POSTS.length];
}

function monthPrefix(d = new Date()) {
  return store.dateKey(d).slice(0, 7);
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function closeSheet() {
  $layer.innerHTML = '';
}

// outside: false면 바깥(어두운 막)을 눌러도 닫히지 않는다 ('닫기' 버튼으로만)
// fixed: true면 내용 길이와 상관없이 시트 높이를 고정한다 (탭을 바꿔도 시트가 출렁이지 않게)
function sheet(label, body, { outside = true, fixed = false } = {}) {
  $layer.innerHTML = `
    <div class="sheet">
      ${outside ? '<button type="button" class="dim" data-act="close" aria-label="닫기"></button>' : '<div class="dim" aria-hidden="true"></div>'}
      <div class="panel${fixed ? ' fixed-h' : ''}" role="dialog" aria-label="${label}">
        <div class="mx-auto mb-1 h-1 w-10 rounded-full bg-outline-variant" aria-hidden="true"></div>
        ${body}
      </div>
    </div>`;
}

const sheetRow = (attrs, left, right = '', disabled = false) => `
  <button type="button" class="tap flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border border-hairline bg-surface-container-lowest px-4 py-2 text-left text-body-md ${disabled ? 'text-outline' : 'text-on-surface hover:border-sage'}" ${attrs} ${disabled ? 'disabled' : ''}>
    <span>${left}</span>${right ? `<span class="${K.small}">${right}</span>` : ''}
  </button>`;

// 라이트/다크 전환: 모든 탭 머리 오른쪽 같은 자리에 둔다. 처음엔 기기 설정을 따르고, 누르면 이 기기에 기억한다
const themeBtn = () => {
  const label = isDark() ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기';
  return `<button type="button" class="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface" data-act="theme" aria-label="${label}" title="${label}">${ms(isDark() ? 'light_mode' : 'dark_mode', 'text-[20px]')}</button>`;
};

// 화면 맨 위: 작은 머리말 + 세리프 제목 (+ 오른쪽 버튼 + 테마 전환)
const header = (meta, title, right = '', icon = '') => `
  <header class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      ${icon ? ms(icon, 'text-[26px] text-primary', true) : ''}
      <div class="flex min-w-0 flex-col gap-0.5">
        ${meta ? `<p class="${K.meta}">${meta}</p>` : ''}
        <h1 class="${K.h1}">${title}</h1>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-2">${right}${themeBtn()}</div>
  </header>`;

// ───────── ① 오늘 ─────────

// ───────── ⓪ 지구 (기후 홈) ─────────
// 머리(지구 기후 모니터) 아래는 '지구 지금' 위젯(js/earth-now-widget.js): 위성 지구 + 기온·CO₂·해수면·수온·산성화 실시간 자료.
// 자료는 서버 함수 api/earth-now.js가 Copernicus·NOAA·하와이대 공개 자료를 모아 준다.


function viewEarth() {
  const today = store.dateKey();
  const picks = store.getPicks(today);
  const doneCount = picks.filter((id) => store.isDone(today, id)).length;
  const prefix = monthPrefix();
  const monthTotal = Object.entries(store.getState().records).filter(([k]) => k.startsWith(prefix)).reduce((n, [, list]) => n + list.length, 0);
  const f = forestInfo(store.totalPoints());
  const post = weeklyPost();
  const label = 'font-mono text-label-sm text-on-surface-variant';

  return `
    <div class="${K.screen}">
      <header class="-mx-4 -mt-5 flex h-16 items-center justify-between bg-surface/80 px-4 shadow-[0_1px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">${ms('public', 'text-[22px]', true)}</div>
          <div class="flex flex-col">
            <h1 class="font-serif text-headline-md font-medium leading-tight tracking-tight">지구 기후 모니터</h1>
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-label-sm uppercase text-on-surface-variant">Climate Home</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-primary-container/15 px-1.5 py-0.5 font-mono text-[12px] text-primary-container"><span class="live-dot h-1.5 w-1.5 rounded-full bg-primary-container"></span>실시간</span>
            </div>
          </div>
        </div>
        ${themeBtn()}
      </header>

      <div data-earth-now></div>

      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="${K.h2}">내가 만든 변화</h2>
          <span class="${label}">이 기기의 기록</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <a href="#/forest" class="tap relative block h-36 overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <img class="h-full w-full object-contain object-bottom" src="${stageImage(f.si)}" alt="" aria-hidden="true">
            <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
            <span class="absolute bottom-2 left-2 rounded bg-surface/70 px-2 py-0.5 font-mono text-[12px] text-primary-container backdrop-blur-sm">나의 숲 · ${f.name} 단계</span>
          </a>
          <a href="#/record" class="tap relative flex h-36 flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-3 shadow-sm">
            <div class="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-tertiary/15 blur-2xl"></div>
            ${ms('calendar_month', 'text-[22px] text-tertiary')}
            <div><span class="num text-metric-lg leading-none">${monthTotal}</span><span class="ml-1 font-mono text-label-sm text-on-surface-variant">개</span></div>
            <span class="self-start rounded bg-surface/70 px-2 py-0.5 font-mono text-[12px] text-tertiary">이번 달 실천 기록</span>
          </a>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="${K.h2}">그래서 오늘 할 수 있는 것</h2>
        <a href="#/today" class="tap group flex items-center justify-between gap-3 rounded-xl bg-surface-container-high/90 p-4 shadow-md hover:bg-surface-bright">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">${ms('energy_savings_leaf', 'text-[22px]')}</div>
            <div class="flex min-w-0 flex-col">
              <span class="font-serif text-[16px] font-semibold group-hover:text-primary-container">${COPY.picksTitle} ${doneCount}/${picks.length}</span>
              <span class="truncate text-body-sm text-on-surface-variant">${picks.map((id) => esc(cardById[id].title)).join(' · ')}</span>
            </div>
          </div>
          ${ms('arrow_forward', 'text-[20px] text-on-surface-variant group-hover:text-primary-container')}
        </a>
        <a href="#/read" class="tap group flex items-center justify-between gap-3 rounded-xl bg-surface-container-high/90 p-4 shadow-md hover:bg-surface-bright">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">${ms('travel_explore', 'text-[22px]')}</div>
            <div class="flex min-w-0 flex-col">
              <span class="font-serif text-[16px] font-semibold group-hover:text-tertiary">이번 주 읽기 · ${esc(post.tag)}</span>
              <span class="truncate text-body-sm text-on-surface-variant">${esc(post.title)}</span>
            </div>
          </div>
          ${ms('arrow_forward', 'text-[20px] text-on-surface-variant group-hover:text-tertiary')}
        </a>
        <p class="flex items-start gap-1.5 text-body-sm text-on-surface-variant">${ms('spa', 'mt-0.5 text-[16px] text-primary-container')}<span>0.1℃라도 덜 오르면 그만큼 피해가 줄어요. 작은 실천도 그 0.1℃에 보태져요.</span></p>
      </section>

      <p class="text-[12px] leading-relaxed text-outline">기온·해수면·해수 표면온도: 세계기상기구(WMO) 전 지구 기후 현황 보고서(2025년 기준). CO₂: NOAA 마우나로아 관측, 2025년 2월 월평균(연평균 아님). 탄소 예산: Indicators of Global Climate Change 2024(Forster 외, 2025), 2025년 1월 1일부터 센 값. 실시간 관측값이 아니라 발표된 값이에요.</p>
    </div>`;
}

// 오늘의 실천 식물: 오늘 카드를 기록할 때마다 그 자리에서 한 뼘씩 자라고, 다 기록하면 꽃이 핀다 (Lottie, js/practice-plant.js)
function practicePlant(done, total) {
  const all = total > 0 && done >= total;
  const label = all ? '오늘 실천을 모두 기록해 꽃이 피었어요' : `오늘 실천 ${total}개 중 ${done}개를 기록해 식물이 자라고 있어요`;
  return `
    <div class="flex shrink-0 flex-col items-center" role="img" aria-label="${label}">
      <div class="relative h-28 w-28">
        <div class="pointer-events-none absolute inset-x-3 bottom-1 h-10 rounded-full bg-primary-container/15 blur-xl" aria-hidden="true"></div>
        <div class="plant-box relative grid h-full w-full place-items-end justify-center" data-plant data-frame="${plantFrame(done, total)}" aria-hidden="true">${ms('potted_plant', 'mb-3 text-[44px] text-primary-container', true)}</div>
      </div>
      <span class="-mt-0.5 font-mono text-[12px] tracking-tight ${all ? 'text-tertiary' : 'text-on-surface-variant'}">${all ? '오늘 꽃 피움' : '한 뼘씩 자라요'}</span>
    </div>`;
}

function viewToday() {
  const today = store.dateKey();
  const now = new Date();
  const picks = store.getPicks(today);
  const points = store.totalPoints();
  const f = forestInfo(points);
  const post = weeklyPost();
  const prefix = monthPrefix();
  const saved = store.countCard(COPY.effect.card, prefix);
  const doneCount = picks.filter((id) => store.isDone(today, id)).length;
  const monthTotal = Object.entries(store.getState().records).filter(([k]) => k.startsWith(prefix)).reduce((n, [, list]) => n + list.length, 0);

  // 분야 알약: 오늘 카드에 있는 분야만. 고른 분야의 카드만 보여 준다
  const areas = [...new Set(picks.map((id) => cardById[id].area))];
  if (ui.todayArea !== 'all' && !areas.includes(ui.todayArea)) ui.todayArea = 'all';
  const shown = ui.todayArea === 'all' ? picks : picks.filter((id) => cardById[id].area === ui.todayArea);
  const pill = (id, label, icon) => {
    const on = ui.todayArea === id;
    return `<button type="button" class="tap flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-label-sm whitespace-nowrap ${on ? 'bg-primary-container font-semibold text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}" data-act="today-area" data-id="${esc(id)}" aria-pressed="${on}">${ms(icon, 'text-[15px]')}${esc(label)}</button>`;
  };
  const areaIcon = (area) => CARD_ICON[picks.find((id) => cardById[id].area === area)] || 'eco';

  const cards = shown.map((id) => {
    const c = cardById[id];
    const done = store.isDone(today, id);
    const month = store.countCard(id, prefix);
    return `
      <article class="${K.card} flex flex-col gap-3 p-4 ${done ? 'ring-1 ring-primary-container/30' : ''}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest shadow-inner ${done ? 'text-primary-container' : 'text-on-surface-variant'}">${ms(CARD_ICON[id] || 'eco', 'text-[22px]', done)}</div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <h3 class="font-serif text-[16px] font-semibold text-on-surface">${esc(c.title)}</h3>
                ${done
                  ? `<span class="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[12px] text-primary">기록함</span>`
                  : `<span class="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono text-[12px] text-on-surface-variant">${LEVEL_LABEL[c.level]}</span>`}
              </div>
              <p class="mt-0.5 text-body-sm text-on-surface-variant">${esc(c.hint)}</p>
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-end">
            <span class="num text-[18px] font-bold ${month ? 'text-primary-container' : 'text-on-surface-variant'}">${month}<span class="text-[12px] font-medium">${c.unit}</span></span>
            <span class="font-mono text-[12px] text-on-surface-variant">이번 달</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="flex items-center gap-1 font-mono text-[12px] ${done ? 'text-primary' : 'text-on-surface-variant'}">${ms(done ? 'task_alt' : 'radio_button_unchecked', 'text-[14px]')}${done ? '오늘 기록했어요' : '아직 기록 전'}</span>
          ${done
            ? `<button type="button" class="${btn('line', 'min-h-[36px] px-3')}" data-act="toggle" data-id="${id}" aria-pressed="true" aria-label="${esc(c.title)} 기록 취소">${ms('check', 'text-[16px] text-primary-container')}했어요</button>`
            : `<button type="button" class="${btn('solid', 'min-h-[36px] px-3')}" data-act="toggle" data-id="${id}" aria-pressed="false">${ms('add', 'text-[16px]')}기록하기</button>`}
        </div>
      </article>`;
  }).join('');

  const e = COPY.effect;
  // 샘플의 '오늘의 커뮤니티 미션' 배너 자리: 내 모임 소식 (예시 데이터)
  const mission = { tag: '내 모임 소식', meta: '예시', title: '주말 플로깅 크루 · 일요일 오전 10시', body: '멤버 8명 중 6명이 이번 주 실천을 기록했어요. 30분 걸으며 쓰레기를 주워요.', pct: 75, count: '6/8', href: '#/group', btn: '모임 보러 가기', icon: 'directions_run' };

  return `
    <div class="${K.screen}">
      <header class="-mx-4 -mt-5 flex h-16 items-center justify-between bg-surface/80 px-4 shadow-[0_1px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">${ms('energy_savings_leaf', 'text-[22px]', true)}</div>
          <div class="flex flex-col">
            <h1 class="font-serif text-headline-md font-medium leading-tight tracking-tight">${COPY.todayTitle}</h1>
            <div class="flex items-center gap-1.5">
              <span class="whitespace-nowrap font-mono text-label-sm uppercase text-on-surface-variant">${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-primary-container/15 px-1.5 py-0.5 font-mono text-[12px] text-primary-container max-[389px]:hidden"><span class="live-dot h-1.5 w-1.5 rounded-full bg-primary-container"></span>TODAY</span>
            </div>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          ${accountBtn()}
          ${themeBtn()}
        </div>
      </header>

      <section class="flex gap-3 rounded-2xl bg-surface-container-high p-4" aria-label="저탄소 실천 다짐">
        ${ms('eco', 'mt-0.5 text-[22px] text-primary-container', true)}
        <div class="flex min-w-0 flex-col gap-1.5">
          <p class="text-body-md font-semibold leading-snug [word-break:keep-all]">${PLEDGE.lead}</p>
          <p class="text-body-sm leading-relaxed text-on-surface-variant [word-break:keep-all]">${PLEDGE.pledge}</p>
        </div>
      </section>

      <section class="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-xl" aria-label="오늘 기록 요약">
        <div class="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary-container/10 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl"></div>
        <div class="relative z-10 mb-2 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="live-dot h-2 w-2 rounded-full bg-primary-container"></span>
            <span class="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">오늘의 실천 트래커</span>
          </div>
          <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-label-sm text-primary">이번 달 ${monthTotal}개 기록</span>
        </div>
        <div class="relative z-10 flex items-center justify-between gap-2">
          <div class="flex flex-col">
            <span class="text-body-sm text-on-surface-variant">오늘 기록한 실천</span>
            <div class="mt-0.5 flex items-baseline gap-1">
              <span class="num text-metric-lg tracking-tight text-on-surface">${doneCount}</span>
              <span class="num text-[18px] font-medium text-on-surface-variant">/ ${picks.length}</span>
            </div>
            <span class="mt-2 inline-flex items-center gap-1 self-start rounded bg-primary-container/15 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-primary-container">${ms('local_florist', 'text-[13px]')}숲 +${doneCount}점</span>
          </div>
          ${practicePlant(doneCount, picks.length)}
        </div>
        <a href="#/forest" class="tap relative z-10 mt-4 flex items-center justify-between border-t border-outline-variant/40 pt-2.5">
          <span class="flex items-center gap-1.5 text-body-sm text-on-surface">${ms('forest', 'text-[16px] text-primary-container', true)}나의 숲 · ${f.name} 단계</span>
          <span class="flex items-center gap-0.5 font-mono text-label-sm text-primary">누적 ${points}점${ms('chevron_right', 'text-[16px]')}</span>
        </a>
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">${ms('task_alt', 'text-[20px] text-primary-container')}<h2 class="${K.h2}">${COPY.picksTitle}</h2></div>
          <span class="font-mono text-label-sm text-on-surface-variant">${doneCount}/${picks.length} 완료</span>
        </div>
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="분야">
          ${pill('all', '전체', 'apps')}
          ${areas.map((a) => pill(a, a, areaIcon(a))).join('')}
          <button type="button" class="tap flex shrink-0 items-center gap-1 rounded-full border border-dashed border-outline px-3.5 py-1.5 text-label-sm text-on-surface-variant hover:text-on-surface" data-act="picker">${ms('add', 'text-[15px]')}${COPY.pickMore}</button>
        </div>
        <div class="flex flex-col gap-3">${cards}</div>
        ${doneCount ? '' : `<p class="${K.small}">${COPY.firstHint}</p>`}
      </section>

      <section class="${K.card} flex items-center gap-3 p-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-tertiary">${ms('local_cafe', 'text-[22px]')}</div>
        <div class="min-w-0 flex-1">
          <p class="font-serif text-[15px] font-semibold">${saved > 0 ? e.done(saved) : e.empty}</p>
          <p class="text-body-sm text-on-surface-variant">${saved > 0 ? e.doneSub(saved) : e.emptySub}</p>
        </div>
        <span class="num shrink-0 rounded-full bg-tertiary/15 px-2 py-1 text-[12px] font-semibold text-tertiary">+${saved}</span>
      </section>

      <section class="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-lowest p-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="relative flex h-3 w-3"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-container opacity-75 motion-reduce:animate-none"></span><span class="relative inline-flex h-3 w-3 rounded-full bg-primary-container"></span></span>
            <span class="font-mono text-label-sm font-bold uppercase tracking-wider text-primary-container">${mission.tag}</span>
          </div>
          <span class="font-mono text-label-sm text-on-surface-variant">${mission.meta}</span>
        </div>
        <h3 class="mt-2 font-serif text-headline-md font-medium">${esc(mission.title)}</h3>
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">${mission.body}</p>
        <div class="mt-3 flex items-center gap-2">${bar(mission.pct)}<span class="num shrink-0 text-[12px] text-on-surface">${mission.count}</span></div>
        <a href="${mission.href}" class="tap glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3.5 font-serif text-[15px] font-bold text-on-primary">${ms(mission.icon, 'text-[20px]', true)}${mission.btn}</a>
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">${ms('public', 'text-[20px] text-primary-container')}<h2 class="${K.h2}">이번 주 읽기</h2></div>
          <span class="font-mono text-label-sm text-on-surface-variant">국가기후위기대응위원회</span>
        </div>
        <a href="#/read" class="tap ${K.card} flex flex-col gap-2.5 p-4">
          <div class="flex items-center justify-between">
            <span class="rounded bg-surface-container-highest px-2 py-0.5 font-mono text-[12px] text-on-surface-variant">${esc(post.tag)}</span>
            <span class="font-mono text-[12px] text-on-surface-variant">${post.date}</span>
          </div>
          <h4 class="font-serif text-[15px] font-semibold leading-snug">${esc(post.title)}</h4>
          <p class="line-clamp-2 text-body-sm text-on-surface-variant">${esc(post.intro)}</p>
          <div class="flex items-center justify-between gap-2 pt-1">
            <span class="flex items-center gap-1 font-mono text-[12px] text-tertiary">${ms('edit_note', 'text-[14px]')}${COPY.question}</span>
            ${ms('arrow_outward', 'text-[18px] text-on-surface-variant')}
          </div>
        </a>
      </section>
    </div>`;
}

// 고르기 시트의 카드 한 줄: 오늘 화면에 있는 카드는 '선택 취소' (오늘 이미 기록한 카드는 취소하지 않는다)
function pickRow(c) {
  const today = store.dateKey();
  const label = `${ms(CARD_ICON[c.id] || 'eco', 'mr-2 align-[-4px] text-[18px] text-secondary')}${esc(c.title)}`;
  if (!store.getPicks(today).includes(c.id)) return sheetRow(`data-act="add-pick" data-id="${c.id}" data-pick-row`, label, LEVEL_LABEL[c.level]);
  return `
    <div class="flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border border-primary-container/30 bg-surface-container-lowest px-4 py-2 text-body-md" data-pick-row>
      <span class="min-w-0">${label}</span>
      ${store.isDone(today, c.id)
        ? `<span class="shrink-0 ${K.small}">오늘 기록함</span>`
        : `<button type="button" class="tap shrink-0 rounded-full border border-outline-variant px-3 py-1.5 text-label-md text-on-surface hover:border-primary-container" data-act="remove-pick" data-id="${c.id}" aria-label="${esc(c.title)} 선택 취소">선택 취소</button>`}
    </div>`;
}

// 분야 탭 모양: 고른 탭은 진한 알약, 나머지는 옅은 알약 (글자 굵기는 같게 둬서 탭을 바꿔도 줄바꿈이 달라지지 않게)
const PICK_TAB_ON = ['bg-primary-container', 'text-on-primary'];
const PICK_TAB_OFF = ['bg-surface-container-high', 'text-on-surface-variant'];

function openPicker() {
  const areas = [...new Set(CARDS.map((c) => c.area))];
  if (!areas.includes(ui.pickerArea)) ui.pickerArea = areas[0];
  // 분야는 탭으로 나눠 한 번에 한 분야만 보여 준다. 탭을 바꿔도 시트는 다시 그리지 않는다 (패널만 숨김/보임)
  // 여러 장을 이어서 고르는 시트라 바깥을 눌러도 닫히지 않는다
  sheet(COPY.pickerTitle, `
    <div class="flex items-center justify-between gap-2">
      <h2 class="${K.h2}">${COPY.pickerTitle}</h2>
      <button type="button" class="tap -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" data-act="close" aria-label="닫기">${ms('close', 'text-[22px]')}</button>
    </div>
    <p class="${K.small}">${COPY.pickerSub}. 오늘 화면에 있는 카드는 '선택 취소'로 뺄 수 있어요.</p>
    <div class="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="실천 분야">
      ${areas.map((area, i) => {
        const on = area === ui.pickerArea;
        const first = CARDS.find((c) => c.area === area);
        const n = CARDS.filter((c) => c.area === area).length;
        return `<button type="button" role="tab" id="pick-tab-${i}" aria-controls="pick-panel-${i}" aria-selected="${on}" tabindex="${on ? 0 : -1}" class="tap flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-label-md font-medium whitespace-nowrap ${(on ? PICK_TAB_ON : PICK_TAB_OFF).join(' ')}" data-act="picker-tab" data-id="${esc(area)}">${ms(CARD_ICON[first.id] || 'eco', 'text-[16px]')}${esc(area)}<span class="font-mono text-[12px] opacity-70">${n}</span></button>`;
      }).join('')}
    </div>
    <div class="mt-2 shrink-0" data-pick-panels>
    ${areas.map((area, i) => `
      <div class="flex-col gap-2" style="${pickPanelStyle(area === ui.pickerArea)}" role="tabpanel" id="pick-panel-${i}" aria-labelledby="pick-tab-${i}" data-pick-panel="${esc(area)}">
        ${CARDS.filter((c) => c.area === area).map(pickRow).join('')}
      </div>`).join('')}
    </div>
    <button type="button" class="${btn('ghost', 'mt-1')}" data-act="close">닫기</button>`, { outside: false, fixed: true });
}

// 고른 분야 목록만 보인다. 목록 높이는 그 분야 카드 수만큼이라 아래 빈 공간이 생기지 않는다
const pickPanelStyle = (on) => `display:${on ? 'flex' : 'none'}`;

// 탭 전환: 시트 안의 탭 모양과 패널만 바꾼다 (고른 줄 상태는 그대로)
function selectPickerTab(area) {
  ui.pickerArea = area;
  $layer.querySelectorAll('[data-act="picker-tab"]').forEach((t) => {
    const on = t.dataset.id === area;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    t.classList.remove(...PICK_TAB_ON, ...PICK_TAB_OFF);
    t.classList.add(...(on ? PICK_TAB_ON : PICK_TAB_OFF));
  });
  $layer.querySelectorAll('[data-pick-panel]').forEach((p) => { p.style.display = p.dataset.pickPanel === area ? 'flex' : 'none'; });
}

// ───────── ② 로그인 ─────────

const PROVIDER_LABEL = { kakao: '카카오', google: '구글' };

// 프로필 사진이 없거나 못 불러오면 이름 첫 글자
function avatar(p, size) {
  const initial = `<span class="flex h-full w-full items-center justify-center bg-primary-container/15 font-semibold text-primary-container" style="font-size:${Math.round(size * 0.42)}px">${esc([...p.name][0] || '나')}</span>`;
  return `<span class="relative inline-flex shrink-0 overflow-hidden rounded-full" style="width:${size}px;height:${size}px">${initial}${p.avatar
    ? `<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer" class="absolute inset-0 h-full w-full object-cover" onerror="this.remove()">`
    : ''}</span>`;
}

// 오늘 화면 머리의 버튼: 로그인 전엔 '로그인', 로그인 뒤엔 내 이름
function accountBtn() {
  const p = auth.profile();
  if (!p) return `<a href="#/login" class="${btn('line', 'min-h-[40px] px-3')}">${ms('person', 'text-[18px]')}로그인</a>`;
  return `<a href="#/login" class="${btn('line', 'min-h-[40px] max-w-[132px] pl-1.5 pr-3')}" aria-label="내 계정 · ${esc(p.name)}">${avatar(p, 28)}<span class="truncate">${esc(p.name)}</span></a>`;
}

function syncText() {
  const s = sync.getStatus();
  if (s.state === 'syncing') return [ms('sync', 'text-[18px] animate-spin'), '계정에 저장하는 중이에요'];
  if (s.state === 'offline') return [ms('cloud_off', 'text-[18px]'), '지금은 이 기기에 저장해요. 인터넷이 연결되면 계정에 올려요.'];
  if (s.state === 'saved') {
    const t = new Date(s.at);
    return [ms('cloud_done', 'text-[18px] text-primary-container', true), `계정에 저장했어요 · ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`];
  }
  return [ms('cloud', 'text-[18px]'), '계정과 연결하는 중이에요'];
}

function viewAccount(p) {
  const [icon, text] = syncText();
  const points = store.totalPoints();
  return `
    <div class="flex min-h-[100dvh] flex-col px-5 pb-6 pt-6">
      <a href="#/today" class="${K.back}">${ms('chevron_left', 'text-[20px]')}오늘로</a>
      <div class="mt-6 flex flex-col items-center gap-3 text-center">
        ${avatar(p, 72)}
        <div>
          <h1 class="font-serif text-headline-lg font-bold">${esc(p.name)}${COPY.nim}</h1>
          <p class="${K.small}">${PROVIDER_LABEL[p.provider] || p.provider} 계정으로 로그인했어요</p>
        </div>
      </div>
      <section class="mt-8 ${K.card} flex flex-col gap-3 p-4" aria-label="저장 상태">
        <div class="flex items-center gap-2 text-body-sm" role="status">${icon}<span>${text}</span></div>
        <p class="${K.small}">지금까지 기록 ${points}개. 다른 기기에서 같은 계정으로 로그인하면 기록과 숲이 그대로 보여요.</p>
      </section>
      <div class="mt-auto flex flex-col gap-2.5 pt-8">
        <a href="#/today" class="${btn('solid', 'h-[52px] rounded-full')}">오늘 실천하러 가기</a>
        <button type="button" data-act="logout" class="${btn('line', 'h-[52px] rounded-full')}">로그아웃</button>
        <p class="${K.tiny} text-center">로그아웃해도 이 기기의 기록은 지우지 않아요.</p>
      </div>
    </div>`;
}

function viewLogin() {
  const p = auth.profile();
  if (p) return viewAccount(p);
  return `
    <div class="flex min-h-[100dvh] flex-col px-5 pb-6 pt-12">
      <div class="flex flex-col items-start gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/70 text-primary">${ms('spa', 'text-[26px]', true)}</div>
        <h1 class="mt-3 font-serif text-headline-xl font-bold leading-tight">기록을 안전하게<br>저장해요</h1>
        <p class="text-body-sm leading-relaxed text-on-surface-variant">로그인하면 기기를 바꿔도 기록과 숲이 그대로 남아요. 알림 설정과 모임 참여도 이때부터 쓸 수 있어요.</p>
      </div>
      <div class="mt-8 flex flex-col gap-2.5">
        <button type="button" data-act="login" data-id="kakao" class="tap flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#FEE500] text-body-md font-medium text-[#191919]">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.9 4 3 7.1 3 10.9c0 2.4 1.6 4.5 4 5.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.4 0 .9.1 1.2.1 5.1 0 9-3.1 9-6.9S17.1 4 12 4z" fill="#191919"/></svg>
          카카오로 시작하기
        </button>
        <button type="button" data-act="login" data-id="google" class="tap flex h-[52px] items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest text-body-md font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.2 22 12 22z" fill="#34A853"/><path d="M6.4 13.9c-.2-.6-.3-1.3-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.2 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335"/></svg>
          구글로 시작하기
        </button>
        <a href="#/today" class="${btn('ghost')}">로그인 없이 먼저 둘러보기</a>
      </div>
      <div class="mt-auto rounded-2xl border border-hairline bg-surface-container-lowest p-4">
        <div class="${K.eyebrow}">받는 정보</div>
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">필수: 닉네임 · 선택: 프로필 사진<br>비밀번호는 저장하지 않아요. 탈퇴를 요청하면 기록과 연결 정보를 함께 지워요.</p>
        <a href="./privacy.html" class="mt-2 inline-flex min-h-[44px] items-center text-body-sm text-primary underline underline-offset-2">개인정보처리방침</a>
      </div>
    </div>`;
}

// ───────── ③ 기록 ─────────

function viewRecord() {
  const now = new Date();
  const todayKey = store.dateKey(now);
  const m = ui.calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
  const y = m.getFullYear();
  const mo = m.getMonth();
  const prefix = monthPrefix(m);
  const isThisMonth = y === now.getFullYear() && mo === now.getMonth();
  const { records } = store.getState();

  const cells = [];
  for (let i = 0; i < new Date(y, mo, 1).getDay(); i++) cells.push('<div aria-hidden="true"></div>');
  const lastDay = new Date(y, mo + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const key = store.dateKey(new Date(y, mo, d));
    const n = (records[key] || []).length;
    const cls = [n >= 3 ? 'many' : n ? 'some' : key > todayKey ? 'future' : 'past', key === todayKey ? 'today' : ''].join(' ');
    cells.push(`<div class="${cls}" aria-label="${d}일 기록 ${n}개"><span>${d}</span><small>${n ? n + '개' : ''}</small></div>`);
  }

  // 이번 달 쌓인 변화: 가장 많이 한 카드 3개
  const counts = {};
  Object.entries(records).filter(([k]) => k.startsWith(prefix)).forEach(([, list]) => list.forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
  const top = Object.entries(counts).filter(([id]) => cardById[id]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const stats = top.length
    ? `<div class="grid grid-cols-3 gap-2">${top.map(([id, n]) => `
        <div class="${K.card} flex flex-col gap-1 p-3.5">
          ${ms(CARD_ICON[id] || 'eco', 'text-[20px] text-amber')}
          <b class="font-serif text-[24px] font-semibold leading-tight text-tertiary">${n}<span class="text-body-sm">${cardById[id].unit}</span></b>
          <span class="text-label-md leading-snug text-on-surface-variant [word-break:keep-all]">${esc(cardById[id].stat)}</span>
        </div>`).join('')}</div>`
    : `<p class="${K.small}">이번 달 기록이 쌓이면 여기에 개수로 보여 드려요.</p>`;

  // 챌린지: 첫 기록한 날부터 40일
  const days = Object.keys(records).sort();
  let challenge = `<p class="${K.small}">첫 기록을 남기면 40일 챌린지가 시작돼요.</p>`;
  if (days.length) {
    const start = new Date(days[0] + 'T00:00:00');
    const nth = Math.min(40, Math.floor((new Date(todayKey + 'T00:00:00') - start) / 864e5) + 1);
    challenge = `
      <div class="flex items-baseline justify-between"><h2 class="${K.h2}">40일 챌린지</h2><span class="${K.meta}">${nth}일째</span></div>
      <div role="progressbar" aria-label="챌린지 진행" aria-valuenow="${nth}" aria-valuemin="0" aria-valuemax="40">${bar((nth / 40) * 100, 'h-2.5')}</div>
      <p class="${K.small}">혼자 참여 중 · <a class="font-medium text-primary underline underline-offset-2" href="${COPY.together.href}">${COPY.together.text}</a></p>`;
  }

  return `
    <div class="${K.screen}">
      ${header('', '나의 기록', '', 'calendar_month')}
      <section class="${K.card} p-4" aria-label="${y}년 ${mo + 1}월 기록 달력">
        <div class="mb-2 flex items-center justify-between">
          <button type="button" class="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container" data-act="cal-prev" aria-label="이전 달">${ms('chevron_left')}</button>
          <div class="font-serif text-body-md font-semibold">${y}년 ${mo + 1}월</div>
          <button type="button" class="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container disabled:text-outline-variant" data-act="cal-next" aria-label="다음 달" ${isThisMonth ? 'disabled' : ''}>${ms('chevron_right')}</button>
        </div>
        <div class="cal mb-1.5 text-center text-label-sm text-outline">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal">${cells.join('')}</div>
        <div class="mt-3 flex justify-end gap-3 text-label-sm text-on-surface-variant">
          <span class="flex items-center gap-1"><i class="inline-block h-2.5 w-2.5 rounded bg-secondary-container"></i>1~2개</span>
          <span class="flex items-center gap-1"><i class="inline-block h-2.5 w-2.5 rounded bg-primary-container"></i>3개 이상</span>
        </div>
      </section>
      ${isThisMonth ? gapNote(records, now) : ''}
      <section class="space-y-3">
        <h2 class="${K.h2} px-1">이번 달 쌓인 변화</h2>
        ${stats}
      </section>
      <section class="${K.card} space-y-3 p-5">${challenge}</section>
      ${achievementsFold({ fold: `${K.card} p-5`, title: K.h2, meta: K.meta })}
    </div>`;
}

// 끊긴 날을 탓하지 않고 다시 시작한 날을 알려 준다
function gapNote(records, now) {
  const has = (d) => (records[store.dateKey(d)] || []).length > 0;
  const day = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const note = (text) => `<div class="flex items-start gap-2 rounded-2xl bg-done px-4 py-3 text-body-sm text-primary">${ms('spa', 'mt-0.5 text-[18px]')}<span>${text}</span></div>`;
  if (!Object.keys(records).length) return '';
  if (!has(day(0)) && has(day(1))) return '';
  // 오늘부터 거꾸로: 기록한 날 → 빈 날 묶음 → 그 전에 기록한 날이 있으면 안내
  let i = 0;
  if (!has(day(0))) {
    while (i < 60 && !has(day(i))) i++;
    if (i >= 60) return '';
    return note(`${i}일 동안 쉬었어요. 괜찮아요, 오늘 한 장으로 다시 시작해요.`);
  }
  while (i < 60 && has(day(i))) i++;
  const restart = day(i - 1);
  let j = i;
  while (j < 60 && !has(day(j))) j++;
  if (j >= 60 || j === i) return '';
  const fmt = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const gapText = j - i === 1 ? `${fmt(day(i))}엔` : `${fmt(day(j - 1))}부터 ${fmt(day(i))}까지`;
  return note(`${gapText} 기록이 없었지만 괜찮아요. ${fmt(restart)}에 다시 시작했어요.`);
}

// ───────── ④ 나의 숲 ─────────

function viewForest() {
  const points = store.totalPoints();
  const f = forestInfo(points);
  const { reads } = store.getState();

  const animals = [
    { name: '벌', icon: 'emoji_nature', cond: "꽃 단계에서 '벌이 사라지면' 카드 읽기", now: reads[BEE_POST_ID] || 0, need: 1, gate: f.si >= 3 },
    { name: '새', icon: 'raven', cond: `'${cardById.nature.title}' 기록 3회`, now: store.countCard('nature'), need: 3, gate: true },
    { name: '다람쥐', icon: 'pets', cond: "'쓰레기 3개 줍기' 기록 5회", now: store.countCard('pickup'), need: 5, gate: true }
  ].map((a) => ({ ...a, ok: a.gate && a.now >= a.need }));
  const [bee, bird, squirrel] = animals;

  const demo = DEMO ? `
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="${btn('line')}" data-act="demo" data-id="${COPY.effect.card}">실천 기록 +1점</button>
      <button type="button" class="${btn('line')}" data-act="demo" data-id="nature">자연 관찰 +1회</button>
      <button type="button" class="${btn('line')}" data-act="demo" data-id="pickup">쓰레기 줍기 +1회</button>
      <button type="button" class="${btn('line')}" data-act="demo-bee">벌 카드 읽기</button>
    </div>
    <p class="${K.tiny}">시연 모드 버튼입니다. 누른 만큼 오늘 기록이 더해집니다.</p>` : '';

  return `
    <div class="${K.screen} gap-6 pt-3">
      <a href="#/today" class="${K.back}">${ms('chevron_left', 'text-[20px]')}${COPY.nav.today}</a>
      <div class="-mt-3 space-y-1">
        <h1 class="${K.h1}">나의 숲</h1>
        <p class="${K.small}">${COPY.forestMeta}</p>
      </div>
      <section class="overflow-hidden rounded-2xl border border-hairline" aria-label="숲 그림">
        <div class="stage-art">
          <img class="main plant" src="${stageImage(f.si)}" alt="식물 ${f.name} 단계 모습">
          <svg class="critters" viewBox="0 0 358 220" aria-hidden="true">
            ${bee.ok ? '<g transform="translate(70,120)"><ellipse rx="9" ry="6" fill="#F2C230" stroke="#1C2620" stroke-width="1.5"/></g>' : ''}
            ${bird.ok ? '<path d="M280 46 q8 -8 16 0 q8 -8 16 0" stroke="#dfe2f1" stroke-width="2" fill="none" stroke-linecap="round"/>' : ''}
            ${squirrel.ok ? '<g><circle cx="290" cy="196" r="9" fill="#B4651E"/><circle cx="298" cy="187" r="4" fill="#B4651E"/></g>' : ''}
          </svg>
        </div>
        <div class="flex items-baseline justify-between border-t border-hairline bg-surface-container-lowest px-4 py-3">
          <span class="font-serif text-body-md font-semibold text-primary">${f.name} 단계</span>
          <span class="${K.meta}">${points}점 · ${f.nextText}</span>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="${K.h2} px-1">성장 단계</h2>
        <div class="grid grid-cols-3 gap-2">
          ${STAGES.map(([name, need], i) => {
            const st = i < f.si ? 'border-secondary-container bg-secondary-container/60 text-primary' : i === f.si ? 'border-primary-container bg-primary-container text-on-primary' : 'border-hairline bg-surface-container-lowest text-on-surface-variant';
            return `<div class="flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 text-center ${st}"><b class="text-body-sm font-semibold">${name}</b><span class="text-label-sm">${need}점 · ${i < f.si ? '완료' : i === f.si ? '지금' : '다음'}</span></div>`;
          }).join('')}
        </div>
      </section>

      <section class="space-y-2.5">
        <h2 class="${K.h2} px-1">함께 사는 동식물</h2>
        ${animals.map((a) => `
          <div class="${K.card} flex items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.ok ? 'bg-secondary-container text-primary' : 'bg-surface-container text-outline'}">${ms(a.icon, 'text-[20px]', a.ok)}</div>
              <div><div class="text-body-md font-medium">${a.name}</div><div class="${K.small}">${esc(a.cond)}</div></div>
            </div>
            <span class="${K.pill} ${a.ok ? 'bg-secondary-container text-primary' : 'bg-surface-container text-on-surface-variant'}">${a.ok ? '열림' : '잠김'} ${a.gate ? `${Math.min(a.now, a.need)}/${a.need}` : '꽃 단계 필요'}</span>
          </div>`).join('')}
      </section>
      ${demo}
    </div>`;
}

// ───────── ⑤ 읽기 ─────────

function viewRead() {
  const isReflect = ui.readTab === 'reflect';
  const post = weeklyPost();
  const shown = ui.readTopic === 'all' ? POSTS : POSTS.filter((p) => p.topic === ui.readTopic);
  const mine = store.getState().reflections.slice(0, 3);
  const seg = (items, cur, act) => `
    <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-container p-1" role="group" aria-label="보기 전환">
      ${items.map(([id, label]) => `<button type="button" class="tap h-10 rounded-full text-label-md ${cur === id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant'}" data-act="${act}" data-id="${id}" aria-pressed="${cur === id}">${label}</button>`).join('')}
    </div>`;

  const reflect = `
    ${seriesSection()}
    <a href="#/earth" class="tap ${K.card} flex items-center justify-between gap-3 p-4">
      <span class="flex items-center gap-2 text-body-md font-medium">${ms('public', 'text-[20px] text-primary-container')}기후 지표는 '지구' 탭에서 볼 수 있어요</span>
      ${chev}
    </a>

    <div class="flex flex-wrap gap-2" role="group" aria-label="주제">
      ${TOPICS.map((t) => `<button type="button" class="tap min-h-[36px] rounded-full px-4 text-label-md font-medium ${ui.readTopic === t.id ? 'bg-primary-container text-on-primary' : 'bg-secondary-container/60 text-on-surface'}" data-act="topic" data-id="${t.id}" aria-pressed="${ui.readTopic === t.id}">${t.label}</button>`).join('')}
    </div>

    <article class="flex flex-col gap-3 rounded-2xl border border-primary-container/25 bg-gradient-to-br from-surface-container-high to-surface-container-low p-6 text-on-surface">
      <span class="font-mono text-label-md uppercase text-primary">이번 주의 카드 · 카드뉴스 · 원문 읽기</span>
      <h2 class="font-serif text-[21px] font-semibold leading-snug">${esc(post.title)}</h2>
      <p class="font-serif text-body-md leading-relaxed text-on-surface-variant">${esc(post.intro)}</p>
      <p class="text-body-sm leading-relaxed text-on-surface-variant">${esc(post.summary)}</p>
      <div class="mt-1 flex items-center justify-between gap-2">
        <span class="font-mono text-label-sm text-on-surface-variant">국가기후위기대응위원회 · ${post.date}</span>
        <a href="${post.url}" target="_blank" rel="noopener" class="${btn('solid')}" data-act="read-post" data-id="${post.id}">원문 보기${ms('open_in_new', 'text-[16px]')}</a>
      </div>
    </article>

    <form class="space-y-3 rounded-2xl border border-amber/20 bg-oat/60 p-5" data-act="reflect">
      <label for="reflect" class="block text-label-md font-medium text-tertiary">${COPY.question}</label>
      <p class="font-serif text-quote leading-relaxed">“${esc(post.question)}”</p>
      <div class="flex gap-2">
        <input id="reflect" name="text" type="text" maxlength="200" placeholder="한 줄로 남겨 보세요" autocomplete="off" class="h-11 min-w-0 flex-1 rounded-full border border-amber/25 bg-surface-container-lowest px-4 text-[16px] focus:border-amber focus:outline-none">
        <button type="submit" class="${btn('solid')}">남기기</button>
      </div>
      <p class="flex items-center gap-1 text-label-sm text-tertiary/80">${ms('lock', 'text-[14px]')}${COPY.reflectNote}</p>
      ${mine.map((r) => `<div class="border-t border-amber/15 pt-2 font-serif text-body-sm"><span class="mr-1 font-sans text-label-sm text-tertiary/70">${r.date.slice(5).replace('-', '.')}</span>${esc(r.text)}</div>`).join('')}
    </form>

    <p class="px-1 ${K.small}">카드 ${shown.length}편 · 원문은 국가기후위기대응위원회 누리집에서 읽어요</p>
    <section class="-mt-4 flex flex-col">
      ${shown.map((p) => `
        <a class="flex min-h-[44px] items-center gap-3 border-b border-outline-variant/30 px-1 py-4 hover:bg-surface-container-low" href="${p.url}" target="_blank" rel="noopener" data-act="read-post" data-id="${p.id}">
          <div class="flex flex-1 flex-col gap-1">
            <div class="font-serif text-body-md font-semibold">${esc(p.title)}</div>
            <div class="text-body-sm text-on-surface-variant">${esc(p.intro)}</div>
            <p class="text-body-sm leading-relaxed text-on-surface-variant">${esc(p.summary)}</p>
            <div class="${K.tiny}">카드뉴스 · ${p.date} · ${p.tag}</div>
          </div>
          <span class="flex shrink-0 items-center text-label-md font-medium text-primary">원문${ms('chevron_right', 'text-[18px]')}</span>
        </a>`).join('')}
    </section>`;

  const newsItem = (n) => `
    <article class="${K.card} space-y-2 p-4">
      <div class="${K.eyebrow}">${n.label} · ${esc(n.source)} · ${n.date}</div>
      <h4 class="font-serif text-body-md font-semibold leading-snug">${esc(n.title)}</h4>
      <ul class="list-disc space-y-1 pl-4 text-body-sm leading-relaxed text-on-surface-variant">${n.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="flex items-center justify-between gap-2">
        <span class="${K.tiny}">${n.act ? `관련 실천 · ${n.act}` : ''}</span>
        <a href="${n.url}" target="_blank" rel="noopener" class="flex min-h-[44px] shrink-0 items-center text-label-md font-medium text-primary">원문 보기${ms('chevron_right', 'text-[18px]')}</a>
      </div>
    </article>`;
  const news = `
    <section class="${K.card} space-y-1.5 p-5">
      <div class="flex items-center gap-2"><span class="${K.pill} bg-secondary-container text-primary">${NEWSLETTER.issue}</span><span class="${K.small}">${NEWSLETTER.published} 발행</span></div>
      <h2 class="font-serif text-headline-md font-semibold">이번 달 생태 동향</h2>
      <p class="${K.small}">${NEWSLETTER.intro}</p>
    </section>
    ${NEWSLETTER.sections.map((sec) => `
      <section class="space-y-2.5">
        <h3 class="px-1 text-label-md font-semibold">${sec.title}</h3>
        ${sec.items.map(newsItem).join('')}
      </section>`).join('')}
    <p class="px-1 ${K.small}">요약과 링크만 싣습니다. 원문 전문은 출처 누리집에서 읽어요.</p>`;

  return `
    <div class="${K.screen} gap-6">
      ${header(COPY.readMeta, COPY.readTitle, '', 'menu_book')}
      ${seg([['reflect', '생태 성찰'], ['news', '뉴스레터']], isReflect ? 'reflect' : 'news', 'read-tab')}
      ${isReflect ? reflect : news}
    </div>`;
}

// ───────── ⑥ 모임 찾기 (정적 예시) ─────────

function viewGroups() {
  const modes = [['all', '전체'], ['on', '온라인'], ['off', '오프라인']];
  const list = GROUPS.filter((g) => ui.groupMode === 'all' || g.kind === ui.groupMode);
  return `
    <div class="${K.screen} gap-5">
      ${header('', '모임 찾기', `<button type="button" class="${btn('soft')}" data-act="soon">${ms('add', 'text-[16px]')}모임 만들기</button>`, 'groups')}
      <div class="relative">
        <label for="q" class="sr">모임 검색</label>
        ${ms('search', 'pointer-events-none absolute left-4 top-3 text-[20px] text-outline')}
        <input id="q" type="search" placeholder="관심 주제나 모임 이름" class="h-12 w-full rounded-full border border-outline-variant/60 bg-surface-container-lowest pl-11 pr-4 text-[16px] focus:border-primary-container focus:outline-none">
      </div>
      <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-container p-1" role="group" aria-label="모임 방식">
        ${modes.map(([id, label]) => `<button type="button" class="tap h-10 rounded-full text-label-md ${ui.groupMode === id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant'}" data-act="group-mode" data-id="${id}" aria-pressed="${ui.groupMode === id}">${label}</button>`).join('')}
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="inline-flex min-h-[32px] items-center rounded-full border border-dashed border-outline px-3.5 text-label-md text-on-surface-variant">지역 선택 안 함</span>
        ${['제로웨이스트', '기후 공부', '플로깅'].map((t) => `<span class="inline-flex min-h-[32px] items-center rounded-full bg-secondary-container/60 px-3.5 text-label-md">${t}</span>`).join('')}
      </div>
      <p class="px-1 ${K.small}">관심 주제 기준 추천 · ${list.length}개 · 예시 데이터</p>
      ${list.map((g) => `
        <div class="${K.card} -mt-2 space-y-2 p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-serif text-headline-md font-semibold">${esc(g.name)}</h2>
            <span class="${K.pill} ${g.kind === 'on' ? 'bg-sky text-on-sky' : 'bg-oat text-amber'}">${g.kind === 'on' ? '온라인' : '오프라인'}</span>
          </div>
          <p class="flex flex-wrap items-center gap-x-2 ${K.meta}"><span>${esc(g.topic)}</span>·<span>${esc(g.place)}</span>·<span>멤버 ${g.members}명</span></p>
          <div class="flex items-center justify-between gap-2 pt-1">
            <span class="flex items-center gap-1 text-body-sm">${ms('schedule', 'text-[16px] text-secondary')}${esc(g.next)}</span>
            <a href="#/group" class="${btn('line')}">둘러보기</a>
          </div>
        </div>`).join('')}
    </div>`;
}

// ───────── ⑦ 모임 홈 · 운영자 (정적 예시) ─────────

function viewGroupHome() {
  const dots = [1, 1, 1, 1, 1, 1, 0, 0].map((on) => `<span class="h-4 w-4 rounded-full border-[1.5px] border-primary-container ${on ? 'bg-primary-container' : ''}"></span>`).join('');
  const body = ui.reviewEditing
    ? `<label for="draft" class="${K.small}">후기 고치기</label><textarea id="draft" rows="5" data-act="draft" class="w-full resize-none rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 text-[16px] leading-relaxed focus:border-primary-container focus:outline-none">${esc(ui.reviewText)}</textarea>`
    : `<p class="whitespace-pre-line font-serif text-body-sm leading-relaxed">${esc(ui.reviewText)}</p>`;
  const actions = ui.reviewShared
    ? `<div role="status" class="rounded-2xl bg-done px-4 py-3 text-body-sm font-medium text-primary">멤버 8명에게 공유했어요</div>`
    : `<div class="grid grid-cols-2 gap-2">
        <button type="button" class="${btn('line')}" data-act="review-edit">${ui.reviewEditing ? '고치기 완료' : '고치기'}</button>
        <button type="button" class="${btn('solid')}" data-act="review-share">멤버에게 공유</button>
      </div>`;
  return `
    <div class="${K.screen} gap-5 pt-3">
      <a href="#/groups" class="${K.back}">${ms('chevron_left', 'text-[20px]')}모임 찾기</a>
      <div class="-mt-3 flex items-start justify-between gap-2">
        <div class="space-y-0.5"><h1 class="${K.h1}">주말 플로깅 크루</h1><p class="${K.meta}">오프라인 · 서울 마포구 · 멤버 8명</p></div>
        <span class="${K.pill} bg-primary-container text-on-primary">운영자</span>
      </div>
      <section class="${K.card} space-y-3 p-5">
        <div class="flex items-baseline justify-between"><h2 class="${K.h2}">40일 공동 챌린지</h2><span class="${K.meta}">10일째</span></div>
        <div class="flex items-center gap-3"><div class="flex gap-1" aria-hidden="true">${dots}</div><span class="text-body-sm">이번 주 기록한 멤버 <b>6</b>/8명</span></div>
        <a href="#/feed" class="${btn('soft', 'w-full justify-between')}">멤버 실천 보기 · 응원 남기기${ms('chevron_right', 'text-[18px]')}</a>
      </section>
      <section class="space-y-3 rounded-2xl border-[1.5px] border-primary-container/60 bg-surface-container-lowest p-5">
        <div class="flex items-center gap-2"><span class="${K.pill} bg-secondary-container text-primary">${ms('auto_awesome', 'mr-0.5 text-[12px]')}AI 초안</span><span class="${K.small}">운영자가 확인해야 멤버에게 공유돼요</span></div>
        <h2 class="${K.h2}">지난 모임 후기</h2>
        ${body}
        <p class="${K.tiny}">멤버 기록 6건과 운영자 메모 1개로 만들었어요</p>
        ${actions}
      </section>
      <section class="space-y-2 rounded-2xl border border-amber/20 bg-oat/60 p-5">
        <div class="text-label-md font-medium text-tertiary">이번 모임 나눔 질문</div>
        <ol class="ml-5 list-decimal space-y-1.5 font-serif text-body-md leading-relaxed">
          <li>이번 주 줍다가 가장 놀랐던 쓰레기는 무엇이었나요?</li>
          <li>다음 달에 줄여 볼 일회용품 하나를 고른다면?</li>
        </ol>
      </section>
      <div class="flex items-center justify-between gap-2 px-1">
        <div><p class="${K.small}">다음 활동</p><p class="text-body-md font-medium">일요일 오전 10시 · 플로깅</p></div>
        <button type="button" class="${btn('soft')}" data-act="soon">플로깅 키트 열기</button>
      </div>
      <p class="px-1 ${K.tiny}">예시 데이터입니다. 모임 기능은 3단계에서 연결합니다.</p>
    </div>`;
}

// ───────── ⑧ 모임 피드 · 응원 (정적 예시) ─────────

function viewFeed() {
  const posts = FEED.map((p) => {
    const mine = ui.feedPicks[p.id];
    return `
      <article class="${K.card} space-y-3 p-4">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body-sm font-bold text-primary" aria-hidden="true" style="background:${p.bg}">${esc(p.name.charAt(0))}</div>
          <div class="flex-1"><div class="text-body-md font-semibold">${esc(p.name)}</div><div class="${K.tiny}">${p.when}</div></div>
          <span class="${K.pill} bg-secondary-container/70 text-primary">${esc(p.tag)}</span>
          <button type="button" class="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-outline hover:bg-surface-container" data-act="soon" aria-label="신고하거나 숨기기">${ms('more_horiz')}</button>
        </div>
        <p class="text-body-md leading-relaxed">${esc(p.memo)}</p>
        <div class="flex items-center gap-1.5">
          ${REACTIONS.map((label, i) => `<button type="button" class="tap h-10 flex-1 rounded-full border text-label-md ${mine === i ? 'border-primary-container bg-secondary-container font-semibold text-primary' : 'border-hairline bg-surface-container-low text-on-surface'}" data-act="react" data-id="${p.id}" data-i="${i}" aria-pressed="${mine === i}">${label} ${p.base[i] + (mine === i ? 1 : 0)}</button>`).join('')}
          <button type="button" class="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary" data-act="phrase" data-id="${p.id}" aria-label="${esc(p.name)}${COPY.nim}에게 한마디 보내기">${ms('send', 'text-[18px]')}</button>
        </div>
      </article>`;
  }).join('');
  return `
    <div class="${K.screen} gap-4 pt-3">
      <a href="#/group" class="${K.back}">${ms('chevron_left', 'text-[20px]')}주말 플로깅 크루</a>
      <div class="-mt-2 space-y-1"><h1 class="${K.h1}">이번 주 멤버 실천</h1><p class="${K.small}">8명 중 6명이 기록했어요 · 순위 없이 응원만 남겨요</p></div>
      ${ui.feedSent ? `<div role="status" class="rounded-2xl bg-done px-4 py-3 text-body-sm font-medium text-primary">${esc(ui.feedSent)}</div>` : ''}
      ${posts}
      <p class="px-1 ${K.tiny}">응원은 이 모임 멤버만 볼 수 있어요. 한 기록에 반응은 하나만 남길 수 있고, 한마디는 정해진 문구로 보내요.</p>
    </div>`;
}

function openPhrases(postId) {
  const p = FEED.find((x) => x.id === postId);
  sheet('한마디 보내기', `
    <h2 class="${K.h2}">${esc(p.name)}${COPY.nim}에게 한마디</h2>
    <p class="${K.small}">직접 쓰는 글 대신 따뜻한 문구를 골라 보내요</p>
    ${PHRASES.map((t) => sheetRow(`data-act="send-phrase" data-id="${p.id}"`, t)).join('')}
    <button type="button" class="${btn('ghost', 'mt-1')}" data-act="close">취소</button>`);
}

// ───────── 라우터 ─────────

const ROUTES = {
  earth: { view: viewEarth, tab: 'earth' },
  today: { view: viewToday, tab: 'today' },
  login: { view: viewLogin, tab: null },
  record: { view: viewRecord, tab: 'record' },
  forest: { view: viewForest, tab: 'today' },
  read: { view: viewRead, tab: 'read' },
  groups: { view: viewGroups, tab: 'groups' },
  group: { view: viewGroupHome, tab: 'groups' },
  feed: { view: viewFeed, tab: 'groups' }
};

// 예전 주소(#/start 대상 고르기, #/village 학생용 지구 마을)는 오늘 화면으로 보낸다
function currentRoute() {
  const name = location.hash.replace(/^#\/?/, '') || 'earth';
  return ROUTES[name] ? name : 'today';
}

// 하단 메뉴: 샘플처럼 지금 탭만 네온 초록 글자로. 맨 앞에 '지구' 탭을 더해 5칸
const NAV_ICON = { earth: 'public', today: 'eco', record: 'calendar_today', groups: 'groups', read: 'menu_book' };

function renderNav(tab) {
  $nav.classList.toggle('hidden', !tab);
  $nav.innerHTML = `
    <div class="flex h-16 items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
      ${['earth', 'today', 'record', 'read', 'groups'].map((t) => {
        const on = t === tab;
        return `<a href="#/${t}" class="tap flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 px-2 py-1 ${on ? 'font-semibold text-primary-container' : 'text-nav-inactive hover:text-on-surface'}" ${on ? 'aria-current="page"' : ''}>
          ${ms(NAV_ICON[t], 'text-[22px]', on)}<span class="text-label-sm tracking-tight">${t === 'earth' ? '지구' : COPY.nav[t]}</span>
        </a>`;
      }).join('')}
    </div>`;
}

const isDark = () => document.documentElement.classList.contains('dark');
window.addEventListener('themechange', () => render(true));

function render(keepScroll = false) {
  const route = ROUTES[currentRoute()];
  const y = window.scrollY;
  $app.innerHTML = route.view();
  mountClimateCharts($app);
  mountAchievements($app, isDark() ? 'dark' : 'light');
  mountSeries($app);
  mountPlant($app);
  const earth = $app.querySelector('[data-earth-now]');
  if (earth && window.EarthNow) window.EarthNow.mount(earth, { api: '/api/earth-now', assets: '../images/earth/', title: '지구 지금' });
  renderNav(route.tab);
  window.scrollTo(0, keepScroll ? y : 0);
}

window.addEventListener('hashchange', () => { closeSheet(); render(); });

// 화면 안의 모든 버튼은 data-act 하나로 처리한다
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  const today = store.dateKey();
  switch (act) {
    case 'toggle':
      store.toggleRecord(today, id);
      break;
    case 'today-area':
      ui.todayArea = id;
      break;
    case 'picker':
      openPicker();
      return;
    case 'picker-tab':
      selectPickerTab(id);
      return;
    case 'add-pick':
      // 시트는 '닫기'를 누를 때까지 열어 두고 그 줄만 바꾼다 (여러 장을 이어서 고를 수 있게)
      store.addPick(today, id);
      el.closest('[data-pick-row]').outerHTML = pickRow(cardById[id]);
      toast(`'${cardById[id].title}' ${COPY.added}`);
      break;
    case 'remove-pick':
      // 시트는 열어 둔 채 그 줄만 바꾸고, 뒤의 오늘 화면을 다시 그린다
      store.removePick(today, id);
      el.closest('[data-pick-row]').outerHTML = pickRow(cardById[id]);
      toast(`'${cardById[id].title}' 오늘 화면에서 뺐어요`);
      break;
    case 'close':
      closeSheet();
      return;
    case 'theme':
      try {
        localStorage.setItem('eco-climate-theme', isDark() ? 'light' : 'dark');
        window.__applyTheme?.();
      } catch {
        document.documentElement.classList.toggle('dark'); // 저장이 막혀도 이번만 바꾼다
      }
      break;
    case 'login':
      if (!auth.isConfigured()) {
        toast('로그인은 준비 중이에요. 지금은 이 기기에 저장돼요.');
        return;
      }
      if (!navigator.onLine) {
        toast('인터넷에 연결한 뒤 다시 시도해 주세요');
        return;
      }
      el.disabled = true;
      auth.signIn(id, '#/today').catch(() => {
        el.disabled = false;
        toast(`${PROVIDER_LABEL[id]} 로그인을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.`);
      });
      // 앱(WebView)에서는 시스템 브라우저가 열리므로, 돌아올 때를 대비해 버튼을 다시 살려 둔다
      setTimeout(() => { el.disabled = false; }, 4000);
      return;
    case 'logout':
      el.disabled = true;
      sync.flush()
        .catch(() => {})
        .then(() => auth.signOut())
        .then(() => toast('로그아웃했어요. 기록은 이 기기에 남아 있어요.'))
        .catch(() => toast('로그아웃하지 못했어요. 다시 시도해 주세요.'))
        .finally(() => render(true));
      return;
    case 'soon':
      toast('3단계에서 연결되는 기능이에요');
      return;
    case 'cal-prev':
    case 'cal-next': {
      const now = new Date();
      const m = ui.calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
      ui.calMonth = new Date(m.getFullYear(), m.getMonth() + (act === 'cal-prev' ? -1 : 1), 1);
      break;
    }
    case 'demo':
      store.addDemoRecord(id);
      break;
    case 'demo-bee':
      store.markRead(BEE_POST_ID);
      break;
    case 'read-tab':
      ui.readTab = id;
      break;
    case 'topic':
      ui.readTopic = id;
      break;
    case 'read-post':
      store.markRead(Number(id)); // 링크는 그대로 새 창으로 열린다
      return;
    case 'group-mode':
      ui.groupMode = id;
      break;
    case 'review-edit':
      ui.reviewEditing = !ui.reviewEditing;
      break;
    case 'review-share':
      ui.reviewShared = true;
      ui.reviewEditing = false;
      break;
    case 'react': {
      const i = Number(el.dataset.i);
      if (ui.feedPicks[id] === i) delete ui.feedPicks[id];
      else ui.feedPicks[id] = i;
      break;
    }
    case 'phrase':
      openPhrases(id);
      return;
    case 'send-phrase':
      ui.feedSent = `${FEED.find((p) => p.id === id).name}${COPY.nim}에게 응원을 보냈어요`;
      closeSheet();
      break;
    default:
      return;
  }
  render(true);
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.act === 'draft') ui.reviewText = e.target.value;
});

document.addEventListener('submit', (e) => {
  if (e.target.dataset.act !== 'reflect') return;
  e.preventDefault();
  const text = e.target.elements.text.value.trim();
  if (!text) return;
  store.addReflection(text);
  toast('나만 보기로 남겼어요');
  render(true);
});

render();

// ───────── 로그인·동기화 ─────────

let syncedUser = null;
auth.onAuth((user) => {
  const id = user?.id ?? null;
  if (id === syncedUser) {
    if (currentRoute() === 'login' || currentRoute() === 'today') render(true);
    return; // 토큰 갱신 등은 다시 맞출 필요 없음
  }
  syncedUser = id;
  if (id) sync.start(auth.getClient(), id, () => render(true));
  else sync.stop();
  render(true);
});

// 저장 상태 문구는 계정 화면에서만 보인다
sync.onStatus(() => { if (currentRoute() === 'login') render(true); });

// Expo 앱이 시스템 브라우저 로그인을 마치고 결과를 넘겨 줄 때
window.addEventListener('eco-auth-result', (e) => {
  toast(e.detail.message);
  if (e.detail.ok && currentRoute() === 'login') location.hash = '#/today';
});

auth.init().then((res) => {
  if (!res) return;
  render(); // init()이 주소를 #/today 등으로 바꿔 두었다
  toast(res.message);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {});
}
