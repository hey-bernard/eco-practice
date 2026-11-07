// 오늘 탭 '실천 식물' Lottie(images/lottie/plant-grow.json)를 만든다.
// 실행: node tools/make-plant-lottie.mjs
//
// 타임라인 0~120프레임 = 새싹(아무것도 안 함) → 다 자란 식물(오늘 카드를 모두 기록).
// 앱(climate/app.js)이 '오늘 기록 수 / 오늘 카드 수' 비율로 프레임을 골라 그 구간만 재생한다.
// 그래서 카드 1장을 기록할 때마다 식물이 한 뼘씩 자란다.
//
// 색은 이름(nm: 'fill-leaf' 등)으로 표시해 두고, 앱이 화면 테마(--c-* 변수)에 맞춰 바꿔 넣는다.
// 여기 적은 색은 LottieFiles 등에서 그냥 열어 볼 때 쓰는 다크 테마 기본값이다.
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 120, H = 120, END = 120;
const rgb = (hex) => [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).concat(1);
const COLOR = {
  soil: rgb('#4a3a2a'), stem: rgb('#00e38b'), leaf: rgb('#00ff9d'), vein: rgb('#163a2a'),
  bud: rgb('#8ef0bf'), petal: rgb('#ffb86b'), center: rgb('#ffdcbc')
};

// ── 줄기: 흙(60,104)에서 위로 살짝 S자로 휘는 3차 베지어 ──
const P0 = [60, 104], C1 = [53, 80], C2 = [68, 52], P3 = [60, 24];
const bez = (t) => [0, 1].map((k) => (1 - t) ** 3 * P0[k] + 3 * (1 - t) ** 2 * t * C1[k] + 3 * (1 - t) * t ** 2 * C2[k] + t ** 3 * P3[k]);
// Trim Paths는 길이 비율로 자르므로, 길이 비율 → 점 표를 만든다
const N = 2000, pts = [], lens = [0];
for (let i = 0; i <= N; i++) pts.push(bez(i / N));
for (let i = 1; i <= N; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
const total = lens[N];
const at = (frac) => {
  const target = frac * total;
  let i = lens.findIndex((l) => l >= target);
  if (i <= 0) return pts[0];
  const r = (target - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r].map((v) => +v.toFixed(2));
};

// 프레임 → 줄기가 자란 비율 (0프레임에도 새싹 줄기 10%는 보인다)
const START = 0.1;
const grown = (f) => START + (1 - START) * (f / END);
const frameAt = (frac) => ((frac - START) / (1 - START)) * END;

// ── 키프레임 도우미 (bodymovin 5.x 형식) ──
const LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const ease = (dim) => ({ i: { x: Array(dim).fill(0.3), y: Array(dim).fill(1) }, o: { x: Array(dim).fill(0.4), y: Array(dim).fill(0) } });
const still = (k) => ({ a: 0, k });
const anim = (keys, dim = 1, curve = LIN) => ({
  a: 1,
  k: keys.map(([t, v], idx) => (idx === keys.length - 1 ? { t, s: [].concat(v) } : { t, s: [].concat(v), ...(curve === LIN ? LIN : ease(dim)) }))
});
const tr = () => ({ ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), sk: still(0), sa: still(0), nm: 'Transform' });
const fill = (name) => ({ ty: 'fl', c: still(COLOR[name]), o: still(100), r: 1, bm: 0, nm: `fill-${name}` });
const stroke = (name, w) => ({ ty: 'st', c: still(COLOR[name]), o: still(100), w: still(w), lc: 2, lj: 2, ml: 4, bm: 0, nm: `fill-${name}` });
const group = (nm, it) => ({ ty: 'gr', nm, it: [...it, tr()], np: it.length, cix: 2, bm: 0 });
const path = (v, i, o, c) => ({ ty: 'sh', ks: still({ v, i, o, c }), nm: 'Path' });

let ind = 0;
const layer = (nm, shapes, ks = {}) => ({
  ddd: 0, ind: ++ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op: END + 1, st: 0, bm: 0,
  ks: { o: still(100), r: still(0), p: still([0, 0, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...ks },
  shapes
});

// 잎: 원점(잎자루)에서 +x 쪽으로 뻗는 모양. 레이어 회전으로 방향을 정한다
const leafShape = (len) => [
  group('leaf', [
    path([[0, 0], [len, 0]], [[len * 0.3, len * 0.42], [-len * 0.36, -len * 0.28]], [[len * 0.3, -len * 0.42], [-len * 0.36, len * 0.28]], true),
    fill('leaf')
  ]),
  group('vein', [path([[len * 0.12, 0], [len * 0.78, 0]], [[0, 0], [0, 0]], [[0, 0], [0, 0]], false), stroke('vein', 1.2)])
];

// 잎 하나: 줄기 끝이 그 높이를 지날 때 톡 펼쳐진다 (0 → 115 → 100%)
const leaf = (nm, frac, dir, len, born = null) => {
  const f = born ?? Math.max(0, frameAt(frac));
  const p = at(frac);
  const rot = dir === 'L' ? -148 : -32;
  const s = born === 0
    ? still([100, 100, 100])
    : anim([[f, [0, 0, 100]], [f + 7, [115, 115, 100]], [f + 13, [100, 100, 100]]], 3, 'ease');
  return layer(nm, leafShape(len), { p: still([...p, 0]), r: still(rot), s });
};

// 줄기 끝 봉오리: 자라는 끝을 따라 올라가다가 마지막에 꽃으로 바뀐다
const tipKeys = [];
for (let f = 0; f <= END; f += 4) tipKeys.push([f, [...at(grown(f)), 0]]);
const budStart = 104;

// 꽃: 마지막 구간(오늘 카드를 모두 기록)에서 피어난다
const petals = [0, 72, 144, 216, 288].map((deg) => {
  const r = (deg - 90) * Math.PI / 180;
  return group(`petal-${deg}`, [
    { ty: 'el', p: still([+(Math.cos(r) * 6.5).toFixed(2), +(Math.sin(r) * 6.5).toFixed(2)]), s: still([9, 9]), d: 1, nm: 'Ellipse' },
    fill('petal')
  ]);
});
const top = at(1);

const layers = [
  layer('flower', [group('center', [{ ty: 'el', p: still([0, 0]), s: still([7, 7]), d: 1, nm: 'Ellipse' }, fill('center')]), ...petals], {
    p: still([...top, 0]),
    r: anim([[budStart, -40], [END, 0]], 1, 'ease'),
    s: anim([[budStart, [0, 0, 100]], [budStart + 10, [118, 118, 100]], [END, [100, 100, 100]]], 3, 'ease')
  }),
  layer('bud', [group('bud', [{ ty: 'el', p: still([0, -2.5]), s: still([6, 9]), d: 1, nm: 'Ellipse' }, fill('bud')])], {
    p: { a: 1, k: tipKeys.map(([t, v], i) => (i === tipKeys.length - 1 ? { t, s: v } : { t, s: v, i: { x: 1, y: 1 }, o: { x: 0, y: 0 }, to: [0, 0, 0], ti: [0, 0, 0] })) },
    o: anim([[budStart, 100], [budStart + 6, 0]])
  }),
  leaf('leaf-4', 0.78, 'R', 15),
  leaf('leaf-3', 0.63, 'L', 17),
  leaf('leaf-2', 0.47, 'R', 18),
  leaf('leaf-1', 0.31, 'L', 18),
  leaf('sprout-R', 0.1, 'R', 10, 0),
  leaf('sprout-L', 0.1, 'L', 10, 0),
  layer('soil', [group('soil', [{ ty: 'el', p: still([60, 107]), s: still([66, 14]), d: 1, nm: 'Ellipse' }, fill('soil')])]),
  layer('stem', [group('stem', [
    path([P0, P3], [[0, 0], [C2[0] - P3[0], C2[1] - P3[1]]], [[C1[0] - P0[0], C1[1] - P0[1]], [0, 0]], false),
    { ty: 'tm', s: still(0), e: anim([[0, START * 100], [END, 100]]), o: still(0), m: 1, nm: 'grow' },
    stroke('stem', 3.6)
  ])])
];

const data = { v: '5.7.4', fr: 60, ip: 0, op: END + 1, w: W, h: H, nm: 'plant-grow', ddd: 0, assets: [], layers, markers: [] };
mkdirSync(new URL('../images/lottie/', import.meta.url), { recursive: true });
writeFileSync(new URL('../images/lottie/plant-grow.json', import.meta.url), JSON.stringify(data));
console.log('images/lottie/plant-grow.json', JSON.stringify(data).length, 'bytes, stem', total.toFixed(1), 'px');
