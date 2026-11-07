// 로그인한 사람의 기록을 Supabase user_state 테이블(한 사람당 한 줄, data jsonb)과 맞춘다.
// - 이 기기를 이 계정에 처음 연결할 때, 또는 아직 못 올린 기록이 있을 때: 기기 기록과 계정 기록을 합친다 (잃는 기록 없음)
// - 그 밖에는 계정 기록을 그대로 받아 온다 (다른 기기에서 취소한 기록이 되살아나지 않게)
// - 기록이 바뀌면 잠시 뒤 계정에 올린다. 오프라인이면 연결되면 다시 올린다.
import * as store from './store.js';

const META_KEY = 'eco-sync-meta'; // { linked: userId, dirty: bool }
const TABLE = 'user_state';
const DELAY = 1200;

let ctx = null; // { client, userId, unsub, timer, onRemote }
let status = { state: 'idle', at: 0 }; // idle | syncing | saved | offline
const listeners = new Set();

export const getStatus = () => status;
export function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(state) {
  status = { state, at: state === 'saved' ? Date.now() : status.at };
  listeners.forEach((fn) => fn(status));
}

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch {
    return {};
  }
}
function writeMeta(patch) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ ...readMeta(), ...patch }));
  } catch {
    // 저장이 막힌 환경: 매번 합치기로 동작 (기록은 잃지 않는다)
  }
}

// ───────── 합치기 ─────────

// 같은 값이 여러 번 들어갈 수 있는 목록(시연 기록 등)은 값마다 더 많은 쪽 개수를 남긴다
function mergeMulti(a = [], b = [], key = (x) => x) {
  const count = (list) => list.reduce((m, x) => m.set(key(x), (m.get(key(x)) || 0) + 1), new Map());
  const ca = count(a);
  const out = [...a];
  const seen = new Map();
  for (const x of b) {
    const k = key(x);
    seen.set(k, (seen.get(k) || 0) + 1);
    if (seen.get(k) > (ca.get(k) || 0)) out.push(x);
  }
  return out;
}

export function merge(local, remote) {
  const l = local || {};
  const r = remote || {};
  const days = new Set([...Object.keys(l.records || {}), ...Object.keys(r.records || {})]);
  const records = {};
  days.forEach((d) => {
    const list = mergeMulti(l.records?.[d], r.records?.[d]);
    if (list.length) records[d] = list;
  });

  const reads = { ...(r.reads || {}) };
  Object.entries(l.reads || {}).forEach(([id, n]) => { reads[id] = Math.max(n, reads[id] || 0); });

  const reflections = mergeMulti(l.reflections, r.reflections, (x) => `${x.date}|${x.text}`)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const readLog = mergeMulti(l.readLog, r.readLog, (x) => `${x.date}|${x.id}`)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const lv = l.village || {};
  const rv = r.village || {};
  const placed = new Map();
  [...(rv.placed || []), ...(lv.placed || [])].forEach((p) => placed.set(`${p.x},${p.y}`, p));
  const level = Math.max(lv.level || 0, rv.level || 0);

  return {
    ...r,
    ...l,
    records,
    picks: { ...(r.picks || {}), ...(l.picks || {}) },
    reflections,
    reads,
    readLog,
    village: { ...rv, ...lv, claimed: { ...(rv.claimed || {}), ...(lv.claimed || {}) }, placed: [...placed.values()], ...(level ? { level } : {}) }
  };
}

// ───────── 올리기·받기 ─────────

async function pull() {
  const { data, error } = await ctx.client.from(TABLE).select('data').eq('user_id', ctx.userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function push() {
  if (!ctx) return;
  clearTimeout(ctx.timer);
  const c = ctx;
  setStatus('syncing');
  const { error } = await c.client.from(TABLE).upsert({ user_id: c.userId, data: store.getState(), updated_at: new Date().toISOString() });
  if (ctx !== c) return; // 그 사이 로그아웃
  if (error) {
    setStatus('offline');
    return;
  }
  writeMeta({ dirty: false });
  setStatus('saved');
}

function schedule() {
  writeMeta({ dirty: true });
  clearTimeout(ctx.timer);
  ctx.timer = setTimeout(push, DELAY);
}

// 앱으로 돌아왔을 때: 못 올린 게 있으면 올리고, 아니면 다른 기기에서 바뀐 내용을 받아 온다
async function refresh() {
  if (!ctx || document.visibilityState !== 'visible') return;
  if (readMeta().dirty) return push();
  try {
    const remote = await pull();
    if (remote && ctx) {
      store.replaceState(remote);
      ctx.onRemote?.();
    }
  } catch {
    setStatus('offline');
  }
}

const onVisible = () => refresh();
const onOnline = () => { if (readMeta().dirty) push(); };

// onRemote: 계정에서 받은 내용으로 기록이 바뀌었을 때 화면을 다시 그리는 함수
export async function start(client, userId, onRemote) {
  stop();
  ctx = { client, userId, unsub: null, timer: 0, onRemote };
  const c = ctx;
  setStatus('syncing');

  let remote;
  try {
    remote = await pull();
  } catch {
    if (ctx !== c) return;
    // 계정 기록을 못 읽으면 덮어쓰지 않도록 올리지 않고, 다음 기회(온라인·앱 복귀)에 다시 맞춘다
    ctx.unsub = store.subscribe(() => writeMeta({ dirty: true }));
    setStatus('offline');
    window.addEventListener('online', retryStart);
    document.addEventListener('visibilitychange', retryStart);
    return;
  }
  if (ctx !== c) return;

  const meta = readMeta();
  const firstLink = meta.linked !== userId;
  const next = !remote ? store.getState() : firstLink || meta.dirty ? merge(store.getState(), remote) : remote;
  store.replaceState(next);
  writeMeta({ linked: userId });
  onRemote?.();

  ctx.unsub = store.subscribe(schedule);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);

  if (!remote || firstLink || meta.dirty) await push();
  else setStatus('saved');
}

function retryStart() {
  if (document.visibilityState !== 'visible') return;
  window.removeEventListener('online', retryStart);
  document.removeEventListener('visibilitychange', retryStart);
  if (ctx) start(ctx.client, ctx.userId, ctx.onRemote);
}

export function stop() {
  if (!ctx) return;
  clearTimeout(ctx.timer);
  ctx.unsub?.();
  ctx = null;
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('online', retryStart);
  document.removeEventListener('visibilitychange', retryStart);
  setStatus('idle');
}

// 로그아웃 직전: 못 올린 기록을 먼저 올린다
export async function flush() {
  if (ctx && readMeta().dirty) await push();
}
