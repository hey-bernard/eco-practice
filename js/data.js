// 앱에서 쓰는 고정 데이터: 실천 카드(성인 30개 · 학생 25개), 숲 단계, 읽기 카드 14편, 예시 모임·학급, 화면 문구
// 기준: 노션 기획안 6장(2026-10-17). 첫 화면에서 고른 대상(audience.js)에 따라 내보내는 값이 달라진다.
import { IS_STUDENT } from './audience.js';

// level: easy 쉬움 · normal 보통 · hard 도전
// stat/unit: 기록 화면 '이번 달 쌓인 변화'에 보여 줄 이름과 단위 (탄소 수치는 쓰지 않음)
// occasional: 매일 할 수 없는 카드라 하루 추천에서 뺌
// group: 모임에 합류해야 의미 있는 카드라 하루 추천에서 뺌
const ADULT_CARDS = [
  { id: 'transit', area: '이동', title: '대중교통 이용', level: 'easy', hint: '오늘 한 번이라도', stat: '대중교통 이동', unit: '번' },
  { id: 'walk8k', area: '이동', title: '8천 보 걷기', level: 'easy', hint: '걸어서 가까운 곳까지', stat: '8천 보 걸은 날', unit: '일' },
  { id: 'onestop', area: '이동', title: '한 정거장 걸어서 내리기', level: 'easy', hint: '한 정거장 먼저 내려서', stat: '한 정거장 걷기', unit: '번' },
  { id: 'bike', area: '이동', title: '자전거 타기', level: 'normal', hint: '가까운 거리는 자전거로', stat: '자전거 이동', unit: '번' },
  { id: 'stairs', area: '이동', title: '계단 오르기', level: 'easy', hint: '엘리베이터 대신', stat: '계단 오르기', unit: '번' },
  { id: 'carpool', area: '이동', title: '카풀', level: 'hard', hint: '같은 방향 동료와', stat: '카풀', unit: '번' },
  { id: 'vegmeal', area: '식단', title: '하루 한 끼 채식', level: 'normal', hint: '점심이나 저녁 한 끼', stat: '채식 끼니', unit: '끼' },
  { id: 'meatless', area: '식단', title: '고기 없는 날', level: 'hard', hint: '하루 동안 고기 없이', stat: '고기 없는 날', unit: '일' },
  { id: 'noleftover', area: '식단', title: '음식 남기지 않기', level: 'easy', hint: '먹을 만큼만 덜어서', stat: '음식 남기지 않기', unit: '번' },
  { id: 'fridge', area: '식단', title: '장보기 전 냉장고 확인', level: 'easy', hint: '있는 재료부터 쓰기', stat: '냉장고 확인', unit: '번' },
  { id: 'seasonal', area: '식단', title: '제철 식재료 고르기', level: 'normal', hint: '지금 계절 재료로', stat: '제철 식재료', unit: '번' },
  { id: 'coldwash', area: '에너지·물', title: '찬물 세탁', level: 'normal', hint: '세탁기 온도를 낮춰서', stat: '찬물 세탁', unit: '번' },
  { id: 'airdry', area: '에너지·물', title: '빨래 자연건조', level: 'normal', hint: '건조기 대신 햇볕에', stat: '자연건조', unit: '번' },
  { id: 'unplug', area: '에너지·물', title: '안 쓰는 플러그 뽑기', level: 'easy', hint: '나가기 전에 한 번', stat: '플러그 뽑기', unit: '번' },
  { id: 'lightsoff', area: '에너지·물', title: '나갈 때 불 끄기', level: 'easy', hint: '빈 방은 어둡게', stat: '불 끄기', unit: '번' },
  { id: 'shortshower', area: '에너지·물', title: '짧게 샤워', level: 'normal', hint: '노래 두 곡 안에', stat: '짧은 샤워', unit: '번' },
  { id: 'tapoff', area: '에너지·물', title: '양치할 때 물 잠그기', level: 'easy', hint: '컵에 받아서', stat: '물 잠그기', unit: '번' },
  { id: 'ereceipt', area: '소비·순환', title: '전자영수증 받기', level: 'easy', hint: '계산할 때 한마디', stat: '전자영수증', unit: '장' },
  { id: 'refill', area: '소비·순환', title: '리필스테이션 이용', level: 'normal', hint: '빈 용기를 챙겨서', stat: '리필', unit: '번' },
  { id: 'reusable', area: '소비·순환', title: '다회용기로 포장·배달', level: 'hard', hint: '용기를 들고 가서', stat: '다회용기', unit: '개' },
  { id: 'sorting', area: '소비·순환', title: '분리배출 꼼꼼히', level: 'normal', hint: '헹구고 떼고 나눠서', stat: '꼼꼼한 분리배출', unit: '번' },
  { id: 'secondhand', area: '소비·순환', title: '중고 거래·나눔', level: 'normal', hint: '새로 사기 전에', stat: '중고 거래·나눔', unit: '건' },
  { id: 'repair', area: '소비·순환', title: '수리해서 쓰기', level: 'hard', hint: '버리기 전에 고쳐 보기', stat: '수리', unit: '건', occasional: true },
  { id: 'phone', area: '소비·순환', title: '폐휴대폰 반납', level: 'hard', hint: '서랍 속 휴대폰을', stat: '폐휴대폰 반납', unit: '개', occasional: true },
  { id: 'tumbler', area: '일회용품', title: '텀블러 쓰기', level: 'easy', hint: '카페·사무실에서', stat: '아낀 일회용 컵', unit: '개' },
  { id: 'bag', area: '일회용품', title: '장바구니 챙기기', level: 'easy', hint: '장 보러 갈 때', stat: '아낀 비닐봉투', unit: '장' },
  { id: 'nature', area: '자연·성찰', title: '오늘의 자연 한 줄', level: 'easy', hint: '바라본 자연을 한 줄로', stat: '자연 관찰', unit: '번' },
  { id: 'stroll', area: '자연·성찰', title: '10분 산책', level: 'easy', hint: '가까운 공원이나 골목', stat: '산책', unit: '번' },
  { id: 'pickup', area: '자연·성찰', title: '쓰레기 3개 줍기', level: 'normal', hint: '걷다가 눈에 띈 것', stat: '쓰레기 줍기', unit: '번' },
  { id: 'groupchal', area: '함께하기', title: '모임 공동 챌린지 인증', level: 'normal', hint: '모임과 함께', stat: '공동 챌린지 인증', unit: '번', group: true }
];

// 학생(중학생)용 미션: 학교·집·등하굣길에서 할 수 있는 것만. 지구 마을·동물 해금이 쓰는 id(nature, pickup)는 성인과 같게 둔다.
const STUDENT_CARDS = [
  { id: 'walk', area: '등하굣길', title: '걸어서 등교하기', level: 'easy', hint: '가까우면 걸어서', stat: '걸어서 등교', unit: '번' },
  { id: 'stairs', area: '등하굣길', title: '계단으로 다니기', level: 'easy', hint: '엘리베이터 대신', stat: '계단 이용', unit: '번' },
  { id: 'transit', area: '등하굣길', title: '학원은 버스·지하철로', level: 'normal', hint: '태워 달라고 하기 전에', stat: '대중교통 이용', unit: '번' },
  { id: 'bike', area: '등하굣길', title: '자전거로 등교하기', level: 'hard', hint: '헬멧 쓰고 안전하게', stat: '자전거 등교', unit: '번' },
  { id: 'noleftover', area: '급식·간식', title: '급식 남기지 않기', level: 'easy', hint: '먹을 만큼만 받기', stat: '남김없이 먹은 급식', unit: '번' },
  { id: 'bottle', area: '급식·간식', title: '개인 물병 챙기기', level: 'easy', hint: '편의점 생수 대신', stat: '아낀 페트병', unit: '개' },
  { id: 'vegday', area: '급식·간식', title: '채식 급식날 맛있게 먹기', level: 'normal', hint: '채소 반찬도 한 입', stat: '채식 급식', unit: '번' },
  { id: 'snack', area: '급식·간식', title: '포장 적은 간식 고르기', level: 'normal', hint: '낱개 포장 대신 큰 봉지', stat: '포장 줄인 간식', unit: '번' },
  { id: 'lightsoff', area: '교실·학교', title: '빈 교실 불 끄기', level: 'easy', hint: '이동 수업 갈 때', stat: '빈 교실 불 끄기', unit: '번' },
  { id: 'paper', area: '교실·학교', title: '이면지·연습장 끝까지 쓰기', level: 'easy', hint: '새 종이 꺼내기 전에', stat: '이면지 쓰기', unit: '번' },
  { id: 'sorting', area: '교실·학교', title: '교실 분리배출 꼼꼼히', level: 'normal', hint: '헹구고 나눠서', stat: '꼼꼼한 분리배출', unit: '번' },
  { id: 'aircon', area: '교실·학교', title: '냉난방 켤 때 문 닫기', level: 'normal', hint: '창문과 앞뒷문 확인', stat: '문 닫고 냉난방', unit: '번' },
  { id: 'tapoff', area: '집', title: '양치할 때 컵 쓰기', level: 'easy', hint: '물 틀어 놓지 않기', stat: '물 잠그기', unit: '번' },
  { id: 'unplug', area: '집', title: '충전 끝나면 플러그 뽑기', level: 'easy', hint: '휴대폰·태블릿 충전기', stat: '플러그 뽑기', unit: '번' },
  { id: 'milkpack', area: '집', title: '우유팩 헹궈서 모으기', level: 'normal', hint: '펼쳐서 말리기', stat: '모은 우유팩', unit: '개' },
  { id: 'shortshower', area: '집', title: '짧게 샤워하기', level: 'normal', hint: '노래 두 곡 안에', stat: '짧은 샤워', unit: '번' },
  { id: 'bag', area: '집', title: '장 볼 때 장바구니 챙기기', level: 'normal', hint: '가족과 함께', stat: '아낀 비닐봉투', unit: '장' },
  { id: 'stationery', area: '물건 아끼기', title: '학용품 끝까지 쓰기', level: 'easy', hint: '새로 사기 전에', stat: '끝까지 쓴 학용품', unit: '개' },
  { id: 'handkerchief', area: '물건 아끼기', title: '손수건 쓰기', level: 'normal', hint: '화장실 휴지 대신', stat: '손수건 쓰기', unit: '번' },
  { id: 'share', area: '물건 아끼기', title: '교복·참고서 물려받기·나누기', level: 'hard', hint: '선배에게 받고 후배에게 주기', stat: '물려받기·나누기', unit: '건', occasional: true },
  { id: 'market', area: '물건 아끼기', title: '학교 나눔 장터 참여', level: 'hard', hint: '안 쓰는 물건 가져가기', stat: '나눔 장터', unit: '번', occasional: true },
  { id: 'nature', area: '자연·함께', title: '학교 화단 관찰 한 줄', level: 'easy', hint: '바라본 자연을 한 줄로', stat: '자연 관찰', unit: '번' },
  { id: 'stroll', area: '자연·함께', title: '10분 산책하기', level: 'easy', hint: '학원 가는 길에 공원으로', stat: '산책', unit: '번' },
  { id: 'pickup', area: '자연·함께', title: '쓰레기 3개 줍기', level: 'normal', hint: '등굣길에 눈에 띈 것', stat: '쓰레기 줍기', unit: '번' },
  { id: 'classchal', area: '자연·함께', title: '반 공동 미션 인증', level: 'normal', hint: '반 친구들과 함께', stat: '공동 미션 인증', unit: '번', group: true }
];

export const CARDS = IS_STUDENT ? STUDENT_CARDS : ADULT_CARDS;

export const LEVEL_LABEL = { easy: '쉬움', normal: '보통', hard: '도전' };

// [이름, 필요한 점수] · 실천 기록 1개 = 1점 (파일럿 데이터로 조정 예정)
export const STAGES = [['씨앗', 0], ['새싹', 5], ['어린 묘목', 15], ['꽃', 30], ['나무', 60], ['숲', 120]];

// 국가기후위기대응위원회 카드뉴스 · 원문 링크 카드로만 연결 (제4유형)
const PCCCR = 'https://www.pcccr.go.kr/base/board/read?boardManagementNo=7&searchCategory=&page=1&searchType=&searchWord=&menuLevel=2&menuNo=98&boardNo=';
export const TOPICS = [
  { id: 'all', label: '전체' },
  { id: 'water', label: '물·바다' },
  { id: 'forest', label: '숲·자연' },
  { id: 'food', label: '먹거리' },
  { id: 'life', label: '소비·이동' }
];
// 학생용 '생각 한 줄' 질문: 같은 원문을 학교·집 생활에 맞춰 묻는다
const STUDENT_QUESTIONS = {
  7559: '우리 집 수도꼭지 물은 어디서 와서 어디로 갈까?',
  7779: '바닷가에서 가장 많이 본 쓰레기는 무엇이었을까?',
  7558: '내가 해변 하나를 맡는다면 무엇을 하고 싶을까?',
  7556: '우리 학교 주변에서 요즘 잘 안 보이는 생물이 있을까?',
  7555: '벌이 사라지면 급식에서 먼저 사라질 과일은 무엇일까?',
  7553: '오늘 급식 재료 중 우리 지역에서 온 것은 무엇일까?',
  7552: '학원 가는 길, 버스로 바꿀 수 있는 날은 언제일까?',
  7462: '고장 나서 버린 물건 중 고칠 수 있었던 것이 있을까?',
  7402: '작아져서 못 입는 옷, 누구에게 물려줄 수 있을까?',
  7401: '학교 주변 나무는 여름에 우리에게 어떤 일을 해 줄까?',
  7400: '지금 계절에 가장 맛있는 급식 반찬은 무엇일까?',
  7397: '이번 명절에 줄일 수 있는 쓰레기 하나는?',
  7236: '갯벌이 사라지면 바다와 우리에게 어떤 일이 생길까?',
  3431: '이번 주 교실에서 버리기 헷갈렸던 쓰레기는?'
};

export const POSTS = [
  { id: 7559, topic: 'water', date: '2026.6.12', tag: '물', title: '한 번 쓴 물도 다시 쓰는 나라?', intro: '싱가포르가 작은 나라에서 물을 얻는 네 가지 방법', question: '내가 쓰는 물은 어디서 와서 어디로 갈까?', cards: ['shortshower', 'tapoff'] },
  { id: 7779, topic: 'water', date: '2026.8.14', tag: '물·바다', title: '해변의 흔적을 줍줍~ 바다를 즐기는 방법', intro: '해변을 걸으며 쓰레기를 살피고 줍는 비치코밍', question: '이번 바다에서 내가 발견한 것은 무엇이었나?', cards: ['pickup'] },
  { id: 7558, topic: 'water', date: '2026.6.8', tag: '물·바다', title: '내 반려해변을 입양할 수 있다?', intro: '해변을 정기적으로 돌보는 국민참여 제도', question: '내가 자주 가는 해변을 맡는다면 무엇을 하고 싶나?', cards: ['pickup'] },
  { id: 7556, topic: 'forest', date: '2026.5.22', tag: '숲·자연', title: '5/22 국제 생물다양성의 날, 기후변화 생물지표종은 알고 가자!', intro: '기후에 민감한 생물을 시민이 관찰해 기록하는 방법', question: '우리 동네에서 가장 먼저 사라진 생물은 무엇일까?', cards: ['nature'] },
  { id: 7555, topic: 'forest', date: '2026.5.20', tag: '숲·자연', title: "벌이 사라지면 '진짜' 벌어지는 일", intro: '꿀벌이 식탁과 생태계에 주는 가치', question: '내가 먹는 과일 하나에 벌은 얼마나 기여했을까?', cards: ['seasonal'] },
  { id: 7553, topic: 'food', date: '2026.5.13', tag: '먹거리', title: '요즘 장보기, 로컬이 더 힙하다고?', intro: '지역 먹거리와 제철 식재료를 고르는 장보기', question: '이번 주 장바구니에서 지역 먹거리는 몇 개였을까?', cards: ['seasonal', 'bag'] },
  { id: 7552, topic: 'life', date: '2026.5.7', tag: '소비·이동', title: '티켓 한 장으로 어디든 갈 수 있는 나라?', intro: '오스트리아 기후티켓과 자동차 이용 감소 효과', question: '내 이동 중 자동차 대신 바꿀 수 있는 구간은?', cards: ['transit'] },
  { id: 7462, topic: 'life', date: '2026.4.14', tag: '소비', title: 'Vol.2 리페어 컬처 - 좋아하는 것을 오래 누리는 즐거움', intro: '고쳐 쓰고 오래 누리는 문화와 리페어카페', question: '최근 고장 난 물건을 버리기 전에 고쳐 본 적 있나?', cards: ['repair'] },
  { id: 7402, topic: 'life', date: '2026.3.26', tag: '소비', title: '봄맞이 옷정리, 이렇게 하세요', intro: '비우기·분류·수납으로 옷장 정리하는 법', question: '옷장에서 1년 넘게 입지 않은 옷은 몇 벌일까?', cards: ['secondhand'] },
  { id: 7401, topic: 'forest', date: '2026.3.19', tag: '숲·자연', title: '3월 21일은 세계 산림의 날', intro: '나무가 탄소와 열을 흡수하는 역할과 산림 수칙', question: '내가 자주 찾는 숲은 어떤 역할을 하고 있을까?', cards: ['nature', 'stroll'] },
  { id: 7400, topic: 'food', date: '2026.3.10', tag: '먹거리', title: 'Vol.1 제철코어 봄동, 코어가 되다', intro: '제철 식재료를 즐기는 흐름과 기후변화', question: '지금 계절에 가장 맛있는 식재료는 무엇인가?', cards: ['seasonal'] },
  { id: 7397, topic: 'life', date: '2026.2.13', tag: '소비·먹거리', title: '설명절 밸런스 게임', intro: '명절 이동·음식·포장에서 저탄소 선택 고르기', question: '이번 명절에 줄일 수 있는 것 하나는?', cards: ['noleftover'] },
  { id: 7236, topic: 'forest', date: '2025.12.12', tag: '숲·자연', title: '바다가 만든 탄소저장고 블루카본', intro: '갯벌과 잘피가 탄소를 저장하는 원리', question: '우리 동네 갯벌이나 해안은 어떤 역할을 할까?', cards: [] },
  { id: 3431, topic: 'life', date: '2024.5.27', tag: '소비', title: '오늘도 그린 하루 EP.9 · 알아두면 쓸모 있는 분리배출 방법', intro: '폐의약품·프라이팬·컵라면 용기 등 헷갈리는 배출법', question: '이번 주 버린 쓰레기 중 헷갈렸던 것은?', cards: ['sorting'] }
].map((p) => ({ ...p, question: IS_STUDENT ? STUDENT_QUESTIONS[p.id] : p.question, url: PCCCR + p.id }));

export const BEE_POST_ID = 7555;

// 3주차 전까지는 정적 예시 데이터 · 성인은 지역·온라인 모임, 학생은 우리 반
export const GROUPS = [
  { name: '주말 플로깅 크루', kind: 'off', topic: '플로깅', place: '서울 마포구', members: 8, next: '일요일 오전 10시' },
  { name: '기후 책 읽기 모임', kind: 'on', topic: '기후 공부', place: '온라인', members: 15, next: '격주 수요일 저녁 8시' },
  { name: '제로웨이스트 장보기', kind: 'off', topic: '제로웨이스트', place: '서울 성동구', members: 11, next: '매달 첫째 토요일' }
];

export const CLASSROOM = {
  school: '한빛중학교', name: '2학년 3반', teacher: '김하늘 선생님', members: 28, todayDone: 17,
  forest: { stage: 3, name: '꽃', pct: 40, next: '나무까지 우리 반 미션 52번 남았어요' },
  mission: { title: '우유팩 100개 모으기', now: 62, need: 100, due: '금요일', card: 'milkpack' }
};

const ADULT_FEED = [
  { id: 'a', name: '하늘', bg: '#E3EEE6', when: '오늘 오전', tag: '텀블러', memo: '카페 세 곳에서 텀블러를 썼어요. 한 곳은 할인도 해 줬어요.', base: [3, 2, 1] },
  { id: 'b', name: '다온', bg: '#F3E6D2', when: '어제', tag: '플로깅', memo: '퇴근길에 집 앞 골목에서 쓰레기 한 봉지를 주웠어요.', base: [2, 4, 2] },
  { id: 'c', name: '소담', bg: '#DCE8EE', when: '어제', tag: '대중교통', memo: '이번 주는 출퇴근을 전부 지하철로 했어요.', base: [4, 1, 0] }
];

const STUDENT_FEED = [
  { id: 'a', name: '하람', bg: '#E3EEE6', when: '오늘 아침', tag: '걸어서 등교', memo: '비가 와서 우산 쓰고 걸어왔어요. 10분 걸렸어요.', base: [5, 3, 2] },
  { id: 'b', name: '도윤', bg: '#F3E6D2', when: '어제', tag: '화단 관찰', memo: '운동장 옆 은행나무가 반쯤 노랗게 물들었어요.', base: [4, 1, 3] },
  { id: 'c', name: '서아', bg: '#DCE8EE', when: '어제', tag: '급식', memo: '오늘 급식은 남김없이 다 먹었어요. 시금치도요!', base: [6, 2, 1] }
];

export const FEED = IS_STUDENT ? STUDENT_FEED : ADULT_FEED;

// 학생용은 친구끼리 쓰는 말투. 자유 댓글 없이 정해진 반응·문구만 쓴다
export const REACTIONS = IS_STUDENT ? ['응원해', '나도 할래', '멋져'] : ['응원해요', '대단해요', '함께해요'];
export const PHRASES = IS_STUDENT
  ? ['오늘도 잘했어', '덕분에 나도 해 볼래', '내일 학교에서 보자', '꾸준한 거 멋지다']
  : ['오늘도 수고했어요', '덕분에 저도 힘이 나요', '다음 모임에서 만나요', '꾸준한 모습이 멋져요'];

export const REVIEW_DRAFT = '지난 일요일 아침, 멤버 6명이 한강공원 산책로를 걸으며 쓰레기 4봉지를 주웠어요. 가장 많이 나온 건 일회용 컵 뚜껑이었다는 이야기가 나왔고, 다음 모임에서는 텀블러 챌린지를 함께 해 보기로 했어요.';

// 대상에 따라 바뀌는 화면 문구
export const COPY = IS_STUDENT ? {
  label: '학생용',
  nav: { today: '미션', record: '기록', groups: '우리 반', read: '배우기' },
  todayTitle: '오늘의 미션',
  question: '이번 주 생각 한 줄',
  questionBtn: '한 줄 쓰기',
  picksTitle: '오늘 고른 미션',
  pickMore: '미션 더 고르기',
  pickerTitle: '미션 고르기',
  pickerSub: '고른 미션은 오늘 화면에 더해져요',
  added: '미션을 더했어요',
  firstHint: '하나만 눌러도 오늘 기록이 시작돼요.',
  forestMeta: '미션 한 번이 숲을 한 뼘 키워요. 기록이 끊겨도 나무는 시들지 않아요.',
  effect: { card: 'bottle', done: (n) => `이번 달 페트병 ${n}개를 아꼈어요`, doneSub: (n) => `물병 기록 ${n}번을 페트병 개수로 바꿨어요`, empty: '물병을 챙기면 아낀 페트병을 세어 줄게요', emptySub: "'개인 물병 챙기기' 미션을 기록해 보세요" },
  together: { text: '우리 반 보기', href: '#/groups' },
  readMeta: '기후 공부',
  readTitle: '배우기',
  reflectNote: '나만 보기 · 반에 나누기는 선택 (3단계)',
  nim: ''
} : {
  label: '성인용',
  nav: { today: '오늘', record: '기록', groups: '모임', read: '읽기' },
  todayTitle: '오늘의 실천',
  question: '이번 주 성찰 질문',
  questionBtn: '한 줄 남기기',
  picksTitle: '오늘 고른 실천',
  pickMore: '카드 더 고르기',
  pickerTitle: '실천 카드 고르기',
  pickerSub: '고른 카드는 오늘 화면에 더해져요',
  added: '카드를 더했어요',
  firstHint: '한 장만 눌러도 오늘 기록이 시작돼요.',
  forestMeta: '실천 한 번이 숲을 한 뼘 키워요. 기록이 끊겨도 나무는 시들지 않아요.',
  effect: { card: 'tumbler', done: (n) => `이번 달 일회용 컵 ${n}개를 아꼈어요`, doneSub: (n) => `텀블러 기록 ${n}번을 컵 개수로 바꿨어요`, empty: '텀블러를 쓰면 아낀 컵을 세어 드려요', emptySub: "'텀블러 쓰기' 카드를 기록해 보세요" },
  together: { text: '함께할 모임 찾기', href: '#/groups' },
  readMeta: '마음의 허브',
  readTitle: '생태 성찰 &amp; 뉴스레터',
  reflectNote: '나만 보기 · 모임에 나누기는 선택 (3단계)',
  nim: '님'
};
