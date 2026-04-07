# 해커톤 관리 시스템 대시보드

React + TypeScript + Vite 기반의 해커톤 관리 시스템 데모입니다.  
관리자와 참가자 각각의 전용 대시보드를 제공합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 번들러 | Vite 8 |
| 스타일링 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 라우팅 | React Router DOM v7 |
| 아이콘 | lucide-react |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

개발 서버 실행 후 `http://localhost:5173` 접속

---

## 화면 구성

### 진입점

| URL | 설명 |
|-----|------|
| `/` | 홈 — 관리자 / 참가자 선택 |
| `/admin` | 관리자 대시보드 |
| `/participant` | 참가자 대시보드 |

---

### 관리자 화면 (5개 페이지)

| 페이지 | URL | 설명 |
|--------|-----|------|
| 전체 현황 요약 | `/admin` | StatCard 4개, 팀별 제출 진행바, 최근 공지 3개 |
| 참가자/팀 관리 | `/admin/participants` | 탭 전환, 이름·이메일 검색, 상태 필터, 데스크탑 테이블/모바일 카드 |
| 공지사항 관리 | `/admin/notices` | 공지 작성·수정·삭제 (로컬 상태 CRUD) |
| 제출물 현황 | `/admin/submissions` | 팀별 제출 상태 카드, GitHub·발표자료 링크 |
| 심사 점수판 | `/admin/scores` | 순위 테이블/카드, 1위 금색 하이라이트, CSS 막대 차트 |
| 점수 입력 | `/admin/score-input` | 팀별 항목별 점수 입력, 저장 시 점수판 즉시 반영 |

---

### 참가자 화면 (5개 페이지)

| 페이지 | URL | 설명 |
|--------|-----|------|
| 내 팀 정보 | `/participant` | 팀 헤더, 팀원 이니셜 아바타, 아이디어 카드, 제출 현황 |
| 일정 타임라인 | `/participant/schedule` | D-day 카운트다운, 세로 타임라인, 전체 진행률 바 |
| 공지사항 | `/participant/notices` | 아코디언 목록, 최신 공지 NEW 뱃지 |
| 제출하기 | `/participant/submit` | GitHub URL·발표자료·설명 입력, 제출 완료 상태 전환 |
| 알림 센터 | `/participant/notifications` | 읽음/안읽음 구분, 클릭 읽음 처리, 전체 읽음 버튼 |

---

## 반응형 대응

| 브레이크포인트 | 적용 |
|---------------|------|
| 모바일 (< `sm`) | 카드 리스트, 하단 탭 바, 햄버거 메뉴 |
| 태블릿 (`sm`) | 2열 그리드 전환 |
| 데스크탑 (`lg+`) | 240px 고정 사이드바, 테이블 레이아웃 |

---

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/
│   │   ├── AdminLayout.tsx        # 관리자 레이아웃 (사이드바 + 하단 탭)
│   │   ├── ParticipantLayout.tsx  # 참가자 레이아웃 (사이드바 + 하단 탭)
│   │   └── Header.tsx
│   └── ui/
│       ├── Badge.tsx              # 상태 뱃지 (approved/pending/rejected/submitted/not-submitted)
│       ├── Button.tsx
│       ├── Card.tsx               # 범용 카드
│       └── StatCard.tsx           # 현황 요약 숫자 카드
├── data/
│   ├── mockData.ts                # 더미 데이터 및 타입 정의
│   ├── scoreStore.ts              # 심사 점수 싱글톤 스토어
│   └── index.ts
├── hooks/
│   └── useScores.ts               # 점수 스토어 구독 훅
├── pages/
│   ├── admin/
│   │   ├── Dashboard.tsx
│   │   ├── Participants.tsx
│   │   ├── Notices.tsx
│   │   ├── Submissions.tsx
│   │   ├── Scoring.tsx
│   │   └── ScoreInput.tsx
│   └── participant/
│       ├── Dashboard.tsx
│       ├── Timeline.tsx
│       ├── Notices.tsx
│       ├── Submit.tsx
│       └── Notifications.tsx
└── App.tsx
```

---

## 더미 데이터 구성

| 데이터 | 수량 | 비고 |
|--------|------|------|
| 참가자 | 15명 | 4개 팀, 팀별 3~4명 |
| 팀 | 4개 | Alpha·Beta·Gamma·Delta |
| 공지사항 | 5개 | 4/10 ~ 4/17 |
| 마일스톤 | 5개 | 2개 완료, 3개 예정 |
| 알림 | 8개 | 5개 안읽음, 3개 읽음 |
| 심사 점수 | 4팀 | 창의성 40 + 완성도 35 + 발표력 25 = 100점 만점 |

---

## 심사 점수 입력 흐름

```
심사 점수판 (/admin/scores)
    └─ [점수 입력] 버튼
         ↓
점수 입력 (/admin/score-input)
    ├─ 팀별 창의성 / 완성도 / 발표력 입력
    ├─ 합계 자동 계산
    └─ 저장 → scoreStore 업데이트
         ↓
점수판으로 돌아가면 즉시 반영 (useScores 훅 구독)
```
