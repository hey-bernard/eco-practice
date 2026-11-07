// 카카오·구글 로그인 (Supabase Auth, PKCE 방식).
// - 브라우저·PWA: 로그인 화면으로 이동했다가 /climate/?code=... 로 돌아오면 여기서 세션으로 바꾼다.
// - Expo 앱(WebView): 구글이 WebView 로그인을 막으므로, 로그인 주소만 만들어 앱에 넘기고
//   앱이 시스템 인증 브라우저로 연 뒤 돌아온 주소를 window.__ecoAuthFinish(url)로 다시 넘겨 준다.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './auth-config.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const RETURN_KEY = 'eco-auth-return'; // 로그인 뒤 돌아갈 화면

let client = null;
let user = null;
const listeners = new Set();

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const getUser = () => user;
export const getClient = () => client;

// fn(user, event) — 로그인·로그아웃·토큰 갱신 때 불린다
export function onAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (event) => listeners.forEach((fn) => fn(user, event));

// Expo 앱이 페이지를 띄우기 전에 넣어 주는 값 (App.tsx injectedJavaScriptBeforeContentLoaded)
const appRedirect = () => window.__ECO_APP_REDIRECT || '';
const inApp = () => Boolean(appRedirect() && window.ReactNativeWebView);

export function profile(u = user) {
  if (!u) return null;
  const m = u.user_metadata || {};
  return {
    name: m.name || m.full_name || m.nickname || m.preferred_username || m.user_name || '실천가',
    avatar: m.avatar_url || m.picture || '',
    provider: u.app_metadata?.provider || ''
  };
}

async function load() {
  if (client) return client;
  const { createClient } = await import(CDN);
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  client.auth.onAuthStateChange((event, session) => {
    const next = session?.user ?? null;
    if (event === 'INITIAL_SESSION') return; // init()에서 직접 처리
    user = next;
    emit(event);
  });
  return client;
}

// 주소에서 ?code=, ?error= 를 지우고 해시 화면으로 바꾼다 (?demo=1 같은 다른 값은 남긴다)
function cleanUrl(hash) {
  const url = new URL(location.href);
  ['code', 'error', 'error_code', 'error_description', 'state'].forEach((k) => url.searchParams.delete(k));
  if (hash) url.hash = hash;
  history.replaceState(null, '', url.toString());
}

function takeReturn() {
  try {
    const r = localStorage.getItem(RETURN_KEY);
    localStorage.removeItem(RETURN_KEY);
    return r || '#/today';
  } catch {
    return '#/today';
  }
}

// 주소(또는 앱이 넘겨 준 주소)에 담긴 code를 세션으로 바꾼다. 결과 문구를 돌려준다.
async function finishFrom(href) {
  const params = new URL(href).searchParams;
  const code = params.get('code');
  const err = params.get('error_description') || params.get('error');
  if (err) return { ok: false, message: '로그인을 마치지 못했어요. 다시 시도해 주세요.' };
  if (!code) return null;
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) return { ok: false, message: '로그인을 마치지 못했어요. 다시 시도해 주세요.' };
  user = data.user;
  emit('SIGNED_IN');
  return { ok: true, message: `${profile().name}님, 반가워요. 기록을 계정에 저장해요.` };
}

// 앱 시작 때 한 번. 로그인에서 돌아온 경우 결과 { ok, message, hash } 를 돌려준다.
export async function init() {
  if (!isConfigured()) return null;
  try {
    await load();
  } catch {
    return null; // 오프라인 등으로 라이브러리를 못 받으면 기기 저장만으로 계속
  }

  // Expo 앱이 시스템 브라우저 로그인 뒤 돌아온 주소를 넘겨 준다 (취소하면 null)
  window.__ecoAuthFinish = async (href) => {
    const res = href ? await finishFrom(href).catch(() => null) : null;
    window.dispatchEvent(new CustomEvent('eco-auth-result', {
      detail: res || { ok: false, message: href ? '로그인을 마치지 못했어요. 다시 시도해 주세요.' : '로그인을 취소했어요' }
    }));
  };

  const params = new URLSearchParams(location.search);
  if (params.has('code') || params.has('error')) {
    const res = await finishFrom(location.href).catch(() => ({ ok: false, message: '로그인을 마치지 못했어요. 다시 시도해 주세요.' }));
    const hash = res?.ok ? takeReturn() : '#/login';
    cleanUrl(hash);
    if (res) return { ...res, hash };
  }

  const { data } = await client.auth.getSession();
  user = data.session?.user ?? null;
  if (user) emit('INITIAL_SESSION');
  return null;
}

export async function signIn(provider, returnHash = '#/today') {
  await load();
  try {
    localStorage.setItem(RETURN_KEY, returnHash);
  } catch {
    // 저장이 막혀도 로그인은 진행 (돌아오면 오늘 화면)
  }
  if (inApp()) {
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: appRedirect(), skipBrowserRedirect: true }
    });
    if (error || !data?.url) throw error || new Error('no url');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'oauth', url: data.url }));
    return;
  }

  const redirectTo = new URL('./', location.href).toString().split('?')[0].split('#')[0];
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw error;
}

export async function signOut() {
  if (!client) return;
  await client.auth.signOut();
  user = null;
  emit('SIGNED_OUT');
}
