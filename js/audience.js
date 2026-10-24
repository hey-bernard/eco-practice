// 첫 화면에서 고른 사용 대상(학생·성인). 바꾸면 새로고침해서 카드·문구·기록을 그 대상 것으로 다시 읽는다.
// 저장이 막힌 브라우저에서는 주소의 ?as=student 로 대신 기억한다.
const KEY = 'eco-audience';
const VALID = ['student', 'adult'];

function read() {
  const fromUrl = new URLSearchParams(location.search).get('as');
  if (VALID.includes(fromUrl)) return fromUrl;
  try {
    const v = localStorage.getItem(KEY);
    return VALID.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export const AUDIENCE = read();
export const IS_STUDENT = AUDIENCE === 'student';

// ?as 를 뺀 주소에 해시를 붙여 다시 연다 (?demo=1 같은 다른 값은 유지)
function reload(hash, as = null) {
  const params = new URLSearchParams(location.search);
  params.delete('as');
  if (as) params.set('as', as);
  const q = params.toString();
  // 해시만 바뀌면 새로고침되지 않으므로 주소를 바꾼 뒤 직접 새로고침한다
  history.replaceState(null, '', `${location.pathname}${q ? '?' + q : ''}${hash}`);
  location.reload();
}

export function chooseAudience(a) {
  try {
    localStorage.setItem(KEY, a);
    reload('#/today');
  } catch {
    reload('#/today', a);
  }
}

export function resetAudience() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 저장이 막혔으면 주소의 ?as 만 지우면 된다
  }
  reload('#/start');
}
