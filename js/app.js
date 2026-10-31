// 화면 라우터와 화면들. 해시(#/today 등)로 이동하고, 화면마다 HTML 문자열을 그려 넣는다.
// 첫 실행에는 대상 고르기(#/start)를 보여 주고, 고른 대상(학생·성인)에 맞는 카드·문구·화면으로 들어간다.
import { CARDS, LEVEL_LABEL, STAGES, TOPICS, POSTS, NEWSLETTER, PLEDGE, BEE_POST_ID, GROUPS, CLASSROOM, FEED, REACTIONS, PHRASES, REVIEW_DRAFT, COPY } from './data.js';
import { AUDIENCE, IS_STUDENT, chooseAudience, resetAudience } from './audience.js';
import * as store from './store.js';
import { mountClimateCharts } from './climate-chart.js';
import { achievementsFold, mountAchievements } from './achievements.js';
import { seriesSection, mountSeries } from './series.js';
import * as village from './village.js';

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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const icon = {
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  chevL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  cup: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B4651E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M6 8h11l-1.2 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6 8z"/><path d="M5 8h13"/><path d="M9 4.5c0 1 .8 1.5.8 2.5M12.5 4c0 1 .8 1.5.8 2.5"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#55625A" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="position:absolute;left:14px;top:13px"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/></svg>'
};

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

// 성장 6단계 그림: 학생용은 지구지킴이 캐릭터(시트 Lv.1~6에서 잘라 냄), 성인용은 식물 일러스트(SVG)
const stageImage = (si) => (IS_STUDENT ? `images/forest/stage${si + 1}.webp` : `images/forest/plant${si + 1}.svg`);
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

// ───────── 첫 실행 · 대상 고르기 ─────────

function viewStart() {
  return `
    <div class="screen start" style="padding-top:56px;min-height:100dvh;padding-bottom:24px">
      <div class="col" style="gap:12px;align-items:flex-start">
        <div aria-hidden="true" style="width:56px;height:56px;border-radius:18px;background:var(--green-soft);display:flex;align-items:center;justify-content:center">
          <svg width="30" height="30" viewBox="0 0 44 44"><path d="M22 36V24" stroke="#2E6A4C" stroke-width="2.4" stroke-linecap="round"/><path d="M22 24c-6 0-8-4.5-8-7 4.5 0 8 2.2 8 7zM22 24c6 0 8-4.5 8-7-4.5 0-8 2.2-8 7z" fill="#2E6A4C"/></svg>
        </div>
        <h1 class="serif" style="margin-top:8px;font-size:26px;line-height:1.35">어디에서 실천할지<br>먼저 골라 주세요</h1>
        <p style="font-size:14px;line-height:1.6;color:var(--muted)">고른 쪽에 맞춰 실천 카드와 화면이 달라져요.</p>
      </div>
      <div class="col" style="gap:12px;margin-top:20px">
        <button type="button" class="choice" data-act="choose-audience" data-id="student">
          <span class="badge" style="background:var(--blue-bg);color:var(--blue)">중학생</span>
          <b>학생으로 시작하기</b>
          <span class="small">학교·집에서 하는 오늘의 미션, 반 친구들과 함께 키우는 우리 반 숲, 지구 마을</span>
        </button>
        <button type="button" class="choice" data-act="choose-audience" data-id="adult">
          <span class="badge">성인</span>
          <b>성인으로 시작하기</b>
          <span class="small">출퇴근·카페·장보기 속 실천 카드, 동네 모임, 생태 성찰 읽기</span>
        </button>
      </div>
      <div class="small" style="margin-top:auto">기록은 이 기기에만 저장되고, 학생용과 성인용 기록은 따로 쌓여요. 나중에 기록 화면에서 바꿀 수 있어요.</div>
    </div>`;
}

// ───────── ① 오늘 ─────────

function viewToday() {
  const today = store.dateKey();
  const now = new Date();
  const picks = store.getPicks(today);
  const points = store.totalPoints();
  const f = forestInfo(points);
  const post = weeklyPost();
  const saved = store.countCard(COPY.effect.card, monthPrefix());
  const anyToday = picks.some((id) => store.isDone(today, id));

  const cards = picks.map((id) => {
    const c = cardById[id];
    const done = store.isDone(today, id);
    return `
      <div class="practice">
        <div class="col" style="flex:1">
          <div style="font-size:15px;font-weight:500">${IS_STUDENT ? `<span class="place">${esc(c.area)}</span>` : ''}${esc(c.title)}</div>
          <div class="small">${LEVEL_LABEL[c.level]} · ${esc(c.hint)}</div>
        </div>
        ${done
          ? `<button type="button" class="btn btn-solid" data-act="toggle" data-id="${id}" aria-pressed="true" aria-label="${esc(c.title)} 기록 취소">${icon.check}했어요</button>`
          : `<button type="button" class="btn btn-line" data-act="toggle" data-id="${id}" aria-pressed="false">기록하기</button>`}
      </div>`;
  }).join('');

  const e = COPY.effect;
  const effect = saved > 0
    ? `<strong>${e.done(saved)}</strong><span>${e.doneSub(saved)}</span>`
    : `<strong>${e.empty}</strong><span>${e.emptySub}</span>`;

  const cls = CLASSROOM;
  const news = IS_STUDENT
    ? `<a href="#/groups" class="card s link-card">
        <div class="row"><div class="eyebrow">우리 반 소식 · ${cls.name}</div><span class="badge">예시</span></div>
        <div style="font-size:14px;font-weight:500">반 공동 미션 · ${cls.mission.title} ${cls.mission.now}/${cls.mission.need}</div>
        <div class="small">오늘 우리 반 ${cls.members}명 중 ${cls.todayDone}명이 미션을 했어요</div>
      </a>`
    : `<a href="#/group" class="card s link-card">
        <div class="row"><div class="eyebrow">내 모임 소식</div><span class="badge">예시</span></div>
        <div style="font-size:14px;font-weight:500">주말 플로깅 크루 · 일요일 오전 10시</div>
        <div class="small">멤버 8명 중 6명이 이번 주 실천을 기록했어요</div>
      </a>`;

  return `
    <div class="screen">
      <div class="row" style="align-items:flex-start">
        <div class="col">
          <div class="meta">${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일</div>
          <h1 class="title">${COPY.todayTitle}</h1>
        </div>
        <a href="#/login" class="btn btn-line" style="font-size:13px;flex:none">${IS_STUDENT ? '반 참여' : '로그인'}</a>
      </div>

      <section class="card s pledge" aria-label="저탄소 실천 다짐">
        <strong>${PLEDGE.lead}</strong>
        <span>${PLEDGE.pledge}</span>
      </section>

      <section class="card">
        <div class="eyebrow">${COPY.question}</div>
        <p class="serif" style="font-size:19px;line-height:1.5">${esc(post.question)}</p>
        <a href="#/read" class="btn btn-soft" style="align-self:flex-start">${COPY.questionBtn}</a>
      </section>

      <section class="col" style="gap:10px">
        <div class="row base">
          <h2 class="h2">${COPY.picksTitle}</h2>
          <button type="button" class="btn btn-ghost" data-act="picker" style="font-size:13px;padding:0 4px">${COPY.pickMore}</button>
        </div>
        ${cards}
        ${anyToday ? '' : `<div class="small">${COPY.firstHint}</div>`}
      </section>

      <a href="#/forest" class="card link-card forest-link">
        <img class="stage-thumb ${stageClass}" src="${stageImage(f.si)}" alt="" aria-hidden="true">
        <div class="col" style="flex:1">
          <div class="eyebrow">나의 숲</div>
          <div style="font-size:14px;font-weight:500">${f.name} 단계 · ${points}점</div>
          <div class="progress"><div style="width:${f.pct}%"></div></div>
          <div class="small">${f.nextText}</div>
        </div>
        <span style="color:var(--muted)">${icon.chevR}</span>
      </a>

      ${IS_STUDENT ? villageEntry() : ''}

      <div class="effect">${icon.cup}<div class="col" style="gap:2px">${effect}</div></div>

      ${news}
    </div>`;
}

function openPicker() {
  const today = store.dateKey();
  const picks = store.getPicks(today);
  const areas = [...new Set(CARDS.map((c) => c.area))];
  const rows = areas.map((area) => `
    <div class="eyebrow" style="margin-top:6px">${esc(area)}</div>
    ${CARDS.filter((c) => c.area === area).map((c) => {
      const has = picks.includes(c.id);
      return `<button type="button" class="pick-row" data-act="add-pick" data-id="${c.id}" ${has ? 'disabled' : ''}>
        <span>${esc(c.title)}</span><span class="small">${has ? '오늘 화면에 있음' : LEVEL_LABEL[c.level]}</span>
      </button>`;
    }).join('')}`).join('');
  $layer.innerHTML = `
    <div class="sheet">
      <button type="button" class="dim" data-act="close" aria-label="닫기"></button>
      <div class="panel" role="dialog" aria-label="${COPY.pickerTitle}">
        <div class="h2">${COPY.pickerTitle}</div>
        <div class="small">${COPY.pickerSub}</div>
        ${rows}
        <button type="button" class="btn btn-ghost" data-act="close" style="color:var(--muted)">닫기</button>
      </div>
    </div>`;
}

// ───────── ② 로그인 ─────────

function viewLogin() {
  if (IS_STUDENT) return viewJoinClass();
  return `
    <div class="screen" style="padding-top:56px;min-height:100dvh;padding-bottom:24px">
      <div class="col" style="gap:12px;align-items:flex-start">
        <div aria-hidden="true" style="width:56px;height:56px;border-radius:18px;background:var(--green-soft);display:flex;align-items:center;justify-content:center">
          <svg width="30" height="30" viewBox="0 0 44 44"><path d="M22 36V24" stroke="#2E6A4C" stroke-width="2.4" stroke-linecap="round"/><path d="M22 24c-6 0-8-4.5-8-7 4.5 0 8 2.2 8 7zM22 24c6 0 8-4.5 8-7-4.5 0-8 2.2-8 7z" fill="#2E6A4C"/></svg>
        </div>
        <h1 class="serif" style="margin-top:8px;font-size:26px;line-height:1.35">기록을 안전하게<br>저장해요</h1>
        <p style="font-size:14px;line-height:1.6;color:var(--muted)">로그인하면 기기를 바꿔도 기록과 숲이 그대로 남아요. 알림 설정과 모임 참여도 이때부터 쓸 수 있어요.</p>
      </div>
      <div class="col" style="gap:10px;margin-top:24px">
        <button type="button" data-act="login" style="height:52px;border-radius:14px;border:none;background:#FEE500;color:#191919;font:500 15px var(--sans);display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.9 4 3 7.1 3 10.9c0 2.4 1.6 4.5 4 5.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.4 0 .9.1 1.2.1 5.1 0 9-3.1 9-6.9S17.1 4 12 4z" fill="#191919"/></svg>
          카카오로 시작하기
        </button>
        <button type="button" data-act="login" style="height:52px;border-radius:14px;border:1px solid var(--line-strong);background:#FFF;color:var(--text);font:500 15px var(--sans);display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.2 22 12 22z" fill="#34A853"/><path d="M6.4 13.9c-.2-.6-.3-1.3-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.2 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335"/></svg>
          구글로 시작하기
        </button>
        <a href="#/today" class="btn btn-ghost">로그인 없이 먼저 둘러보기</a>
      </div>
      <div class="card s" style="margin-top:auto">
        <div class="eyebrow">받는 정보</div>
        <div class="small" style="color:var(--text-2);line-height:1.6">필수: 닉네임 · 선택: 프로필 사진<br>비밀번호는 저장하지 않아요. 탈퇴하면 기록과 연결 정보를 함께 지워요.</div>
      </div>
    </div>`;
}

// 학생용 로그인: 실명·연락처 없이 학급 코드와 닉네임만 (화면만, 2단계에서 연결)
function viewJoinClass() {
  return `
    <div class="screen" style="padding-top:56px;min-height:100dvh;padding-bottom:24px">
      <div class="col" style="gap:12px;align-items:flex-start">
        <h1 class="serif" style="font-size:26px;line-height:1.35">우리 반에<br>참여해요</h1>
        <p style="font-size:14px;line-height:1.6;color:var(--muted)">선생님께 받은 학급 코드를 넣으면 우리 반 숲과 공동 미션에 함께할 수 있어요.</p>
      </div>
      <form class="col" data-act="join" style="gap:12px;margin-top:20px">
        <label for="class-code" class="eyebrow">학급 코드</label>
        <input id="class-code" type="text" maxlength="8" placeholder="예: HB2-3K7" autocomplete="off">
        <label for="nickname" class="eyebrow">닉네임</label>
        <input id="nickname" type="text" maxlength="10" placeholder="친구들에게 보일 이름" autocomplete="off">
        <button type="submit" class="btn btn-solid" style="height:48px">참여하기</button>
        <a href="#/today" class="btn btn-ghost">나중에 하기</a>
      </form>
      <div class="card s" style="margin-top:auto">
        <div class="eyebrow">받는 정보</div>
        <div class="small" style="color:var(--text-2);line-height:1.6">학급 코드와 닉네임만 받아요. 이름·전화번호·사진은 받지 않아요.<br>만 14세 미만은 보호자 동의를 받은 뒤 참여해요.</div>
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
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const stats = top.length
    ? `<div class="stats">${top.map(([id, n]) => `<div class="stat"><b>${n}${cardById[id].unit}</b><span>${esc(cardById[id].stat)}</span></div>`).join('')}</div>`
    : '<div class="small">이번 달 기록이 쌓이면 여기에 개수로 보여 드려요.</div>';

  // 챌린지: 첫 기록한 날부터 40일
  const days = Object.keys(records).sort();
  let challenge = '<div class="small">첫 기록을 남기면 40일 챌린지가 시작돼요.</div>';
  if (days.length) {
    const start = new Date(days[0] + 'T00:00:00');
    const nth = Math.min(40, Math.floor((new Date(todayKey + 'T00:00:00') - start) / 864e5) + 1);
    challenge = `
      <div class="row base"><div class="h2 sm">40일 챌린지</div><div class="meta">${nth}일째</div></div>
      <div class="progress lg" role="progressbar" aria-label="챌린지 진행" aria-valuenow="${nth}" aria-valuemin="0" aria-valuemax="40"><div style="width:${(nth / 40) * 100}%"></div></div>
      <div class="small">혼자 참여 중 · <a href="${COPY.together.href}">${COPY.together.text}</a></div>`;
  }

  return `
    <div class="screen">
      <div class="row end"><h1 class="title">나의 기록</h1></div>
      <section class="card" style="padding:14px 12px;gap:6px" aria-label="${y}년 ${mo + 1}월 기록 달력">
        <div class="row">
          <button type="button" class="icon-btn" data-act="cal-prev" aria-label="이전 달">${icon.chevL}</button>
          <div style="font-size:15px;font-weight:700">${y}년 ${mo + 1}월</div>
          <button type="button" class="icon-btn" data-act="cal-next" aria-label="다음 달" ${isThisMonth ? 'disabled' : ''}>${icon.chevR}</button>
        </div>
        <div class="cal-head">${WEEKDAYS.map((w) => `<div>${w}</div>`).join('')}</div>
        <div class="cal">${cells.join('')}</div>
        <div class="legend"><span><i style="background:var(--green-mid)"></i>1~2개</span><span><i style="background:var(--green)"></i>3개 이상</span></div>
      </section>
      ${isThisMonth ? gapNote(records, now) : ''}
      <section class="col" style="gap:10px">
        <h2 class="h2">이번 달 쌓인 변화</h2>
        ${stats}
      </section>
      <section class="card">${challenge}</section>
      ${achievementsFold({ fold: 'card', title: 'h2 sm', meta: 'meta' })}
      <div class="row" style="padding:0 2px">
        <div class="small">지금은 <b>${COPY.label}</b>으로 쓰고 있어요</div>
        <button type="button" class="btn btn-ghost" data-act="switch-audience" style="font-size:13px;flex:none">대상 바꾸기</button>
      </div>
      <div class="small" style="align-self:center">다른 디자인: <a href="stitch/#/record">Stitch 라이트</a> · <a href="monitor/#/record">기후 모니터(다크)</a> · <a href="climate/#/earth">기후 홈</a> · <a href="apple/#/record">iOS 스타일</a> · <a href="material/#/record">Material 3</a> · <a href="line/#/record">LINE 스타일</a></div>
    </div>`;
}

// 끊긴 날을 탓하지 않고 다시 시작한 날을 알려 준다
function gapNote(records, now) {
  const has = (d) => (records[store.dateKey(d)] || []).length > 0;
  const day = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  if (!Object.keys(records).length) return '';
  if (!has(day(0)) && has(day(1))) return '';
  // 오늘부터 거꾸로: 기록한 날 → 빈 날 묶음 → 그 전에 기록한 날이 있으면 안내
  let i = 0;
  if (!has(day(0))) {
    while (i < 60 && !has(day(i))) i++;
    if (i >= 60) return '';
    return `<div class="note">${i}일 동안 쉬었어요. 괜찮아요, 오늘 한 장으로 다시 시작해요.</div>`;
  }
  while (i < 60 && has(day(i))) i++;
  const restart = day(i - 1);
  let j = i;
  while (j < 60 && !has(day(j))) j++;
  if (j >= 60 || j === i) return '';
  const fmt = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const gapText = j - i === 1 ? `${fmt(day(i))}엔` : `${fmt(day(j - 1))}부터 ${fmt(day(i))}까지`;
  return `<div class="note">${gapText} 기록이 없었지만 괜찮아요. ${fmt(restart)}에 다시 시작했어요.</div>`;
}

// ───────── ④ 나의 숲 ─────────

function viewForest() {
  const points = store.totalPoints();
  const f = forestInfo(points);
  const { reads } = store.getState();

  const animals = [
    { name: '벌', cond: "꽃 단계에서 '벌이 사라지면' 카드 읽기", now: reads[BEE_POST_ID] || 0, need: 1, gate: f.si >= 3 },
    { name: '새', cond: `'${cardById.nature.title}' 기록 3회`, now: store.countCard('nature'), need: 3, gate: true },
    { name: '다람쥐', cond: "'쓰레기 3개 줍기' 기록 5회", now: store.countCard('pickup'), need: 5, gate: true }
  ].map((a) => ({ ...a, ok: a.gate && a.now >= a.need }));
  const [bee, bird, squirrel] = animals;


  const demo = DEMO ? `
    <div class="demo">
      <button type="button" class="btn btn-line" data-act="demo" data-id="${COPY.effect.card}">실천 기록 +1점</button>
      <button type="button" class="btn btn-line" data-act="demo" data-id="nature">자연 관찰 +1회</button>
      <button type="button" class="btn btn-line" data-act="demo" data-id="pickup">쓰레기 줍기 +1회</button>
      <button type="button" class="btn btn-line" data-act="demo-bee">벌 카드 읽기</button>
    </div>
    <div class="tiny">시연 모드 버튼입니다. 누른 만큼 오늘 기록이 더해집니다.</div>` : '';

  return `
    <div class="screen tight">
      <a href="#/today" class="back">${icon.chevL}오늘</a>
      <div class="col">
        <h1 class="title sm">나의 숲</h1>
        <div class="meta">${COPY.forestMeta}</div>
      </div>
      <section class="forest-art" aria-label="숲 그림">
        <div class="stage-art">
          <img class="main ${stageClass}" src="${stageImage(f.si)}" alt="${IS_STUDENT ? '지구지킴이' : '식물'} ${f.name} 단계 모습">
          <svg class="critters" viewBox="0 0 358 220" aria-hidden="true">
            ${bee.ok ? '<g transform="translate(70,120)"><ellipse rx="9" ry="6" fill="#F2C230" stroke="#1C2620" stroke-width="1.5"/></g>' : ''}
            ${bird.ok ? '<path d="M280 46 q8 -8 16 0 q8 -8 16 0" stroke="#1C2620" stroke-width="2" fill="none" stroke-linecap="round"/>' : ''}
            ${squirrel.ok ? '<g><circle cx="290" cy="196" r="9" fill="#B4651E"/><circle cx="298" cy="187" r="4" fill="#B4651E"/></g>' : ''}
          </svg>
        </div>
        <div class="foot row base">
          <div style="font-size:15px;font-weight:700">${f.name} 단계</div>
          <div class="meta">${points}점 · ${f.nextText}</div>
        </div>
      </section>

      ${IS_STUDENT ? villageEntry() : ''}

      <section class="col" style="gap:8px">
        <h2 class="h2 sm">성장 단계</h2>
        <div class="stages">
          ${STAGES.map(([name, need], i) => {
            const st = i < f.si ? 'done' : i === f.si ? 'now' : '';
            return `<div class="${st}"><b>${name}</b><span>${need}점 · ${i < f.si ? '완료' : i === f.si ? '지금' : '다음'}</span></div>`;
          }).join('')}
        </div>
      </section>

      <section class="col" style="gap:6px">
        <h2 class="h2 sm">함께 사는 동식물</h2>
        ${animals.map((a) => `
          <div class="animal">
            <div class="col" style="gap:2px"><div style="font-size:14px;font-weight:500">${a.name}</div><div class="small">${esc(a.cond)}</div></div>
            <div class="st ${a.ok ? 'on' : ''}">${a.ok ? '열림' : '잠김'} ${a.gate ? `${Math.min(a.now, a.need)}/${a.need}` : '꽃 단계 필요'}</div>
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

  const reflect = `
    ${seriesSection()}
    <section class="col" style="gap:10px" aria-labelledby="climate-h">
      <div class="col" style="gap:2px">
        <h2 id="climate-h" class="h2 sm">기후 4대 지표</h2>
        <div class="small">연도별 추이 · 옆으로 넘기고, 그래프를 누르면 그 해 값이 보여요</div>
      </div>
      <div data-climate-charts></div>
    </section>

    <div class="chips" role="group" aria-label="주제">
      ${TOPICS.map((t) => `<button type="button" class="chip" data-act="topic" data-id="${t.id}" aria-pressed="${ui.readTopic === t.id}">${t.label}</button>`).join('')}
    </div>

    <article class="feature">
      <div class="k">이번 주의 카드 · 카드뉴스 · 원문 읽기</div>
      <h2>${esc(post.title)}</h2>
      <p>${esc(post.intro)}</p>
      <p class="sum">${esc(post.summary)}</p>
      <div class="row" style="margin-top:4px">
        <div class="k">국가기후위기대응위원회 · ${post.date}</div>
        <a href="${post.url}" target="_blank" rel="noopener" class="btn btn-solid" data-act="read-post" data-id="${post.id}">원문 보기</a>
      </div>
    </article>

    <form class="card s" data-act="reflect" style="gap:8px">
      <label for="reflect" class="eyebrow">${COPY.question} · ${esc(post.question)}</label>
      <div style="display:flex;gap:8px">
        <input id="reflect" name="text" type="text" maxlength="200" placeholder="한 줄로 남겨 보세요" autocomplete="off" style="flex:1;min-width:0">
        <button type="submit" class="btn btn-solid">남기기</button>
      </div>
      <div class="small">${COPY.reflectNote}</div>
      ${mine.map((r) => `<div class="mine"><span class="small">${r.date.slice(5).replace('-', '.')}</span> ${esc(r.text)}</div>`).join('')}
    </form>

    <div class="small">카드 ${shown.length}편 · 원문은 국가기후위기대응위원회 누리집에서 읽어요</div>
    <section class="col" style="gap:2px">
      ${shown.map((p) => `
        <a class="post" href="${p.url}" target="_blank" rel="noopener" data-act="read-post" data-id="${p.id}">
          <div class="col" style="flex:1">
            <div class="t">${esc(p.title)}</div>
            <div class="i">${esc(p.intro)}</div>
            <div class="sum">${esc(p.summary)}</div>
            <div class="small">카드뉴스 · ${p.date} · ${p.tag}</div>
          </div>
          <span class="go" aria-hidden="true">원문</span>
        </a>`).join('')}
    </section>`;

  const newsItem = (n) => `
    <article class="card s" style="gap:8px">
      <div class="eyebrow" style="font-size:11px">${n.label} · ${esc(n.source)} · ${n.date}</div>
      <h4 class="serif" style="margin:0;font-size:16px;font-weight:700;line-height:1.45">${esc(n.title)}</h4>
      <ul class="news-lines">${n.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="row">
        <span class="small">${n.act ? `관련 실천 · ${n.act}` : ''}</span>
        <a href="${n.url}" target="_blank" rel="noopener" class="news-go">원문 보기</a>
      </div>
    </article>`;
  const news = `
    <section class="card" style="gap:6px">
      <div style="display:flex;align-items:center;gap:8px"><span class="badge">${NEWSLETTER.issue}</span><span class="small">${NEWSLETTER.published} 발행</span></div>
      <div class="serif" style="font-size:18px;font-weight:700">이번 달 생태 동향</div>
      <div class="small">${NEWSLETTER.intro}</div>
    </section>
    ${NEWSLETTER.sections.map((sec) => `
      <section class="col" style="gap:10px">
        <h3 class="h2 sm">${sec.title}</h3>
        ${sec.items.map(newsItem).join('')}
      </section>`).join('')}
    <div class="small">요약과 링크만 싣습니다. 원문 전문은 출처 누리집에서 읽어요.</div>`;

  return `
    <div class="screen" style="gap:14px">
      <div class="col"><div class="meta">${COPY.readMeta}</div><h1 class="title">${COPY.readTitle}</h1></div>
      ${IS_STUDENT ? '' : `<div class="seg" role="group" aria-label="보기 전환">
        <button type="button" data-act="read-tab" data-id="reflect" aria-pressed="${isReflect}">생태 성찰</button>
        <button type="button" data-act="read-tab" data-id="news" aria-pressed="${!isReflect}">뉴스레터</button>
      </div>`}
      ${isReflect ? reflect : news}
    </div>`;
}

// ───────── ⑥ 모임 찾기 (정적 예시) ─────────

function viewGroups() {
  const modes = [['all', '전체'], ['on', '온라인'], ['off', '오프라인']];
  const list = GROUPS.filter((g) => ui.groupMode === 'all' || g.kind === ui.groupMode);
  return `
    <div class="screen" style="gap:14px">
      <div class="row end">
        <h1 class="title">모임 찾기</h1>
        <button type="button" class="btn btn-soft" data-act="soon">+ 모임 만들기</button>
      </div>
      <div style="position:relative">
        <label for="q" class="sr">모임 검색</label>
        ${icon.search}
        <input id="q" type="search" placeholder="관심 주제나 모임 이름" style="padding-left:40px;border-radius:12px">
      </div>
      <div class="seg" role="group" aria-label="모임 방식">
        ${modes.map(([id, label]) => `<button type="button" data-act="group-mode" data-id="${id}" aria-pressed="${ui.groupMode === id}">${label}</button>`).join('')}
      </div>
      <div class="chips">
        <button type="button" class="chip dashed">지역 선택 안 함</button>
        <button type="button" class="chip">제로웨이스트</button>
        <button type="button" class="chip">기후 공부</button>
        <button type="button" class="chip">플로깅</button>
      </div>
      <div class="small">관심 주제 기준 추천 · ${list.length}개 · 예시 데이터</div>
      ${list.map((g) => `
        <div class="card s" style="gap:8px">
          <div class="row">
            <div style="font-size:16px;font-weight:700">${esc(g.name)}</div>
            <span class="badge" style="background:${g.kind === 'on' ? 'var(--blue-bg)' : 'var(--warm-bg)'};color:${g.kind === 'on' ? 'var(--blue)' : 'var(--warm)'}">${g.kind === 'on' ? '온라인' : '오프라인'}</span>
          </div>
          <div class="meta">${esc(g.topic)} · ${esc(g.place)} · 멤버 ${g.members}명</div>
          <div class="row">
            <div style="font-size:13px">다음 활동 · ${esc(g.next)}</div>
            <a href="#/group" class="btn btn-line">둘러보기</a>
          </div>
        </div>`).join('')}
    </div>`;
}

// ───────── ⑥ 우리 반 · 학생용 (정적 예시) ─────────

function viewClass() {
  const c = CLASSROOM;
  const m = c.mission;
  return `
    <div class="screen" style="gap:14px">
      <div class="row" style="align-items:flex-start">
        <div class="col"><div class="meta">${c.school} · ${c.members}명 · 담임 ${c.teacher}</div><h1 class="title">${c.name}</h1></div>
        <span class="badge">예시</span>
      </div>

      <section class="card forest-link" style="cursor:default">
        <img class="stage-thumb" src="${stageImage(c.forest.stage)}" alt="" aria-hidden="true">
        <div class="col" style="flex:1">
          <div class="eyebrow">우리 반 숲 · ${c.forest.name} 단계</div>
          <div class="progress"><div style="width:${c.forest.pct}%"></div></div>
          <div class="small">${c.forest.next}</div>
        </div>
      </section>
      <div class="small" style="margin-top:-6px;padding:0 2px">내 미션 기록이 우리 반 숲에 더해져요. 누가 몇 번 했는지는 보여 주지 않아요.</div>

      <section class="card s" style="gap:10px">
        <div class="row base"><div class="h2 sm">이번 주 반 공동 미션</div><div class="meta">${m.due}까지</div></div>
        <div style="font-size:15px;font-weight:500">${m.title}</div>
        <div class="progress lg" role="progressbar" aria-label="공동 미션 진행" aria-valuenow="${m.now}" aria-valuemin="0" aria-valuemax="${m.need}"><div style="width:${(m.now / m.need) * 100}%"></div></div>
        <div class="small">${m.now}개 모였어요 · ${m.due}에 선생님이 확인해요</div>
        <button type="button" class="btn btn-soft" data-act="soon" style="align-self:flex-start">내가 모은 것 인증하기</button>
      </section>

      <a href="#/feed" class="card s link-card">
        <div class="row"><div class="h2 sm">친구들 소식</div><span style="color:var(--muted)">${icon.chevR}</span></div>
        <div class="small">오늘 ${c.members}명 중 ${c.todayDone}명이 미션을 했어요 · 응원 남기기</div>
      </a>

      <div class="note" style="background:var(--warm-bg);color:var(--warm)">댓글 대신 정해진 응원 버튼만 쓸 수 있어요. 새 글과 사진은 선생님이 확인한 뒤 반에 보여요.</div>
      <div class="tiny">예시 데이터입니다. 학급 기능은 3단계에서 연결합니다.</div>
    </div>`;
}

// ───────── ⑦ 모임 홈 · 운영자 (정적 예시) ─────────

function viewGroupHome() {
  const dots = [1, 1, 1, 1, 1, 1, 0, 0].map((on) => `<span class="${on ? 'on' : ''}"></span>`).join('');
  const body = ui.reviewEditing
    ? `<label for="draft" class="small">후기 고치기</label><textarea id="draft" rows="5" data-act="draft">${esc(ui.reviewText)}</textarea>`
    : `<p style="font-size:14px;line-height:1.65;white-space:pre-line">${esc(ui.reviewText)}</p>`;
  const actions = ui.reviewShared
    ? '<div role="status" class="note" style="font-weight:500">멤버 8명에게 공유했어요</div>'
    : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" class="btn btn-line" data-act="review-edit">${ui.reviewEditing ? '고치기 완료' : '고치기'}</button>
        <button type="button" class="btn btn-solid" data-act="review-share">멤버에게 공유</button>
      </div>`;
  return `
    <div class="screen tight">
      <a href="#/groups" class="back">${icon.chevL}모임 찾기</a>
      <div class="row" style="align-items:flex-start">
        <div class="col"><h1 class="title sm">주말 플로깅 크루</h1><div class="meta">오프라인 · 서울 마포구 · 멤버 8명</div></div>
        <span class="badge" style="background:var(--green-deep);color:#FFF">운영자</span>
      </div>
      <section class="card s" style="gap:10px">
        <div class="row base"><div class="h2 sm">40일 공동 챌린지</div><div class="meta">10일째</div></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="member-dots" aria-hidden="true">${dots}</div>
          <div style="font-size:13px">이번 주 기록한 멤버 <b>6</b>/8명</div>
        </div>
        <a href="#/feed" class="btn btn-soft" style="justify-content:space-between">멤버 실천 보기 · 응원 남기기 ${icon.chevR}</a>
      </section>
      <section class="card s" style="gap:10px;border:1.5px solid var(--green)">
        <div style="display:flex;align-items:center;gap:8px"><span class="badge">AI 초안</span><span class="small">운영자가 확인해야 멤버에게 공유돼요</span></div>
        <div class="h2 sm">지난 모임 후기</div>
        ${body}
        <div class="small">멤버 기록 6건과 운영자 메모 1개로 만들었어요</div>
        ${actions}
      </section>
      <section class="card s" style="gap:8px">
        <div class="eyebrow">이번 모임 나눔 질문</div>
        <ol class="serif" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:15px;line-height:1.5">
          <li>이번 주 줍다가 가장 놀랐던 쓰레기는 무엇이었나요?</li>
          <li>다음 달에 줄여 볼 일회용품 하나를 고른다면?</li>
        </ol>
      </section>
      <div class="row" style="padding:0 2px">
        <div class="col" style="gap:2px"><div class="small">다음 활동</div><div style="font-size:14px;font-weight:500">일요일 오전 10시 · 플로깅</div></div>
        <button type="button" class="btn btn-soft" data-act="soon">플로깅 키트 열기</button>
      </div>
      <div class="tiny">예시 데이터입니다. 모임 기능은 3단계에서 연결합니다.</div>
    </div>`;
}

// ───────── ⑧ 모임 피드 · 응원 (정적 예시) ─────────

function viewFeed() {
  const posts = FEED.map((p) => {
    const mine = ui.feedPicks[p.id];
    return `
      <article class="card s" style="gap:8px;padding:12px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" aria-hidden="true" style="background:${p.bg}">${esc(p.name.charAt(0))}</div>
          <div class="col" style="flex:1;gap:1px"><div style="font-size:14px;font-weight:700">${esc(p.name)}</div><div class="small">${p.when}</div></div>
          <span class="badge">${esc(p.tag)}</span>
          <button type="button" class="icon-btn" data-act="soon" aria-label="신고하거나 숨기기" style="margin:-6px -10px -6px 0;color:var(--muted)">${icon.more}</button>
        </div>
        <p style="font-size:14px;line-height:1.6">${esc(p.memo)}</p>
        <div style="display:flex;gap:6px;align-items:center">
          ${REACTIONS.map((label, i) => `<button type="button" class="react" data-act="react" data-id="${p.id}" data-i="${i}" aria-pressed="${mine === i}">${label} ${p.base[i] + (mine === i ? 1 : 0)}</button>`).join('')}
          <button type="button" class="icon-btn" data-act="phrase" data-id="${p.id}" aria-label="${esc(p.name)}${COPY.nim}에게 한마디 보내기" style="flex:none;background:var(--green);color:#FFF;border-radius:12px">${icon.send}</button>
        </div>
      </article>`;
  }).join('');
  return `
    <div class="screen tight">
      ${IS_STUDENT
        ? `<a href="#/groups" class="back">${icon.chevL}우리 반</a>
      <div class="col"><h1 class="title sm">이번 주 친구들 미션</h1><div class="meta">${CLASSROOM.members}명 중 ${CLASSROOM.todayDone}명이 오늘 기록했어요 · 순위 없이 응원만 남겨요</div></div>`
        : `<a href="#/group" class="back">${icon.chevL}주말 플로깅 크루</a>
      <div class="col"><h1 class="title sm">이번 주 멤버 실천</h1><div class="meta">8명 중 6명이 기록했어요 · 순위 없이 응원만 남겨요</div></div>`}
      ${ui.feedSent ? `<div role="status" class="note" style="font-weight:500">${esc(ui.feedSent)}</div>` : ''}
      ${posts}
      <div class="small" style="padding:0 2px">${IS_STUDENT
        ? '응원은 우리 반 친구와 선생님만 볼 수 있어요. 댓글 대신 정해진 반응과 문구만 보낼 수 있어요.'
        : '응원은 이 모임 멤버만 볼 수 있어요. 한 기록에 반응은 하나만 남길 수 있고, 한마디는 정해진 문구로 보내요.'}</div>
    </div>`;
}

function openPhrases(postId) {
  const p = FEED.find((x) => x.id === postId);
  $layer.innerHTML = `
    <div class="sheet">
      <button type="button" class="dim" data-act="close" aria-label="닫기"></button>
      <div class="panel" role="dialog" aria-label="한마디 보내기">
        <div class="h2">${esc(p.name)}${COPY.nim}에게 한마디</div>
        <div class="small">직접 쓰는 글 대신 따뜻한 문구를 골라 보내요</div>
        ${PHRASES.map((t) => `<button type="button" class="pick-row" data-act="send-phrase" data-id="${p.id}">${t}</button>`).join('')}
        <button type="button" class="btn btn-ghost" data-act="close" style="color:var(--muted)">취소</button>
      </div>
    </div>`;
}

// ───────── 지구 마을 (미니 게임) ─────────

function villageEntry() {
  const info = village.villageInfo();
  const ready = village.readyCount();
  return `
    <a href="#/village" class="card s link-card village-entry">
      <img src="images/village/earth.webp" alt="" aria-hidden="true">
      <div class="col" style="flex:1;gap:2px">
        <div class="eyebrow">지구 마을</div>
        <div style="font-size:14px;font-weight:500">${info.name} · 나뭇잎 ${info.leaves}개</div>
        <div class="small">${ready ? `받을 수 있는 퀘스트 보상이 ${ready}개 있어요` : '리사의 부탁을 들어주고 섬을 가꿔요'}</div>
      </div>
      ${ready ? `<span class="dot-badge" aria-label="받을 보상 ${ready}개">${ready}</span>` : ''}
      <span style="color:var(--muted)">${icon.chevR}</span>
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
        cells.push(`<div class="tile ${shade} home"><img src="images/village/earth.webp" alt="지구지킴이"></div>`);
        continue;
      }
      const target = ui.placing && !c.item ? 'target' : '';
      const label = c.item ? `${village.ITEMS[c.item].name}, 눌러서 치우기` : ui.placing ? '여기에 놓기' : '빈 땅';
      cells.push(`<button type="button" class="tile ${shade} ${target}" data-act="tile" data-x="${x}" data-y="${y}" aria-label="${label}">
        ${c.item ? `<svg viewBox="0 0 40 40" aria-hidden="true">${village.ITEM_SVG[c.item]}</svg>` : ''}</button>`);
    }
  }

  const questRow = (q) => `
    <div class="quest ${q.claimed ? 'claimed' : ''}">
      <div class="col" style="flex:1;gap:6px;min-width:0">
        <div style="font-size:14px;font-weight:500">${esc(q.title)}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress" style="flex:1"><div style="width:${(q.progress / q.need) * 100}%"></div></div>
          <span class="small" style="flex:none">${q.progress}/${q.need}</span>
        </div>
        ${q.unlocks && !q.claimed ? `<div class="small">보상으로 ${village.josa(village.ITEMS[q.unlocks].name, '을', '를')} 만들 수 있어요</div>` : ''}
      </div>
      ${q.claimed
        ? '<span class="small" style="flex:none">받음</span>'
        : `<button type="button" class="btn ${q.complete ? 'btn-solid' : 'btn-line'} reward" data-act="claim" data-id="${q.key}" ${q.complete ? '' : 'disabled'}>${village.LEAF}${q.reward}</button>`}
    </div>`;
  const group = (title, list) => (list.length ? `<section class="col" style="gap:8px"><h2 class="h2 sm">${title}</h2>${list.map(questRow).join('')}</section>` : '');
  const questsHtml = `
    ${group('리사의 부탁', qs.filter((q) => q.kind === 'story' && !q.claimed))}
    ${group('오늘', qs.filter((q) => q.kind === 'day'))}
    ${group('이번 주', qs.filter((q) => q.kind === 'week'))}
    <div class="small">퀘스트는 실제 미션 기록으로 채워져요. 기록은 <a href="#/today">미션</a> 화면에서 남겨요.</div>`;

  const build = `
    <div class="items">
      ${Object.entries(village.ITEMS).map(([key, it]) => {
        const open = village.isUnlocked(key, info);
        const afford = info.leaves >= it.cost;
        const note = !open ? `${village.unlockText(key)} 열려요` : afford ? '' : `나뭇잎 ${it.cost - info.leaves}개 더 필요`;
        return `<button type="button" class="item ${ui.placing === key ? 'on' : ''}" data-act="pick-item" data-id="${key}" ${open && afford ? '' : 'disabled'} aria-pressed="${ui.placing === key}">
          <svg viewBox="0 0 40 40" aria-hidden="true" class="${open ? '' : 'locked'}">${village.ITEM_SVG[key]}</svg>
          <b>${open ? it.name : '???'}</b>
          <span>${note || `${village.LEAF}${it.cost}`}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="small">놓은 물건을 누르면 치울 수 있어요. 치우면 나뭇잎을 그대로 돌려받아요.</div>`;

  return `
    <div class="screen tight">
      <a href="#/forest" class="back">${icon.chevL}나의 숲</a>
      <div class="row end">
        <div class="col"><h1 class="title sm">지구 마을</h1><div class="meta">${info.name} · ${info.nextText}</div></div>
        <div class="leaf-count" aria-label="나뭇잎 ${info.leaves}개">${village.LEAF}<b>${info.leaves}</b></div>
      </div>

      <div class="npc">
        <img src="images/village/risa.webp" alt="리사">
        <p class="bubble">${esc(say)}</p>
      </div>

      <section class="island" aria-label="섬 지도, ${info.size}칸 × ${info.size}칸">${cells.join('')}</section>

      ${ui.placing ? `<div class="row note"><span>${village.ITEMS[ui.placing].name} 놓는 중</span><button type="button" class="btn btn-ghost" data-act="cancel-place">그만두기</button></div>` : ''}

      <div class="seg" role="group" aria-label="보기 전환">
        <button type="button" data-act="village-tab" data-id="quest" aria-pressed="${ui.villageTab === 'quest'}">퀘스트${qs.some((q) => q.complete && !q.claimed) ? ' ●' : ''}</button>
        <button type="button" data-act="village-tab" data-id="build" aria-pressed="${ui.villageTab === 'build'}">꾸미기</button>
      </div>
      ${ui.villageTab === 'quest' ? questsHtml : build}
    </div>`;
}

function openRemove(x, y, item) {
  const it = village.ITEMS[item];
  $layer.innerHTML = `
    <div class="sheet">
      <button type="button" class="dim" data-act="close" aria-label="닫기"></button>
      <div class="panel" role="dialog" aria-label="${it.name} 치우기">
        <div class="h2">${village.josa(it.name, '을', '를')} 치울까요?</div>
        <div class="small">나뭇잎 ${it.cost}개를 그대로 돌려받아요. 다른 자리에 다시 놓을 수 있어요.</div>
        <button type="button" class="btn btn-solid" data-act="remove-item" data-x="${x}" data-y="${y}">치우기</button>
        <button type="button" class="btn btn-ghost" data-act="close" style="color:var(--muted)">그대로 두기</button>
      </div>
    </div>`;
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

// 하단 메뉴 이름도 대상에 맞춘다 (아이콘 뒤의 글자만 바꿈)
$nav.querySelectorAll('a').forEach((a) => { a.lastChild.textContent = COPY.nav[a.dataset.tab]; });

function render(keepScroll = false) {
  const route = ROUTES[currentRoute()];
  const y = window.scrollY;
  $app.innerHTML = route.view();
  mountClimateCharts($app);
  mountAchievements($app, 'light');
  mountSeries($app);
  $nav.classList.toggle('hidden', !route.tab);
  $nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.tab === route.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, keepScroll ? y : 0);
}

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
      if (ui.placing) window.scrollTo({ top: document.querySelector('.island').offsetTop - 80, behavior: 'smooth' });
      render(true);
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

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
