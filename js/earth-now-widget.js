/*!
 * 지구 지금 위젯 (지구편 '배우기' 탭에서 떼어 낸 독립 버전, 의존성 없음)
 * - 실제 위성 지구(WebGL, NASA Visible Earth) + 기온·CO₂·해수면·수온·산성화 5장면
 * - 최근 30년 추세를 값에 따라 색이 변하는 선 + 색 범례로 표시
 *
 * 사용법:
 *   <div id="earth-now"></div>
 *   <script src="earth-now-widget.js"></script>
 *   <script>EarthNow.mount(document.getElementById('earth-now'), { api: '/api/earth-now', assets: 'assets/' });</script>
 *
 * 옵션: api(데이터 주소), assets(지구 텍스처 폴더, 끝에 / 포함), title(제목), autoplay(자동 넘김, 기본 true)
 * CSS는 이 파일이 한 번만 <head>에 넣는다. 모든 클래스가 .enw 아래에 있어 기존 앱 스타일과 겹치지 않는다.
 */
(function (root) {
  'use strict';

  /* ---------------- 스타일 ---------------- */
  const CSS = `
.enw{--accent:#FF9A62;position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;gap:12px;min-height:420px;padding:16px 16px 14px;border-radius:14px;color:#E9EEF5;background:radial-gradient(120% 90% at 30% 15%,#1A2A4C 0%,#0A1020 55%,#03050B 100%);font-family:'Noto Sans KR',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;text-align:left;box-sizing:border-box}
.enw *{box-sizing:border-box}
.enw[data-scene="co2"]{--accent:#F1D27A}.enw[data-scene="sea"]{--accent:#6CCBFF}.enw[data-scene="sst"]{--accent:#4FD8C4}.enw[data-scene="ph"]{--accent:#B9A2FF}
.enw::before{content:'';position:absolute;inset:0;z-index:-2;pointer-events:none;opacity:.85;animation:enw-twinkle 6s ease-in-out infinite alternate;background-image:radial-gradient(1px 1px at 18px 24px,#fff,transparent),radial-gradient(1px 1px at 92px 70px,rgba(255,255,255,.7),transparent),radial-gradient(1.5px 1.5px at 150px 30px,rgba(255,255,255,.9),transparent),radial-gradient(1px 1px at 60px 130px,rgba(200,220,255,.8),transparent),radial-gradient(1px 1px at 180px 120px,rgba(255,255,255,.6),transparent),radial-gradient(1.5px 1.5px at 120px 150px,rgba(255,240,220,.8),transparent);background-size:200px 170px}
.enw::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(90% 60% at 0% 100%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%),linear-gradient(180deg,rgba(0,0,0,.35),transparent 22%,transparent 70%,rgba(0,0,0,.55))}
.enw h2,.enw p,.enw figure{margin:0}
.enw .en-globe{position:absolute;z-index:-1;top:-18px;right:-70px;width:250px;aspect-ratio:1;opacity:.9;pointer-events:none}
.enw .en-globe canvas{display:block;width:100%;height:100%}
.enw .en-globe-fallback{width:82%;height:82%;margin:9%;border-radius:50%;background-position:0 50%;background-size:200% 100%;box-shadow:inset -28px -10px 48px rgba(0,0,0,.75),0 0 30px rgba(80,140,255,.35);animation:enw-spin 80s linear infinite}
.enw .en-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em}
.enw .en-live{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:6px;background:rgba(255,70,70,.16);color:#FF8A8A;font-weight:700}
.enw .en-live i{width:7px;height:7px;border-radius:50%;background:#FF4D4D;box-shadow:0 0 8px #FF4D4D;animation:enw-blink 1.4s ease-in-out infinite}
.enw .en-live.off{background:rgba(255,255,255,.1);color:#C9D3E2}.enw .en-live.off i{background:#8796AD;box-shadow:none;animation:none}
.enw .en-clock{font-variant-numeric:tabular-nums;color:#C9D3E2}
.enw .en-title{font-size:30px;font-weight:700;line-height:1.2;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.6)}
.enw .en-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:6px;max-width:76%}
.enw .en-tabs button{display:flex;flex-direction:column;gap:6px;padding:6px 0 0;min-height:36px;border:none;background:none;color:#8796AD;font:inherit;font-size:13px;font-weight:700;text-align:left;white-space:nowrap;cursor:pointer}
.enw .en-tabs button[aria-selected="true"]{color:#fff}
.enw .en-tabs i{display:block;height:3px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden}
.enw .en-tabs i::after{content:'';display:block;height:100%;width:0;background:var(--accent)}
.enw .en-tabs [aria-selected="true"] i::after{animation:enw-run 8s linear forwards}
.enw.manual .en-tabs [aria-selected="true"] i::after{animation:none;width:100%}
.enw .en-scene{display:flex;flex-direction:column;gap:8px;animation:enw-in .7s ease both}
.enw .en-kicker{font-size:13px;letter-spacing:.04em;color:#C9D3E2}
.enw .en-num{font-size:64px;font-weight:500;line-height:1;color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 0 28px color-mix(in srgb,var(--accent) 55%,transparent)}
.enw .en-num small{font-size:22px;margin-left:4px;color:var(--accent)}
.enw .en-sub{font-size:15px;line-height:1.55;color:#F2F5FA;max-width:30em}
.enw .en-cap{font-size:12px;line-height:1.5;color:#8796AD}
.enw .en-when{margin-top:auto;font-size:12px;color:#8796AD;text-align:right}
.enw .en-chart{position:relative}
.enw .en-chart svg{width:100%;height:auto;display:block;touch-action:pan-y}
.enw .en-chart .grid line{stroke:rgba(255,255,255,.08)}
.enw .en-chart .years line{stroke:rgba(255,255,255,.3)}
.enw .en-chart text{font-size:11px;fill:#8796AD;font-family:inherit}
.enw .en-chart .line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;filter:drop-shadow(0 0 3px rgba(255,255,255,.22));stroke-dasharray:1;stroke-dashoffset:1;animation:enw-draw 1.6s ease-out .2s forwards}
.enw .en-chart .dot{stroke:#0A1020;stroke-width:2;animation:enw-pulse 2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.enw .en-chart .hdot{fill:#F2F5FA;stroke:#0A1020;stroke-width:2}
.enw .en-chart .cross{stroke:rgba(255,255,255,.4);stroke-width:1}
.enw .en-tip{position:absolute;width:120px;pointer-events:none;background:#F2F5FA;color:#0A1020;font-size:12px;padding:6px 8px;border-radius:8px;line-height:1.35}
.enw .en-tip[hidden]{display:none}
.enw .en-legend{margin:4px 3.1% 0 10.6%}
.enw .en-legend i{display:block;height:8px;border-radius:4px}
.enw .en-legend div{position:relative;height:16px;margin-top:3px;font-size:11px;color:#8796AD;font-variant-numeric:tabular-nums}
.enw .en-legend span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.enw .en-legend span:first-child{transform:none}.enw .en-legend span:last-child{transform:translateX(-100%)}
.enw details summary{font-size:13px;color:#8796AD;cursor:pointer;min-height:32px;display:flex;align-items:center}
.enw details table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.enw details td,.enw details th{text-align:left;padding:4px;border-top:1px solid rgba(255,255,255,.1);color:#C9D3E2}
.enw details tbody{display:block;max-height:180px;overflow:auto}
.enw details thead,.enw details tr{display:table;width:100%;table-layout:fixed}
.enw-sources{font-size:13px;color:#6B7686;margin:8px 0 0}.enw-sources a{color:inherit}
@media (max-width:380px){.enw .en-tabs{max-width:none;gap:8px}.enw .en-tabs button{font-size:12px}}
@keyframes enw-twinkle{from{opacity:.55}to{opacity:.95}}
@keyframes enw-blink{50%{opacity:.25}}
@keyframes enw-run{to{width:100%}}
@keyframes enw-in{from{opacity:0;transform:translateY(10px);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
@keyframes enw-draw{to{stroke-dashoffset:0}}
@keyframes enw-pulse{50%{transform:scale(1.5)}}
@keyframes enw-spin{to{background-position:-200% 50%}}
@media (prefers-reduced-motion:reduce){.enw::before,.enw .en-live i,.enw .en-scene,.enw .en-chart .dot,.enw .en-globe-fallback{animation:none}.enw .en-chart .line{animation:none;stroke-dashoffset:0}}`;

  function injectCss() {
    if (document.getElementById('enw-style')) return;
    const s = document.createElement('style');
    s.id = 'enw-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- 위성 지구 (WebGL) ---------------- */
  const Globe = (function () {
    const SCALE = 1.22, AUTO_SPEED = 0.06, IDLE_MS = 2500;
    const START = { yaw: 127 * Math.PI / 180, pitch: 0.4 };   // 한반도가 보이게 시작
    const VS = 'attribute vec2 a; varying vec2 vP; void main() { vP = a; gl_Position = vec4(a, 0.0, 1.0); }';
    const FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 vP;
uniform sampler2D uDay, uNight, uCloud;
uniform float uYaw, uPitch, uTime, uScale;
const float PI = 3.14159265;
void main() {
  vec2 p = vP * uScale;
  float r = length(p);
  vec3 sun = normalize(vec3(-0.55, 0.35, 0.76));
  float sunSide = 0.35 + 0.65 * smoothstep(-0.6, 0.6, dot(normalize(p + 1e-5), sun.xy));
  vec3 glowCol = vec3(0.32, 0.58, 1.0) * exp(-max(r - 1.0, 0.0) * 13.0) * 0.6 * sunSide;
  float aa = fwidth(r);
  float inside = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  vec3 col = vec3(0.0);
  if (inside > 0.0) {
    vec3 nv = vec3(p, sqrt(max(1.0 - r * r, 0.0)));
    float cp = cos(uPitch), sp = sin(uPitch);
    vec3 n1 = vec3(nv.x, nv.y * cp + nv.z * sp, -nv.y * sp + nv.z * cp);
    float cy = cos(uYaw), sy = sin(uYaw);
    vec3 nw = vec3(n1.x * cy + n1.z * sy, n1.y, -n1.x * sy + n1.z * cy);
    float u1 = atan(nw.x, nw.z) / (2.0 * PI) + 0.5;
    float u2 = fract(u1 + 0.5) - 0.5;
    float u = fwidth(u1) <= fwidth(u2) ? u1 : u2;
    float v = 0.5 - asin(clamp(nw.y, -1.0, 1.0)) / PI;
    vec3 day = texture2D(uDay, vec2(u, v)).rgb;
    vec3 night = texture2D(uNight, vec2(u, v)).rgb;
    float cloud = texture2D(uCloud, vec2(u + uTime * 0.0025, v)).r;
    float d = dot(nv, sun);
    float diff = max(d, 0.0);
    float ocean = smoothstep(0.02, 0.12, day.b - day.r);
    vec3 h = normalize(sun + vec3(0.0, 0.0, 1.0));
    vec3 lit = day * (0.06 + 1.1 * diff) + vec3(1.0, 0.95, 0.85) * pow(max(dot(nv, h), 0.0), 40.0) * ocean * 0.5;
    lit = mix(lit, vec3(0.04 + 1.05 * diff), cloud * 0.85);
    vec3 lights = night * vec3(1.0, 0.8, 0.5) * 1.5 * (1.0 - cloud * 0.8);
    col = mix(lights, lit, smoothstep(-0.12, 0.18, d));
    col += vec3(0.3, 0.55, 1.0) * pow(1.0 - nv.z, 3.0) * (0.2 + 0.9 * smoothstep(-0.3, 0.6, d));
  }
  float glowA = clamp(max(glowCol.r, max(glowCol.g, glowCol.b)), 0.0, 1.0);
  gl_FragColor = vec4(col * inside + glowCol * (1.0 - inside), max(inside, glowA));
}`;
    const st = { yaw: START.yaw, pitch: START.pitch, t0: performance.now() };
    let canvas = null, gl = null, uni = null, raf = 0, ok = null;
    const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function texture(unit, src) {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 20, 40, 255]));
      const img = new Image();
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      };
      img.src = src;
    }
    function init(assets) {
      canvas = document.createElement('canvas');
      try {
        gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
        if (!gl || !gl.getExtension('OES_standard_derivatives')) throw new Error('no webgl');
        const prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const a = gl.getAttribLocation(prog, 'a');
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        uni = {};
        for (const n of ['uDay', 'uNight', 'uCloud', 'uYaw', 'uPitch', 'uTime', 'uScale']) uni[n] = gl.getUniformLocation(prog, n);
        gl.uniform1i(uni.uDay, 0);
        gl.uniform1i(uni.uNight, 1);
        gl.uniform1i(uni.uCloud, 2);
        gl.uniform1f(uni.uScale, SCALE);
        texture(0, assets + 'earth-day.webp');
        texture(1, assets + 'earth-night.webp');
        texture(2, assets + 'earth-clouds.webp');
        ok = true;
      } catch (e) {
        ok = false;
      }
    }
    let last = 0;
    function frame(now) {
      raf = 0;
      if (!canvas.isConnected || document.hidden) return;
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (!reduce()) st.yaw += AUTO_SPEED * dt;
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      if (w && (canvas.width !== w || canvas.height !== w)) { canvas.width = w; canvas.height = w; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uni.uYaw, st.yaw);
      gl.uniform1f(uni.uPitch, st.pitch);
      gl.uniform1f(uni.uTime, reduce() ? 0 : (now - st.t0) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    }
    // 캔버스·WebGL은 한 번만 만들고 다시 그릴 때는 옮겨 붙인다
    function mount(el, assets) {
      if (ok === null) init(assets);
      if (!ok) {
        el.innerHTML = `<div class="en-globe-fallback" style="background-image:url('${assets}earth-day.webp')"></div>`;
        return;
      }
      el.appendChild(canvas);
      last = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && canvas && canvas.isConnected && ok && !raf) raf = requestAnimationFrame(frame); });
    return { mount };
  })();

  /* ---------------- 도우미 ---------------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sign = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const md = (iso) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;
  const ym = (d) => `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월` + (d.length > 7 ? ` ${Number(d.slice(8, 10))}일` : '');
  const decYear = (d) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12 + (d.length > 7 ? (Number(d.slice(8, 10)) - 1) / 365 : 15 / 365);
  const calm = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  /* ---------------- 값에 따라 색이 변하는 30년 그래프 ---------------- */
  // 기상청 종합 기후변화감시정보 첫 화면 그래프의 색 정지점: 파랑 → 청록 → 노랑 → 주황 → 빨강
  const HEAT = [['#2382BA', 0], ['#00AFC5', 20], ['#0AC6BE', 40], ['#F2E85A', 60], ['#FFA53B', 70], ['#F0443A', 100]];

  function heatAt(k) {
    k = Math.min(Math.max(k, 0), 1) * 100;
    let i = 1;
    while (i < HEAT.length - 1 && HEAT[i][1] < k) i++;
    const [a, pa] = HEAT[i - 1], [b, pb] = HEAT[i], f = (k - pa) / (pb - pa);
    const ch = (c, s) => parseInt(c.slice(s, s + 2), 16);
    return '#' + [1, 3, 5].map((s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * f).toString(16).padStart(2, '0')).join('');
  }

  // spec.lo = 파랑 끝 값, spec.hi = 빨강 끝 값 (pH처럼 낮을수록 나쁘면 lo > hi)
  let uid = 0;
  function trendChart(rows, spec) {
    const W = 320, H = 140, L = 34, R = 10, T = 10, B = 22, gid = 'enw-heat-' + (++uid);
    const xs = rows.map((r) => decYear(r.d)), ys = rows.map((r) => r.v);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    const pad = (hi - lo) * 0.1 || 1;
    lo -= pad; hi += pad;
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = rows.map((r, i) => `${X(xs[i]).toFixed(1)},${Y(r.v).toFixed(1)}`).join(' ');
    const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
    const years = [];
    for (let y = Math.ceil(x0 / 5) * 5; y <= x1; y += 5) years.push(y);
    const last = rows[rows.length - 1];
    const k = (v) => (v - spec.lo) / (spec.hi - spec.lo);
    const legend = `linear-gradient(90deg, ${HEAT.map(([c, p]) => `${c} ${p}%`).join(', ')})`;
    return `
      <figure class="en-chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.label)}">
          <defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${Y(spec.lo).toFixed(1)}" y2="${Y(spec.hi).toFixed(1)}">${HEAT.map(([c, p]) => `<stop offset="${p}%" stop-color="${c}"/>`).join('')}</linearGradient></defs>
          <g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${spec.tick(t)}</text>`).join('')}</g>
          <g class="years">${years.map((y) => `<line x1="${X(y)}" x2="${X(y)}" y1="${H - B}" y2="${H - B + 3}"/><text x="${X(y)}" y="${H - 6}" text-anchor="middle">${y}</text>`).join('')}</g>
          <polyline class="line" pathLength="1" points="${pts}" style="stroke:url(#${gid})"/>
          <circle class="dot" cx="${X(x1)}" cy="${Y(last.v)}" r="4.5" style="fill:${heatAt(k(last.v))}"/>
          <g class="hover" style="display:none"><line class="cross" y1="${T}" y2="${H - B}"/><circle class="hdot" r="4.5"/></g>
          <rect class="hit" x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/>
        </svg>
        <div class="en-tip" hidden></div>
        <div class="en-legend" aria-hidden="true">
          <i style="background:${legend}"></i>
          <div>${spec.legend.map((v) => `<span style="left:${(k(v) * 100).toFixed(1)}%">${esc(spec.legendFmt(v))}</span>`).join('')}</div>
        </div>
        <details><summary>숫자로 보기</summary>
          <table><thead><tr><th>${rows[0].d.length > 7 ? '관측일' : '달'}</th><th>${esc(spec.yName)}</th></tr></thead>
          <tbody>${rows.slice().reverse().map((r) => `<tr><td>${esc(ym(r.d))}</td><td>${esc(spec.fmt(r.v))}</td></tr>`).join('')}</tbody></table>
        </details>
      </figure>`;
  }

  // 마우스·터치로 가장 가까운 달의 값 보기
  function attachHover(fig, rows, spec) {
    if (!fig) return;
    const svg = fig.querySelector('svg'), hover = svg.querySelector('.hover'), tip = fig.querySelector('.en-tip');
    const line = svg.querySelector('.line');
    const dots = rows.map((r, i) => { const c = line.points.getItem(i); return { x: c.x, y: c.y, r }; });
    const move = (e) => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      const s = p.matrixTransform(svg.getScreenCTM().inverse());
      let best = dots[0];
      for (const d of dots) if (Math.abs(d.x - s.x) < Math.abs(best.x - s.x)) best = d;
      hover.style.display = '';
      hover.querySelector('.cross').setAttribute('x1', best.x);
      hover.querySelector('.cross').setAttribute('x2', best.x);
      hover.querySelector('.hdot').setAttribute('cx', best.x);
      hover.querySelector('.hdot').setAttribute('cy', best.y);
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(spec.fmt(best.r.v))}</b> ${esc(ym(best.r.d))}`;
      const box = svg.getBoundingClientRect(), k = box.width / 320;
      tip.style.left = Math.min(Math.max(best.x * k - 60, 0), box.width - 120) + 'px';
      tip.style.top = Math.max(best.y * k - 44, 0) + 'px';
    };
    const hit = svg.querySelector('.hit');
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { hover.style.display = 'none'; tip.hidden = true; });
  }

  // 처음 1년 평균과 마지막 1년 평균의 차이
  function change(rows) {
    const x0 = decYear(rows[0].d), x1 = decYear(rows[rows.length - 1].d);
    const avg = (a) => a.reduce((s, r) => s + r.v, 0) / a.length;
    return { from: rows[0].d.slice(0, 4), diff: avg(rows.filter((r) => decYear(r.d) > x1 - 1)) - avg(rows.filter((r) => decYear(r.d) < x0 + 1)) };
  }
  const rise = (ch) => `${ch.from}년 무렵보다 ${Math.abs(ch.diff).toFixed(1)}℃ ${ch.diff >= 0 ? '올랐어요' : '내렸어요'}.`;

  const TREND = {
    temp: { label: '최근 30년 지구 평균기온 편차(달 평균)', yName: '편차(℃)', lo: -0.5, hi: 1, legend: [-0.5, 0, 0.5, 1], legendFmt: (v) => sign(v, 1) + '℃', fmt: (v) => sign(v, 2) + '℃', tick: (v) => sign(v, 1) },
    co2: { label: '최근 30년 마우나로아 이산화탄소 농도(달 평균)', yName: 'CO2(ppm)', lo: 360, hi: 440, legend: [360, 380, 400, 420, 440], legendFmt: (v) => v + 'ppm', fmt: (v) => v.toFixed(2) + ' ppm', tick: (v) => v.toFixed(0) },
    sea: { label: '최근 30년 전 지구 평균 해수면(달 평균)', yName: '해수면(mm)', lo: 0, hi: 90, legend: [0, 30, 60, 90], legendFmt: (v) => v + 'mm', fmt: (v) => sign(v, 1) + ' mm', tick: (v) => v.toFixed(0) },
    sst: { label: '최근 30년 바다 표면 수온 편차(달 평균)', yName: '편차(℃)', lo: -0.4, hi: 0.8, legend: [-0.4, 0, 0.4, 0.8], legendFmt: (v) => sign(v, 1) + '℃', fmt: (v) => sign(v, 2) + '℃', tick: (v) => sign(v, 1) },
    ph: { label: '최근 30년 하와이 앞바다 표층 pH', yName: 'pH', lo: 8.14, hi: 8.02, legend: [8.14, 8.11, 8.08, 8.05, 8.02], legendFmt: (v) => 'pH ' + v.toFixed(2), fmt: (v) => v.toFixed(3), tick: (v) => v.toFixed(2) }
  };

  /* ---------------- 장면 ---------------- */
  const SCENES = [{ id: 'temp', tab: '기온' }, { id: 'co2', tab: 'CO₂' }, { id: 'sea', tab: '해수면' }, { id: 'sst', tab: '수온' }, { id: 'ph', tab: '산성화' }];
  const SCENE_MS = 8000;
  const num = (v, unit, d, signed) => `<div class="en-num" data-to="${v}" data-d="${d}" data-signed="${signed ? 1 : ''}">${signed ? sign(v, d) : v.toFixed(d)}<small>${unit}</small></div>`;

  // 자료가 없으면 null
  function sceneOf(d, id) {
    const t = d.temp, c = d.co2, lg = d.long || {};
    const chart = (rows) => trendChart(rows, TREND[id]);
    if (id === 'temp' && t && t.length && lg.temp) {
      const tl = t[t.length - 1];
      return { rows: lg.temp, html: `
        <span class="en-kicker">지구 평균기온 · 1991~2020년 평균과 비교</span>
        ${num(tl.ano, '℃', 2, true)}
        <p class="en-sub">${md(tl.date)}, 지구는 30년 평균보다 ${Math.abs(tl.ano).toFixed(2)}℃ ${tl.ano >= 0 ? '더웠어요' : '선선했어요'}. ${rise(change(lg.temp))}</p>
        ${chart(lg.temp)}
        <p class="en-cap">그래프는 최근 30년 달 평균 편차. 하루 평균 ${tl.t.toFixed(2)}℃${tl.final ? '' : ' (잠정치)'}. 위성·관측을 합친 재분석 자료라 5일쯤 늦게 나와요.</p>` };
    }
    if (id === 'co2' && c && lg.co2) {
      const cl = c.rows[c.rows.length - 1], ch = change(lg.co2);
      return { rows: lg.co2, html: `
        <span class="en-kicker">대기 중 이산화탄소 · 하와이 마우나로아 관측소</span>
        ${num(cl.ppm, 'ppm', 2)}
        <p class="en-sub">${ch.from}년 무렵보다 ${sign(ch.diff, 0)} ppm${c.yearAgo ? `, 1년 전보다 ${sign(cl.ppm - c.yearAgo.ppm, 2)} ppm` : ''}. 공기 속 탄소는 계속 쌓이고 있어요.</p>
        ${chart(lg.co2)}
        <p class="en-cap">그래프는 최근 30년 달 평균(톱니 모양은 식물이 자라고 지는 계절 변화). 큰 숫자는 ${md(cl.date)} 하루 관측값.</p>` };
    }
    if (id === 'sea' && lg.sea) {
      const rows = lg.sea, ch = change(rows), last = rows[rows.length - 1];
      return { rows, html: `
        <span class="en-kicker">전 지구 평균 해수면 · ${ch.from}년 무렵과 비교</span>
        ${num(ch.diff / 10, 'cm', 1, true)}
        <p class="en-sub">${ch.from}년 무렵보다 바다가 ${(ch.diff / 10).toFixed(1)} cm 높아졌어요. 바닷물이 데워져 부풀고, 빙하가 녹아 물이 더해져요.</p>
        ${chart(rows)}
        <p class="en-cap">인공위성 고도계 달 평균, 계절 변화를 뺀 값(${ym(last.d)}까지). Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.</p>` };
    }
    if (id === 'sst' && d.sst && lg.sst) {
      const s = d.sst;
      return { rows: lg.sst, html: `
        <span class="en-kicker">바다 표면 수온 · 1991~2020년 평균과 비교</span>
        ${num(s.ano, '℃', 2, true)}
        <p class="en-sub">${md(s.date)}, 바다 표면은 ${s.t.toFixed(1)}℃로 30년 평균보다 ${Math.abs(s.ano).toFixed(2)}℃ ${s.ano >= 0 ? '따뜻했어요' : '차가웠어요'}. ${rise(change(lg.sst))}</p>
        ${chart(lg.sst)}
        <p class="en-cap">남위 60°~북위 60° 바다 평균. 그래프는 최근 30년 달 평균 편차${s.final ? '' : ', 큰 숫자는 잠정치'}.</p>` };
    }
    if (id === 'ph' && lg.ph) {
      const rows = lg.ph, ch = change(rows), last = rows[rows.length - 1];
      return { rows, html: `
        <span class="en-kicker">바다 산성화 · 하와이 북쪽 ALOHA 정점 표층 pH</span>
        ${num(last.v, 'pH', 3)}
        <p class="en-sub">${ch.from}년 무렵보다 pH가 ${Math.abs(ch.diff).toFixed(2)} ${ch.diff <= 0 ? '낮아졌어요' : '높아졌어요'}. 바다가 공기 속 CO₂를 녹여 산성 쪽으로 바뀌고 있어요.</p>
        ${chart(rows)}
        <p class="en-cap">관측선이 나갈 때마다 잰 값(${ym(last.d)} 관측까지). pH는 낮을수록 산성이라, 이 그래프만 아래로 갈수록 빨개져요.</p>` };
    }
    return null;
  }

  // 숫자를 0에서 실제 값까지 차오르게
  function countUp(el) {
    if (!el) return;
    const to = Number(el.dataset.to), d = Number(el.dataset.d), signed = !!el.dataset.signed;
    const unit = el.querySelector('small').outerHTML, t0 = performance.now(), dur = 1300;
    const step = (now) => {
      if (!el.isConnected) return;
      const k = Math.min((now - t0) / dur, 1), v = to * (1 - Math.pow(1 - k, 3));
      el.innerHTML = (signed ? sign(v, d) : v.toFixed(d)) + unit;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- 데이터 ---------------- */
  const CACHE_KEY = 'earthNow.cache';
  // 실패하면 이 기기에 저장해 둔 마지막 값을 쓴다
  function load(api) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    return fetch(api, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* 무시 */ } return { data: d, cached: false }; })
      .catch(() => {
        try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c) return { data: c, cached: true }; } catch (e) { /* 없음 */ }
        return { data: null, cached: false };
      })
      .finally(() => clearTimeout(timer));
  }

  /* ---------------- 붙이기 ---------------- */
  function mount(el, options) {
    const opt = Object.assign({ api: '/api/earth-now', assets: 'assets/', title: '지구 지금', autoplay: true }, options);
    injectCss();
    if (el._enwStop) el._enwStop();
    const timers = [];
    el._enwStop = () => timers.forEach(clearInterval);
    let scene = 'temp', auto = opt.autoplay;

    el.innerHTML = `<div class="enw"><div class="en-top"><span class="en-live off"><i></i>연결 중</span></div><h2 class="en-title">${esc(opt.title)}</h2><p class="en-sub">최신 지구 자료를 불러오는 중이에요…</p></div>`;
    load(opt.api).then((res) => {
      if (!el.isConnected) return;
      const d = res.data;
      const list = d ? SCENES.filter((x) => sceneOf(d, x.id)) : [];
      if (list.length && !list.some((x) => x.id === scene)) scene = list[0].id;
      const live = d && !res.cached;
      const when = d ? new Date(d.fetchedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      el.innerHTML = `
        <div class="enw" data-scene="${scene}">
          <div class="en-globe" aria-hidden="true"></div>
          <div class="en-top">
            <span class="en-live${live ? '' : ' off'}"><i></i>${live ? 'LIVE' : '저장된 값'}</span>
            <span class="en-clock" aria-hidden="true">${clock()}</span>
          </div>
          <h2 class="en-title">${esc(opt.title)}</h2>
          ${list.length ? `
            <div class="en-tabs" role="tablist" aria-label="${esc(opt.title)} 장면">${list.map((x) => `<button type="button" role="tab" data-scene="${x.id}" aria-selected="${x.id === scene}"><span>${x.tab}</span><i></i></button>`).join('')}</div>
            <div class="en-scene" role="tabpanel" aria-live="polite"></div>
            <p class="en-when">${esc(when)} 갱신</p>`
          : `<p class="en-sub">지구 신호가 아직 닿지 않았어요.</p><p class="en-cap">데이터를 불러오지 못했어요. 인터넷에 연결된 뒤 다시 열어 주세요.</p>`}
        </div>
        ${d ? `<p class="enw-sources">자료: <a href="https://pulse.climate.copernicus.eu/" target="_blank" rel="noopener">Copernicus Climate Pulse (C3S/ECMWF, ERA5)</a> · <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener">NOAA GML 마우나로아</a> · <a href="https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/" target="_blank" rel="noopener">NOAA 위성 고도계 해수면</a> · <a href="https://hahana.soest.hawaii.edu/hot/hotco2/hotco2.html" target="_blank" rel="noopener">하와이대 HOT 해양 pH</a>${d.errors && d.errors.length ? ' · 일부 자료를 불러오지 못했어요' : ''} · 위성 사진 NASA Visible Earth · 그래프 색 표현 참고 <a href="http://climate.go.kr/home/09_monitoring/" target="_blank" rel="noopener">기상청 종합 기후변화감시정보</a></p>` : ''}`;

      const panel = el.querySelector('.enw');
      Globe.mount(el.querySelector('.en-globe'), opt.assets);
      const clk = el.querySelector('.en-clock');
      const tick = setInterval(() => { if (!el.isConnected) return clearInterval(tick); clk.textContent = clock(); }, 1000);
      timers.push(tick);
      if (!list.length) return;

      const stopAuto = () => { auto = false; panel.classList.add('manual'); };
      const show = (id) => {
        scene = id;
        panel.dataset.scene = id;
        el.querySelectorAll('.en-tabs [data-scene]').forEach((b) => b.setAttribute('aria-selected', b.dataset.scene === id));
        const box = el.querySelector('.en-scene'), s = sceneOf(d, id);
        box.innerHTML = s.html;
        box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
        attachHover(box.querySelector('.en-chart'), s.rows, TREND[id]);
        if (!calm()) countUp(box.querySelector('.en-num'));
      };
      el.querySelectorAll('.en-tabs [data-scene]').forEach((b) => b.addEventListener('click', () => { stopAuto(); show(b.dataset.scene); }));
      show(scene);

      // 자동으로 다음 장면 (움직임 줄이기 설정이거나 직접 고른 뒤에는 멈춤)
      if (calm() || !auto) { panel.classList.add('manual'); return; }
      const ids = list.map((x) => x.id);
      const next = setInterval(() => {
        if (!el.isConnected || !auto) return clearInterval(next);
        if (document.hidden || panel.matches(':hover')) return;
        show(ids[(ids.indexOf(scene) + 1) % ids.length]);
      }, SCENE_MS);
      timers.push(next);
    });
  }

  root.EarthNow = { mount };
})(window);
