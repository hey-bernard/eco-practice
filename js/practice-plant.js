// 오늘 탭 '실천 식물': 오늘 기록 수 / 오늘 카드 수 만큼 자란 식물을 Lottie로 그린다.
// 카드 하나를 기록하면 이전 높이에서 새 높이까지 그 구간만 재생해 '한 뼘' 자라고, 취소하면 거꾸로 줄어든다.
// 애니메이션은 tools/make-plant-lottie.mjs가 만든 images/lottie/plant-grow.json (0프레임 새싹 → 120프레임 꽃).
// 색은 레이어 이름(fill-leaf 등)을 보고 화면 테마의 --c-* 변수 색으로 바꿔 넣는다.

const END = 120;
const JSON_URL = new URL('../images/lottie/plant-grow.json', import.meta.url);

let dataPromise = null;
let anim = null;
let shownFrame = null; // 지금 화면에 그려진 프레임 (다시 그릴 때 여기서부터 자란다)

const loadData = () => (dataPromise ??= fetch(JSON_URL).then((r) => (r.ok ? r.json() : Promise.reject(r.status))));

export const plantFrame = (done, total) => (total ? Math.round((Math.min(done, total) / total) * END) : 0);

// --c-primary 같은 변수("0 255 157")를 Lottie 색 [r,g,b,1]로
function tokenColor(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim().split(/\s+/).map(Number);
  return raw.length === 3 && raw.every((n) => !Number.isNaN(n)) ? [...raw.map((n) => n / 255), 1] : null;
}

function palette() {
  const dark = document.documentElement.classList.contains('dark');
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
  return {
    leaf: tokenColor('primary-container'),
    stem: tokenColor('primary'),
    vein: tokenColor('secondary-container'),
    bud: tokenColor('on-secondary-container'),
    petal: tokenColor('tertiary-fixed-dim'),
    center: tokenColor('tertiary-fixed'),
    soil: hex(dark ? '#4a3a2a' : '#c8b391')
  };
}

// 원본은 그대로 두고, 테마 색을 입힌 복사본을 만든다
function themed(data) {
  const colors = palette();
  const copy = structuredClone(data);
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if ((node.ty === 'fl' || node.ty === 'st') && typeof node.nm === 'string' && node.nm.startsWith('fill-')) {
      const c = colors[node.nm.slice(5)];
      if (c && node.c && node.c.a === 0) node.c.k = c;
    }
    Object.values(node).forEach(walk);
  };
  walk(copy.layers);
  return copy;
}

// render() 뒤마다 부른다. [data-plant] 칸이 없으면(다른 탭) 정리만 한다
export function mountPlant(root) {
  const box = root.querySelector('[data-plant]');
  if (anim) { anim.destroy(); anim = null; }
  if (!box) { shownFrame = null; return; }

  const target = Number(box.dataset.frame) || 0;
  const from = shownFrame ?? target; // 탭을 처음 열 때는 움직이지 않고 지금 모습으로
  shownFrame = target;

  const lottie = window.lottie;
  if (!lottie) return; // 라이브러리를 못 불러오면 자리의 아이콘이 그대로 남는다

  loadData().then((data) => {
    if (!box.isConnected) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.replaceChildren();
    const a = lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: themed(data),
      rendererSettings: { preserveAspectRatio: 'xMidYMax meet' }
    });
    anim = a;
    a.addEventListener('DOMLoaded', () => {
      if (reduce || from === target) {
        a.goToAndStop(target, true);
      } else {
        a.goToAndStop(from, true);
        // 한 뼘 자라는 데 0.9초쯤 (60fps 기준 구간 길이에 맞춰 속도를 조절)
        a.setSpeed(Math.max(0.5, Math.abs(target - from) / 54));
        a.playSegments([from, target], true);
        box.classList.remove('plant-pop');
        void box.offsetWidth;
        if (target > from) box.classList.add('plant-pop');
      }
    });
  }).catch(() => {});
}
