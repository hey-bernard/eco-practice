// 앱에서 쓰는 고정 데이터: 실천 카드 30개, 숲 단계, 읽기 카드 14편, 예시 모임, 화면 문구
// 기준: 노션 기획안 6장(2026-10-17). 2026-11-02부터 학생용을 없애고 일반(성인) 기준 하나로만 쓴다.

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

export const CARDS = ADULT_CARDS;

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
// summary: 원문 카드뉴스 본문을 읽고 쓴 2~3문장 요약 (숫자는 원문 그대로)
export const POSTS = [
  { id: 7559, topic: 'water', date: '2026.6.12', tag: '물', title: '한 번 쓴 물도 다시 쓰는 나라?', intro: '싱가포르가 작은 나라에서 물을 얻는 네 가지 방법', summary: '싱가포르는 빗물, 말레이시아에서 사 오는 물, 바닷물 담수화, 하수를 정화한 NEWater의 네 갈래로 물을 얻어요. NEWater가 물 공급의 약 40%를 맡고 있고, 55%까지 늘릴 계획이에요.', question: '내가 쓰는 물은 어디서 와서 어디로 갈까?', cards: ['shortshower', 'tapoff'] },
  { id: 7779, topic: 'water', date: '2026.8.14', tag: '물·바다', title: '해변의 흔적을 줍줍~ 바다를 즐기는 방법', intro: '해변을 걸으며 쓰레기를 살피고 줍는 비치코밍', summary: '비치코밍은 해변을 걸으며 쓰레기를 줍는 활동이에요. 2024년 국내 해양폐기물은 약 11.5만 톤으로 추정돼요. 장갑·집게·봉투를 챙기고 주운 것을 기록하되, 날카롭거나 무거운 것은 무리해서 줍지 않아요.', question: '이번 바다에서 내가 발견한 것은 무엇이었나?', cards: ['pickup'] },
  { id: 7558, topic: 'water', date: '2026.6.8', tag: '물·바다', title: '내 반려해변을 입양할 수 있다?', intro: '해변을 정기적으로 돌보는 국민참여 제도', summary: '반려해변은 누구나 해변 한 곳을 맡아 살피고, 줍고, 알리는 해양수산부의 국민참여 제도예요. 2025년까지 시민 7천여 명이 190여 곳에서 쓰레기 65톤을 치웠고, 반려해변 누리집에서 신청해요.', question: '내가 자주 가는 해변을 맡는다면 무엇을 하고 싶나?', cards: ['pickup'] },
  { id: 7556, topic: 'forest', date: '2026.5.22', tag: '숲·자연', title: '5/22 국제 생물다양성의 날, 기후변화 생물지표종은 알고 가자!', intro: '기후에 민감한 생물을 시민이 관찰해 기록하는 방법', summary: '계곡산개구리, 남방노랑나비처럼 기후에 민감한 생물지표종은 사는 곳·나타나는 시기·개체수로 기후변화를 보여 줘요. 누구나 네이처링에 관찰 기록을 올려 시민 과학자로 참여할 수 있어요.', question: '우리 동네에서 가장 먼저 사라진 생물은 무엇일까?', cards: ['nature'] },
  { id: 7555, topic: 'forest', date: '2026.5.20', tag: '숲·자연', title: "벌이 사라지면 '진짜' 벌어지는 일", intro: '꿀벌이 식탁과 생태계에 주는 가치', summary: '국내 꿀벌의 꽃가루받이 가치는 한 해 6조 원이고, 세계 식량작물의 약 75%가 꽃가루 매개의 영향을 받아요. 밀원 감소·기온 변화·응애·농약으로 벌이 줄고 있어, 꽃 심기와 농약 줄이기가 도움이 돼요.', question: '내가 먹는 과일 하나에 벌은 얼마나 기여했을까?', cards: ['seasonal'] },
  { id: 7553, topic: 'food', date: '2026.5.13', tag: '먹거리', title: '요즘 장보기, 로컬이 더 힙하다고?', intro: '지역 먹거리와 제철 식재료를 고르는 장보기', summary: '가까운 지역에서 난 제철 먹거리를 사면 운송과 유통 단계가 줄어 탄소도 줄어요. 장 볼 때 지역산인지, 제철인지, 저탄소 인증이 있는지 살피고, 로컬푸드 직매장이나 직거래 장터를 이용해 보세요.', question: '이번 주 장바구니에서 지역 먹거리는 몇 개였을까?', cards: ['seasonal', 'bag'] },
  { id: 7552, topic: 'life', date: '2026.5.7', tag: '소비·이동', title: '티켓 한 장으로 어디든 갈 수 있는 나라?', intro: '오스트리아 기후티켓과 자동차 이용 감소 효과', summary: '오스트리아 기후티켓은 1년 동안 버스·트램·기차를 마음껏 타는 통합 정기권이에요(2026년 일반권 1,400유로). 2023년 교통 부문에서 약 10만 5천 톤을 줄였고, 국민 5명 중 1명꼴로 갖고 있어요.', question: '내 이동 중 자동차 대신 바꿀 수 있는 구간은?', cards: ['transit'] },
  { id: 7462, topic: 'life', date: '2026.4.14', tag: '소비', title: 'Vol.2 리페어 컬처 - 좋아하는 것을 오래 누리는 즐거움', intro: '고쳐 쓰고 오래 누리는 문화와 리페어카페', summary: '리페어 컬처는 낡은 물건을 고치고 손봐 오래 쓰는 문화예요. 인천 키니스 장난감 병원, 밀양 누구나수선소 같은 곳이 있고, 전자제품 수명을 5년 늘리면 해마다 탄소 약 1,000만 톤을 줄일 수 있대요.', question: '최근 고장 난 물건을 버리기 전에 고쳐 본 적 있나?', cards: ['repair'] },
  { id: 7402, topic: 'life', date: '2026.3.26', tag: '소비', title: '봄맞이 옷정리, 이렇게 하세요', intro: '비우기·분류·수납으로 옷장 정리하는 법', summary: '1년 넘게 안 입은 옷은 비우고, 애매한 옷은 고민 박스에 일주일 두었다 정해요. 입을 만한 옷은 기부하고, 티셔츠 한 장에 물 2,700L가 드는 만큼 살 때부터 오래 입을 옷을 골라요.', question: '옷장에서 1년 넘게 입지 않은 옷은 몇 벌일까?', cards: ['secondhand'] },
  { id: 7401, topic: 'forest', date: '2026.3.19', tag: '숲·자연', title: '3월 21일은 세계 산림의 날', intro: '나무가 탄소와 열을 흡수하는 역할과 산림 수칙', summary: '나무는 전 세계 탄소 흡수량의 약 47.5%를 맡고, 홍수·산사태를 줄이고 도시의 열도 식혀요. 산에서는 쓰레기를 되가져가고, 등산로로만 다니고, 불을 쓰지 않아요.', question: '내가 자주 찾는 숲은 어떤 역할을 하고 있을까?', cards: ['nature', 'stroll'] },
  { id: 7400, topic: 'food', date: '2026.3.10', tag: '먹거리', title: 'Vol.1 제철코어 봄동, 코어가 되다', intro: '제철 식재료를 즐기는 흐름과 기후변화', summary: '봄과 가을이 짧아지면서 제철을 일부러 챙겨 즐기는 제철코어가 퍼지고 있어요. 제철 식재료는 영양이 풍부하고 식탁까지 오는 단계가 적어 탄소도 덜 나와요. 장 볼 때 제철과 원산지를 살펴보세요.', question: '지금 계절에 가장 맛있는 식재료는 무엇인가?', cards: ['seasonal'] },
  { id: 7397, topic: 'life', date: '2026.2.13', tag: '소비·먹거리', title: '설명절 밸런스 게임', intro: '명절 이동·음식·포장에서 저탄소 선택 고르기', summary: '설 연휴에 고를 수 있는 저탄소 선택 네 가지예요. 여유 있는 저탄소 귀성길, 내복 입고 실내 온도 한 칸 낮추기, 알맞은 양의 제철·로컬 상차림, 보자기를 다시 쓰는 선물 포장이에요.', question: '이번 명절에 줄일 수 있는 것 하나는?', cards: ['noleftover'] },
  { id: 7236, topic: 'forest', date: '2025.12.12', tag: '숲·자연', title: '바다가 만든 탄소저장고 블루카본', intro: '갯벌과 잘피가 탄소를 저장하는 원리', summary: '블루카본은 갯벌·잘피·염생식물 같은 바다 생태계가 흡수해 저장하는 탄소예요. 육지보다 최대 50배 빠르게 흡수해 수백~수천 년 저장하고, 갯벌이 많은 우리나라는 잠재력이 커요.', question: '우리 동네 갯벌이나 해안은 어떤 역할을 할까?', cards: [] },
  { id: 3431, topic: 'life', date: '2024.5.27', tag: '소비', title: '오늘도 그린 하루 EP.9 · 알아두면 쓸모 있는 분리배출 방법', intro: '폐의약품·프라이팬·컵라면 용기 등 헷갈리는 배출법', summary: '폐의약품은 약국·보건소·행정복지센터 수거함에, 못 쓰는 프라이팬은 묶어서, 오염된 컵라면 용기는 종량제 봉투에 버려요. 헷갈리면 내 손안의 분리배출 앱으로 확인하고, 비우고 헹구고 분리해요.', question: '이번 주 버린 쓰레기 중 헷갈렸던 것은?', cards: ['sorting'] }
].map((p) => ({ ...p, url: PCCCR + p.id }));

// 뉴스레터 (읽기 › 뉴스레터, 성인용). 기사·기관 발표 원문을 읽고 세 줄로 요약했다. 숫자는 원문 그대로.
// 새 호를 낼 때는 issue·published·sections만 바꾼다.
export const NEWSLETTER = {
  issue: '10월 호',
  published: '2026.10.31',
  intro: '10월 전후에 나온 국내 기사 6편과 해외 대표 기관 발표 3편을 주제별로 골라 세 줄로 요약했어요.',
  sections: [
    { title: '국내 소식', items: [
      { label: '물·바다', source: '파이낸셜뉴스', date: '2026.10.14', url: 'https://www.fnnews.com/news/202610141255305786', act: '오늘의 자연 한 줄',
        title: '"우리 바다 수온 왜 오르나"…해수부, 3개월 전망 해설서 시범 제공',
        lines: ['해양수산부가 10월 15일부터 동해·서해·남해의 표층 수온과 해수면 높이를 3개월 앞서 내다보는 해설서를 시범으로 내요.',
                '전망 숫자에 원인 설명을 더했고, 해수면은 장기 상승 추세부터 보여 줘요.',
                '해설서는 3개월마다 나오고, 내년에는 전용 플랫폼을 만들어 정식 서비스할 계획이에요.'] },
      { label: '물·바다', source: '파이낸셜뉴스', date: '2026.9.13', url: 'https://www.fnnews.com/news/202609131814580269', act: '쓰레기 3개 줍기',
        title: "해양플라스틱 60% 감축 '빨간불'… 폐기물 수거량 외려 급증",
        lines: ['해수부가 2030년까지 해양플라스틱 발생량을 60% 줄이겠다는 목표를 이루기 어렵다고 밝혔어요.',
                '2021~2025년 해양폐기물 수거량은 해마다 늘어 모두 65만 6천여 톤이고, 바다 밑 침적쓰레기는 4년 새 43.4% 늘었어요.',
                '수거의 87%를 지자체·어업인·자원봉사자가 맡고, 정부·공공기관이 직접 치운 양은 13%예요.'] },
      { label: '숲·자연', source: '한국일보', date: '2026.10.22', url: 'https://www.hankookilbo.com/news/article/A2026101822330005469', act: '10분 산책',
        title: '봄은 빨라지고 가을은 늦어졌다… 요즘 단풍이 반갑지 않은 이유',
        lines: ['산림청은 올해 단풍 절정을 전국 평균 10월 31일로, 최근 5년보다 약 0.8일 늦게 내다봤어요.',
                '2009~2024년 수목원 10곳의 관측에서 봄 잎은 해마다 0.79일 빨라지고, 단풍 절정은 0.33일 늦어졌어요.',
                '자라는 기간은 17일 넘게 길어졌지만 탄소를 더 흡수한다고 단정하기 어렵고, 겨울 준비가 짧아져 추위에 약해질 수 있대요.'] },
      { label: '먹거리', source: '글로벌이코노믹', date: '2026.10.20', url: 'https://www.g-enews.com/article/Global-Biz/2026/10/202610192049493860fda4f5ab74_1', act: '음식 남기지 않기',
        title: '밥상 물가 오름세 지속…공급 충격, 식량 인플레이션 2027년까지 이어지나',
        lines: ['유엔식량농업기구(FAO)의 9월 식량가격지수가 136.0으로 2022년 11월 이후 가장 높았어요.',
                '주요 항로 해상 운임이 약 50% 오르고, 밀 가격은 올해 30% 넘게 올랐어요.',
                'FAO 수석경제학자는 식량 물가 오름세가 2027년까지 이어질 수 있다고 봤어요.'] },
      { label: '소비', source: '뉴스1', date: '2026.10.20', url: 'https://www.news1.kr/economy/env-policy/6324706', act: '텀블러 쓰기',
        title: '기후부·세종시, 다회용 컵 확대 협약…일회용 컵 200만개 줄인다',
        lines: ['기후에너지환경부와 세종시가 10월 19일 다회용 컵 전환 협약을 맺었어요.',
                '공공기관 주변 커피전문점 20곳에 다회용 컵 보증금제를 더 들여, 일회용 컵 200만 개를 줄이는 게 목표예요.',
                '다 쓴 컵은 무인회수기에 반납하면 돼요.'] },
      { label: '이동', source: '뉴스1', date: '2026.9.25', url: 'https://www.news1.kr/local/seoul/6300618', act: '대중교통 이용',
        title: "'무제한' 기동카 30일권 사라진다…10월 '기후동행패스'로 갈아타야",
        lines: ['서울 기후동행카드 30일권이 9월로 끝나고, 10월부터는 기후동행패스로 옮겨 가야 해요.',
                '기후동행패스는 기후동행카드와 정부 K-패스를 합친 정기권으로, 먼저 내고 무제한 탄 뒤 쓴 만큼 일부를 돌려받아요.',
                '기존 K-패스 이용자는 새 카드 없이 그대로 쓰고, 청년 할인은 만 39세까지로 넓어졌어요.'] }
    ] },
    { title: '해외 대표 기관 발표', items: [
      { label: '대기', source: '세계기상기구(WMO)', date: '2026.10.27', url: 'https://wmo.int/resources/publication-series/greenhouse-gas-bulletin/no-22', act: '대중교통 이용',
        title: '온실가스 연보 제22호: 2025년 온실가스 농도 또 최고치',
        lines: ['2025년 지구 대기의 CO₂는 426.8ppm으로 산업화 이전보다 53% 높아, 관측 사상 가장 높았어요.',
                '메탄(1,948ppb, 산업화 이전보다 167% 높음)과 아산화질소(339.1ppb, 26% 높음)도 함께 최고치를 다시 썼어요.',
                'CO₂ 증가 폭은 전년보다 작았지만, 최근 10년 평균보다는 조금 컸어요.'] },
      { label: '정책', source: '유엔환경계획(UNEP) · 유엔뉴스', date: '2026.10.21', url: 'https://news.un.org/en/story/2026/10/1168634', act: '',
        title: '배출량 격차 보고서 2026: 1.5℃를 잠시 넘는 것은 피하기 어렵다',
        lines: ['가장 빠르게 줄이는 경우에도 세기 중반에 1.7~1.8℃까지 올랐다가 다시 1.5℃로 내려와야 한다고 봤어요.',
                '그러려면 전 세계 배출을 2025년보다 2030년까지 18%, 2035년까지 45% 줄여야 해요.',
                '지금 정책대로라면 이번 세기 기온 상승은 2.8℃를 넘을 수 있어요.'] },
      { label: '기온·바다', source: '유럽 코페르니쿠스 기후변화서비스(C3S)', date: '2026.10.12', url: 'https://climate.copernicus.eu/copernicus-second-warmest-september-global-temperatures-stay-above-15degc', act: '',
        title: '2026년 9월, 관측 사상 두 번째로 더운 9월',
        lines: ['9월 지구 평균기온은 16.27℃로 산업화 이전보다 1.63℃ 높아, 9월 가운데 두 번째로 더웠어요.',
                '바다 표면온도(남위 60°~북위 60°)는 21.05℃로 9월 가운데 가장 높았어요.',
                '남극 바다 얼음의 올해 최대 면적은 위성 관측 이래 세 번째로 작았어요.'] }
    ] }
  ]
};

// 오늘 화면 맨 위 다짐 문구
export const PLEDGE = {
  lead: '0.1℃라도 덜 오르면 그만큼 피해가 줄어요. 작은 실천도 그 0.1℃에 보태져요.',
  pledge: '에너지를 아끼고, 일회용품을 줄이며, 걷기나 대중교통을 이용하고, 분리배출을 철저히 하는 생활 속 저탄소 실천을 다짐합니다.'
};

// 나의 숲 '벌' 해금: 예전엔 카드뉴스 7555('벌이 사라지면')를 읽어야 했다. 2026-11-07 카드뉴스 목록을 화면에서 빼면서
// 읽기 '기초부터 읽기'의 생태계 변화 편으로 바꿨다 (js/series-data.js). 예전 기록(reads[7555])도 계속 인정한다.
export const BEE_POST_ID = 7555;
export const BEE_SERIES_ID = 'B-3';
export const BEE_SERIES_TITLE = '한반도의 미래와 적응';

// 3주차 전까지는 정적 예시 데이터 · 지역·온라인 모임
export const GROUPS = [
  { name: '주말 플로깅 크루', kind: 'off', topic: '플로깅', place: '서울 마포구', members: 8, next: '일요일 오전 10시' },
  { name: '기후 책 읽기 모임', kind: 'on', topic: '기후 공부', place: '온라인', members: 15, next: '격주 수요일 저녁 8시' },
  { name: '제로웨이스트 장보기', kind: 'off', topic: '제로웨이스트', place: '서울 성동구', members: 11, next: '매달 첫째 토요일' }
];

const ADULT_FEED = [
  { id: 'a', name: '하늘', bg: '#E3EEE6', when: '오늘 오전', tag: '텀블러', memo: '카페 세 곳에서 텀블러를 썼어요. 한 곳은 할인도 해 줬어요.', base: [3, 2, 1] },
  { id: 'b', name: '다온', bg: '#F3E6D2', when: '어제', tag: '플로깅', memo: '퇴근길에 집 앞 골목에서 쓰레기 한 봉지를 주웠어요.', base: [2, 4, 2] },
  { id: 'c', name: '소담', bg: '#DCE8EE', when: '어제', tag: '대중교통', memo: '이번 주는 출퇴근을 전부 지하철로 했어요.', base: [4, 1, 0] }
];

export const FEED = ADULT_FEED;

// 자유 댓글 없이 정해진 반응·문구만 쓴다
export const REACTIONS = ['응원해요', '대단해요', '함께해요'];
export const PHRASES = ['오늘도 수고했어요', '덕분에 저도 힘이 나요', '다음 모임에서 만나요', '꾸준한 모습이 멋져요'];

export const REVIEW_DRAFT = '지난 일요일 아침, 멤버 6명이 한강공원 산책로를 걸으며 쓰레기 4봉지를 주웠어요. 가장 많이 나온 건 일회용 컵 뚜껑이었다는 이야기가 나왔고, 다음 모임에서는 텀블러 챌린지를 함께 해 보기로 했어요.';

// 화면 문구
export const COPY = {
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
