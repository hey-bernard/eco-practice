# 오늘의 실천 (가칭) · MVP 1차

작은 실천을 기록하면 숲이 자라는 생태 실천 모바일 웹앱(PWA)입니다.

- 기획안: [노션 기획안](https://hushed-mollusk-6a1.notion.site/3f5ef6711c3c81cab4dbfe3bd13a63d0)
- 디자인 기준: [핵심 화면 목업](https://claude.ai/artifact/1QLA72dHdco7JX2311uFVz) (원본 사본은 `mockup/project/`)

## 실행

ES 모듈과 서비스 워커를 쓰므로 `climate/index.html`을 파일로 직접 열면 동작하지 않습니다. 로컬 서버로 여세요.

```bash
python -m http.server 8765
# http://localhost:8765/climate/
```

- 앱은 `climate/` 하나뿐입니다. 배포본에서는 `/`과 예전 디자인 주소(`/stitch/`, `/monitor/`, `/apple/`, `/material/`, `/line/`)가 `/climate/`로 넘어갑니다(`vercel.json`).
- 발표 시연용: `http://localhost:8765/climate/?demo=1#/forest` 로 열면 숲 화면에 점수 버튼이 나옵니다.
- 휴대폰으로 확인하려면 같은 와이파이에서 `python -m http.server 8765 --bind 0.0.0.0` 후 PC의 IP로 접속합니다. 단, 홈 화면 설치와 서비스 워커는 HTTPS(또는 localhost)에서만 동작합니다.

## 배포

GitHub 저장소(hey-bernard/eco-practice)의 `main`에 push하면 Vercel이 자동으로 운영 배포한다. 다른 브랜치에 push하면 미리보기 주소가 따로 만들어진다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `climate/` | 앱 틀(`index.html`, Tailwind 다크 토큰), 해시 라우터(`#/earth` 등)와 화면들(`app.js`), 스타일(`style.css`) (아래 '화면 디자인') |
| `js/data.js` | 실천 카드 30개, 숲 단계, 읽기 카드 14편, 예시 모임, 화면 문구(`COPY`) |
| `js/store.js` | 기기 저장(localStorage). 바뀔 때마다 `subscribe()`로 알린다 |
| `js/auth.js`, `js/auth-config.js` | 카카오·구글 로그인 (Supabase Auth, PKCE). 설정이 비어 있으면 "준비 중" 안내만 (아래 '로그인 · 동기화') |
| `js/sync.js` | 로그인한 사람의 기록을 Supabase `user_state` 테이블과 맞춘다 |
| `climate/privacy.html` | 개인정보처리방침 (구글 OAuth 앱 게시·카카오 앱에 링크). 받는 정보가 바뀌면 함께 고친다 |
| `supabase/schema.sql` | `user_state` 테이블과 RLS(자기 줄만 읽고 쓰기) |
| `js/climate-data.js`, `js/climate-chart.js`, `css/climate-chart.css` | 기후 4대 지표 연도별 추이 그래프 (아래 '기후 4대 지표 그래프') |
| `sw.js`, `manifest.webmanifest` | PWA (오프라인 캐시, 홈 화면 추가). 파일을 바꾸면 `sw.js`의 `VERSION`을 올린다 |
| `images/village/earth.webp`, `risa.webp` | 지구지킴이·리사 정면. 시트에서 잘라 배경 제거 |
| `images/forest/stage1~6.webp` | 학생용 지구지킴이 성장 6단계. `22a5fae709d12dd5.webp` 시트의 Lv.1~6을 잘라 2배 확대 |
| `images/forest/plant1~6.svg` | 식물 성장 6단계 (씨앗→숲). 숲 화면 동물 그림과 같은 358×220 좌표 |

## 로그인 · 동기화

- 웹(브라우저·PWA): 버튼 → Supabase → 카카오/구글 → `/climate/?code=...` 로 돌아오면 `js/auth.js`가 세션으로 바꾸고 `#/today`로 보낸다.
- Expo 앱(`mobile/`): 구글이 WebView 로그인을 막으므로, 웹이 로그인 주소만 만들어 앱에 넘기고 앱이 시스템 인증 브라우저(`expo-web-browser`)로 연다. 돌아온 주소를 웹의 `window.__ecoAuthFinish()`로 넘겨 마무리한다.
- 동기화: 이 기기를 계정에 처음 연결할 때(또는 못 올린 기록이 있을 때)는 기기 기록과 계정 기록을 합치고, 그 뒤엔 계정 기록을 받아 온다. 기록이 바뀌면 1.2초 뒤 올린다. 오프라인이면 다시 연결될 때 올린다. 로그아웃해도 기기 기록은 지우지 않는다.

### 처음 설정 (한 번)

1. [supabase.com](https://supabase.com)에서 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행한다.
2. Project Settings > API의 Project URL과 anon public 키를 `js/auth-config.js`에 넣는다 (service_role 키는 절대 넣지 않는다).
3. Authentication > URL Configuration
   - Site URL: `https://eco-practice-phi.vercel.app/climate/`
   - Redirect URLs: `https://eco-practice-phi.vercel.app/climate/`, `http://localhost:*/climate/`(로컬 확인용), `ecopractice://auth`(앱 빌드), `exp://**`(Expo Go)
4. 구글: Google Cloud Console > API 및 서비스 > 사용자 인증 정보 > OAuth 클라이언트 ID(웹 애플리케이션). 승인된 리디렉션 URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`. 클라이언트 ID·보안 비밀을 Supabase Authentication > Providers > Google에 넣는다.
5. 카카오: [developers.kakao.com](https://developers.kakao.com) > 앱 만들기
   - 앱 키의 REST API 키 → Supabase Providers > Kakao의 Client ID, 보안 > Client Secret 코드 생성·활성화 → Client Secret
   - 카카오 로그인 활성화, Redirect URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`
   - 동의항목: 닉네임·프로필 사진. Supabase는 이메일(account_email)도 요청하므로, 이메일 동의항목을 켜거나(개인 개발자 비즈 앱 전환 필요) Supabase Kakao 설정에서 이메일 없는 사용자 허용을 켠다.
   - Supabase의 Client Secret 칸에는 REST API 키가 아니라 **Client Secret** 값을 넣는다. 바뀌어 들어가면 `invalid_client "Bad client credentials"`로 로그인이 실패한다(Supabase Logs > Auth에서 보인다).
   - 동의항목을 켜려면 앱 아이콘(`icons/icon-512.png`)을 등록하고 '개인 개발자 비즈 앱'으로 전환(카카오톡 본인인증)해야 한다. 현재 설정: 닉네임 필수, 프로필 사진·이메일 선택.
6. 구글 OAuth 동의 화면은 '프로덕션'으로 게시해야 누구나 로그인할 수 있다. 게시하려면 브랜딩에 홈페이지(`/climate/`)와 개인정보처리방침(`/climate/privacy.html`)이 있어야 하고, 로고는 올리지 않는다(올리면 구글 심사 대상).
7. 배포 후 `sw.js`의 `VERSION`이 올라갔는지 확인한다.

## 대상

2026-11-02부터 학생용·성인용 구분을 없애고 **일반(성인) 기준 한 가지**로만 운영한다. 첫 화면의 대상 고르기와 기록 화면의 '대상 바꾸기', 학생용 우리 반·지구 마을을 지웠다(예전 주소 `#/start`·`#/village`는 오늘 화면으로 간다). 기록은 기존 `eco-practice-v1` 키를 그대로 쓰므로 성인용 기록은 이어진다. 학생용 그림(`images/forest/stage1~6.webp`, `images/village/`)은 파일만 남아 있고 화면에서는 쓰지 않는다.

## 라이트 · 다크 모드

모든 탭 머리 오른쪽의 해·달 버튼으로 바꾼다. 처음에는 기기 설정을 따르고, 한 번 고르면 이 기기에 기억한다(`eco-climate-theme`).

## 화면 디자인 (`/climate/`)

Stitch 샘플 '지구 기후 모니터 · Climate Home'(다크 배경, 네온 초록, Space Grotesk·Inter·JetBrains Mono)을 입힌 디자인. 하단 메뉴 맨 앞에 **지구** 탭이 있어 5칸이며, 주소만 열면 지구 탭부터 보인다. 예전에 함께 두었던 원래·Stitch 라이트·기후 모니터·iOS·Material 3·LINE 디자인은 2026년 11월에 정리하고 이 버전만 남겼다(git 기록에 남아 있다).

- `climate/app.js`가 화면을 그리고, 데이터·저장은 `js/data.js`, `js/store.js`를 쓴다. 서비스 워커(`/sw.js`, 범위 `/`)도 여기서 등록한다.
- 오늘 화면은 대시보드: 실천 트래커(오늘 기록 수 + 기록할 때마다 한 뼘씩 자라는 Lottie 식물, `js/practice-plant.js`), 분야 알약 필터, 카드별 이번 달 횟수, 모임 소식 배너, 이번 주 읽기.
- 샘플에 있던 등급(A+), 전국 평균 비교, 연속 실천 일수, 탄소 상쇄 구매는 넣지 않았다. 근거 없는 수치이거나 '탓하지 않기'·'순위 없음' 원칙에 맞지 않기 때문이다.

- 지구 탭: 머리(지구 기후 모니터) 아래 **지구 지금** 위젯, 내가 만든 변화(나의 숲·이번 달 기록), '그래서 오늘 할 수 있는 것'(오늘 카드·이번 주 읽기).
- 지구 지금 위젯은 지구편 앱에서 떼어 온 것이다(`지구편앱/export/earth-now`). 위성 지구(WebGL, NASA Visible Earth)와 기온·CO₂·해수면·수온·산성화 5장면, 최근 30년 색 그래프를 보여 주고, 8초마다 다음 장면으로 넘어간다.
  - `js/earth-now-widget.js`: 화면 전체 (스타일은 `.enw` 아래로 한정), `images/earth/`: 지구 텍스처 3장
  - `api/earth-now.js`: Vercel 서버 함수 `/api/earth-now`. Copernicus Climate Pulse(ERA5)·NOAA GML 마우나로아·NOAA 위성 고도계 해수면·하와이대 HOT pH를 받아 약 50KB JSON으로 준다 (API 키 불필요, CDN 30분 캐시). 브라우저에서 원본을 직접 부르면 CORS로 막혀서 서버 함수가 필요하다.
  - 불러오지 못하면 이 기기에 저장한 마지막 값을 '저장된 값'으로 보여 준다. 서비스 워커는 `/api/`를 캐시하지 않는다.
  - 로컬 `python -m http.server`에서는 서버 함수가 돌지 않아 위젯이 "지구 신호가 아직 닿지 않았어요"로 보인다. 확인은 배포본이나 `vercel dev`로 한다.
- 샘플의 'LIVE·NASA NOAA SYNC', 북극 +3.8℃, 예산 고갈 '2029년 11월', 극한 기후 3.2배, 외부 사진은 출처를 확인할 수 없거나 실시간이 아니어서 넣지 않았다. 겁주기보다 '아직 늦지 않았다'는 쪽으로 문구를 맞췄다.
- 읽기 화면의 '기후 4대 지표'는 지구 탭으로 옮겼다.

## 기후 4대 지표 그래프

'기후 4대 지표' 연도별 추이 그래프는 지구 탭의 '연도별 추이'에 있다. 모양은 기상청 [종합 기후변화감시정보](http://climate.go.kr/home/09_monitoring/) 첫 화면을 따랐다: 어두운 바다 배경 위에 지표 패널을 옆으로 넘겨 보고(CO₂ → 기온 → 해수면 → 해수 표면온도), 선은 값이 클수록 파랑 → 노랑 → 빨강, 아래에 색 범례 막대.

| 지표 | 기간 | 기준 | 원자료 |
| --- | --- | --- | --- |
| 지구 평균기온 편차 | 1850–2025 | 1850–1900년 평균 대비 | Met Office HadCRUT5.1 연평균 |
| 해수면 | 1993–2024 | 1993년 = 0 (cm) | NOAA Laboratory for Satellite Altimetry, 계절 신호 제거 |
| 해수 표면온도 편차 | 1850–2025 | 1981–2010년 평균 대비 | NOAA Climate at a Glance 전 지구 바다 월값의 연평균 |
| 대기 중 CO₂ | 1959–2025 | ppm | NOAA 마우나로아 연평균 |

- 그래프 하나에 지표 하나(눈금이 다른 값을 한 축에 겹치지 않음). 위에 최근 값과 첫해 대비 변화, 기온 그래프에는 파리협정 1.5℃ 점선. 아래 점을 누르거나 옆으로 밀어 다른 지표로 넘긴다.
- 그래프를 누르거나 마우스를 올리면 가장 가까운 해의 값이 뜬다. 키보드는 그래프에 초점을 둔 뒤 좌우 화살표. '전체 기간 / 최근 30년'으로 네 그래프의 기간을 함께 바꾸고, '표로 보기'에 모든 값이 있다.
- 해가 끝나지 않은 해(예: 2026년)는 넣지 않았다. WMO 발표값(예: 기온 +1.44℃)은 여러 자료의 평균이라 그래프 값(HadCRUT5 +1.41℃)과 조금 다르다.
- 패널 배경은 사진 대신 CSS 그라데이션이고, 모서리 둥글기는 --cc-radius로 맞춘다. 선 색의 범위는 지표의 전체 기간 최저~최고값이라 '최근 30년'으로 바꿔도 같은 값은 같은 색이다.
- 새 해 자료가 나오면 원자료를 다시 내려받아 `js/climate-data.js`를 다시 만든다(파일 맨 위 주석에 자료와 기준이 있다).

## 나의 성과 (기록 화면)

기록 화면 40일 챌린지 아래에 '나의 성과'를 접고 펴기로 넣었다. 접힌 줄에 '이번 주 n/3 · 업적 n/14'가 보이고, 펼치면 이번 주 목표와 업적이 달리기 트랙으로 나온다(진행한 만큼 사람이 결승 깃발 쪽으로, 달성하면 깃발이 노랗게).

- 위젯은 지구편 앱에서 떼어 온 `js/achievements-widget.js`(스타일은 `.acw` 아래로 한정)이고, 이 앱 쪽 연결은 `js/achievements.js`, 접기 틀 스타일은 `css/achievements.css`.
- 진행값은 저장하지 않고 이 기기의 기록에서 매번 다시 계산한다. 보상은 없다.
- 지구편의 퀴즈·게임·집 점검·레벨 목표는 이 앱에 없는 기능이라 빼고, 이 앱의 기록으로 목표를 새로 짰다.
  - 이번 주: 실천 5번 · 3일 기록 · 생각 한 줄 1번
  - 업적 14개: 첫 실천 · 첫 생각 한 줄 · 첫 읽기 자료 읽기 · 3일/7일 연속 · 실천 10번 · 여섯 분야에서 한 번씩 · 읽기 자료 5편 · 생각 한 줄 10번 · 40일 챌린지 끝까지 · 나의 숲 '어린 묘목'·'꽃'·'나무'·'숲' 단계
- 색은 `--acw-*` 변수로 다크 화면에 맞췄다.

## 기초부터 읽기 (읽기 화면)

읽기 화면 맨 위에 입문 → 기초 → 이해 → 심화 4단계, 6개 시리즈 29편의 읽기 자료를 넣었다.

- 글은 `js/series-data.js`에 있다. 보고서·보도자료·기사 원문을 읽고 하십시오체 중심(묻는 문장·안내만 해요체)으로 다시 썼고, 숫자는 원문 그대로이며 편마다 출처를 단다.
  - 1단계 「기후변화, 처음 읽기」 5편 · 2단계 「숫자로 보는 기후위기」 5편 · 3단계 「원인과 해법」 5편
  - 4단계 「우리나라의 약속」 5편 · 「기후와 우리 삶」 4편 · 「IPCC 보고서 깊이 읽기」 5편
- 한 편: 핵심 숫자 → 본문 → 그림 → 더 알아보기(접기) → 생각해 보기 → 이어지는 실천('오늘 카드에 담기') → 출처 → 이전·다음 편.
- 그림은 `figs`에 데이터로 적고 `js/series.js`가 그린다: 막대(값이 [하한, 상한]이면 범위, 음수면 0 기준), 두 값 비교, 100% 나눔, 연표, 원리 그림 5개(날씨와 기후, 온실효과, 욕조로 본 탄소중립, 해수면 상승의 두 원인, 적응의 한계).
- 편을 누르면 전체 화면 읽기 창이 열린다(뒤로 가기·Esc로 닫힘). 읽은 편은 `reads['s:편id']`로 남아 나의 성과의 읽기 목표에 함께 센다.
- 색은 `--srs-*` 변수(`css/series.css`, `climate/style.css` 끝)로 맞췄다.

## 화면별 상태 (2주차 기준)

| 화면 | 상태 |
| --- | --- |
| ① 오늘 | 동작. 하루 3장 추천(쉬움 2 + 보통·도전 1, 날짜별 고정), 원탭 기록, 카드 더 고르기, 텀블러 → 아낀 컵 수 |
| ② 로그인 | 카카오·구글 로그인, 계정 화면(저장 상태·로그아웃), 기록 동기화. `js/auth-config.js`가 비어 있으면 "준비 중" 안내 |
| ③ 기록 | 동작. 월별 달력, 끊긴 날 안내("괜찮아요, 다시 시작"), 이번 달 많이 한 실천 3개, 40일 챌린지 |
| ④ 나의 숲 | 동작. 기록 1개 = 1점, 6단계, 동물 해금(벌·새·다람쥐) |
| ⑤ 읽기 | 동작. 기초부터 읽기(4단계 29편), 주제 필터, 이번 주 카드(주차별 순환), 한 줄 성찰 저장(나만 보기), 뉴스레터(10월 호) |
| ⑥⑦⑧ 모임 | 정적 예시 데이터. 반응·AI 초안 고치기/공유는 화면 안에서만 동작 (3단계) |

## 임시로 정한 값 (파일럿 데이터로 조정)

- 숲 점수: 실천 기록 1개 = 1점, 단계 기준 0·5·15·30·60·120점 (목업 값)
- 40일 챌린지 시작일: 첫 기록한 날
- 이번 주 성찰 질문과 카드: 연중 주차마다 14편을 차례로 순환
- 동물 해금: 새 = '오늘의 자연 한 줄' 3회, 다람쥐 = '쓰레기 3개 줍기' 5회, 벌 = 꽃 단계 + 벌 카드 원문 열기
