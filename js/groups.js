// 모임: Supabase 테이블(supabase/schema-groups.sql)과 주고받는 함수 모음.
// 화면(climate/app.js)은 동기로 그리므로, 여기서 받아 온 내용을 cache에 두고 다 받으면 onChange로 다시 그리게 한다.
import * as auth from './auth.js';

export const TOPICS = ['플로깅', '제로웨이스트', '기후 공부', '채식', '대중교통·자전거', '에너지 절약', '기타'];
export const MAX_MEMO = 140;

const db = () => auth.getClient();
const uid = () => auth.getUser()?.id ?? null;

// ───────── 캐시 ─────────

export const cache = {
  mine: null,            // my_groups() 결과 배열 (null = 아직 안 받음)
  mineErr: false,
  sharedToday: new Set(), // `${groupId}|${actionId}` : 오늘 내가 공유한 것
  search: { q: '', kind: 'all', list: null, err: false, key: '' },
  preview: {},           // key(id 또는 code:XXXX) → { data, err }
  group: {}              // groupId → { data, err, at }
};
const busy = new Set();
let onChange = () => {};
export const setOnChange = (fn) => { onChange = fn; };

export function reset() {
  cache.mine = null;
  cache.mineErr = false;
  cache.sharedToday = new Set();
  cache.search = { q: '', kind: 'all', list: null, err: false, key: '' };
  cache.preview = {};
  cache.group = {};
}

// 같은 요청이 겹치지 않게: key가 처리 중이면 건너뛴다
async function once(key, fn) {
  if (busy.has(key)) return;
  busy.add(key);
  try {
    await fn();
  } finally {
    busy.delete(key);
    onChange();
  }
}

// 오류를 사람이 읽을 문장으로
export function message(err) {
  const m = String(err?.message || err || '');
  if (m.includes('login_required')) return '로그인한 뒤 이용할 수 있어요';
  if (m.includes('too_many_groups')) return '운영하는 모임은 5개까지 만들 수 있어요';
  if (m.includes('too_many_memberships')) return '모임은 20개까지 참여할 수 있어요';
  if (m.includes('bad_code')) return '초대 코드가 맞지 않아요';
  if (m.includes('full')) return '정원이 다 찼어요';
  if (m.includes('not_found')) return '모임을 찾지 못했어요. 비공개로 바뀌었거나 없어진 모임일 수 있어요';
  if (m.includes('not_owner')) return '운영자만 할 수 있어요';
  if (m.includes('duplicate key')) return '이미 남겼어요';
  if (m.includes('Failed to fetch') || !navigator.onLine) return '인터넷에 연결한 뒤 다시 시도해 주세요';
  return '잠시 뒤 다시 시도해 주세요';
}

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ───────── 읽기 ─────────

export function loadMine(force = false) {
  if (!uid() || (!force && cache.mine)) return;
  return once('mine', async () => {
    try {
      const today = todayKey();
      const [mine, shared] = await Promise.all([
        db().rpc('my_groups').then(must),
        db().from('shares').select('group_id, action_id').eq('user_id', uid()).eq('day', today).then(must)
      ]);
      cache.mine = mine || [];
      cache.sharedToday = new Set((shared || []).map((s) => `${s.group_id}|${s.action_id}`));
      cache.mineErr = false;
    } catch {
      cache.mineErr = true;
      if (!cache.mine) cache.mine = [];
    }
  });
}

export function search(q, kind) {
  if (!uid()) return;
  const key = `${kind}|${q.trim()}`;
  cache.search.q = q;
  cache.search.kind = kind;
  if (cache.search.key === key && cache.search.list) return;
  return once(`search:${key}`, async () => {
    try {
      const list = await db().rpc('search_groups', { p_q: q.trim(), p_kind: kind }).then(must);
      if (`${cache.search.kind}|${cache.search.q.trim()}` !== key) return; // 그 사이 검색어가 바뀜
      cache.search.list = list || [];
      cache.search.key = key;
      cache.search.err = false;
    } catch {
      cache.search.err = true;
      cache.search.key = key; // 다시 그릴 때마다 재요청하지 않게 (검색어를 바꾸거나 새로 고치면 다시)
      cache.search.list = cache.search.list || [];
    }
  });
}

// id로(공개 모임·내 모임) 또는 초대 코드로 소개 보기
export function loadPreview({ id = null, code = null }, force = false) {
  if (!uid()) return;
  const key = code ? `code:${code.toUpperCase()}` : id;
  if (!force && cache.preview[key]) return;
  return once(`preview:${key}`, async () => {
    try {
      const rows = await db().rpc('group_preview', { p_id: code ? null : id, p_code: code || null }).then(must);
      cache.preview[key] = { data: rows?.[0] || null, err: false };
    } catch {
      cache.preview[key] = { data: null, err: true };
    }
  });
}
export const previewOf = ({ id = null, code = null }) => cache.preview[code ? `code:${code.toUpperCase()}` : id];

// 모임 안: 모임 정보, 멤버, 최근 14일 공유, 반응, 한마디 (+ 운영자는 신청·신고)
export function loadGroup(id, force = false) {
  if (!uid()) return;
  const cur = cache.group[id];
  if (!force && cur && Date.now() - cur.at < 30000) return;
  return once(`group:${id}`, async () => {
    try {
      const since = todayKey(-13);
      const [info, members, shares, reactions, cheers] = await Promise.all([
        db().from('groups').select('*').eq('id', id).maybeSingle().then(must),
        db().from('group_members').select('user_id, role, nickname, joined_at').eq('group_id', id).order('joined_at').then(must),
        db().from('shares').select('*').eq('group_id', id).gte('day', since).order('created_at', { ascending: false }).limit(100).then(must),
        db().from('reactions').select('share_id, user_id, kind').eq('group_id', id).then(must),
        db().from('cheers').select('share_id, from_user, phrase').eq('group_id', id).then(must)
      ]);
      if (!info) {
        cache.group[id] = { data: null, err: false, at: Date.now() };
        return;
      }
      const me = members.find((m) => m.user_id === uid());
      let requests = [];
      let reports = [];
      if (me?.role === 'owner') {
        [requests, reports] = await Promise.all([
          db().from('join_requests').select('user_id, nickname, message, created_at').eq('group_id', id).order('created_at').then(must),
          db().from('reports').select('share_id, reason, created_at').eq('group_id', id).then(must)
        ]);
      }
      cache.group[id] = { data: { info, members, shares, reactions, cheers, requests, reports, me }, err: false, at: Date.now() };
    } catch {
      cache.group[id] = { data: cur?.data || null, err: true, at: Date.now() };
    }
  });
}

// ───────── 쓰기 (실패하면 오류를 던진다. 화면이 message()로 알린다) ─────────

const afterGroupChange = (id) => {
  delete cache.group[id];
  cache.preview = {};
  cache.search.key = '';
  cache.mine = null;
};

export async function createGroup(f) {
  const id = await db().rpc('create_group', {
    p_name: f.name, p_kind: f.kind, p_topic: f.topic, p_place: f.place, p_schedule: f.schedule, p_intro: f.intro,
    p_is_public: f.isPublic, p_join_mode: f.joinMode, p_nickname: f.nickname
  }).then(must);
  afterGroupChange(id);
  return id;
}

export async function join(id, nickname, code = null, msg = '') {
  const res = await db().rpc('join_group', { p_id: id, p_nickname: nickname, p_code: code, p_message: msg }).then(must);
  afterGroupChange(id);
  return res; // joined | requested | already
}

export async function cancelRequest(id) {
  await db().from('join_requests').delete().eq('group_id', id).eq('user_id', uid()).then(must);
  afterGroupChange(id);
}

export async function leave(id) {
  await db().from('group_members').delete().eq('group_id', id).eq('user_id', uid()).then(must);
  afterGroupChange(id);
  [...cache.sharedToday].filter((k) => k.startsWith(`${id}|`)).forEach((k) => cache.sharedToday.delete(k));
}

export async function deleteGroup(id) {
  await db().from('groups').delete().eq('id', id).then(must);
  afterGroupChange(id);
}

export async function updateGroup(id, patch) {
  await db().from('groups').update(patch).eq('id', id).then(must);
  afterGroupChange(id);
}

export async function setNickname(id, nickname) {
  await db().from('group_members').update({ nickname }).eq('group_id', id).eq('user_id', uid()).then(must);
  afterGroupChange(id);
}

export async function resetCode(id) {
  const code = await db().rpc('reset_invite_code', { p_group: id }).then(must);
  afterGroupChange(id);
  return code;
}

export async function acceptRequest(id, user) {
  await db().rpc('accept_request', { p_group: id, p_user: user }).then(must);
  afterGroupChange(id);
}

export async function rejectRequest(id, user) {
  await db().from('join_requests').delete().eq('group_id', id).eq('user_id', user).then(must);
  afterGroupChange(id);
}

export async function kick(id, user) {
  await db().from('group_members').delete().eq('group_id', id).eq('user_id', user).then(must);
  afterGroupChange(id);
}

// 오늘 기록한 실천을 여러 모임에 한 번에 공유 (이미 공유한 것은 건너뛴다)
export async function share(groupIds, actionId, memo = '') {
  const day = todayKey();
  const rows = groupIds.map((g) => ({ group_id: g, user_id: uid(), day, action_id: actionId, memo: memo.slice(0, MAX_MEMO) }));
  await db().from('shares').upsert(rows, { onConflict: 'group_id,user_id,day,action_id', ignoreDuplicates: true }).then(must);
  groupIds.forEach((g) => {
    cache.sharedToday.add(`${g}|${actionId}`);
    delete cache.group[g];
  });
  cache.mine = null;
}

export async function deleteShare(groupId, shareId) {
  await db().from('shares').delete().eq('id', shareId).then(must);
  delete cache.group[groupId];
  cache.mine = null;
  cache.sharedToday = new Set(); // 다음 loadMine에서 다시 채운다
}

export async function hideShare(groupId, shareId, hidden) {
  await db().from('shares').update({ hidden }).eq('id', shareId).then(must);
  if (hidden) await db().from('reports').delete().eq('share_id', shareId).then(must);
  delete cache.group[groupId];
}

// 반응: 같은 반응을 다시 누르면 지운다. 화면은 바로 바꾸고(낙관적), 실패하면 되돌린다.
export async function react(groupId, shareId, kind) {
  const g = cache.group[groupId]?.data;
  const mine = g?.reactions.find((r) => r.share_id === shareId && r.user_id === uid());
  const before = g ? [...g.reactions] : null;
  if (g) {
    g.reactions = g.reactions.filter((r) => !(r.share_id === shareId && r.user_id === uid()));
    if (mine?.kind !== kind) g.reactions.push({ share_id: shareId, user_id: uid(), kind });
    onChange();
  }
  try {
    if (mine?.kind === kind) await db().from('reactions').delete().eq('share_id', shareId).eq('user_id', uid()).then(must);
    else await db().from('reactions').upsert({ share_id: shareId, group_id: groupId, user_id: uid(), kind }, { onConflict: 'share_id,user_id' }).then(must);
  } catch (e) {
    if (g) g.reactions = before;
    onChange();
    throw e;
  }
}

export async function cheer(groupId, shareId, phrase) {
  await db().from('cheers').upsert({ share_id: shareId, group_id: groupId, from_user: uid(), phrase }, { onConflict: 'share_id,from_user' }).then(must);
  const g = cache.group[groupId]?.data;
  if (g) {
    g.cheers = g.cheers.filter((c) => !(c.share_id === shareId && c.from_user === uid()));
    g.cheers.push({ share_id: shareId, from_user: uid(), phrase });
  }
}

export async function dismissReports(groupId, shareId) {
  await db().from('reports').delete().eq('share_id', shareId).then(must);
  delete cache.group[groupId];
}

export async function report(groupId, shareId, reason = '') {
  await db().from('reports').upsert({ share_id: shareId, group_id: groupId, reporter: uid(), reason }, { onConflict: 'share_id,reporter', ignoreDuplicates: true }).then(must);
}

// ───────── 도움 ─────────

export function todayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const myId = uid;

export function inviteLink(code) {
  return `${location.origin}${location.pathname}#/join/${code}`;
}
