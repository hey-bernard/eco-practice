// 기기 저장(localStorage). 2단계에서 로그인·동기화가 붙으면 이 모듈만 바꾼다.
import { CARDS } from './data.js';
import { IS_STUDENT } from './audience.js';

// 학생용과 성인용 기록은 따로 저장한다 (성인용은 예전 키를 그대로 써서 기존 기록 유지)
const KEY = IS_STUDENT ? 'eco-practice-student-v1' : 'eco-practice-v1';

const empty = () => ({
  records: {},     // { 'YYYY-MM-DD': [cardId, ...] } 그날 한 실천
  picks: {},       // { 'YYYY-MM-DD': [cardId, ...] } 그날 오늘 화면에 띄운 카드
  reflections: [], // [{ date, text }] 한 줄 성찰 · 나만 보기
  reads: {},       // { postId: 원문 연 횟수 }
  readLog: [],     // [{ date, id }] 원문 연 날짜 · 주간 퀘스트용
  village: { claimed: {}, placed: [] } // 지구 마을: { 퀘스트키: 받은 나뭇잎 }, [{ x, y, item }]
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 화면은 계속 동작
  }
}

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const getState = () => state;

export function isDone(day, cardId) {
  return (state.records[day] || []).includes(cardId);
}

export function toggleRecord(day, cardId) {
  const list = state.records[day] || [];
  state.records[day] = list.includes(cardId) ? list.filter((id) => id !== cardId) : [...list, cardId];
  if (!state.records[day].length) delete state.records[day];
  save();
}

// 하루 3장: 쉬움 2장 + 보통·도전 1장. 날짜로 고정해 새로고침해도 같은 카드가 나온다.
export function getPicks(day) {
  if (!state.picks[day]) {
    state.picks[day] = recommend(day);
    save();
  }
  return state.picks[day];
}

export function addPick(day, cardId) {
  const picks = getPicks(day);
  if (!picks.includes(cardId)) {
    state.picks[day] = [...picks, cardId];
    save();
  }
}

// '카드 더 고르기'에서 선택 취소: 오늘 화면에서 뺀다 (기록은 건드리지 않는다)
export function removePick(day, cardId) {
  state.picks[day] = getPicks(day).filter((id) => id !== cardId);
  save();
}

function recommend(day) {
  let seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const pool = CARDS.filter((c) => !c.occasional && !c.group);
  const take = (list, n) => {
    const copy = [...list];
    const out = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0].id);
    return out;
  };
  return [...take(pool.filter((c) => c.level === 'easy'), 2), ...take(pool.filter((c) => c.level !== 'easy'), 1)];
}

export function addReflection(text) {
  state.reflections = [{ date: dateKey(), text }, ...state.reflections];
  save();
}

export function markRead(postId) {
  state.reads[postId] = (state.reads[postId] || 0) + 1;
  state.readLog = [...state.readLog, { date: dateKey(), id: postId }];
  save();
}

// ───────── 지구 마을 ─────────

export function claimQuest(key, reward) {
  if (state.village.claimed[key] !== undefined) return false;
  state.village.claimed = { ...state.village.claimed, [key]: reward };
  save();
  return true;
}

export function placeItem(x, y, item) {
  state.village.placed = [...state.village.placed.filter((p) => p.x !== x || p.y !== y), { x, y, item }];
  save();
}

// 한 번 넓어진 섬은 다시 좁아지지 않는다
export function raiseVillageLevel(level) {
  if (level > (state.village.level || 0)) {
    state.village = { ...state.village, level };
    save();
  }
}

// 치운 물건의 나뭇잎은 그대로 돌려준다 (잃는 것 없음)
export function removeItem(x, y) {
  state.village.placed = state.village.placed.filter((p) => p.x !== x || p.y !== y);
  save();
}

// 숲 점수 = 지금까지 남긴 실천 기록 수
export function totalPoints() {
  return Object.values(state.records).reduce((n, list) => n + list.length, 0);
}

export function countCard(cardId, prefix = '') {
  return Object.entries(state.records)
    .filter(([day]) => day.startsWith(prefix))
    .reduce((n, [, list]) => n + list.filter((id) => id === cardId).length, 0);
}

// 시연 모드 전용: 오늘 날짜에 기록을 직접 더한다
export function addDemoRecord(cardId) {
  const day = dateKey();
  state.records[day] = [...(state.records[day] || []), cardId];
  save();
}

export function resetAll() {
  state = empty();
  save();
}
