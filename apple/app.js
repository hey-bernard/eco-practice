// apple-design 스킬(Apple Human Interface Guidelines)로 바꾼 iOS 스타일 버전.
// Stitch 버전(../stitch/app.js)을 바탕으로 오늘 화면·카드 고르기·하단 탭·알림을 iOS 패턴(묶음 목록, 활동 링, 시트, HUD)으로 바꿨다. 데이터·저장은 원래 버전(../js)을 그대로 쓴다.
import { CARDS, LEVEL_LABEL, STAGES, TOPICS, POSTS, NEWSLETTER, BEE_POST_ID, GROUPS, CLASSROOM, FEED, REACTIONS, PHRASES, REVIEW_DRAFT, COPY } from '../js/data.js';
import { AUDIENCE, IS_STUDENT, chooseAudience, resetAudience } from '../js/audience.js';
import * as store from '../js/store.js';
import { mountClimateCharts } from '../js/climate-chart.js';
import * as village from '../js/village.js';

const $app = document.getElementById('screen');
const $nav = document.getElementById('nav');
const $layer = document.getElementById('layer');

// ?demo=1 로 열면 발표용 점수 버튼이 나온다
const DEMO = new URLSearchParams(location.search).has('demo');

// 화면을 오가도 유지할 임시 상태 (저장하지 않음)
const ui = {
  calMonth: null,
  readTab: 'reflect',
  readTopic: 'all',
  groupMode: 'all',
  reviewEditing: false,
  reviewShared: false,
  reviewText: REVIEW_DRAFT,
  feedPicks: {},
  feedSent: '',
  villageTab: 'quest',
  placing: null
};

const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const IMG = '../images';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 아이콘: SF Symbols는 웹에서 쓸 수 없어 Material Symbols Rounded로 대신한다
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

// 자주 쓰는 모양 (apple-design 스킬: 테두리·그림자 대신 회색 바탕 위 흰 묶음, 누를 수 있는 것만 틴트 초록)
const K = {
  screen: 'flex flex-col gap-7 px-4 pb-32',
  card: 'rounded-2xl bg-surface-container-lowest',
  h1: 'font-serif text-headline-xl font-bold text-on-surface',
  h2: 'font-serif text-headline-md font-semibold text-on-surface',
  eyebrow: 'text-label-md text-on-surface-variant',
  meta: 'text-label-md font-semibold uppercase text-on-surface-variant',
  small: 'text-body-sm text-on-surface-variant',
  tiny: 'text-label-sm leading-relaxed text-on-surface-variant',
  btn: 'tap inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-4 text-body-sm font-semibold',
  solid: 'bg-primary text-on-primary',
  line: 'bg-secondary-container text-primary',
  soft: 'bg-secondary-container text-primary',
  ghost: 'text-primary',
  pill: 'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-label-sm font-medium',
  bar: 'h-1 w-full overflow-hidden rounded-full bg-surface-container',
  back: 'tap -ml-1.5 inline-flex min-h-[44px] items-center gap-0.5 self-start text-body-md text-primary'
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

// 성장 6단계 그림: 학생용은 지구지킴이 캐릭터, 성인용은 식물 일러스트 (원래 버전과 같은 그림)
const stageImage = (si) => (IS_STUDENT ? `${IMG}/forest/stage${si + 1}.webp` : `${IMG}/forest/plant${si + 1}.svg`);
const stageClass = IS_STUDENT ? '' : 'plant';

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

function sheet(label, body) {
  $layer.innerHTML = `
    <div class="sheet">
      <button type="button" class="dim" data-act="close" aria-label="닫기"></button>
      <div class="panel" role="dialog" aria-label="${label}">
        <div class="mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full bg-outline/50" aria-hidden="true"></div>
        ${body}
      </div>
    </div>`;
}

const sheetRow = (attrs, left, right = '', disabled = false) => `
  <button type="button" class="tap flex min-h-[48px] items-center justify-between gap-2 rounded-2xl bg-surface-container-lowest px-4 py-2 text-left text-body-md ${disabled ? 'text-outline' : 'text-on-surface'}" ${attrs} ${disabled ? 'disabled' : ''}>
    <span>${left}</span>${right ? `<span class="${K.small}">${right}</span>` : ''}
  </button>`;

// 화면 머리: 위 막대(스크롤하면 작은 제목이 나타남) + 큰 제목(Large Title)
const header = (meta, title, right = '') => `
  <div class="navbar sticky top-0 z-30 -mx-4 grid min-h-[44px] grid-cols-[1fr_auto_1fr] items-center px-4 pt-[env(safe-area-inset-top)]">
    <span></span><span class="nav-title text-[1.0625rem] font-semibold">${title}</span><div class="justify-self-end">${right}</div>
  </div>
  <header class="-mt-6 flex flex-col">
    ${meta ? `<p class="${K.meta}">${meta}</p>` : ''}
    <h1 class="${K.h1}">${title}</h1>
  </header>`;

// ───────── 첫 실행 · 대상 고르기 ─────────

function viewStart() {
  const choice = (id, badge, badgeCls, title, desc, icons, foot, footIcon) => `
    <button type="button" class="tap group flex flex-col rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 text-left shadow-[0_4px_20px_-4px_rgba(37,84,59,0.03)] hover:border-primary/40" data-act="choose-audience" data-id="${id}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <span class="${K.pill} ${badgeCls}">${badge}</span>
          <div class="mt-2 font-serif text-headline-md font-bold text-on-surface group-hover:text-primary">${title}</div>
          <p class="mt-1.5 text-body-sm leading-relaxed text-on-surface-variant">${desc}</p>
        </div>
        <div class="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-outline-variant/30 bg-surface-container-low text-secondary group-hover:bg-secondary-container/40">
          ${ms(icons[0], 'text-[24px]')}${ms(icons[1], 'text-[16px] text-primary', true)}
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
        <span class="flex items-center gap-1.5 text-label-md text-secondary">${ms(footIcon, 'text-[16px]')}${foot}</span>
        ${ms('arrow_forward', 'text-[20px] text-outline group-hover:text-primary')}
      </div>
    </button>`;
  return `
    <div class="flex min-h-[100dvh] flex-col px-5 pb-6 pt-12">
      <div class="flex flex-col items-start">
        <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/30 bg-secondary-container/70 text-primary">${ms('eco', 'text-[26px]', true)}</div>
        <span class="mb-2 text-label-md font-medium tracking-wider text-secondary">오늘의 실천</span>
        <h1 class="font-serif text-headline-xl font-bold leading-tight text-on-surface">어디에서 실천할지<br>먼저 골라 주세요</h1>
        <p class="mt-2.5 text-body-sm text-on-surface-variant">고른 쪽에 맞춰 실천 카드와 화면이 달라져요.</p>
      </div>
      <div class="my-9 flex flex-col gap-4">
        ${choice('student', '중학생', 'bg-sky text-on-sky', '학생으로 시작하기', '학교·집에서 하는 오늘의 미션, 반 친구들과 함께 키우는 우리 반 숲, 지구 마을', ['backpack', 'public'], '학교와 집에서 하는 가벼운 미션', 'school')}
        ${choice('adult', '성인', 'bg-secondary-container text-primary', '성인으로 시작하기', '출퇴근·카페·장보기 속 실천 카드, 동네 모임, 생태 성찰 읽기', ['coffee', 'potted_plant'], '일상 속 지속 가능한 루틴', 'nature_people')}
      </div>
      <div class="mt-auto flex items-start justify-center gap-1.5 px-2">
        ${ms('lock', 'mt-0.5 text-[16px] text-outline')}
        <p class="text-label-sm leading-relaxed text-outline">기록은 이 기기에만 저장되고, 학생용과 성인용 기록은 따로 쌓여요. 나중에 기록 화면에서 바꿀 수 있어요.</p>
      </div>
      <a href="../" class="mt-4 self-center text-label-md text-secondary underline underline-offset-2">기존 디자인으로 보기</a>
    </div>`;
}

// ───────── ① 오늘 ─────────

// 오늘 진행을 보여 주는 활동 링 (피트니스 앱처럼)
function ring(done, total) {
  const r = 24;
  const len = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return `
    <svg class="h-16 w-16 shrink-0 -rotate-90" viewBox="0 0 64 64" role="img" aria-label="오늘 ${total}개 중 ${done}개 기록">
      <circle class="ring-track" cx="32" cy="32" r="${r}" fill="none" stroke-width="9"/>
      <circle class="ring-bar" cx="32" cy="32" r="${r}" fill="none" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${(len * (1 - pct)).toFixed(1)}" ${pct ? '' : 'opacity="0"'}/>
    </svg>`;
}

// 묶음 목록의 한 줄: 왼쪽 색 아이콘 타일 · 제목(+부제) · 오른쪽 값 · 꺾쇠
const cellRow = (href, color, icon, title, sub = '', value = '') => `
  <a href="${href}" class="row tap flex min-h-[44px] items-center gap-3 px-4 py-2.5">
    <span class="itile" style="background: rgb(var(--${color}))">${ms(icon, '', true)}</span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-body-md">${title}</span>
      ${sub ? `<span class="text-body-sm text-on-surface-variant">${sub}</span>` : ''}
    </span>
    ${value ? `<span class="shrink-0 whitespace-nowrap text-body-md text-on-surface-variant">${value}</span>` : ''}
    ${ms('chevron_right', 'text-[22px] text-outline/70')}
  </a>`;

const sectionHead = (text, right = '') => `
  <div class="flex items-end justify-between px-4 pb-1.5">
    <h2 class="text-label-md font-normal text-on-surface-variant">${text}</h2>${right}
  </div>`;

function viewToday() {
  const today = store.dateKey();
  const now = new Date();
  const picks = store.getPicks(today);
  const points = store.totalPoints();
  const f = forestInfo(points);
  const post = weeklyPost();
  const saved = store.countCard(COPY.effect.card, monthPrefix());
  const doneCount = picks.filter((id) => store.isDone(today, id)).length;
  const e = COPY.effect;
  const cls = CLASSROOM;

  // 미리 알림 앱처럼: 동그라미를 누르면 기록, 다시 누르면 취소
  const rows = picks.map((id) => {
    const c = cardById[id];
    const done = store.isDone(today, id);
    return `
      <div class="row flex min-h-[44px] items-center gap-3 px-4 py-2.5">
        <button type="button" class="check" data-act="toggle" data-id="${id}" aria-pressed="${done}" aria-label="${esc(c.title)} ${done ? '기록 취소' : '기록하기'}"><i>${ms('check', '', true)}</i></button>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="text-body-md ${done ? 'text-on-surface-variant' : ''}">${esc(c.title)}</span>
          <span class="text-body-sm text-on-surface-variant">${IS_STUDENT ? `${esc(c.area)} · ` : ''}${esc(c.hint)}</span>
        </div>
        <span class="shrink-0 text-label-md text-on-surface-variant">${LEVEL_LABEL[c.level]}</span>
      </div>`;
  }).join('');

  return `
    <div class="${K.screen}">
      ${header(`${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`, COPY.todayTitle,
        `<a href="#/login" class="tap inline-flex min-h-[44px] items-center text-body-md text-primary">${IS_STUDENT ? '반 참여' : '로그인'}</a>`)}

      <section class="group flex items-center gap-4 p-4" aria-label="오늘 요약">
        ${ring(doneCount, picks.length)}
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="text-[1.0625rem] font-semibold">오늘 <span class="font-rounded">${doneCount}/${picks.length}</span></p>
          <p class="text-body-sm text-on-surface-variant">${doneCount ? `숲에 ${doneCount}점을 보탰어요` : COPY.firstHint}</p>
        </div>
      </section>

      <section>
        ${sectionHead(COPY.picksTitle)}
        <div class="group checks">
          ${rows}
          <button type="button" class="row tap flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-body-md text-primary" data-act="picker">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-on-primary">${ms('add', 'text-[18px]')}</span>${COPY.pickMore}
          </button>
        </div>
      </section>

      <section>
        ${sectionHead('나의 변화')}
        <div class="group tiles">
          ${cellRow('#/forest', 'green', 'forest', '나의 숲', `${f.name} 단계 · ${f.nextText}`, `${points}점`)}
          ${IS_STUDENT ? cellRow('#/village', 'teal', 'public', '지구 마을', village.readyCount() ? `받을 보상 ${village.readyCount()}개` : '리사의 부탁을 들어줘요', `${village.LEAF} ${village.villageInfo().leaves}`) : ''}
          <div class="row flex min-h-[44px] items-center gap-3 px-4 py-2.5">
            <span class="itile" style="background: rgb(var(--orange))">${ms(IS_STUDENT ? 'water_bottle' : 'local_cafe', '', true)}</span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="text-body-md">${saved > 0 ? e.done(saved) : e.empty}</span>
              <span class="text-body-sm text-on-surface-variant">${saved > 0 ? e.doneSub(saved) : e.emptySub}</span>
            </span>
          </div>
        </div>
      </section>

      <section>
        ${sectionHead(IS_STUDENT ? '우리 반' : '내 모임', `<span class="text-label-md text-on-surface-variant">예시</span>`)}
        <div class="group tiles">
          ${IS_STUDENT
            ? cellRow('#/groups', 'indigo', 'groups', `반 공동 미션 · ${cls.mission.title}`, `오늘 ${cls.members}명 중 ${cls.todayDone}명이 했어요`, `${cls.mission.now}/${cls.mission.need}`)
            : cellRow('#/group', 'indigo', 'groups', '주말 플로깅 크루', '일요일 오전 10시 · 이번 주 8명 중 6명 기록')}
        </div>
      </section>

      <section>
        ${sectionHead(COPY.question)}
        <div class="group">
          <p class="row px-4 py-3.5 text-body-md leading-relaxed [word-break:keep-all]">“${esc(post.question)}”</p>
          <a href="#/read" class="row tap flex min-h-[44px] items-center justify-between px-4 py-2.5 text-body-md text-primary">${COPY.questionBtn}${ms('chevron_right', 'text-[22px] text-outline/70')}</a>
        </div>
      </section>
    </div>`;
}

function openPicker() {
  const picks = store.getPicks(store.dateKey());
  const areas = [...new Set(CARDS.map((c) => c.area))];
  const colors = ['blue', 'green', 'orange', 'teal', 'indigo', 'pink', 'brown'];
  sheet(COPY.pickerTitle, `
    <div class="sticky top-0 z-10 -mx-4 grid grid-cols-[1fr_auto_1fr] items-center bg-[var(--sheet-bg)] px-4">
      <button type="button" class="tap min-h-[44px] justify-self-start text-body-md text-primary" data-act="close">취소</button>
      <h2 class="text-[1.0625rem] font-semibold">${COPY.pickerTitle}</h2>
      <span></span>
    </div>
    <p class="px-4 text-label-md text-on-surface-variant">${COPY.pickerSub}</p>
    ${areas.map((area, ai) => `
      <h3 class="px-4 pt-3 text-label-md font-normal text-on-surface-variant">${esc(area)}</h3>
      <div class="group tiles">
        ${CARDS.filter((c) => c.area === area).map((c) => {
          const has = picks.includes(c.id);
          return `<button type="button" class="row tap flex min-h-[44px] w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-100" data-act="add-pick" data-id="${c.id}" ${has ? 'disabled' : ''}>
            <span class="itile" style="background: rgb(var(--${colors[ai % colors.length]}))">${ms(CARD_ICON[c.id] || 'eco', '', true)}</span>
            <span class="flex-1 text-body-md">${esc(c.title)}</span>
            ${has ? `<span class="flex items-center gap-1 text-label-md text-primary">${ms('check', 'text-[18px]')}오늘에 있음</span>` : `<span class="text-label-md text-on-surface-variant">${LEVEL_LABEL[c.level]}</span>`}
          </button>`;
        }).join('')}
      </div>`).join('')}`);
}

// ───────── ② 로그인 ─────────

function viewLogin() {
  if (IS_STUDENT) return viewJoinClass();
  return `
    <div class="flex min-h-[100dvh] flex-col px-5 pb-6 pt-12">
      <div class="flex flex-col items-start gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/70 text-primary">${ms('spa', 'text-[26px]', true)}</div>
        <h1 class="mt-3 font-serif text-headline-xl font-bold leading-tight">기록을 안전하게<br>저장해요</h1>
        <p class="text-body-sm leading-relaxed text-on-surface-variant">로그인하면 기기를 바꿔도 기록과 숲이 그대로 남아요. 알림 설정과 모임 참여도 이때부터 쓸 수 있어요.</p>
      </div>
      <div class="mt-8 flex flex-col gap-2.5">
        <button type="button" data-act="login" class="tap flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#FEE500] text-body-md font-medium text-[#191919]">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.9 4 3 7.1 3 10.9c0 2.4 1.6 4.5 4 5.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.4 0 .9.1 1.2.1 5.1 0 9-3.1 9-6.9S17.1 4 12 4z" fill="#191919"/></svg>
          카카오로 시작하기
        </button>
        <button type="button" data-act="login" class="tap flex h-[52px] items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest text-body-md font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.2 22 12 22z" fill="#34A853"/><path d="M6.4 13.9c-.2-.6-.3-1.3-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.2 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335"/></svg>
          구글로 시작하기
        </button>
        <a href="#/today" class="${btn('ghost')}">로그인 없이 먼저 둘러보기</a>
      </div>
      <div class="mt-auto rounded-2xl bg-surface-container-lowest p-4">
        <div class="${K.eyebrow}">받는 정보</div>
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">필수: 닉네임 · 선택: 프로필 사진<br>비밀번호는 저장하지 않아요. 탈퇴하면 기록과 연결 정보를 함께 지워요.</p>
      </div>
    </div>`;
}

// 학생용 로그인: 실명·연락처 없이 학급 코드와 닉네임만 (화면만, 2단계에서 연결)
function viewJoinClass() {
  const input = 'h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md focus:border-primary-container focus:outline-none';
  return `
    <div class="flex min-h-[100dvh] flex-col px-5 pb-6 pt-12">
      <div class="flex flex-col items-start gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-on-sky">${ms('school', 'text-[26px]', true)}</div>
        <h1 class="mt-3 font-serif text-headline-xl font-bold leading-tight">우리 반에<br>참여해요</h1>
        <p class="text-body-sm leading-relaxed text-on-surface-variant">선생님께 받은 학급 코드를 넣으면 우리 반 숲과 공동 미션에 함께할 수 있어요.</p>
      </div>
      <form class="mt-6 flex flex-col gap-3" data-act="join">
        <label for="class-code" class="${K.eyebrow}">학급 코드</label>
        <input id="class-code" class="${input}" type="text" maxlength="8" placeholder="예: HB2-3K7" autocomplete="off">
        <label for="nickname" class="${K.eyebrow}">닉네임</label>
        <input id="nickname" class="${input}" type="text" maxlength="10" placeholder="친구들에게 보일 이름" autocomplete="off">
        <button type="submit" class="${btn('solid', 'mt-2 h-12')}">참여하기</button>
        <a href="#/today" class="${btn('ghost')}">나중에 하기</a>
      </form>
      <div class="mt-auto rounded-2xl bg-surface-container-lowest p-4">
        <div class="${K.eyebrow}">받는 정보</div>
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">학급 코드와 닉네임만 받아요. 이름·전화번호·사진은 받지 않아요.<br>만 14세 미만은 보호자 동의를 받은 뒤 참여해요.</p>
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
          <span class="text-label-md leading-snug text-on-surface-variant">${esc(cardById[id].stat)}</span>
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
      <div class="flex items-center justify-between gap-2 px-1">
        <p class="${K.small}">지금은 <b class="font-semibold text-primary">${COPY.label}</b>으로 쓰고 있어요</p>
        <button type="button" class="${btn('ghost', 'px-1')}" data-act="switch-audience">${ms('swap_horiz', 'text-[16px]')}대상 바꾸기</button>
      </div>
      <p class="self-center text-label-md text-on-surface-variant">다른 디자인: <a href="../#/record" class="text-primary">기존</a> · <a href="../stitch/#/record" class="text-primary">Stitch</a> · <a href="../monitor/#/record" class="text-primary">기후 모니터</a> · <a href="../climate/#/earth" class="text-primary">기후 홈</a> · <a href="../material/#/record" class="text-primary">Material 3</a> · <a href="../line/#/record" class="text-primary">LINE 스타일</a></p>
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
          <img class="main ${stageClass}" src="${stageImage(f.si)}" alt="${IS_STUDENT ? '지구지킴이' : '식물'} ${f.name} 단계 모습">
          <svg class="critters" viewBox="0 0 358 220" aria-hidden="true">
            ${bee.ok ? '<g transform="translate(70,120)"><ellipse rx="9" ry="6" fill="#F2C230" stroke="#1C2620" stroke-width="1.5"/></g>' : ''}
            ${bird.ok ? '<path d="M280 46 q8 -8 16 0 q8 -8 16 0" stroke="#1C2620" stroke-width="2" fill="none" stroke-linecap="round"/>' : ''}
            ${squirrel.ok ? '<g><circle cx="290" cy="196" r="9" fill="#B4651E"/><circle cx="298" cy="187" r="4" fill="#B4651E"/></g>' : ''}
          </svg>
        </div>
        <div class="flex items-baseline justify-between border-t border-hairline bg-surface-container-lowest px-4 py-3">
          <span class="font-serif text-body-md font-semibold text-primary">${f.name} 단계</span>
          <span class="${K.meta}">${points}점 · ${f.nextText}</span>
        </div>
      </section>

      ${IS_STUDENT ? villageEntry() : ''}

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
  const isReflect = IS_STUDENT || ui.readTab === 'reflect'; // 학생용은 뉴스레터 없이 배우기만
  const post = weeklyPost();
  const shown = ui.readTopic === 'all' ? POSTS : POSTS.filter((p) => p.topic === ui.readTopic);
  const mine = store.getState().reflections.slice(0, 3);
  const seg = (items, cur, act) => `
    <div class="grid auto-cols-fr grid-flow-col gap-0.5 rounded-[9px] bg-surface-container p-0.5" role="group" aria-label="보기 전환">
      ${items.map(([id, label]) => `<button type="button" class="tap h-8 rounded-[7px] text-label-md ${cur === id ? 'bg-surface-container-lowest font-semibold text-on-surface shadow' : 'text-on-surface'}" data-act="${act}" data-id="${id}" aria-pressed="${cur === id}">${label}</button>`).join('')}
    </div>`;

  const reflect = `
    <section class="space-y-3" aria-labelledby="climate-h">
      <div class="space-y-0.5 px-1">
        <h2 id="climate-h" class="${K.h2}">기후 4대 지표</h2>
        <p class="${K.tiny}">연도별 추이 · 옆으로 넘기고, 그래프를 누르면 그 해 값이 보여요</p>
      </div>
      <div data-climate-charts></div>
    </section>

    <div class="flex flex-wrap gap-2" role="group" aria-label="주제">
      ${TOPICS.map((t) => `<button type="button" class="tap min-h-[36px] rounded-full px-4 text-label-md font-medium ${ui.readTopic === t.id ? 'bg-primary-container text-on-primary' : 'bg-secondary-container/60 text-on-surface'}" data-act="topic" data-id="${t.id}" aria-pressed="${ui.readTopic === t.id}">${t.label}</button>`).join('')}
    </div>

    <article class="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 text-on-surface">
      <span class="text-label-md text-on-surface-variant">이번 주의 카드 · 카드뉴스 · 원문 읽기</span>
      <h2 class="font-serif text-[21px] font-semibold leading-snug">${esc(post.title)}</h2>
      <p class="font-serif text-body-md leading-relaxed text-on-surface-variant">${esc(post.intro)}</p>
      <p class="text-body-sm leading-relaxed text-on-surface-variant">${esc(post.summary)}</p>
      <div class="mt-1 flex items-center justify-between gap-2">
        <span class="text-label-sm text-on-surface-variant">국가기후위기대응위원회 · ${post.date}</span>
        <a href="${post.url}" target="_blank" rel="noopener" class="${btn('solid')}" data-act="read-post" data-id="${post.id}">원문 보기${ms('open_in_new', 'text-[16px]')}</a>
      </div>
    </article>

    <form class="space-y-3 rounded-2xl border border-amber/20 bg-oat/60 p-5" data-act="reflect">
      <label for="reflect" class="block text-label-md font-medium text-tertiary">${COPY.question}</label>
      <p class="font-serif text-quote leading-relaxed">“${esc(post.question)}”</p>
      <div class="flex gap-2">
        <input id="reflect" name="text" type="text" maxlength="200" placeholder="한 줄로 남겨 보세요" autocomplete="off" class="h-11 min-w-0 flex-1 rounded-full border border-amber/25 bg-surface-container-lowest px-4 text-body-sm focus:border-amber focus:outline-none">
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
      ${header(COPY.readMeta, COPY.readTitle, '', IS_STUDENT ? 'school' : 'menu_book')}
      ${IS_STUDENT ? '' : seg([['reflect', '생태 성찰'], ['news', '뉴스레터']], isReflect ? 'reflect' : 'news', 'read-tab')}
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
        <input id="q" type="search" placeholder="관심 주제나 모임 이름" class="h-12 w-full rounded-full border border-outline-variant/60 bg-surface-container-lowest pl-11 pr-4 text-body-sm focus:border-primary-container focus:outline-none">
      </div>
      <div class="grid auto-cols-fr grid-flow-col gap-0.5 rounded-[9px] bg-surface-container p-0.5" role="group" aria-label="모임 방식">
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

// ───────── ⑥ 우리 반 · 학생용 (정적 예시) ─────────

function viewClass() {
  const c = CLASSROOM;
  const m = c.mission;
  return `
    <div class="${K.screen} gap-6">
      ${header(`${c.school} · ${c.members}명 · 담임 ${c.teacher}`, c.name, `<span class="${K.pill} bg-secondary-container text-primary">예시</span>`, 'school')}

      <section class="${K.card} space-y-3 p-5">
        <div class="flex items-center gap-4">
          <img class="stage-thumb" src="${IMG}/forest/stage${c.forest.stage + 1}.webp" alt="" aria-hidden="true">
          <div class="flex-1 space-y-1.5">
            <div class="flex items-center gap-1.5">${ms('forest', 'text-[18px] text-primary')}<span class="text-body-md font-medium">우리 반 숲 · ${c.forest.name} 단계</span></div>
            ${bar(c.forest.pct)}
            <p class="${K.small}">${c.forest.next}</p>
          </div>
        </div>
        <p class="border-t border-outline-variant/20 pt-3 ${K.tiny}">내 미션 기록이 우리 반 숲에 더해져요. 누가 몇 번 했는지는 보여 주지 않아요.</p>
      </section>

      <section class="${K.card} space-y-3 p-5">
        <div class="flex items-baseline justify-between"><h2 class="${K.h2}">이번 주 반 공동 미션</h2><span class="${K.meta}">${m.due}까지</span></div>
        <div class="flex items-center gap-2 text-body-md font-medium">${ms(CARD_ICON[m.card] || 'eco', 'text-[20px] text-secondary')}${m.title}</div>
        <div role="progressbar" aria-label="공동 미션 진행" aria-valuenow="${m.now}" aria-valuemin="0" aria-valuemax="${m.need}">${bar((m.now / m.need) * 100, 'h-2.5')}</div>
        <p class="${K.small}">${m.now}개 모였어요 · ${m.due}에 선생님이 확인해요</p>
        <button type="button" class="${btn('soft')}" data-act="soon">${ms('photo_camera', 'text-[16px]')}내가 모은 것 인증하기</button>
      </section>

      <a href="#/feed" class="tap ${K.card} block space-y-2 p-5">
        <div class="flex items-center justify-between"><h2 class="${K.h2}">친구들 소식</h2>${chev}</div>
        <div class="flex items-center gap-2">
          <div class="flex -space-x-1.5">${FEED.map((p) => `<span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-primary ring-2 ring-surface-container-lowest" style="background:${p.bg}">${esc(p.name.charAt(0))}</span>`).join('')}</div>
          <p class="${K.small}">오늘 ${c.members}명 중 ${c.todayDone}명이 미션을 했어요 · 응원 남기기</p>
        </div>
      </a>

      <div class="flex items-start gap-2 rounded-2xl border border-amber/20 bg-oat/70 px-4 py-3 text-body-sm text-tertiary">${ms('shield_person', 'mt-0.5 text-[18px]')}<span>댓글 대신 정해진 응원 버튼만 쓸 수 있어요. 새 글과 사진은 선생님이 확인한 뒤 반에 보여요.</span></div>
      <p class="-mt-3 px-1 ${K.tiny}">예시 데이터입니다. 학급 기능은 3단계에서 연결합니다.</p>
    </div>`;
}

// ───────── ⑦ 모임 홈 · 운영자 (정적 예시) ─────────

function viewGroupHome() {
  const dots = [1, 1, 1, 1, 1, 1, 0, 0].map((on) => `<span class="h-4 w-4 rounded-full border-[1.5px] border-primary-container ${on ? 'bg-primary-container' : ''}"></span>`).join('');
  const body = ui.reviewEditing
    ? `<label for="draft" class="${K.small}">후기 고치기</label><textarea id="draft" rows="5" data-act="draft" class="w-full resize-none rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 text-body-sm leading-relaxed focus:border-primary-container focus:outline-none">${esc(ui.reviewText)}</textarea>`
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
      ${IS_STUDENT
        ? `<a href="#/groups" class="${K.back}">${ms('chevron_left', 'text-[20px]')}우리 반</a>
      <div class="-mt-2 space-y-1"><h1 class="${K.h1}">이번 주 친구들 미션</h1><p class="${K.small}">${CLASSROOM.members}명 중 ${CLASSROOM.todayDone}명이 오늘 기록했어요 · 순위 없이 응원만 남겨요</p></div>`
        : `<a href="#/group" class="${K.back}">${ms('chevron_left', 'text-[20px]')}주말 플로깅 크루</a>
      <div class="-mt-2 space-y-1"><h1 class="${K.h1}">이번 주 멤버 실천</h1><p class="${K.small}">8명 중 6명이 기록했어요 · 순위 없이 응원만 남겨요</p></div>`}
      ${ui.feedSent ? `<div role="status" class="rounded-2xl bg-done px-4 py-3 text-body-sm font-medium text-primary">${esc(ui.feedSent)}</div>` : ''}
      ${posts}
      <p class="px-1 ${K.tiny}">${IS_STUDENT
        ? '응원은 우리 반 친구와 선생님만 볼 수 있어요. 댓글 대신 정해진 반응과 문구만 보낼 수 있어요.'
        : '응원은 이 모임 멤버만 볼 수 있어요. 한 기록에 반응은 하나만 남길 수 있고, 한마디는 정해진 문구로 보내요.'}</p>
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

// ───────── 지구 마을 (미니 게임) ─────────

function villageEntry() {
  const info = village.villageInfo();
  const ready = village.readyCount();
  return `
    <a href="#/village" class="tap ${K.card} flex items-center gap-4 p-5">
      <img src="${IMG}/village/earth.webp" alt="" aria-hidden="true" class="h-14 w-12 shrink-0 object-contain">
      <div class="flex-1 space-y-0.5">
        <div class="flex items-center gap-1.5">${ms('public', 'text-[18px] text-primary')}<h2 class="${K.h2}">지구 마을</h2></div>
        <p class="flex items-center gap-1 text-body-sm font-medium">${info.name} · ${village.LEAF} 나뭇잎 ${info.leaves}개</p>
        <p class="${K.small}">${ready ? `받을 수 있는 퀘스트 보상이 ${ready}개 있어요` : '리사의 부탁을 들어주고 섬을 가꿔요'}</p>
      </div>
      ${ready ? `<span class="${K.pill} bg-tertiary-fixed px-2.5 font-bold text-tertiary" aria-label="받을 보상 ${ready}개">${ready}</span>` : ''}
      ${chev}
    </a>`;
}

function viewVillage() {
  const info = village.villageInfo();
  const qs = village.quests();
  const story = qs.find((q) => q.kind === 'story' && !q.claimed);
  const say = ui.placing
    ? `${village.josa(village.ITEMS[ui.placing].name, '을', '를')} 어디에 놓을까? 빈 땅을 눌러 줘!`
    : story
      ? (story.complete ? '고마워! 아래에서 보상을 받아 줘.' : story.say)
      : '부탁을 모두 들어줬어! 이번 주 퀘스트로 섬을 계속 가꿔 보자.';

  const cells = [];
  for (let y = 0; y < village.GRID; y++) {
    for (let x = 0; x < village.GRID; x++) {
      const c = village.cellState(x, y, info);
      if (!c.land) { cells.push('<div class="sea" aria-hidden="true"></div>'); continue; }
      const shade = (x + y) % 2 ? 'b' : 'a';
      if (c.home) {
        cells.push(`<div class="tile ${shade} home"><img src="${IMG}/village/earth.webp" alt="지구지킴이"></div>`);
        continue;
      }
      const target = ui.placing && !c.item ? 'target' : '';
      const label = c.item ? `${village.ITEMS[c.item].name}, 눌러서 치우기` : ui.placing ? '여기에 놓기' : '빈 땅';
      cells.push(`<button type="button" class="tile ${shade} ${target}" data-act="tile" data-x="${x}" data-y="${y}" aria-label="${label}">
        ${c.item ? `<svg viewBox="0 0 40 40" aria-hidden="true">${village.ITEM_SVG[c.item]}</svg>` : ''}</button>`);
    }
  }

  const questRow = (q) => `
    <div class="${K.card} flex items-center gap-3 px-4 py-3.5 ${q.claimed ? 'opacity-60' : ''}">
      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="text-body-md font-medium">${esc(q.title)}</div>
        <div class="flex items-center gap-2">${bar((q.progress / q.need) * 100, 'flex-1')}<span class="shrink-0 text-label-md text-on-surface-variant">${q.progress}/${q.need}</span></div>
        ${q.unlocks && !q.claimed ? `<div class="${K.tiny}">보상으로 ${village.josa(village.ITEMS[q.unlocks].name, '을', '를')} 만들 수 있어요</div>` : ''}
      </div>
      ${q.claimed
        ? `<span class="shrink-0 ${K.small}">받음</span>`
        : `<button type="button" class="${btn(q.complete ? 'solid' : 'line', 'min-w-[64px] disabled:opacity-50')}" data-act="claim" data-id="${q.key}" ${q.complete ? '' : 'disabled'}>${village.LEAF}${q.reward}</button>`}
    </div>`;
  const group = (title, list) => (list.length ? `<section class="space-y-2.5"><h2 class="${K.h2} px-1">${title}</h2>${list.map(questRow).join('')}</section>` : '');
  const questsHtml = `
    ${group('리사의 부탁', qs.filter((q) => q.kind === 'story' && !q.claimed))}
    ${group('오늘', qs.filter((q) => q.kind === 'day'))}
    ${group('이번 주', qs.filter((q) => q.kind === 'week'))}
    <p class="px-1 ${K.small}">퀘스트는 실제 미션 기록으로 채워져요. 기록은 <a class="font-medium text-primary underline underline-offset-2" href="#/today">미션</a> 화면에서 남겨요.</p>`;

  const build = `
    <div class="grid grid-cols-3 gap-2">
      ${Object.entries(village.ITEMS).map(([key, it]) => {
        const open = village.isUnlocked(key, info);
        const afford = info.leaves >= it.cost;
        const note = !open ? `${village.unlockText(key)} 열려요` : afford ? '' : `나뭇잎 ${it.cost - info.leaves}개 더 필요`;
        return `<button type="button" class="tap flex flex-col items-center gap-0.5 rounded-2xl border-[1.5px] px-1.5 pb-2.5 pt-2 ${ui.placing === key ? 'border-primary-container bg-secondary-container/60' : 'border-hairline bg-surface-container-lowest'} disabled:cursor-default disabled:bg-surface-container-low" data-act="pick-item" data-id="${key}" ${open && afford ? '' : 'disabled'} aria-pressed="${ui.placing === key}">
          <svg viewBox="0 0 40 40" aria-hidden="true" class="item-art ${open ? '' : 'locked'}">${village.ITEM_SVG[key]}</svg>
          <b class="text-body-sm font-semibold">${open ? it.name : '???'}</b>
          <span class="inline-flex items-center gap-0.5 text-center text-label-sm leading-snug text-on-surface-variant">${note || `${village.LEAF}${it.cost}`}</span>
        </button>`;
      }).join('')}
    </div>
    <p class="px-1 ${K.small}">놓은 물건을 누르면 치울 수 있어요. 치우면 나뭇잎을 그대로 돌려받아요.</p>`;

  return `
    <div class="${K.screen} gap-5 pt-3">
      <a href="#/forest" class="${K.back}">${ms('chevron_left', 'text-[20px]')}나의 숲</a>
      <div class="-mt-3 flex items-end justify-between gap-2">
        <div class="space-y-0.5"><h1 class="${K.h1}">지구 마을</h1><p class="${K.meta}">${info.name} · ${info.nextText}</p></div>
        <div class="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-lowest px-3 py-2 text-body-md" aria-label="나뭇잎 ${info.leaves}개">${village.LEAF}<b>${info.leaves}</b></div>
      </div>

      <div class="flex items-end gap-2">
        <img src="${IMG}/village/risa.webp" alt="리사" class="w-16 shrink-0">
        <p class="flex-1 rounded-[1rem_1rem_1rem_0.25rem] border border-amber/20 bg-oat/70 px-4 py-3 font-serif text-body-sm leading-relaxed">${esc(say)}</p>
      </div>

      <section class="island" aria-label="섬 지도, ${info.size}칸 × ${info.size}칸">${cells.join('')}</section>

      ${ui.placing ? `<div class="flex items-center justify-between rounded-2xl bg-done px-4 py-2 text-body-sm text-primary"><span>${village.ITEMS[ui.placing].name} 놓는 중</span><button type="button" class="${btn('ghost')}" data-act="cancel-place">그만두기</button></div>` : ''}

      <div class="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1" role="group" aria-label="보기 전환">
        ${[['quest', `퀘스트${qs.some((q) => q.complete && !q.claimed) ? ' ●' : ''}`], ['build', '꾸미기']].map(([id, label]) => `<button type="button" class="tap h-10 rounded-full text-label-md ${ui.villageTab === id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant'}" data-act="village-tab" data-id="${id}" aria-pressed="${ui.villageTab === id}">${label}</button>`).join('')}
      </div>
      ${ui.villageTab === 'quest' ? questsHtml : build}
    </div>`;
}

function openRemove(x, y, item) {
  const it = village.ITEMS[item];
  sheet(`${it.name} 치우기`, `
    <h2 class="${K.h2}">${village.josa(it.name, '을', '를')} 치울까요?</h2>
    <p class="${K.small}">나뭇잎 ${it.cost}개를 그대로 돌려받아요. 다른 자리에 다시 놓을 수 있어요.</p>
    <button type="button" class="${btn('solid', 'mt-2 h-12')}" data-act="remove-item" data-x="${x}" data-y="${y}">치우기</button>
    <button type="button" class="${btn('ghost')}" data-act="close">그대로 두기</button>`);
}

// ───────── 라우터 ─────────

const ROUTES = {
  start: { view: viewStart, tab: null },
  today: { view: viewToday, tab: 'today' },
  login: { view: viewLogin, tab: null },
  record: { view: viewRecord, tab: 'record' },
  forest: { view: viewForest, tab: 'today' },
  read: { view: viewRead, tab: 'read' },
  groups: { view: IS_STUDENT ? viewClass : viewGroups, tab: 'groups' },
  group: { view: IS_STUDENT ? viewClass : viewGroupHome, tab: 'groups' },
  feed: { view: viewFeed, tab: 'groups' },
  village: { view: viewVillage, tab: 'today' }
};

function currentRoute() {
  if (!AUDIENCE) return 'start';
  const name = location.hash.replace(/^#\/?/, '') || 'today';
  if (name === 'start' || (name === 'village' && !IS_STUDENT)) return 'today';
  return ROUTES[name] ? name : 'today';
}

// 하단 탭 막대: 지금 탭은 틴트 + 채운 아이콘, 나머지는 회색 윤곽 아이콘
const NAV_ICON = IS_STUDENT
  ? { today: 'check_circle', record: 'history_edu', groups: 'group', read: 'school' }
  : { today: 'eco', record: 'calendar_today', groups: 'groups', read: 'menu_book' };

function renderNav(tab) {
  $nav.classList.toggle('hidden', !tab);
  $nav.innerHTML = `
    <div class="flex items-start justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
      ${['today', 'record', 'groups', 'read'].map((t) => {
        const on = t === tab;
        return `<a href="#/${t}" class="tap flex min-h-[44px] min-w-[64px] flex-col items-center gap-0.5 ${on ? 'text-primary' : 'text-outline'}" ${on ? 'aria-current="page"' : ''}>
          ${ms(NAV_ICON[t], 'text-[26px]', on)}<span class="text-[10px] font-medium leading-3">${COPY.nav[t]}</span>
        </a>`;
      }).join('')}
    </div>`;
}

function render(keepScroll = false) {
  const route = ROUTES[currentRoute()];
  const y = window.scrollY;
  $app.innerHTML = route.view();
  mountClimateCharts($app);
  renderNav(route.tab);
  window.scrollTo(0, keepScroll ? y : 0);
  syncNavbar();
}

function syncNavbar() {
  const bar = document.querySelector('.navbar');
  if (bar) bar.dataset.scrolled = String(window.scrollY > 40);
}
window.addEventListener('scroll', syncNavbar, { passive: true });

window.addEventListener('hashchange', () => { closeSheet(); ui.placing = null; render(); });

// 화면 안의 모든 버튼은 data-act 하나로 처리한다
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  const today = store.dateKey();
  switch (act) {
    case 'choose-audience':
      chooseAudience(id);
      return;
    case 'switch-audience':
      resetAudience();
      return;
    case 'toggle':
      store.toggleRecord(today, id);
      break;
    case 'picker':
      openPicker();
      return;
    case 'add-pick':
      store.addPick(today, id);
      closeSheet();
      toast(`'${cardById[id].title}' ${COPY.added}`);
      break;
    case 'close':
      closeSheet();
      return;
    case 'login':
      toast('로그인은 2단계에서 연결돼요. 지금은 이 기기에 저장돼요.');
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
    case 'village-tab':
      ui.villageTab = id;
      ui.placing = null;
      break;
    case 'claim': {
      const q = village.quests().find((x) => x.key === id);
      if (q && q.complete && store.claimQuest(q.key, q.reward)) {
        toast(q.unlocks ? `나뭇잎 ${q.reward}개를 받았어요. ${village.josa(village.ITEMS[q.unlocks].name, '을', '를')} 만들 수 있어요!` : `나뭇잎 ${q.reward}개를 받았어요`);
      }
      break;
    }
    case 'pick-item':
      ui.placing = ui.placing === id ? null : id;
      render(true);
      if (ui.placing) window.scrollTo({ top: document.querySelector('.island').offsetTop - 80, behavior: 'smooth' });
      return;
    case 'cancel-place':
      ui.placing = null;
      break;
    case 'tile': {
      const x = Number(el.dataset.x);
      const y = Number(el.dataset.y);
      const info = village.villageInfo();
      const c = village.cellState(x, y, info);
      if (c.item && !ui.placing) {
        openRemove(x, y, c.item);
        return;
      }
      if (!ui.placing || c.item) return;
      if (info.leaves < village.ITEMS[ui.placing].cost) {
        ui.placing = null;
        break;
      }
      store.placeItem(x, y, ui.placing);
      const after = village.villageInfo();
      store.raiseVillageLevel(after.level);
      if (after.level > info.level) toast(`섬이 넓어졌어요! 이제 ${village.josa(after.name, '이에요', '예요')}`);
      if (after.leaves < village.ITEMS[ui.placing].cost) ui.placing = null;
      break;
    }
    case 'remove-item':
      store.removeItem(Number(el.dataset.x), Number(el.dataset.y));
      closeSheet();
      break;
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
  if (e.target.dataset.act === 'join') {
    e.preventDefault();
    toast('학급 참여는 2단계에서 연결돼요. 지금은 이 기기에 저장돼요.');
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
