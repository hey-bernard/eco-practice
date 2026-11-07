// Stitch 샘플 '지구 기후 모니터 · Climate Home'을 입힌 네 번째 디자인. 첫 탭 '지구'에서 기후 지표를 보고 오늘 실천으로 이어진다.
// 지구 화면과 5칸 메뉴로 이루어진 하나뿐인 버전이다. 데이터·저장은 공용 모듈(../js)을 쓴다.
import { CARDS, LEVEL_LABEL, STAGES, POSTS, NEWSLETTER, PLEDGE, BEE_POST_ID, BEE_SERIES_ID, BEE_SERIES_TITLE, GROUPS, FEED, REACTIONS, PHRASES, REVIEW_DRAFT, COPY } from '../js/data.js';
import * as store from '../js/store.js';
import * as auth from '../js/auth.js';
import * as sync from '../js/sync.js';
import * as groups from '../js/groups.js';
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
  groupMode: 'all',
  reviewEditing: false,
  reviewShared: false,
  reviewText: REVIEW_DRAFT,
  feedPicks: {},
  feedSent: '',
  keep: {},          // 입력 중인 값 (data-keep): 화면을 다시 그려도 남게
  loginReturn: '',   // 로그인 뒤 돌아갈 화면
  confirmFn: null    // 확인 시트에서 '예'를 누르면 할 일
};
const keep = (k, d = '') => (ui.keep[k] ?? d);

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
// 머리(지구 기후 모니터) 아래는 '기후변화' 위젯(제목만 바꾼 지구 지금 위젯)(js/earth-now-widget.js): 위성 지구 + 기온·CO₂·해수면·수온·산성화 실시간 자료.
// 자료는 서버 함수 api/earth-now.js가 Copernicus·NOAA·하와이대 공개 자료를 모아 준다.


function viewEarth() {
  const today = store.dateKey();
  const picks = store.getPicks(today);
  const doneCount = picks.filter((id) => store.isDone(today, id)).length;
  const prefix = monthPrefix();
  const monthTotal = Object.entries(store.getState().records).filter(([k]) => k.startsWith(prefix)).reduce((n, [, list]) => n + list.length, 0);
  const f = forestInfo(store.totalPoints());
  const label ='font-mono text-label-sm text-on-surface-variant';

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

// 오늘 기록한 카드의 '공유' 버튼: 로그인했고 모임이 있을 때만. 모든 모임에 공유했으면 '공유함'
function shareBtn(cardId) {
  const mine = auth.getUser() ? groups.cache.mine : null;
  if (!mine?.length) return '';
  const all = mine.every((g) => groups.cache.sharedToday.has(`${g.id}|${cardId}`));
  if (all) return `<span class="font-mono text-[12px] text-primary">${ms('groups', 'mr-0.5 align-[-3px] text-[14px]')}공유함</span>`;
  return `<button type="button" class="${btn('soft', 'min-h-[36px] px-3')}" data-act="share-open" data-id="${cardId}" aria-label="${esc(cardById[cardId].title)} 모임에 공유">${ms('ios_share', 'text-[16px]')}공유</button>`;
}

function viewToday() {
  if (auth.getUser()) groups.loadMine();
  const today = store.dateKey();
  const now = new Date();
  const picks = store.getPicks(today);
  const points = store.totalPoints();
  const f = forestInfo(points);
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
          ${done ? `<div class="flex shrink-0 items-center gap-1.5">${shareBtn(id)}` : ''}
          ${done
            ? `<button type="button" class="${btn('line', 'min-h-[36px] px-3')}" data-act="toggle" data-id="${id}" aria-pressed="true" aria-label="${esc(c.title)} 기록 취소">${ms('check', 'text-[16px] text-primary-container')}했어요</button></div>`
            : `<button type="button" class="${btn('solid', 'min-h-[36px] px-3')}" data-act="toggle" data-id="${id}" aria-pressed="false">${ms('add', 'text-[16px]')}기록하기</button>`}
        </div>
      </article>`;
  }).join('');

  const e = COPY.effect;
  // 샘플의 '오늘의 커뮤니티 미션' 배너 자리: 내 모임 소식. 로그인 전에는 예시, 로그인 뒤에는 첫 번째 내 모임
  const mine = auth.getUser() ? groups.cache.mine : null;
  let mission = { tag: '내 모임 소식', meta: '예시', title: '주말 플로깅 크루 · 일요일 오전 10시', body: '멤버 8명 중 6명이 이번 주 실천을 기록했어요. 30분 걸으며 쓰레기를 주워요.', pct: 75, count: '6/8', href: '#/group', btn: '모임 보러 가기', icon: 'directions_run' };
  if (mine?.length) {
    const g = mine[0];
    mission = {
      tag: '내 모임 소식', meta: g.role === 'owner' ? '운영자' : '멤버', title: `${g.name}${g.schedule ? ` · ${g.schedule}` : ''}`,
      body: `멤버 ${g.member_count}명 중 ${g.active_week}명이 최근 7일 실천을 공유했어요.`,
      pct: Math.round((g.active_week / Math.max(1, g.member_count)) * 100), count: `${g.active_week}/${g.member_count}`, href: `#/group/${g.id}`, btn: '모임 보러 가기', icon: 'groups'
    };
  } else if (mine) {
    mission = { tag: '모임', meta: '', title: '함께 실천할 모임을 찾아보세요', body: '공개 모임을 검색하거나, 받은 초대 코드로 들어갈 수 있어요.', pct: 0, count: '', href: '#/groups', btn: '모임 찾기', icon: 'search' };
  }

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
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">${esc(mission.body)}</p>
        ${mission.count ? `<div class="mt-3 flex items-center gap-2">${bar(mission.pct)}<span class="num shrink-0 text-[12px] text-on-surface">${mission.count}</span></div>` : ''}
        <a href="${mission.href}" class="tap glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3.5 font-serif text-[15px] font-bold text-on-primary">${ms(mission.icon, 'text-[20px]', true)}${mission.btn}</a>
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
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">필수: 닉네임 · 선택: 프로필 사진, 이메일<br>모임에서는 내가 정한 모임 닉네임만 보여요. 비밀번호는 저장하지 않아요. 탈퇴를 요청하면 기록과 연결 정보를 함께 지워요.</p>
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
    // 벌: 읽기 '기초부터 읽기'의 생태계 변화 글. 예전 카드뉴스('벌이 사라지면')를 읽은 기록도 그대로 인정한다
    { name: '벌', icon: 'emoji_nature', cond: `꽃 단계에서 읽기 '${BEE_SERIES_TITLE}' 편 읽기`, now: (reads[`s:${BEE_SERIES_ID}`] || 0) + (reads[BEE_POST_ID] || 0), need: 1, gate: f.si >= 3 },
    { name: '새', icon: 'raven', cond: `'${cardById.nature.title}' 기록 3회`, now: store.countCard('nature'), need: 3, gate: true },
    { name: '다람쥐', icon: 'pets', cond: "'쓰레기 3개 줍기' 기록 5회", now: store.countCard('pickup'), need: 5, gate: true }
  ].map((a) => ({ ...a, ok: a.gate && a.now >= a.need }));
  const [bee, bird, squirrel] = animals;

  const demo = DEMO ? `
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="${btn('line')}" data-act="demo" data-id="${COPY.effect.card}">실천 기록 +1점</button>
      <button type="button" class="${btn('line')}" data-act="demo" data-id="nature">자연 관찰 +1회</button>
      <button type="button" class="${btn('line')}" data-act="demo" data-id="pickup">쓰레기 줍기 +1회</button>
      <button type="button" class="${btn('line')}" data-act="demo-bee">벌 읽기 편 읽기</button>
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

    <form class="space-y-3 rounded-2xl border border-amber/20 bg-oat/60 p-5" data-act="reflect">
      <label for="reflect" class="block text-label-md font-medium text-tertiary">${COPY.question}</label>
      <p class="font-serif text-quote leading-relaxed">“${esc(post.question)}”</p>
      <div class="flex gap-2">
        <input id="reflect" name="text" type="text" maxlength="200" placeholder="한 줄로 남겨 보세요" autocomplete="off" class="h-11 min-w-0 flex-1 rounded-full border border-amber/25 bg-surface-container-lowest px-4 text-[16px] focus:border-amber focus:outline-none">
        <button type="submit" class="${btn('solid')}">남기기</button>
      </div>
      <p class="flex items-center gap-1 text-label-sm text-tertiary/80">${ms('lock', 'text-[14px]')}${COPY.reflectNote}</p>
      ${mine.map((r) => `<div class="border-t border-amber/15 pt-2 font-serif text-body-sm"><span class="mr-1 font-sans text-label-sm text-tertiary/70">${r.date.slice(5).replace('-', '.')}</span>${esc(r.text)}</div>`).join('')}
    </form>`;

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

// ───────── ⑥ 모임 찾기 (로그인 전: 예시) ─────────

function viewGroupsDemo() {
  const modes = [['all', '전체'], ['on', '온라인'], ['off', '오프라인']];
  const list = GROUPS.filter((g) => ui.groupMode === 'all' || g.kind === ui.groupMode);
  return `
    <div class="${K.screen} gap-5">
      ${header('', '모임 찾기', `<button type="button" class="${btn('soft')}" data-act="login-from">${ms('add', 'text-[16px]')}모임 만들기</button>`, 'groups')}
      <section class="${K.card} flex items-center gap-3 p-4">
        ${ms('group_add', 'text-[24px] text-primary-container')}
        <p class="min-w-0 flex-1 text-body-sm text-on-surface-variant">로그인하면 실제 모임을 만들고, 찾고, 초대 코드로 들어갈 수 있어요. 아래는 예시예요.</p>
        <button type="button" class="${btn('solid')}" data-act="login-from">로그인</button>
      </section>
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

function viewGroupHomeDemo() {
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
      <p class="px-1 ${K.tiny}">예시 데이터입니다. 로그인하면 실제 모임을 만들거나 들어갈 수 있어요.</p>
    </div>`;
}

// ───────── ⑧ 모임 피드 · 응원 (정적 예시) ─────────

function viewFeedDemo() {
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

// ───────── ⑨ 실제 모임 (Supabase · js/groups.js) ─────────
// 로그인 전에는 위의 예시 화면을 보여 주고, 로그인 뒤에는 아래 화면을 쓴다.

const INPUT = 'w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 text-[16px] text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none';
const KIND_LABEL = { on: '온라인', off: '오프라인' };
const kindPill = (kind) => `<span class="${K.pill} ${kind === 'on' ? 'bg-sky text-on-sky' : 'bg-oat text-amber'}">${KIND_LABEL[kind] || ''}</span>`;
const NICK_BG = ['#E3EEE6', '#F3E6D2', '#DCE8EE', '#EBE3F1', '#F1E1E1', '#E6EBD5'];
const colorOf = (id) => NICK_BG[[...String(id)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % NICK_BG.length];
const nickAvatar = (name, id, size = 36) => `<div class="flex shrink-0 items-center justify-center rounded-full font-bold text-[#0F281E]" style="width:${size}px;height:${size}px;background:${colorOf(id)};font-size:${Math.round(size * 0.4)}px" aria-hidden="true">${esc([...String(name)][0] || '?')}</div>`;
const defaultNick = () => [...(auth.profile()?.name || '')].slice(0, 12).join('');
const backLink = (href, label) => `<a href="${href}" class="${K.back}">${ms('chevron_left', 'text-[20px]')}${esc(label)}</a>`;
const note = (text, icon = 'info') => `<p class="flex items-start gap-1.5 px-1 ${K.tiny}">${ms(icon, 'mt-px text-[14px]')}<span>${text}</span></p>`;
const loadingLine = (text = '불러오는 중이에요') => `<p class="flex items-center gap-2 px-1 ${K.small}" role="status">${ms('progress_activity', 'animate-spin text-[18px]')}${text}</p>`;
const segBtns = (items, cur, attrs, label) => `
  <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-container p-1" role="group" aria-label="${label}">
    ${items.map(([id, text]) => `<button type="button" class="tap h-10 rounded-full text-label-md ${cur === id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant'}" ${attrs(id)} aria-pressed="${cur === id}">${text}</button>`).join('')}
  </div>`;

function dayLabel(day) {
  const n = Math.round((new Date(`${store.dateKey()}T00:00:00`) - new Date(`${day}T00:00:00`)) / 864e5);
  return n <= 0 ? '오늘' : n === 1 ? '어제' : `${n}일 전`;
}

function loginPrompt(title, text, back = '#/groups') {
  return `
    <div class="${K.screen} gap-5 pt-3">
      ${backLink(back, '모임')}
      <section class="${K.card} flex flex-col gap-3 p-5">
        ${ms('group_add', 'text-[28px] text-primary-container')}
        <h1 class="${K.h2}">${title}</h1>
        <p class="${K.small}">${text}</p>
        <button type="button" class="${btn('solid', 'h-12 w-full rounded-full')}" data-act="login-from">로그인하고 계속하기</button>
      </section>
    </div>`;
}

function stateView(back, backLabel, body) {
  return `<div class="${K.screen} gap-5 pt-3">${backLink(back, backLabel)}${body}</div>`;
}

// 로그인한 사람의 모임 탭: 내 모임 · 초대 코드 · 공개 모임 검색
function viewGroups() {
  if (!auth.getUser()) return viewGroupsDemo();
  groups.loadMine();
  const s = groups.cache.search;
  if (s.list === null) groups.search(keep('gq'), ui.groupMode);
  const mine = groups.cache.mine;

  const myCard = (g) => {
    const pct = Math.round((g.active_week / Math.max(1, g.member_count)) * 100);
    return `
      <a href="#/group/${g.id}" class="tap ${K.card} flex flex-col gap-2 p-4">
        <div class="flex items-start justify-between gap-2">
          <h3 class="min-w-0 font-serif text-[17px] font-semibold leading-snug">${esc(g.name)}</h3>
          <div class="flex shrink-0 gap-1">
            ${g.pending ? `<span class="${K.pill} bg-tertiary/15 text-tertiary">신청 ${g.pending}</span>` : ''}
            ${g.role === 'owner' ? `<span class="${K.pill} bg-primary-container text-on-primary">운영자</span>` : ''}
          </div>
        </div>
        <p class="${K.small}">${KIND_LABEL[g.kind]} · 멤버 ${g.member_count}명${g.schedule ? ` · ${esc(g.schedule)}` : ''}</p>
        <div class="flex items-center gap-2">${bar(pct)}<span class="num shrink-0 text-[12px]">${g.active_week}/${g.member_count}</span></div>
        <p class="${K.tiny}">최근 7일 실천을 공유한 멤버</p>
      </a>`;
  };
  const resultCard = (g) => {
    const full = g.member_count >= g.max_members;
    const action = g.is_member
      ? `<a href="#/group/${g.id}" class="${btn('solid')}">들어가기</a>`
      : g.requested
        ? `<a href="#/group/${g.id}" class="${btn('line')}">신청함</a>`
        : `<a href="#/group/${g.id}" class="${btn('line')}">둘러보기</a>`;
    return `
      <article class="${K.card} flex flex-col gap-2 p-5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="min-w-0 font-serif text-headline-md font-semibold leading-snug">${esc(g.name)}</h3>
          ${kindPill(g.kind)}
        </div>
        <p class="flex flex-wrap items-center gap-x-2 ${K.small}"><span>${esc(g.topic)}</span>${g.place ? `·<span>${esc(g.place)}</span>` : ''}·<span>멤버 ${g.member_count}/${g.max_members}명</span>${g.join_mode === 'approve' ? '·<span>승인 후 참여</span>' : ''}${full ? '·<span class="text-tertiary">정원 마감</span>' : ''}</p>
        ${g.intro ? `<p class="text-body-sm leading-relaxed">${esc(g.intro)}</p>` : ''}
        <div class="flex items-center justify-between gap-2 pt-1">
          <span class="flex min-w-0 items-center gap-1 text-body-sm">${g.schedule ? `${ms('schedule', 'text-[16px] text-secondary')}<span class="truncate">${esc(g.schedule)}</span>` : ''}</span>
          ${action}
        </div>
      </article>`;
  };

  const mineHtml = mine === null
    ? loadingLine()
    : mine.length
      ? mine.map(myCard).join('')
      : `<p class="px-1 ${K.small}">아직 참여한 모임이 없어요. 아래에서 공개 모임을 찾거나, 받은 초대 코드로 들어가요.</p>`;
  const results = s.list === null
    ? loadingLine('모임을 찾는 중이에요')
    : s.err && !s.list.length
      ? `<p class="px-1 ${K.small}">모임을 불러오지 못했어요. <button type="button" class="font-medium text-primary underline" data-act="g-search-retry">다시 시도</button></p>`
      : s.list.length
        ? s.list.map(resultCard).join('')
        : `<p class="px-1 ${K.small}">찾는 모임이 없어요. 다른 말로 찾아보거나 직접 만들어 보세요.</p>`;
  const q = keep('gq');

  return `
    <div class="${K.screen} gap-5">
      ${header('', '모임', `<a href="#/group-new" class="${btn('soft')}">${ms('add', 'text-[16px]')}만들기</a>`, 'groups')}
      <section class="flex flex-col gap-3">
        <h2 class="${K.h2} px-1">내 모임</h2>
        ${mineHtml}
        ${groups.cache.mineErr ? `<p class="px-1 ${K.small}">내 모임을 불러오지 못했어요. <button type="button" class="font-medium text-primary underline" data-act="g-mine-retry">다시 시도</button></p>` : ''}
      </section>
      <form class="flex gap-2" data-act="code-form">
        <label for="g-code" class="sr">초대 코드</label>
        <input id="g-code" name="code" data-keep="code" value="${esc(keep('code'))}" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="초대 코드 6자리" class="${INPUT} h-11 min-w-0 flex-1 rounded-full font-mono uppercase tracking-widest">
        <button type="submit" class="${btn('line', 'h-11 rounded-full')}">코드로 참여</button>
      </form>
      <section class="flex flex-col gap-3">
        <h2 class="${K.h2} px-1">모임 찾기</h2>
        <form class="relative" data-act="search-form" role="search">
          <label for="gq" class="sr">모임 검색</label>
          ${ms('search', 'pointer-events-none absolute left-4 top-3 text-[20px] text-outline')}
          <input id="gq" name="q" type="search" data-keep="gq" value="${esc(q)}" maxlength="30" placeholder="모임 이름, 주제, 지역" autocomplete="off" class="${INPUT} h-12 rounded-full pl-11">
        </form>
        ${segBtns([['all', '전체'], ['on', '온라인'], ['off', '오프라인']], ui.groupMode, (id) => `data-act="group-mode" data-id="${id}"`, '모임 방식')}
        <div class="flex flex-wrap gap-2">
          ${groups.TOPICS.filter((t) => t !== '기타').map((t) => `<button type="button" class="tap inline-flex min-h-[36px] items-center rounded-full px-3.5 text-label-md ${q === t ? 'bg-primary-container font-semibold text-on-primary' : 'bg-secondary-container/60'}" data-act="topic-chip" data-id="${esc(t)}" aria-pressed="${q === t}">${esc(t)}</button>`).join('')}
        </div>
        <p class="px-1 ${K.small}">공개 모임 ${s.list ? s.list.length : '…'}개${s.q.trim() ? ` · '${esc(s.q.trim())}' 검색` : ' · 최근 만든 순'}</p>
        ${results}
      </section>
    </div>`;
}

// 모임 소개 + 참여 (공개 모임 둘러보기, 초대 링크)
function viewPreview({ id = null, code = null }) {
  const back = ['#/groups', '모임'];
  groups.loadPreview({ id, code });
  const p = groups.previewOf({ id, code });
  if (!p) return stateView(...back, loadingLine());
  if (p.err) return stateView(...back, `<p class="${K.small}">모임을 불러오지 못했어요. <button type="button" class="font-medium text-primary underline" data-act="g-preview-retry" data-id="${esc(id || '')}" data-code="${esc(code || '')}">다시 시도</button></p>`);
  if (!p.data) {
    return stateView(...back, `
      <section class="${K.card} flex flex-col gap-2 p-5">
        <h1 class="${K.h2}">${code ? '초대 코드가 맞지 않아요' : '모임을 찾지 못했어요'}</h1>
        <p class="${K.small}">${code ? '운영자가 코드를 바꿨을 수 있어요. 새 초대 링크를 받아 주세요.' : '비공개로 바뀌었거나 없어진 모임일 수 있어요.'}</p>
      </section>`);
  }
  const g = p.data;
  const full = g.member_count >= g.max_members;
  const approve = g.join_mode === 'approve' && !g.by_code;
  let action;
  if (g.is_member) {
    action = `<a href="#/group/${g.id}" class="${btn('solid', 'h-12 w-full rounded-full')}">모임으로 들어가기</a>`;
  } else if (g.requested && !g.by_code) {
    action = `
      <div role="status" class="rounded-2xl bg-done px-4 py-3 text-body-sm font-medium text-primary">참여 신청을 보냈어요. 운영자가 수락하면 '내 모임'에 나타나요.</div>
      <button type="button" class="${btn('line', 'h-11 w-full rounded-full')}" data-act="g-cancel-req" data-id="${g.id}">신청 취소</button>`;
  } else if (full) {
    action = `<p class="rounded-2xl bg-surface-container px-4 py-3 text-body-sm">정원(${g.max_members}명)이 다 찼어요.</p>`;
  } else {
    action = `
      <form class="flex flex-col gap-3" data-act="join-form" data-id="${g.id}" data-code="${esc(g.by_code ? code : '')}">
        <div class="flex flex-col gap-1.5">
          <label for="j-nick" class="text-label-md font-medium">모임에서 쓸 닉네임</label>
          <input id="j-nick" name="nick" data-keep="j_nick" value="${esc(keep('j_nick', defaultNick()))}" required maxlength="12" autocomplete="off" class="${INPUT} h-12">
          <p class="${K.tiny}">멤버에게는 이 닉네임만 보여요. 카카오·구글 이름이나 사진은 보이지 않아요.</p>
        </div>
        ${approve ? `
        <div class="flex flex-col gap-1.5">
          <label for="j-msg" class="text-label-md font-medium">운영자에게 한마디 <span class="${K.tiny}">(선택)</span></label>
          <input id="j-msg" name="msg" data-keep="j_msg" value="${esc(keep('j_msg'))}" maxlength="80" autocomplete="off" placeholder="예: 마포에 살고 주말에 함께하고 싶어요" class="${INPUT} h-12">
        </div>` : ''}
        <button type="submit" class="${btn('solid', 'h-12 w-full rounded-full')}">${approve ? '참여 신청 보내기' : '참여하기'}</button>
      </form>`;
  }
  return stateView(...back, `
    <section class="${K.card} flex flex-col gap-3 p-5">
      <div class="flex items-start justify-between gap-2">
        <h1 class="min-w-0 ${K.h1}">${esc(g.name)}</h1>
        ${kindPill(g.kind)}
      </div>
      <p class="flex flex-wrap items-center gap-x-2 ${K.small}"><span>${esc(g.topic)}</span>${g.place ? `·<span>${esc(g.place)}</span>` : ''}·<span>멤버 ${g.member_count}/${g.max_members}명</span></p>
      ${g.schedule ? `<p class="flex items-center gap-1 text-body-sm">${ms('schedule', 'text-[16px] text-secondary')}${esc(g.schedule)}</p>` : ''}
      ${g.intro ? `<p class="text-body-md leading-relaxed">${esc(g.intro)}</p>` : ''}
      <p class="${K.tiny}">${g.by_code ? '초대 코드로 들어가요 · 바로 참여' : g.join_mode === 'approve' ? '운영자가 수락하면 참여돼요' : '누르면 바로 참여돼요'}</p>
    </section>
    <section class="flex flex-col gap-3">${action}</section>
    ${note('참여하면 멤버에게 모임 닉네임과 내가 직접 공유한 실천만 보여요. 나의 기록·숲·성찰은 보이지 않아요.', 'lock')}`);
}

function viewJoin() {
  const code = routeParam();
  if (!auth.getUser()) return loginPrompt('초대받은 모임이 있어요', '로그인하면 모임 소개를 보고 바로 참여할 수 있어요.');
  return viewPreview({ code });
}

function groupEntry() {
  const id = routeParam();
  groups.loadGroup(id);
  return { id, e: groups.cache.group[id] };
}

function viewGroupRoute() {
  if (!routeParam()) return viewGroupHomeDemo();
  if (!auth.getUser()) return loginPrompt('모임 소개는 로그인한 뒤 볼 수 있어요', '카카오나 구글로 로그인하면 모임을 둘러보고 참여할 수 있어요.');
  const { id, e } = groupEntry();
  if (!e) return stateView('#/groups', '모임', loadingLine());
  if (!e.data) {
    if (e.err) return stateView('#/groups', '모임', `<p class="${K.small}">모임을 불러오지 못했어요. <button type="button" class="font-medium text-primary underline" data-act="g-refresh" data-g="${esc(id)}">다시 시도</button></p>`);
    return viewPreview({ id }); // 아직 멤버가 아니면 소개 화면
  }
  return viewGroupHome(id, e.data);
}

function viewGroupHome(id, d) {
  const { info, members, shares, requests, reports, me } = d;
  const owner = me.role === 'owner';
  const week = groups.todayKey(-6);
  const active = new Set(shares.filter((s) => s.day >= week).map((s) => s.user_id));
  const dots = members.slice(0, 16).map((m) => `<span class="h-4 w-4 rounded-full border-[1.5px] border-primary-container ${active.has(m.user_id) ? 'bg-primary-container' : ''}" title="${esc(m.nickname)}"></span>`).join('');
  const nick = Object.fromEntries(members.map((m) => [m.user_id, m.nickname]));
  const row = 'flex min-h-[52px] items-center justify-between gap-2 border-t border-hairline py-2 first:border-t-0';

  const manage = owner ? `
    <section class="${K.card} flex flex-col gap-1 p-5">
      <h2 class="${K.h2} mb-1">참여 신청 <span class="${K.small}">${requests.length}</span></h2>
      ${requests.length ? requests.map((r) => `
        <div class="${row}">
          <div class="flex min-w-0 items-center gap-2.5">${nickAvatar(r.nickname, r.user_id, 32)}<div class="min-w-0"><div class="text-body-md font-medium">${esc(r.nickname)}</div>${r.message ? `<div class="${K.small} [word-break:keep-all]">${esc(r.message)}</div>` : ''}</div></div>
          <div class="flex shrink-0 gap-1.5">
            <button type="button" class="${btn('line', 'min-h-[36px] px-3')}" data-act="g-reject" data-g="${id}" data-u="${r.user_id}">거절</button>
            <button type="button" class="${btn('solid', 'min-h-[36px] px-3')}" data-act="g-accept" data-g="${id}" data-u="${r.user_id}">수락</button>
          </div>
        </div>`).join('') : `<p class="${K.small}">${info.join_mode === 'approve' ? '기다리는 신청이 없어요.' : '지금은 바로 참여 모임이라 신청 없이 들어와요.'}</p>`}
    </section>
    ${reports.length ? `
    <section class="${K.card} flex flex-col gap-1 border border-tertiary/30 p-5">
      <h2 class="${K.h2} mb-1">신고된 공유 <span class="${K.small}">${new Set(reports.map((r) => r.share_id)).size}</span></h2>
      ${[...new Set(reports.map((r) => r.share_id))].map((sid) => {
        const s = shares.find((x) => x.id === sid);
        const why = reports.filter((r) => r.share_id === sid).map((r) => r.reason).filter(Boolean);
        return `
          <div class="flex flex-col gap-2 border-t border-hairline py-3 first:border-t-0">
            <p class="text-body-sm"><b>${esc(nick[s?.user_id] || '멤버')}</b> · ${esc(cardById[s?.action_id]?.title || '실천')}${s?.memo ? ` · “${esc(s.memo)}”` : ''}</p>
            <p class="${K.tiny}">신고 ${reports.filter((r) => r.share_id === sid).length}건${why.length ? ` · ${esc([...new Set(why)].join(', '))}` : ''}${s?.hidden ? ' · 숨김' : ''}</p>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="${btn('line')}" data-act="g-dismiss" data-g="${id}" data-id="${sid}">그대로 두기</button>
              <button type="button" class="${btn('solid')}" data-act="g-hide" data-g="${id}" data-id="${sid}" data-v="1">숨기기</button>
            </div>
          </div>`;
      }).join('')}
    </section>` : ''}
    <section class="${K.card} flex flex-col gap-3 p-5">
      <h2 class="${K.h2}">모임 설정</h2>
      <div class="flex items-center justify-between gap-3">
        <div><div class="text-body-md font-medium">모임 찾기에 공개</div><div class="${K.small}">${info.is_public ? '검색 결과에 소개 정보가 보여요' : '초대 코드로만 들어올 수 있어요'}</div></div>
        <button type="button" role="switch" aria-checked="${info.is_public}" aria-label="모임 찾기에 공개" class="tap relative h-8 w-14 shrink-0 rounded-full ${info.is_public ? 'bg-primary-container' : 'bg-surface-container-highest'}" data-act="g-set" data-g="${id}" data-k="is_public" data-v="${info.is_public ? '0' : '1'}"><span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${info.is_public ? 'left-7' : 'left-1'}"></span></button>
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="text-body-md font-medium">검색으로 찾아온 사람</div>
        ${segBtns([['open', '바로 참여'], ['approve', '승인 후 참여']], info.join_mode, (v) => `data-act="g-set" data-g="${id}" data-k="join_mode" data-v="${v}"`, '참여 방식')}
        <p class="${K.tiny}">초대 코드로 들어오는 사람은 언제나 바로 참여해요.</p>
      </div>
    </section>` : '';

  const memberList = `
    <section class="${K.card} flex flex-col gap-1 p-5">
      <h2 class="${K.h2} mb-1">멤버 <span class="${K.small}">${members.length}/${info.max_members}</span></h2>
      ${members.map((m) => `
        <div class="${row}">
          <div class="flex min-w-0 items-center gap-2.5">${nickAvatar(m.nickname, m.user_id, 32)}<span class="truncate text-body-md">${esc(m.nickname)}${m.user_id === me.user_id ? ' <span class="text-label-sm text-outline">(나)</span>' : ''}</span>${m.role === 'owner' ? `<span class="${K.pill} bg-primary-container text-on-primary">운영자</span>` : ''}</div>
          ${m.user_id === me.user_id
            ? `<button type="button" class="${btn('ghost', 'min-h-[36px] px-2')}" data-act="g-nick-open" data-g="${id}">닉네임 바꾸기</button>`
            : owner ? `<button type="button" class="${btn('ghost', 'min-h-[36px] px-2 text-outline')}" data-act="g-kick" data-g="${id}" data-u="${m.user_id}" aria-label="${esc(m.nickname)} 내보내기">내보내기</button>` : ''}
        </div>`).join('')}
    </section>`;

  return `
    <div class="${K.screen} gap-5 pt-3">
      ${backLink('#/groups', '모임')}
      <div class="-mt-3 flex items-start justify-between gap-2">
        <div class="min-w-0 space-y-0.5"><h1 class="${K.h1}">${esc(info.name)}</h1><p class="${K.small}">${KIND_LABEL[info.kind]}${info.place ? ` · ${esc(info.place)}` : ''} · ${esc(info.topic)} · 멤버 ${members.length}명</p></div>
        ${owner ? `<span class="${K.pill} bg-primary-container text-on-primary">운영자</span>` : ''}
      </div>
      ${info.intro ? `<p class="-mt-2 px-1 text-body-sm leading-relaxed text-on-surface-variant">${esc(info.intro)}</p>` : ''}
      <section class="${K.card} flex flex-col gap-3 p-5">
        <div class="flex items-baseline justify-between"><h2 class="${K.h2}">최근 7일</h2><span class="${K.meta}">공유 ${shares.filter((s) => s.day >= week).length}건</span></div>
        <div class="flex flex-wrap items-center gap-3"><div class="flex flex-wrap gap-1" aria-hidden="true">${dots}</div><span class="text-body-sm">실천을 공유한 멤버 <b>${active.size}</b>/${members.length}명</span></div>
        <button type="button" class="${btn('solid', 'w-full')}" data-act="share-open-g" data-g="${id}">${ms('ios_share', 'text-[18px]')}오늘 실천 공유하기</button>
        <a href="#/feed/${id}" class="${btn('soft', 'w-full justify-between')}">멤버 실천 보기 · 응원 남기기${ms('chevron_right', 'text-[18px]')}</a>
      </section>
      ${info.schedule ? `
      <div class="flex items-center justify-between gap-2 px-1">
        <div><p class="${K.small}">다음 활동</p><p class="text-body-md font-medium">${esc(info.schedule)}</p></div>
      </div>` : ''}
      <section class="flex flex-col gap-3 rounded-2xl border border-amber/20 bg-oat/60 p-5">
        <div class="text-label-md font-medium text-tertiary">초대 코드</div>
        <div class="flex items-center justify-between gap-2">
          <span class="num text-[28px] font-bold tracking-[0.2em] text-on-surface">${esc(info.invite_code)}</span>
          <button type="button" class="${btn('solid')}" data-act="g-invite" data-g="${id}">${ms('share', 'text-[16px]')}초대 링크 보내기</button>
        </div>
        <p class="${K.tiny}">이 코드나 링크를 받은 사람은 비공개 모임이어도 바로 들어올 수 있어요.${owner ? '' : ' 코드는 운영자가 바꿀 수 있어요.'}</p>
        ${owner ? `<button type="button" class="${btn('ghost', 'self-start px-0')}" data-act="g-reset-code" data-g="${id}">${ms('autorenew', 'text-[16px]')}코드 바꾸기</button>` : ''}
      </section>
      ${manage}
      ${memberList}
      <button type="button" class="${btn('line', 'h-11 rounded-full text-[#E5484D]')}" data-act="${owner ? 'g-delete' : 'g-leave'}" data-g="${id}">${owner ? '모임 삭제하기' : '모임 나가기'}</button>
      ${note(owner ? '운영자는 모임을 나갈 수 없어요. 삭제하면 모든 멤버의 공유와 응원이 함께 지워져요.' : '나가면 이 모임에 남긴 공유·반응·한마디가 함께 지워져요.')}
    </div>`;
}

function viewFeedRoute() {
  if (!routeParam()) return viewFeedDemo();
  if (!auth.getUser()) return loginPrompt('멤버 실천은 로그인한 뒤 볼 수 있어요', '모임 멤버만 서로의 실천과 응원을 볼 수 있어요.');
  const { id, e } = groupEntry();
  if (!e) return stateView('#/groups', '모임', loadingLine());
  if (!e.data) {
    if (e.err) return stateView('#/groups', '모임', `<p class="${K.small}">불러오지 못했어요. <button type="button" class="font-medium text-primary underline" data-act="g-refresh" data-g="${esc(id)}">다시 시도</button></p>`);
    return viewPreview({ id });
  }
  return viewFeed(id, e.data);
}

function viewFeed(id, d) {
  const { info, members, shares, reactions, cheers, me } = d;
  const owner = me.role === 'owner';
  const nick = Object.fromEntries(members.map((m) => [m.user_id, m.nickname]));
  const week = groups.todayKey(-6);
  const active = new Set(shares.filter((s) => s.day >= week).map((s) => s.user_id)).size;

  const post = (s) => {
    const rs = reactions.filter((r) => r.share_id === s.id);
    const mine = rs.find((r) => r.user_id === me.user_id)?.kind;
    const cs = cheers.filter((c) => c.share_id === s.id);
    const own = s.user_id === me.user_id;
    const sent = cs.find((c) => c.from_user === me.user_id);
    const card = cardById[s.action_id];
    const name = nick[s.user_id] || '멤버';
    return `
      <article class="${K.card} flex flex-col gap-3 p-4 ${s.hidden ? 'opacity-60' : ''}">
        <div class="flex items-center gap-2.5">
          ${nickAvatar(name, s.user_id)}
          <div class="min-w-0 flex-1"><div class="truncate text-body-md font-semibold">${esc(name)}${own ? ' <span class="text-label-sm font-normal text-outline">(나)</span>' : ''}</div><div class="${K.tiny}">${dayLabel(s.day)}${s.hidden ? ' · 숨긴 글 (멤버에게 안 보여요)' : ''}</div></div>
          <span class="${K.pill} max-w-[40%] truncate bg-secondary-container/70 text-primary">${ms(CARD_ICON[s.action_id] || 'eco', 'mr-0.5 text-[13px]')}${esc(card?.title || '실천')}</span>
          <button type="button" class="tap -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-outline hover:bg-surface-container" data-act="g-more" data-g="${id}" data-id="${s.id}" aria-label="더 보기 · ${own ? '지우기' : '신고'}">${ms('more_horiz')}</button>
        </div>
        ${s.memo ? `<p class="text-body-md leading-relaxed [word-break:keep-all]">${esc(s.memo)}</p>` : `<p class="${K.small}">${esc(card?.title || '실천')}을(를) 했어요</p>`}
        <div class="flex items-center gap-1.5">
          ${REACTIONS.map((label, i) => {
            const n = rs.filter((r) => r.kind === i).length;
            return `<button type="button" class="tap h-10 flex-1 rounded-full border text-label-md ${mine === i ? 'border-primary-container bg-secondary-container font-semibold text-primary' : 'border-hairline bg-surface-container-low text-on-surface'}" data-act="g-react" data-g="${id}" data-id="${s.id}" data-i="${i}" aria-pressed="${mine === i}">${label} ${n}</button>`;
          }).join('')}
          ${own ? '' : `<button type="button" class="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sent ? 'bg-secondary-container text-primary' : 'bg-primary-container text-on-primary'}" data-act="g-cheer-open" data-g="${id}" data-id="${s.id}" aria-label="${esc(name)}${COPY.nim}에게 한마디 ${sent ? '바꾸기' : '보내기'}">${ms(sent ? 'mark_chat_read' : 'send', 'text-[18px]')}</button>`}
        </div>
        ${own && cs.length ? `
          <div class="flex flex-col gap-1 rounded-xl bg-surface-container px-3 py-2">
            <span class="${K.tiny}">받은 한마디 ${cs.length}</span>
            ${cs.map((c) => `<p class="text-body-sm"><b class="font-semibold">${esc(nick[c.from_user] || '멤버')}</b> · ${esc(PHRASES[c.phrase] || '')}</p>`).join('')}
          </div>` : ''}
        ${!own && sent ? `<p class="${K.tiny}">보낸 한마디 · ${esc(PHRASES[sent.phrase] || '')}</p>` : ''}
      </article>`;
  };

  return `
    <div class="${K.screen} gap-4 pt-3">
      <div class="flex items-center justify-between gap-2">
        ${backLink(`#/group/${id}`, info.name)}
        <button type="button" class="tap grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container" data-act="g-refresh" data-g="${id}" aria-label="새로 고침">${ms('refresh', 'text-[20px]')}</button>
      </div>
      <div class="-mt-2 space-y-1"><h1 class="${K.h1}">멤버 실천</h1><p class="${K.small}">최근 7일 ${members.length}명 중 ${active}명이 공유했어요 · 순위 없이 응원만 남겨요</p></div>
      <button type="button" class="${btn('solid', 'w-full')}" data-act="share-open-g" data-g="${id}">${ms('ios_share', 'text-[18px]')}오늘 실천 공유하기</button>
      ${ui.feedSent ? `<div role="status" class="rounded-2xl bg-done px-4 py-3 text-body-sm font-medium text-primary">${esc(ui.feedSent)}</div>` : ''}
      ${shares.length ? shares.map(post).join('') : `<p class="px-1 ${K.small}">최근 2주 동안 공유한 실천이 없어요. 오늘 기록한 실천을 먼저 공유해 보세요.</p>`}
      ${note('응원은 이 모임 멤버만 볼 수 있어요. 한 기록에 반응은 하나, 한마디는 정해진 문구로 하나만 보내요. 최근 2주 공유만 보여요.')}
    </div>`;
}

// 모임 만들기
function viewGroupNew() {
  if (!auth.getUser()) return loginPrompt('모임을 만들려면 로그인해 주세요', '모임을 만든 사람이 운영자가 돼요. 멤버 신청 수락과 공유 관리를 할 수 있어요.');
  const kind = keep('n_kind', 'off');
  const topic = keep('n_topic', groups.TOPICS[0]);
  const pub = keep('n_pub', '1') === '1';
  const mode = keep('n_mode', 'open');
  const field = (key, label, attrs, hint = '', opt = false) => `
    <div class="flex flex-col gap-1.5">
      <label for="${key}" class="text-label-md font-medium">${label}${opt ? ` <span class="${K.tiny}">(선택)</span>` : ''}</label>
      <input id="${key}" name="${key}" data-keep="${key}" value="${esc(keep(key, key === 'n_nick' ? defaultNick() : ''))}" autocomplete="off" class="${INPUT} h-12" ${attrs}>
      ${hint ? `<p class="${K.tiny}">${hint}</p>` : ''}
    </div>`;
  return `
    <div class="${K.screen} gap-5 pt-3">
      ${backLink('#/groups', '모임')}
      <h1 class="-mt-3 ${K.h1}">모임 만들기</h1>
      <form class="flex flex-col gap-5" data-act="create-group" novalidate>
        ${field('n_name', '모임 이름', 'required minlength="2" maxlength="30" placeholder="예: 주말 플로깅 크루"')}
        <div class="flex flex-col gap-1.5">
          <span class="text-label-md font-medium">모임 방식</span>
          ${segBtns([['off', '오프라인'], ['on', '온라인']], kind, (v) => `data-act="keep-set" data-k="n_kind" data-id="${v}"`, '모임 방식')}
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-label-md font-medium">주제</span>
          <div class="flex flex-wrap gap-2" role="group" aria-label="주제">
            ${groups.TOPICS.map((t) => `<button type="button" class="tap inline-flex min-h-[36px] items-center rounded-full px-3.5 text-label-md ${topic === t ? 'bg-primary-container font-semibold text-on-primary' : 'bg-secondary-container/60'}" data-act="keep-set" data-k="n_topic" data-id="${esc(t)}" aria-pressed="${topic === t}">${esc(t)}</button>`).join('')}
          </div>
        </div>
        ${kind === 'off' ? field('n_place', '지역', 'maxlength="30" placeholder="예: 서울 마포구"', '검색 결과에 보이니 구·동 단위까지만 적어요. 정확한 장소는 모임 안에서 알려요.', true) : ''}
        ${field('n_schedule', '모이는 때', 'maxlength="40" placeholder="예: 매주 일요일 오전 10시"', '', true)}
        <div class="flex flex-col gap-1.5">
          <label for="n_intro" class="text-label-md font-medium">소개 한 줄 <span class="${K.tiny}">(선택)</span></label>
          <textarea id="n_intro" name="n_intro" data-keep="n_intro" rows="3" maxlength="100" placeholder="어떤 실천을 함께하는 모임인지 적어요" class="${INPUT} resize-none py-3 leading-relaxed">${esc(keep('n_intro'))}</textarea>
        </div>
        <section class="${K.card} flex flex-col gap-3 p-4">
          <div class="flex items-center justify-between gap-3">
            <div><div class="text-body-md font-medium">모임 찾기에 공개</div><div class="${K.small}">${pub ? '누구나 검색해서 찾을 수 있어요' : '초대 코드를 받은 사람만 들어와요'}</div></div>
            <button type="button" role="switch" aria-checked="${pub}" aria-label="모임 찾기에 공개" class="tap relative h-8 w-14 shrink-0 rounded-full ${pub ? 'bg-primary-container' : 'bg-surface-container-highest'}" data-act="keep-set" data-k="n_pub" data-id="${pub ? '0' : '1'}"><span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${pub ? 'left-7' : 'left-1'}"></span></button>
          </div>
          ${pub ? `
          <div class="flex flex-col gap-1.5">
            <span class="text-body-md font-medium">검색으로 찾아온 사람</span>
            ${segBtns([['open', '바로 참여'], ['approve', '승인 후 참여']], mode, (v) => `data-act="keep-set" data-k="n_mode" data-id="${v}"`, '참여 방식')}
            <p class="${K.tiny}">${mode === 'approve' ? '참여 신청을 운영자가 수락해야 들어와요. 오프라인 모임에 추천해요.' : '참여하기를 누르면 바로 멤버가 돼요.'}</p>
          </div>` : ''}
        </section>
        ${field('n_nick', '내 모임 닉네임', 'required maxlength="12"', '멤버에게 보이는 이름이에요.')}
        <button type="submit" class="${btn('solid', 'h-12 w-full rounded-full')}">모임 만들기</button>
        ${note('모임 이름·주제·지역·소개는 공개로 두면 로그인한 다른 사용자에게 보여요. 한 사람이 운영하는 모임은 5개까지예요.')}
      </form>
    </div>`;
}

// 공유 시트: 오늘 탭 카드에서(실천 고정 → 모임 고르기) 또는 모임 화면에서(모임 고정 → 오늘 기록 고르기)
function openShare({ actionId = null, groupId = null }) {
  const today = store.dateKey();
  const mine = groups.cache.mine || [];
  const g = groupId ? groups.cache.group[groupId]?.data : null;
  const sharedIn = (gid, a) => groups.cache.sharedToday.has(`${gid}|${a}`)
    || (g && gid === groupId && g.shares.some((s) => s.user_id === g.me.user_id && s.day === today && s.action_id === a));
  const check = 'h-5 w-5 shrink-0 accent-[#00b36e]';
  const rowCls = 'flex min-h-[52px] items-center gap-3 rounded-2xl border border-hairline bg-surface-container-lowest px-4 py-2 text-body-md';
  let picks;
  if (actionId) {
    picks = mine.map((x) => {
      const done = sharedIn(x.id, actionId);
      return `<label class="${rowCls} ${done ? 'text-outline' : ''}"><input type="checkbox" name="g" value="${x.id}" class="${check}" ${done ? 'disabled' : 'checked'}><span class="min-w-0 flex-1 truncate">${esc(x.name)}</span>${done ? `<span class="${K.small}">공유함</span>` : ''}</label>`;
    }).join('');
  } else {
    const done = [...new Set(store.getState().records[today] || [])].filter((a) => cardById[a]);
    if (!done.length) {
      sheet('실천 공유', `
        <h2 class="${K.h2}">오늘 기록한 실천이 없어요</h2>
        <p class="${K.small}">오늘 탭에서 실천을 기록하면 모임에 공유할 수 있어요.</p>
        <a href="#/today" class="${btn('solid', 'h-12 rounded-full')}">오늘 탭으로</a>
        <button type="button" class="${btn('ghost')}" data-act="close">닫기</button>`);
      return;
    }
    const open = done.filter((a) => !sharedIn(groupId, a));
    picks = done.map((a) => {
      const s = sharedIn(groupId, a);
      return `<label class="${rowCls} ${s ? 'text-outline' : ''}"><input type="radio" name="a" value="${a}" class="${check}" ${s ? 'disabled' : a === open[0] ? 'checked' : ''}>${ms(CARD_ICON[a] || 'eco', 'text-[18px] text-secondary')}<span class="min-w-0 flex-1 truncate">${esc(cardById[a].title)}</span>${s ? `<span class="${K.small}">공유함</span>` : ''}</label>`;
    }).join('');
  }
  sheet('실천 공유', `
    <form class="flex flex-col gap-2.5" data-act="share-form" data-a="${actionId || ''}" data-g="${groupId || ''}">
      <h2 class="${K.h2}">${actionId ? `'${esc(cardById[actionId].title)}' 공유` : `${esc(g?.info.name || '모임')}에 공유`}</h2>
      <p class="${K.small}">${actionId ? '공유할 모임을 골라요' : '오늘 기록한 실천 중 하나를 골라요'}</p>
      ${picks}
      <label for="s-memo" class="mt-1 text-label-md font-medium">한 줄 메모 <span class="${K.tiny}">(선택 · ${groups.MAX_MEMO}자)</span></label>
      <textarea id="s-memo" name="memo" rows="2" maxlength="${groups.MAX_MEMO}" placeholder="예: 카페 세 곳에서 텀블러를 썼어요" class="${INPUT} resize-none py-3 leading-relaxed"></textarea>
      <p class="${K.tiny}">모임 멤버만 볼 수 있어요. 공유한 뒤에도 지울 수 있어요.</p>
      <button type="submit" class="${btn('solid', 'h-12 rounded-full')}">공유하기</button>
      <button type="button" class="${btn('ghost')}" data-act="close">취소</button>
    </form>`, { outside: false });
}

function confirmSheet(title, text, label, fn) {
  ui.confirmFn = fn;
  sheet(title, `
    <h2 class="${K.h2}">${title}</h2>
    <p class="${K.small}">${text}</p>
    <button type="button" class="${btn('line', 'h-12 rounded-full text-[#E5484D]')}" data-act="confirm-run">${label}</button>
    <button type="button" class="${btn('ghost')}" data-act="close">취소</button>`);
}

// 비동기 작업: 끝나면 알림을 띄우고 화면을 다시 그린다
function run(promise, ok, after) {
  return Promise.resolve(promise)
    .then((r) => {
      if (ok) toast(typeof ok === 'function' ? ok(r) : ok);
      after?.(r);
    })
    .catch((err) => toast(groups.message(err)))
    .finally(() => render(true));
}

const REPORT_REASONS = ['불쾌한 내용', '광고·스팸', '개인정보 노출', '실천과 관계없는 글'];

function openMore(gid, sid) {
  const d = groups.cache.group[gid]?.data;
  const s = d?.shares.find((x) => x.id === sid);
  if (!s) return;
  const own = s.user_id === d.me.user_id;
  const owner = d.me.role === 'owner';
  const rows = [];
  if (own) rows.push(sheetRow(`data-act="g-del-share" data-g="${gid}" data-id="${sid}"`, `${ms('delete', 'mr-2 align-[-4px] text-[18px]')}공유 지우기`));
  if (owner && !own) rows.push(sheetRow(`data-act="g-hide" data-g="${gid}" data-id="${sid}" data-v="${s.hidden ? '0' : '1'}"`, `${ms(s.hidden ? 'visibility' : 'visibility_off', 'mr-2 align-[-4px] text-[18px]')}${s.hidden ? '다시 보이기' : '멤버에게 숨기기'}`));
  if (!own) {
    rows.push(`<p class="mt-2 ${K.small}">신고하기 · 운영자에게만 알려져요</p>`);
    REPORT_REASONS.forEach((r, i) => rows.push(sheetRow(`data-act="g-report" data-g="${gid}" data-id="${sid}" data-i="${i}"`, r)));
  }
  sheet('더 보기', `<h2 class="${K.h2}">${own ? '내 공유' : esc(d.members.find((m) => m.user_id === s.user_id)?.nickname || '멤버') + '의 공유'}</h2>${rows.join('')}<button type="button" class="${btn('ghost', 'mt-1')}" data-act="close">닫기</button>`);
}

function openCheer(gid, sid) {
  const d = groups.cache.group[gid]?.data;
  const s = d?.shares.find((x) => x.id === sid);
  if (!s) return;
  const name = d.members.find((m) => m.user_id === s.user_id)?.nickname || '멤버';
  const sent = d.cheers.find((c) => c.share_id === sid && c.from_user === d.me.user_id);
  sheet('한마디 보내기', `
    <h2 class="${K.h2}">${esc(name)}${COPY.nim}에게 한마디</h2>
    <p class="${K.small}">직접 쓰는 글 대신 따뜻한 문구를 골라 보내요${sent ? ' · 다시 고르면 바뀌어요' : ''}</p>
    ${PHRASES.map((t, i) => sheetRow(`data-act="g-cheer" data-g="${gid}" data-id="${sid}" data-i="${i}"`, esc(t), sent?.phrase === i ? '보냄' : '')).join('')}
    <button type="button" class="${btn('ghost', 'mt-1')}" data-act="close">취소</button>`);
}

function openNick(gid) {
  const d = groups.cache.group[gid]?.data;
  if (!d) return;
  sheet('닉네임 바꾸기', `
    <form class="flex flex-col gap-2.5" data-act="nick-form" data-g="${gid}">
      <h2 class="${K.h2}">모임 닉네임</h2>
      <label for="nick-in" class="sr">닉네임</label>
      <input id="nick-in" name="nick" value="${esc(d.me.nickname)}" required maxlength="12" autocomplete="off" class="${INPUT} h-12">
      <button type="submit" class="${btn('solid', 'h-12 rounded-full')}">바꾸기</button>
      <button type="button" class="${btn('ghost')}" data-act="close">취소</button>
    </form>`);
}

async function invite(gid) {
  const info = groups.cache.group[gid]?.data?.info;
  if (!info) return;
  const url = groups.inviteLink(info.invite_code);
  const text = `'${info.name}' 모임에 초대해요. 초대 코드 ${info.invite_code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: '지구편 실천앱 모임 초대', text, url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('초대 링크를 복사했어요');
  } catch {
    sheet('초대 링크', `
      <h2 class="${K.h2}">초대 링크</h2>
      <p class="${K.small}">아래 주소를 길게 눌러 복사해 보내요</p>
      <p class="break-all rounded-xl bg-surface-container p-3 font-mono text-body-sm">${esc(url)}</p>
      <button type="button" class="${btn('ghost')}" data-act="close">닫기</button>`);
  }
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
  'group-new': { view: viewGroupNew, tab: 'groups' },
  group: { view: viewGroupRoute, tab: 'groups' },   // #/group = 예시, #/group/<id> = 실제 모임
  feed: { view: viewFeedRoute, tab: 'groups' },     // #/feed = 예시, #/feed/<id> = 실제 피드
  join: { view: viewJoin, tab: 'groups' }           // #/join/<초대 코드>
};

// 예전 주소(#/start 대상 고르기, #/village 학생용 지구 마을)는 오늘 화면으로 보낸다
function currentRoute() {
  const name = location.hash.replace(/^#\/?/, '').split('/')[0] || 'earth';
  return ROUTES[name] ? name : 'today';
}

// #/group/<id> 의 <id> 부분
function routeParam() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[1] || '');
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
  // 입력 중이던 칸은 다시 그린 뒤에도 커서를 그대로 둔다 (검색 결과가 도착해 화면이 바뀌어도)
  const a = document.activeElement;
  const focusId = a && a.id && $app.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName) ? a.id : '';
  const caret = focusId ? a.selectionStart : null;
  $app.innerHTML = route.view();
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(caret, caret); } catch { /* type=search 등 */ }
    }
  }
  mountClimateCharts($app);
  mountAchievements($app, isDark() ? 'dark' : 'light');
  mountSeries($app);
  mountPlant($app);
  const earth = $app.querySelector('[data-earth-now]');
  if (earth && window.EarthNow) window.EarthNow.mount(earth, { api: '/api/earth-now', assets: '../images/earth/', title: '기후변화' });
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
      auth.signIn(id, ui.loginReturn || '#/today').catch(() => {
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
      store.markRead(`s:${BEE_SERIES_ID}`);
      break;
    case 'read-tab':
      ui.readTab = id;
      break;
    case 'group-mode':
      ui.groupMode = id;
      if (auth.getUser()) groups.search(keep('gq'), id);
      break;
    case 'topic-chip':
      ui.keep.gq = keep('gq') === id ? '' : id;
      groups.search(ui.keep.gq, ui.groupMode);
      break;
    case 'g-search-retry':
      groups.cache.search.key = '';
      groups.search(keep('gq'), ui.groupMode);
      break;
    case 'g-mine-retry':
      groups.loadMine(true);
      break;
    case 'g-preview-retry':
      groups.loadPreview({ id: el.dataset.id || null, code: el.dataset.code || null }, true);
      break;
    case 'g-refresh':
      groups.loadGroup(el.dataset.g, true);
      break;
    case 'login-from':
      ui.loginReturn = location.hash || '#/groups';
      location.hash = '#/login';
      return;
    case 'keep-set':
      ui.keep[el.dataset.k] = id;
      break;
    case 'confirm-run': {
      const fn = ui.confirmFn;
      ui.confirmFn = null;
      closeSheet();
      fn?.();
      return;
    }
    case 'share-open':
      openShare({ actionId: id });
      return;
    case 'share-open-g':
      openShare({ groupId: el.dataset.g });
      return;
    case 'g-react':
      groups.react(el.dataset.g, id, Number(el.dataset.i)).catch((err) => toast(groups.message(err)));
      return;
    case 'g-cheer-open':
      openCheer(el.dataset.g, id);
      return;
    case 'g-cheer': {
      const d = groups.cache.group[el.dataset.g]?.data;
      const s = d?.shares.find((x) => x.id === id);
      const name = d?.members.find((m) => m.user_id === s?.user_id)?.nickname || '멤버';
      closeSheet();
      run(groups.cheer(el.dataset.g, id, Number(el.dataset.i)), `${name}${COPY.nim}에게 한마디를 보냈어요`);
      return;
    }
    case 'g-more':
      openMore(el.dataset.g, id);
      return;
    case 'g-report':
      closeSheet();
      run(groups.report(el.dataset.g, id, REPORT_REASONS[Number(el.dataset.i)] || ''), '운영자에게 알렸어요. 고마워요.');
      return;
    case 'g-del-share': {
      const g = el.dataset.g;
      confirmSheet('공유를 지울까요?', '이 공유에 남은 반응과 한마디도 함께 지워져요. 나의 기록은 그대로예요.', '지우기', () =>
        run(groups.deleteShare(g, id), '공유를 지웠어요', () => groups.loadMine(true)));
      return;
    }
    case 'g-hide':
      closeSheet();
      run(groups.hideShare(el.dataset.g, id, el.dataset.v === '1'), el.dataset.v === '1' ? '멤버에게 숨겼어요' : '다시 보이게 했어요');
      return;
    case 'g-dismiss':
      run(groups.dismissReports(el.dataset.g, id), '신고를 정리했어요');
      return;
    case 'g-accept':
      run(groups.acceptRequest(el.dataset.g, el.dataset.u), '참여를 수락했어요');
      return;
    case 'g-reject':
      run(groups.rejectRequest(el.dataset.g, el.dataset.u), '신청을 거절했어요');
      return;
    case 'g-kick': {
      const { g, u } = el.dataset;
      const name = groups.cache.group[g]?.data?.members.find((m) => m.user_id === u)?.nickname || '멤버';
      confirmSheet(`${esc(name)}${COPY.nim}을 내보낼까요?`, '이 멤버가 모임에 남긴 공유·반응·한마디가 함께 지워져요. 초대 코드를 알면 다시 들어올 수 있으니, 필요하면 코드도 바꿔 주세요.', '내보내기', () =>
        run(groups.kick(g, u), '멤버를 내보냈어요'));
      return;
    }
    case 'g-set': {
      const { g, k, v } = el.dataset;
      run(groups.updateGroup(g, { [k]: k === 'is_public' ? v === '1' : v }), '설정을 바꿨어요');
      return;
    }
    case 'g-reset-code': {
      const g = el.dataset.g;
      confirmSheet('초대 코드를 바꿀까요?', '지금 코드와 예전 초대 링크로는 더 이상 들어올 수 없어요. 이미 들어온 멤버는 그대로예요.', '코드 바꾸기', () =>
        run(groups.resetCode(g), (c) => `새 코드는 ${c}예요`));
      return;
    }
    case 'g-invite':
      invite(el.dataset.g);
      return;
    case 'g-nick-open':
      openNick(el.dataset.g);
      return;
    case 'g-cancel-req':
      run(groups.cancelRequest(id), '참여 신청을 취소했어요');
      return;
    case 'g-leave': {
      const g = el.dataset.g;
      confirmSheet('모임을 나갈까요?', '이 모임에 남긴 공유·반응·한마디가 함께 지워져요. 나의 기록과 숲은 그대로예요.', '나가기', () =>
        run(groups.leave(g), '모임을 나왔어요', () => { location.hash = '#/groups'; }));
      return;
    }
    case 'g-delete': {
      const g = el.dataset.g;
      confirmSheet('모임을 삭제할까요?', '모든 멤버의 공유·반응·한마디와 참여 신청이 지워지고 되돌릴 수 없어요.', '삭제하기', () =>
        run(groups.deleteGroup(g), '모임을 삭제했어요', () => { location.hash = '#/groups'; }));
      return;
    }
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

let searchTimer = 0;
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.act === 'draft') ui.reviewText = t.value;
  if (t.dataset.keep) ui.keep[t.dataset.keep] = t.value;
  if (t.dataset.keep === 'gq') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => groups.search(t.value, ui.groupMode), 350);
  }
});

const trim = (v) => String(v || '').trim();

// 모임 화면의 입력 폼들
function onGroupSubmit(form) {
  const act = form.dataset.act;
  const f = form.elements;
  if (act === 'search-form') {
    clearTimeout(searchTimer);
    groups.search(f.q.value, ui.groupMode);
    f.q.blur();
    return true;
  }
  if (act === 'code-form') {
    const code = trim(f.code.value).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) {
      toast('초대 코드 6자리를 넣어 주세요');
      return true;
    }
    ui.keep.code = '';
    location.hash = `#/join/${code}`;
    return true;
  }
  if (act === 'join-form') {
    const nick = trim(f.nick.value);
    if (!nick) {
      toast('모임에서 쓸 닉네임을 넣어 주세요');
      return true;
    }
    const { id } = form.dataset;
    const code = form.dataset.code || null;
    form.querySelector('[type=submit]').disabled = true;
    run(groups.join(id, nick, code, trim(f.msg?.value)),
      (r) => (r === 'requested' ? '참여 신청을 보냈어요. 운영자가 수락하면 들어갈 수 있어요' : '모임에 들어왔어요'),
      (r) => {
        ui.keep.j_msg = '';
        if (r !== 'requested') location.hash = `#/group/${id}`;
      });
    return true;
  }
  if (act === 'create-group') {
    const name = trim(keep('n_name'));
    const nickname = trim(keep('n_nick', defaultNick()));
    if (name.length < 2) {
      toast('모임 이름을 두 글자 이상 넣어 주세요');
      document.getElementById('n_name')?.focus();
      return true;
    }
    if (!nickname) {
      toast('내 모임 닉네임을 넣어 주세요');
      document.getElementById('n_nick')?.focus();
      return true;
    }
    const kind = keep('n_kind', 'off');
    const isPublic = keep('n_pub', '1') === '1';
    form.querySelector('[type=submit]').disabled = true;
    run(groups.createGroup({
      name, kind, topic: keep('n_topic', groups.TOPICS[0]), place: kind === 'off' ? trim(keep('n_place')) : '온라인',
      schedule: trim(keep('n_schedule')), intro: trim(keep('n_intro')), isPublic, joinMode: isPublic ? keep('n_mode', 'open') : 'open', nickname
    }), '모임을 만들었어요. 초대 코드로 멤버를 불러 보세요', (gid) => {
      Object.keys(ui.keep).filter((k) => k.startsWith('n_')).forEach((k) => delete ui.keep[k]);
      location.hash = `#/group/${gid}`;
    });
    return true;
  }
  if (act === 'share-form') {
    const actionId = form.dataset.a || form.querySelector('input[name=a]:checked')?.value;
    const gids = form.dataset.g ? [form.dataset.g] : [...form.querySelectorAll('input[name=g]:checked')].map((x) => x.value);
    if (!actionId) {
      toast('공유할 실천을 골라 주세요');
      return true;
    }
    if (!gids.length) {
      toast('공유할 모임을 골라 주세요');
      return true;
    }
    form.querySelector('[type=submit]').disabled = true;
    closeSheet();
    run(groups.share(gids, actionId, trim(f.memo.value)), gids.length > 1 ? `모임 ${gids.length}곳에 공유했어요` : '모임에 공유했어요');
    return true;
  }
  if (act === 'nick-form') {
    const nick = trim(f.nick.value);
    if (!nick) return true;
    closeSheet();
    run(groups.setNickname(form.dataset.g, nick), '닉네임을 바꿨어요');
    return true;
  }
  return false;
}

document.addEventListener('submit', (e) => {
  if (onGroupSubmit(e.target)) {
    e.preventDefault();
    return;
  }
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
  groups.reset(); // 다른 계정의 모임 내용이 남지 않게
  if (id) sync.start(auth.getClient(), id, () => render(true));
  else sync.stop();
  render(true);
});

// 모임 내용을 받아 오면 다시 그린다
groups.setOnChange(() => render(true));

// 앱으로 돌아오면 모임 내용을 새로 받는다 (다른 멤버의 공유·응원)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !auth.getUser()) return;
  const r = currentRoute();
  if ((r === 'group' || r === 'feed') && routeParam()) groups.loadGroup(routeParam(), true);
  if (r === 'groups' || r === 'today') groups.loadMine(true);
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
