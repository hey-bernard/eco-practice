/*!
 * 나의 성과 위젯 (지구편 클래식 모드 '성과' 탭의 '이번 주 목표' ~ '업적' 부분, 의존성 없음)
 * - 목표 카드마다 달리기 트랙: 진행한 만큼 사람이 결승 깃발 쪽으로 달려가 있고, 달성하면 깃발이 노랗게 펄럭인다
 *
 * 사용법:
 *   <div id="goals"></div>
 *   <script src="achievements-widget.js"></script>
 *   <script>
 *     const stats = Achievements.statsFromRecords(records);   // 또는 앱에서 직접 계산한 { metric: 값 }
 *     Achievements.mount(document.getElementById('goals'), { stats });
 *   </script>
 *
 * 옵션: stats(필수, { metric 이름: 숫자 }), weekly / achievements(목표 목록, 생략하면 원본 목록),
 *       weekNote(이번 주 목표 옆 안내 문구)
 * stats에 없는 metric을 쓰는 목표는 화면에서 뺀다(이 앱에 없는 기능의 목표를 0%로 보여 주지 않으려고).
 * CSS는 이 파일이 한 번만 <head>에 넣는다. 모든 클래스가 .acw 아래에 있어 기존 앱 스타일과 겹치지 않는다.
 * 색은 --acw-* 변수로 바꿀 수 있다.
 */
(function (root) {
  'use strict';

  /* ---------------- 원본 목표 ---------------- */
  const WEEKLY = [
    { id: 'w-rec5', title: '이번 주 실천 5번', metric: 'weekRecords', target: 5 },
    { id: 'w-days3', title: '이번 주 3일 기록하기', metric: 'weekDays', target: 3 },
    { id: 'w-quiz', title: '이번 주 퀴즈 다 푼 날 1일', metric: 'weekQuizDays', target: 1 }
  ];
  const ACHIEVEMENTS = [
    { id: 'rec1', title: '첫 실천 기록하기', metric: 'records', target: 1 },
    { id: 'quiz1', title: 'OX 퀴즈 5문항 모두 풀기', metric: 'quizDays', target: 1 },
    { id: 'home1', title: '우리 집 방 1곳 탐험 완료', metric: 'homeRooms', target: 1 },
    { id: 'game80', title: '분리배출 게임 80점 넘기기', metric: 'gameBest', target: 80 },
    { id: 'streak3', title: '3일 연속 실천 기록', metric: 'bestStreak', target: 3 },
    { id: 'rec10', title: '실천 10번 기록', metric: 'records', target: 10 },
    { id: 'lv3', title: 'Lv.3 초록 정원 되기', metric: 'level', target: 3 },
    { id: 'quiz5', title: '퀴즈를 다 푼 날 5일', metric: 'quizDays', target: 5 },
    { id: 'streak7', title: '7일 연속 실천 기록', metric: 'bestStreak', target: 7 },
    { id: 'areas', title: '여섯 영역에서 한 번씩 실천', metric: 'areas', target: 6 },
    { id: 'rec30', title: '실천 30번 기록', metric: 'records', target: 30 },
    { id: 'game150', title: '분리배출 게임 150점 넘기기', metric: 'gameBest', target: 150 },
    { id: 'homeall', title: '한 계절에 우리 집 4곳 모두 탐험', metric: 'homeSeasons', target: 1 },
    { id: 'lv4', title: 'Lv.4 풍성한 숲 되기', metric: 'level', target: 4 },
    { id: 'lv5', title: 'Lv.5 생명이 가득한 지구 되기', metric: 'level', target: 5 },
    { id: 'rec100', title: '실천 100번 기록', metric: 'records', target: 100 },
    { id: 'lv6', title: 'Lv.6 푸른 지구 되기', metric: 'level', target: 6 }
  ];

  /* ---------------- 스타일 ---------------- */
  const CSS = `
.acw{--acw-surface:#FFFFFF;--acw-surface-2:#F2F6F0;--acw-line:#D5E0D1;--acw-ink:#1F2A22;--acw-ink-2:#3F4D43;--acw-green:#2F7D3E;--acw-green-strong:#23612F;--acw-green-soft:#D5ECC2;--acw-chip:#DCEFF8;--acw-chip-ink:#1F5873;--acw-radius:14px;--acw-shadow:0 1px 3px rgba(31,42,34,.08);display:flex;flex-direction:column;gap:20px;color:var(--acw-ink);font-family:inherit;line-height:1.5}
@media (prefers-color-scheme:dark){.acw:not(.acw-light){--acw-surface:#1A221C;--acw-surface-2:#202B23;--acw-line:#2E3A31;--acw-ink:#EAF1EA;--acw-ink-2:#A9B6AC;--acw-green:#7CC98A;--acw-green-strong:#9AD9A5;--acw-green-soft:#24402A;--acw-chip:#1C3440;--acw-chip-ink:#A8D8EE;--acw-shadow:none}}
.acw.acw-dark{--acw-surface:#1A221C;--acw-surface-2:#202B23;--acw-line:#2E3A31;--acw-ink:#EAF1EA;--acw-ink-2:#A9B6AC;--acw-green:#7CC98A;--acw-green-strong:#9AD9A5;--acw-green-soft:#24402A;--acw-chip:#1C3440;--acw-chip-ink:#A8D8EE;--acw-shadow:none}
.acw *{box-sizing:border-box}
.acw-sec{display:flex;flex-direction:column;gap:10px}
.acw-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.acw-head h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.4px}
.acw-note{font-size:12px;color:var(--acw-ink-2)}
.acw-empty{margin:0;font-size:13px}
.acw-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--acw-chip);color:var(--acw-chip-ink)}
.acw-bar{height:12px;border-radius:6px;background:var(--acw-surface-2);overflow:hidden;border:1px solid var(--acw-line)}
.acw-bar>i{display:block;height:100%;background:var(--acw-green);border-radius:6px;transition:width .4s ease}
.acw-done{background:var(--acw-surface);border:1px solid var(--acw-line);border-radius:16px;padding:4px 14px}
.acw-done summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:500}
.acw-done .acw-group{display:flex;flex-direction:column;gap:8px;padding:6px 0 12px}
.acw-goal{display:flex;flex-direction:column;gap:6px;padding:12px 14px 10px;border:1px solid var(--acw-line);border-radius:var(--acw-radius);background:var(--acw-surface);box-shadow:var(--acw-shadow)}
.acw-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.acw-top .t{font-weight:700}
.acw-num{font-size:12px;color:var(--acw-ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.acw-race{position:relative;height:38px}
.acw-race .lane{position:absolute;left:0;right:10px;bottom:4px;height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,var(--acw-surface-2) 0 12px,var(--acw-line) 12px 14px)}
.acw-race .trail{display:block;height:100%;width:calc(var(--p) * 1%);border-radius:4px;background:linear-gradient(90deg,var(--acw-green-soft),var(--acw-green));animation:acw-trail 1.3s cubic-bezier(.2,.7,.3,1) both}
.acw-race .runner{position:absolute;bottom:10px;left:calc((100% - 44px) * var(--p) / 100);width:28px;height:28px;animation:acw-run 1.3s cubic-bezier(.2,.7,.3,1) both}
.acw-race .runner svg{width:100%;height:100%;fill:none;stroke:var(--acw-green-strong);stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;animation:acw-bob .3s ease-in-out infinite alternate}
.acw-race .runner .head{fill:var(--acw-green-strong);stroke:none}
.acw-race .runner .l2{opacity:0}
.acw-race .runner .l1,.acw-race .runner .l2{animation:acw-stride .3s steps(1) infinite}
.acw-race .runner .l2{animation-delay:.15s}
.acw-race .finish{position:absolute;right:0;bottom:4px;width:16px;height:30px}
.acw-race .finish svg{width:100%;height:100%;stroke:var(--acw-ink-2);stroke-width:1.8;stroke-linecap:round}
.acw-race .finish .cloth{fill:var(--acw-surface-2);stroke-linejoin:round}
.acw-goal.done .acw-race .finish .cloth{fill:#F2C14E;stroke:#B8860B;animation:acw-wave 1.2s ease-in-out infinite alternate;transform-origin:2px 6px}
.acw-goal.done .acw-race .runner svg,.acw-goal.done .acw-race .runner .l1,.acw-goal.done .acw-race .runner .l2{animation:none}
.acw-goal.done .acw-race .runner .l2{opacity:0}
@keyframes acw-run{from{left:0}}
@keyframes acw-trail{from{width:0}}
@keyframes acw-bob{to{transform:translateY(-2px) rotate(-5deg)}}
@keyframes acw-stride{0%{opacity:1}50%{opacity:0}}
@keyframes acw-wave{to{transform:skewY(-6deg) scaleX(.92)}}
@media (prefers-reduced-motion:reduce){.acw-race .trail,.acw-race .runner,.acw-race .runner svg,.acw-race .runner .l1,.acw-race .runner .l2,.acw-goal.done .acw-race .finish .cloth{animation:none}}`;

  function injectCss() {
    if (document.getElementById('acw-style')) return;
    const s = document.createElement('style');
    s.id = 'acw-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- 계산 도우미 ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + n));
  }
  // 그 주 월요일의 날짜 키
  function weekStart(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return addDays(key, -((dow + 6) % 7));
  }
  // 기록이 있는 날이 가장 길게 이어진 일수 (현재 연속이 아니라 최장이라, 한 번 달성하면 사라지지 않는다)
  function bestStreak(records) {
    const days = Object.keys(records || {}).filter((k) => records[k].length).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      run = prev && addDays(prev, 1) === k ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    }
    return best;
  }
  // 날짜별 기록 { 'YYYY-MM-DD': [항목, ...] }에서 기록 기반 지표를 만든다
  // (퀴즈·게임·레벨 같은 나머지 지표는 앱에서 계산해 이 결과에 더한다)
  function statsFromRecords(records, todayKey) {
    records = records || {};
    const from = weekStart(todayKey || dateKey(new Date())), to = addDays(from, 6);
    const inWeek = (k) => k >= from && k <= to;
    const keys = Object.keys(records);
    return {
      records: keys.reduce((n, k) => n + records[k].length, 0),
      bestStreak: bestStreak(records),
      weekRecords: keys.filter(inWeek).reduce((n, k) => n + records[k].length, 0),
      weekDays: keys.filter((k) => inWeek(k) && records[k].length).length
    };
  }
  function progress(goal, stats) {
    const value = Math.min(stats[goal.metric] || 0, goal.target);
    return { value, target: goal.target, done: value >= goal.target };
  }

  /* ---------------- 화면 ---------------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RUNNER = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="4.5" r="2.3" class="head"/><path d="M14 7.5 11 13"/><path d="M13.6 8.6l3 2 2-1.4M13 8.6 10 9.6l-1.6 2.6"/><path class="l1" d="M11 13l3 2.6-.6 4.2M11 13l-2.6 3-3.6.4"/><path class="l2" d="M11 13l1 3.4 3.4 2.4M11 13l-1.2 3.6-1.4 3.6"/></svg>';
  const FLAG = '<svg viewBox="0 0 16 28" aria-hidden="true"><path d="M2 27V2"/><path class="cloth" d="M2.6 2.5h11l-2.6 4 2.6 4h-11z"/></svg>';

  function goalRow(x) {
    const pct = Math.min(100, Math.round((x.prog.value / x.prog.target) * 100));
    return `
      <div class="acw-goal ${x.prog.done ? 'done' : ''}">
        <div class="acw-top">
          <span class="t">${esc(x.q.title)}</span>
          ${x.prog.done ? '<span class="acw-chip">달성</span>' : `<span class="acw-num">${x.prog.value.toLocaleString()}/${x.prog.target.toLocaleString()} · ${pct}%</span>`}
        </div>
        <div class="acw-race" style="--p:${pct}" role="progressbar" aria-label="${esc(x.q.title)} 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <span class="lane"><i class="trail"></i></span>
          <span class="runner">${RUNNER}</span>
          <span class="finish">${FLAG}</span>
        </div>
      </div>`;
  }

  function mount(el, options) {
    const opt = Object.assign({ stats: {}, weekly: WEEKLY, achievements: ACHIEVEMENTS, weekNote: '월요일마다 새로 시작해요', theme: '' }, options);
    injectCss();
    const has = (q) => q.metric in opt.stats;
    const list = (goals) => goals.filter(has).map((q) => ({ q, prog: progress(q, opt.stats) }));
    const weekly = list(opt.weekly);
    const goals = list(opt.achievements);
    const pctOf = (x) => x.prog.value / x.prog.target;
    const open = goals.filter((x) => !x.prog.done).sort((a, b) => pctOf(b) - pctOf(a));
    const done = goals.filter((x) => x.prog.done);
    const theme = opt.theme === 'dark' ? ' acw-dark' : opt.theme === 'light' ? ' acw-light' : '';
    el.innerHTML = `
      <div class="acw${theme}">
        ${weekly.length ? `
        <section class="acw-sec" aria-label="이번 주 목표">
          <div class="acw-head"><h3>이번 주 목표</h3><span class="acw-note">${esc(opt.weekNote)}</span></div>
          ${weekly.map(goalRow).join('')}
        </section>` : ''}
        ${goals.length ? `
        <section class="acw-sec" aria-label="업적">
          <div class="acw-head"><h3>업적</h3><span class="acw-note">${done.length}/${goals.length} 달성</span></div>
          <div class="acw-bar" role="progressbar" aria-label="업적 달성률" aria-valuemin="0" aria-valuemax="${goals.length}" aria-valuenow="${done.length}"><i style="width:${(done.length / goals.length) * 100}%"></i></div>
          ${open.map(goalRow).join('') || '<p class="acw-empty">모든 업적을 달성했어요!</p>'}
          ${done.length ? `<details class="acw-done"><summary>달성한 업적 ${done.length}개</summary><div class="acw-group">${done.map(goalRow).join('')}</div></details>` : ''}
        </section>` : ''}
      </div>`;
  }

  root.Achievements = { mount, statsFromRecords, weekStart, bestStreak, WEEKLY, ACHIEVEMENTS };
})(window);
