// 지구 마을: 실제 실천으로 퀘스트를 깨고, 받은 나뭇잎으로 섬을 꾸민다. 학생용에서만 연다.
// 원칙: 마을은 시들지 않고, 치운 물건은 나뭇잎을 그대로 돌려준다. 순위·벌점 없음.
import { CARDS } from './data.js';
import * as store from './store.js';

const GRID = 7;

// 놓은 개수에 따라 섬이 넓어진다: [필요 개수, 한 변 칸 수, 이름]
const LEVELS = [[0, 4, '작은 섬'], [4, 5, '초록 섬'], [10, 6, '숲이 있는 섬'], [18, 7, '푸른 지구 마을']];

// unlock: 'base' 처음부터 · 숫자 섬 단계(0부터) · 'story:<id>' 리사의 부탁을 마치면
export const ITEMS = {
  sapling: { name: '어린나무', cost: 2, unlock: 'base' },
  flower: { name: '꽃밭', cost: 2, unlock: 'base' },
  bench: { name: '벤치', cost: 3, unlock: 'base' },
  garden: { name: '텃밭', cost: 4, unlock: 'base' },
  bigtree: { name: '큰 나무', cost: 6, unlock: 1 },
  pond: { name: '연못', cost: 6, unlock: 1 },
  windmill: { name: '풍차', cost: 10, unlock: 2 },
  recycle: { name: '분리수거함', cost: 4, unlock: 'story:pickup' },
  bikerack: { name: '자전거 거치대', cost: 4, unlock: 'story:transit' },
  birdhouse: { name: '새집', cost: 3, unlock: 'story:nature' },
  library: { name: '작은 도서관', cost: 8, unlock: 'story:read' },
  solar: { name: '태양광 지붕', cost: 8, unlock: 'story:energy' }
};

const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const allRecords = () => Object.entries(store.getState().records);
const countCards = (ids, since = '') => allRecords()
  .filter(([d]) => d >= since)
  .reduce((n, [, list]) => n + list.filter((id) => ids.includes(id)).length, 0);

// 리사의 부탁: 하나씩 차례로 열린다
const STORY = [
  { id: 'first', title: '첫 실천을 기록해 줘', say: '안녕! 나는 리사야. 이 섬을 같이 가꿔 보자. 먼저 오늘 실천 하나를 기록해 줄래?', need: 1, now: () => store.totalPoints(), reward: 5 },
  { id: 'bottle', title: "'개인 물병 챙기기' 3번", say: '섬에 페트병이 덜 떠밀려 오면 좋겠어. 개인 물병을 세 번 챙겨 볼까?', need: 3, now: () => store.countCard('bottle'), reward: 6 },
  { id: 'pickup', title: "'쓰레기 3개 줍기' 1번", say: '바닷가에 떠밀려 온 쓰레기를 같이 주워 보자. 분리수거함을 만들 수 있게 돼!', need: 1, now: () => store.countCard('pickup'), reward: 6, unlocks: 'recycle' },
  { id: 'transit', title: '걸어서·자전거로 등교 3번', say: '섬 사람들도 자전거를 타고 다니고 싶대. 걸어서나 자전거로 세 번 등교해 줘.', need: 3, now: () => countCards(['walk', 'bike']), reward: 6, unlocks: 'bikerack' },
  { id: 'nature', title: "'학교 화단 관찰 한 줄' 3번", say: '새들이 섬에 놀러 오고 싶어 해. 학교 화단을 세 번 관찰해서 남겨 줄래?', need: 3, now: () => store.countCard('nature'), reward: 6, unlocks: 'birdhouse' },
  { id: 'read', title: '배우기 탭 원문 3편 열기', say: '섬에 작은 도서관을 짓고 싶어. 배우기 탭에서 글 세 편을 읽어 줘.', need: 3, now: () => store.getState().readLog.length, reward: 8, unlocks: 'library' },
  { id: 'energy', title: '불 끄기·플러그 뽑기 5번', say: '이제 햇빛으로 전기를 만들어 볼까? 빈 교실 불 끄기나 플러그 뽑기를 다섯 번 해 줘.', need: 5, now: () => countCards(['lightsoff', 'unplug', 'aircon']), reward: 8, unlocks: 'solar' }
];

function weekStart(d = new Date()) {
  const day = (d.getDay() + 6) % 7; // 월요일 시작
  return store.dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - day));
}

export function quests() {
  const today = store.dateKey();
  const ws = weekStart();
  const { claimed } = store.getState().village;
  const st = store.getState();

  const storyDone = STORY.filter((q) => claimed[`story-${q.id}`] !== undefined);
  const story = STORY.slice(0, storyDone.length + 1).map((q) => ({ ...q, key: `story-${q.id}`, kind: 'story' }));

  const daily = store.getPicks(today).map((id) => ({
    key: `day-${today}-${id}`, kind: 'day', title: `오늘 '${cardById[id].title}' 하기`, need: 1, now: () => (store.isDone(today, id) ? 1 : 0), reward: 2
  }));

  const weekAreas = () => new Set(allRecords().filter(([d]) => d >= ws).flatMap(([, list]) => list.map((id) => cardById[id].area))).size;
  const weekly = [
    { id: 'records', title: '이번 주 미션 7번 하기', need: 7, now: () => allRecords().filter(([d]) => d >= ws).reduce((n, [, l]) => n + l.length, 0), reward: 8 },
    { id: 'areas', title: '이번 주 서로 다른 종류 미션 3가지 하기', need: 3, now: weekAreas, reward: 6 },
    { id: 'read', title: '이번 주 원문 1편 읽기', need: 1, now: () => st.readLog.filter((r) => r.date >= ws).length, reward: 4 },
    { id: 'reflect', title: '이번 주 생각 한 줄 남기기', need: 1, now: () => st.reflections.filter((r) => r.date >= ws).length, reward: 4 }
  ].map((q) => ({ ...q, key: `week-${ws}-${q.id}`, kind: 'week' }));

  return [...story, ...daily, ...weekly].map((q) => {
    const now = Math.min(q.now(), q.need);
    return { ...q, progress: now, complete: now >= q.need, claimed: claimed[q.key] !== undefined };
  });
}

export function readyCount() {
  return quests().filter((q) => q.complete && !q.claimed).length;
}

export function villageInfo() {
  const { claimed, placed, level = 0 } = store.getState().village;
  const earned = Object.values(claimed).reduce((a, b) => a + b, 0);
  const spent = placed.reduce((a, p) => a + ITEMS[p.item].cost, 0);
  let li = level;
  LEVELS.forEach(([need], i) => { if (placed.length >= need && i > li) li = i; });
  const next = LEVELS[li + 1];
  return {
    leaves: earned - spent,
    placed,
    level: li,
    name: LEVELS[li][2],
    size: LEVELS[li][1],
    nextText: next ? `${next[0] - placed.length}개 더 놓으면 섬이 넓어져요` : '섬을 끝까지 넓혔어요'
  };
}

export function isUnlocked(key, info = villageInfo()) {
  const u = ITEMS[key].unlock;
  if (u === 'base') return true;
  if (typeof u === 'number') return info.level >= u;
  return store.getState().village.claimed[`story-${u.slice(6)}`] !== undefined;
}

export function unlockText(key) {
  const u = ITEMS[key].unlock;
  if (typeof u === 'number') return `${josa(LEVELS[u][2], '이', '가')} 되면`;
  const q = STORY.find((s) => `story:${s.id}` === u);
  return `리사의 부탁(${q.title})을 마치면`;
}

// 받침에 따라 조사를 고른다: josa('꽃밭', '을', '를') → '꽃밭을'
export function josa(word, withFinal, withoutFinal) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

// 지구지킴이가 서 있는 가운데 칸
export const HOME = { x: 3, y: 3 };

export function cellState(x, y, info) {
  const o = Math.floor((GRID - info.size) / 2);
  const land = x >= o && x < o + info.size && y >= o && y < o + info.size;
  const item = info.placed.find((p) => p.x === x && p.y === y);
  return { land, home: x === HOME.x && y === HOME.y, item: item ? item.item : null };
}

export { GRID, LEVELS, STORY };

// ───────── 물건 그림 (40×40, 위에서 비스듬히 본 평면 그림) ─────────

const shadow = '<ellipse cx="20" cy="34" rx="12" ry="3.5" fill="#1C2620" opacity=".14"/>';
export const ITEM_SVG = {
  sapling: `${shadow}<rect x="18.5" y="22" width="3" height="11" rx="1.5" fill="#8A6142"/><circle cx="20" cy="18" r="8" fill="#5FAF5A"/><circle cx="16.5" cy="16" r="3" fill="#7CC873"/>`,
  flower: `${shadow}<path d="M10 33c3-4 17-4 20 0" fill="#5FAF5A"/><g fill="#F2B8C6"><circle cx="13" cy="25" r="3.2"/><circle cx="27" cy="24" r="3.2"/></g><circle cx="20" cy="21" r="3.6" fill="#F7D35B"/><g fill="#FFF"><circle cx="13" cy="25" r="1.1"/><circle cx="27" cy="24" r="1.1"/></g><circle cx="20" cy="21" r="1.3" fill="#E59A3A"/><path d="M13 28v5M20 25v8M27 27v6" stroke="#3E8E41" stroke-width="1.4"/>`,
  bench: `${shadow}<rect x="8" y="16" width="24" height="4" rx="1.5" fill="#B7814F"/><rect x="8" y="22" width="24" height="5" rx="1.5" fill="#C9935F"/><path d="M11 27v6M29 27v6" stroke="#7A5A3A" stroke-width="2.4" stroke-linecap="round"/>`,
  garden: `${shadow}<rect x="7" y="14" width="26" height="19" rx="3" fill="#9C6B45"/><g stroke="#7A5232" stroke-width="1"><path d="M7 20h26M7 26h26"/></g><g fill="#6DBB5E"><circle cx="12" cy="17" r="2.2"/><circle cx="20" cy="17" r="2.2"/><circle cx="28" cy="17" r="2.2"/><circle cx="12" cy="23" r="2.2"/><circle cx="20" cy="23" r="2.2"/><circle cx="28" cy="23" r="2.2"/></g><g fill="#E8743B"><circle cx="16" cy="29.5" r="1.8"/><circle cx="24" cy="29.5" r="1.8"/></g>`,
  bigtree: `<ellipse cx="20" cy="35" rx="15" ry="3.5" fill="#1C2620" opacity=".16"/><rect x="17.5" y="22" width="5" height="12" rx="2" fill="#7A5A3A"/><circle cx="20" cy="15" r="12" fill="#3F8F4A"/><circle cx="13" cy="19" r="7" fill="#4FA25A"/><circle cx="27" cy="19" r="7" fill="#4FA25A"/><circle cx="16" cy="11" r="4" fill="#6CBF6A"/>`,
  pond: `<ellipse cx="20" cy="24" rx="16" ry="10" fill="#8FC7E8"/><ellipse cx="20" cy="23" rx="13" ry="7.5" fill="#5BA9DB"/><path d="M13 21q3-2 6 0M22 26q3-2 6 0" stroke="#D6EEFA" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="26" cy="20" r="2.6" fill="#6DBB5E"/><circle cx="26" cy="19.6" r="1" fill="#F2B8C6"/>`,
  windmill: `${shadow}<path d="M17 33l1.5-17h3L23 33z" fill="#F2EDE2" stroke="#C8BFA8"/><g transform="translate(20 15)"><g fill="#E9E2D0" stroke="#B7AD94" stroke-width=".8"><path d="M0 0L-2-12 2-12z"/><path d="M0 0L12-2 12 2z"/><path d="M0 0L2 12-2 12z"/><path d="M0 0L-12 2-12-2z"/></g><circle r="2" fill="#B7814F"/></g>`,
  recycle: `${shadow}<path d="M11 15h18l-2 18H13z" fill="#3D8BC9"/><rect x="9.5" y="12" width="21" height="4" rx="1.5" fill="#2F74AB"/><path d="M17 27l-2-3.5 2-3.5M23 20l2 3.5-2 3.5M17.5 20h5" stroke="#FFF" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  bikerack: `${shadow}<circle cx="13" cy="27" r="5.5" fill="none" stroke="#2E4A3A" stroke-width="2"/><circle cx="27" cy="27" r="5.5" fill="none" stroke="#2E4A3A" stroke-width="2"/><path d="M13 27l5-9h7l2 9M18 18l-2-3h-3M25 18l1.5-3" stroke="#E07B39" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  birdhouse: `${shadow}<rect x="18.5" y="22" width="3" height="12" fill="#8A6142"/><rect x="12" y="11" width="16" height="13" rx="2" fill="#E9B872"/><path d="M10 13l10-7 10 7" stroke="#C0573E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="17" r="2.6" fill="#5A3E2B"/><circle cx="29" cy="9" r="2.6" fill="#5BA9DB"/><path d="M31 9l2.5-1" stroke="#E59A3A" stroke-width="1.4" stroke-linecap="round"/>`,
  library: `${shadow}<rect x="9" y="16" width="22" height="17" rx="2" fill="#F4E9D4"/><path d="M6 17l14-10 14 10z" fill="#5C8F6B"/><rect x="17" y="24" width="6" height="9" rx="1" fill="#8A6142"/><g fill="#5BA9DB"><rect x="11.5" y="20" width="4" height="4" rx=".8"/><rect x="24.5" y="20" width="4" height="4" rx=".8"/></g><path d="M16 13h8" stroke="#F4E9D4" stroke-width="1.6" stroke-linecap="round"/>`,
  solar: `${shadow}<rect x="9" y="20" width="22" height="13" rx="2" fill="#F4E9D4"/><path d="M7 21l13-9 13 9z" fill="#C0573E"/><path d="M12 19l8-5.6 8 5.6z" fill="#2F5D8A"/><path d="M16 16.3l8 0M14 17.8h12M20 13.4v5.6" stroke="#8FB8DE" stroke-width=".7"/><rect x="17" y="25" width="6" height="8" rx="1" fill="#8A6142"/><circle cx="32" cy="9" r="3.4" fill="#F7D35B"/>`
};

export const LEAF = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" fill="#5FAF5A"/><path d="M5 19c4-5 8-8 12-11" stroke="#2E6A4C" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
