// '나의 성과' (지구편 앱에서 가져온 js/achievements-widget.js)를 기록 화면 40일 챌린지 아래 접고 펴기로 붙인다.
// 진행값은 저장하지 않고 이 기기의 기록에서 매번 다시 계산한다. 보상은 없다.
// 지구편의 퀴즈·게임·집 점검처럼 이 앱에 없는 기능의 목표는 빼고, 이 앱에 있는 기록으로만 목표를 만들었다.
import { CARDS, STAGES } from './data.js';
import * as store from './store.js';

const WEEKLY = [
  { id: 'w-rec5', title: '이번 주 실천 5번', metric: 'weekRecords', target: 5 },
  { id: 'w-days3', title: '이번 주 3일 기록하기', metric: 'weekDays', target: 3 },
  { id: 'w-refl', title: '이번 주 생각 한 줄 남기기', metric: 'weekReflections', target: 1 }
];
const stageGoal = (i) => ({ id: `stage${i}`, title: `나의 숲 '${STAGES[i][0]}' 단계 되기`, metric: 'stage', target: i });
const GOALS = [
  { id: 'rec1', title: '첫 실천 기록하기', metric: 'records', target: 1 },
  { id: 'refl1', title: '생각 한 줄 처음 남기기', metric: 'reflections', target: 1 },
  { id: 'read1', title: '읽기 자료 처음 읽기', metric: 'reads', target: 1 },
  { id: 'streak3', title: '3일 연속 실천 기록', metric: 'bestStreak', target: 3 },
  { id: 'rec10', title: '실천 10번 기록', metric: 'records', target: 10 },
  stageGoal(2),
  { id: 'streak7', title: '7일 연속 실천 기록', metric: 'bestStreak', target: 7 },
  { id: 'areas', title: '여섯 분야에서 한 번씩 실천', metric: 'areas', target: 6 },
  { id: 'read5', title: '읽기 자료 5편 읽기', metric: 'reads', target: 5 },
  stageGoal(3),
  { id: 'refl10', title: '생각 한 줄 10번 남기기', metric: 'reflections', target: 10 },
  { id: 'ch40', title: '40일 챌린지 끝까지 가기', metric: 'challengeDay', target: 40 },
  stageGoal(4),
  stageGoal(5)
];

let open = false; // 화면을 다시 그려도 펼친 상태를 기억한다 (저장하지 않음)

function stats() {
  const st = store.getState();
  const today = store.dateKey();
  const A = window.Achievements;
  const base = A.statsFromRecords(st.records, today);
  const from = A.weekStart(today);
  const points = store.totalPoints();
  let stage = 0;
  STAGES.forEach(([, need], i) => { if (points >= need) stage = i; });
  const area = Object.fromEntries(CARDS.map((c) => [c.id, c.area]));
  const areas = new Set(Object.values(st.records).flat().map((id) => area[id]).filter(Boolean));
  const first = Object.keys(st.records).sort()[0];
  const challengeDay = first ? Math.min(40, Math.floor((new Date(today + 'T00:00:00') - new Date(first + 'T00:00:00')) / 864e5) + 1) : 0;
  return {
    ...base,
    stage,
    areas: areas.size,
    challengeDay,
    reflections: st.reflections.length,
    weekReflections: st.reflections.filter((r) => r.date >= from && r.date <= today).length,
    reads: Object.keys(st.reads).length
  };
}

// cls: 버전마다 디자인에 맞춘 클래스 { fold, title, meta }
export function achievementsFold(cls = {}) {
  let meta = '이번 주 목표와 업적';
  if (window.Achievements) {
    const s = stats();
    const done = (list) => list.filter((g) => (s[g.metric] || 0) >= g.target).length;
    meta = `이번 주 ${done(WEEKLY)}/${WEEKLY.length} · 업적 ${done(GOALS)}/${GOALS.length}`;
  }
  return `
      <details class="ach-fold ${cls.fold || ''}" data-ach${open ? ' open' : ''}>
        <summary>
          <span class="ach-title ${cls.title || ''}">나의 성과</span>
          <span class="ach-meta ${cls.meta || ''}">${meta}</span>
        </summary>
        <div class="ach-body" data-achievements></div>
      </details>`;
}

// 화면을 그린 뒤 부른다. theme: 'light' / 'dark' / ''(시스템 설정 따름)
export function mountAchievements(scope = document, theme = '') {
  const fold = scope.querySelector('[data-ach]');
  if (!fold || !window.Achievements) return;
  fold.addEventListener('toggle', () => { open = fold.open; });
  window.Achievements.mount(fold.querySelector('[data-achievements]'), { stats: stats(), weekly: WEEKLY, achievements: GOALS, theme });
}
