# 해커톤 운영 대시보드

React + TypeScript + Vite 기반의 해커톤 운영 웹앱입니다.  
관리자, 심사위원, 참가자 화면을 분리해 참가자 관리, 팀 편성, 일정 관리, 공지, 제출, 점수 입력 기능을 제공합니다.

## 기술 스택

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- React Router DOM 7
- Supabase (DB + Realtime 구독)
- lucide-react

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

기본 주소: `http://localhost:5173`

### 4. 검증

```bash
npm run lint
npm run build
```

## 역할 및 권한

| 역할 | 접근 가능 경로 |
|------|--------------|
| `admin` | `/admin/*` 전체 (점수 입력 버튼 비활성화) |
| `judge` | `/admin/scores`, `/admin/score-input` |
| `participant` | `/participant/*` 전체 |

## 라우트

### 공통

- `/login` — 로그인
- `/change-password` — 최초 로그인 시 비밀번호 변경

### 관리자 / 심사위원

| 경로 | 설명 |
|------|------|
| `/admin` | 관리자 대시보드 |
| `/admin/participants` | 참가자 및 팀 관리 |
| `/admin/notices` | 공지 관리 (CRUD) |
| `/admin/milestones` | 일정 관리 (CRUD, 관리자 전용) |
| `/admin/submissions` | 제출 현황 |
| `/admin/scores` | 점수 현황 (관리자: 조회만 / 심사위원: 입력 가능) |
| `/admin/score-input` | 점수 입력 (`admin`, `judge` 공통 접근) |

### 참가자

| 경로 | 설명 |
|------|------|
| `/participant` | 참가자 대시보드 (내 팀 정보) |
| `/participant/schedule` | 마일스톤 타임라인 (공개 일정만 표시) |
| `/participant/notices` | 공지사항 목록 |
| `/participant/submit` | 제출하기 |
| `/participant/notifications` | 알림 |

## 주요 기능

### 관리자 — 참가자 관리

- 인라인 그리드 편집 (신규 행 최대 60개까지 동시 추가)
- 다중 행 동시 편집 및 일괄 저장
- 모바일에서 가로 스크롤 그리드 동일하게 동작

### 관리자 — 팀 관리

- 팀 추가/수정 팝업: 좌측에서 무소속 승인 참가자 검색·다중 선택, 우측에서 팀명/설명 입력
- `n조` 자동 팀명 제안
- 잠금 팀은 수정/삭제/자동매칭 배정 불가
- 자동 매칭: `approved && team === ''` 참가자만 대상

### 관리자 — 일정 관리

- Stepper UI로 마일스톤 추가/수정/삭제
- `is_public` 설정 — 참가자 화면에 공개 일정만 표시, 비공개는 관리자만 확인
- 완료 여부는 DB 저장 없이 프론트에서 `date < 오늘`로 계산

### 관리자 — 공지 관리

- 공지 등록/수정/삭제
- 새 공지 등록 시 참가자 네비게이션에 빨간 점 표시

### 관리자 — 점수 현황 / 입력

- 심사 기준 4개 × 25점 = 100점 만점: 창의성/독창성, 실용성, 완성도, 발표
- 심사위원 평균으로 집계, 팀별/전체 저장
- 관리자는 점수 입력 불가 — 버튼 비활성화 및 안내 토스트 표시

### 참가자 — 일정

- 공개 마일스톤만 표시
- D-day 카드, 전체 진행률 바, 완료/진행 중/예정 상태 시각화
- 관리자가 일정 변경 시 네비게이션에 빨간 점 → 페이지 방문 시 자동 소멸

### 참가자 — 공지사항

- 아코디언 펼치기/접기
- 오늘 등록된 공지에 NEW 뱃지 (다음 날 자정 자동 소멸)
- 새 공지 추가 시 네비게이션에 빨간 점 → 페이지 방문 시 자동 소멸 (수정/삭제는 미표시)

## 프로젝트 구조

```
src/
  api/           # Supabase CRUD 함수 (milestones, notices, participants, scores, submissions, teams)
  components/
    layout/      # AdminLayout, ParticipantLayout
    ui/          # Card, Button, Badge, StatCard
  contexts/
    AuthContext.tsx                  # 인증 상태
    useAuth.ts
    MilestonesNotification.tsx       # 일정 변경 알림 context (ParticipantLayout 내부)
    NoticesNotification.tsx          # 공지 신규 알림 context (ParticipantLayout 내부)
  data/
    mockData.ts       # 공통 타입 정의 (Notice, Milestone 등)
    scoreStore.ts     # SCORE_CRITERIA, 점수 타입
    hackathonStore.ts
  hooks/             # useXxx 데이터 훅 — Supabase Realtime 구독, { data, refetch } 반환
  lib/
    supabase.ts
  pages/
    admin/
    participant/
  App.tsx
  main.tsx
```

## 상태 관리 규칙

- 참가자/팀 상태 변경은 `src/data/hackathonStore.ts`의 helper 함수를 통해 처리합니다.
- 점수 상태 변경은 `src/data/scoreStore.ts`를 사용합니다.
- 화면에서 store 데이터를 직접 변경하지 않습니다.

## 팀 운영 규칙

- 자동 매칭 대상: `approved && team === ''` 참가자만
- 잠금된 팀은 수정/삭제/자동매칭 배정 불가
- 잠금된 팀 소속 참가자는 팀 변경/삭제 불가

## 참고

- 모든 데이터는 Supabase를 통해 읽기/쓰기합니다.
- 각 `useXxx` 훅은 고유한 채널명으로 Supabase Realtime을 구독합니다 (동일 훅 다중 인스턴스 충돌 방지).
- 날짜 비교는 브라우저 로컬 시간 기준으로 처리합니다 (KST 자정 기준 동작).
