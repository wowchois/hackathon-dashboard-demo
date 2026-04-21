# KBDS AI 해커톤 운영 대시보드

React + TypeScript + Vite 기반의 해커톤 운영 웹앱입니다.  
관리자, 심사위원, 참가자 화면을 분리해 참가자 관리, 팀 편성, 일정 관리, 참석 투표, 공지, 제출, 점수 입력 기능을 제공합니다.

## 기술 스택

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- React Router DOM 7
- Supabase (DB + Realtime 구독)
- lucide-react
- xlsx (엑셀 내보내기/가져오기)

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사해 `.env.development`(개발) 또는 `.env.production`(운영) 파일을 만들고 값을 채웁니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Vercel 배포 시**: 파일 대신 Vercel 대시보드 → Settings → Environment Variables에서 위 두 값을 설정해야 합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

기본 주소: `http://localhost:5173`

### 4. 검증

```bash
npm run lint    # ESLint
npm run build   # tsc + Vite 프로덕션 빌드
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
- 목록 정렬: 팀명 오름차순 → 팀장 우선 → 이름 오름차순
- 이메일 중복 사전 체크 (기존 참가자 + 현재 입력 행 간 교차 검사)
- 모바일에서 가로 스크롤 그리드 동일하게 동작

#### 엑셀 일괄 등록

관리자 패널 참가자 탭에서 `.xlsx` 파일로 참가자를 일괄 등록할 수 있습니다.

**필수 헤더 (순서 무관, 첫 번째 시트에서 읽음)**

| 헤더명 | 필수 여부 | 설명 |
|--------|----------|------|
| `이름` | **필수** | 참가자 이름 |
| `이메일` | **필수** | 로그인 계정으로 사용, 중복 불가 |
| `부서` | 선택 | 소속 부서 |
| `직급` | 선택 | 직급/직책 |

> - 팀 배정·팀장 여부·상태는 엑셀로 지정할 수 없으며, 등록 후 화면에서 직접 수정합니다.  
> - 비밀번호는 서버의 `IMPORT_DEFAULT_PASSWORD` 환경 변수 값으로 자동 설정됩니다.  
> - 한 번에 최대 60행까지 반영됩니다.

### 관리자 — 팀 관리

- 팀 추가/수정 팝업: 좌측에서 무소속 승인 참가자 검색·다중 선택, 우측에서 팀명/설명 입력
- `n조` 자동 팀명 제안
- 잠금 팀은 수정/삭제/자동매칭 배정 불가
- 자동 매칭: `approved && team === ''` 참가자만 대상

### 관리자 — 일정 관리

- Stepper UI로 마일스톤 추가/수정/삭제
- `is_public` 설정 — 참가자 화면에 공개 일정만 표시, 비공개는 관리자만 확인
- 완료 여부는 DB 저장 없이 프론트에서 `date < 오늘`로 계산
- 각 일정의 **참석 명단 보기** 버튼으로 투표 참석자 목록 조회 가능
  - 참석자 명단: 이름(팀장 배지) / 팀 / 부서 / 직급
  - 10명 이상이면 테이블 스크롤, 컬럼 헤더 고정
  - **엑셀 다운로드**: 참석자만, 컬럼 = 이름 / 팀장여부 / 팀 / 부서 / 직급 / 투표일시

### 관리자 — 공지 관리

- 공지 등록/수정/삭제
- 새 공지 등록 시 참가자 네비게이션에 빨간 점 표시

### 관리자 — 점수 현황 / 입력

- 심사 기준 4개 × 25점 = 100점 만점: 창의성/독창성, 실용성, 완성도, 발표
- 심사위원 평균으로 집계, 팀별/전체 저장
- 관리자는 점수 입력 불가 — 버튼 비활성화 및 안내 토스트 표시

### 참가자 — 일정 & 참석 투표

- 공개 마일스톤만 표시
- D-day 카드, 전체 진행률 바, 완료/진행 중/예정 상태 시각화
- 일정 변경 시 네비게이션에 빨간 점 → 페이지 방문 시 자동 소멸
- **참석 투표** (투표 가능 기간: 일정 7일 전 ~ 당일 마감)
  - 평일 일정: 당일 **오후 6시 KST** 마감
  - 주말 일정: 당일 **오전 10시 KST** 마감
  - 투표 후 결과 즉시 반영 (낙관적 업데이트) + "투표되었습니다" 성공 토스트
  - 투표 완료 후 버튼 잠금 → **재투표** 링크로 재입력 가능

### 참가자 — 공지사항

- 아코디언 펼치기/접기
- 오늘 등록된 공지에 NEW 뱃지 (다음 날 자정 자동 소멸)
- 새 공지 추가 시 네비게이션에 빨간 점 → 페이지 방문 시 자동 소멸 (수정/삭제는 미표시)

### 참가자 — 제출하기

- **팀장만** 제출 및 수정 가능
- 팀원 화면: "팀장만 제출 및 수정이 가능합니다" 안내 문구 표시
- 팀장이 이미 제출한 경우: 제출 내용 조회 + **수정하기** 버튼 제공
- 수정 모드에서 취소 시 기존 제출 내용으로 복원

### 팀장 — 팀원 추가

- 팀장은 자신의 팀에 직접 팀원을 추가할 수 있음
- 잠긴 팀에는 추가 불가 (관리자 문의 안내)
- 팀 최대 인원 초과 시 추가 불가

## 데이터베이스

Supabase를 사용하며 마이그레이션 쿼리는 `supabase/prd_query.sql`에 있습니다.

### 참석 투표 테이블

```sql
CREATE TABLE milestone_attendances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id   uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  attending      boolean NOT NULL,
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(milestone_id, participant_id)
);
ALTER TABLE milestone_attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON milestone_attendances
  FOR SELECT USING (auth.role() = 'authenticated');
```

## Edge Functions (`supabase/functions/participant-admin`)

| action | 권한 | 설명 |
|--------|------|------|
| `create` | admin, 팀장 | 참가자 생성 (auth user + DB 행 동시 생성) |
| `update` | admin | 참가자 정보 수정 |
| `delete` | admin | 참가자 삭제 (auth user + DB 행 동시 삭제) |
| `reset-password` | admin | 비밀번호 초기화 (`IMPORT_DEFAULT_PASSWORD`로 재설정) |
| `vote-attendance` | participant | 참석 투표 (투표 기간 서버 측 KST 검증 후 upsert) |

> **CORS**: `corsHeaders`의 `Access-Control-Allow-Origin`을 실제 운영 도메인으로 변경 후 배포해야 합니다.

## 프로젝트 구조

```
src/
  api/           # Supabase CRUD 함수
                 #   attendances.ts   — 참석 투표 조회/제출
                 #   milestones.ts
                 #   notices.ts
                 #   participants.ts
                 #   scores.ts
                 #   submissions.ts
                 #   teams.ts
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
  hooks/             # useXxx 데이터 훅 — Supabase Realtime 구독
                     #   useMyAttendances.ts  — milestone_attendances 실시간 구독
  lib/
    supabase.ts
  pages/
    admin/
    participant/
  App.tsx
  main.tsx
supabase/
  functions/
    participant-admin/   # Edge Function
  prd_query.sql          # DB 마이그레이션 쿼리
```

## 상태 관리 규칙

- 참가자/팀 상태 변경은 `src/data/hackathonStore.ts`의 helper 함수를 통해 처리합니다.
- 점수 상태 변경은 `src/data/scoreStore.ts`를 사용합니다.
- 화면에서 store 데이터를 직접 변경하지 않습니다.

## 팀 운영 규칙

- 자동 매칭 대상: `approved && team === ''` 참가자만
- 잠금된 팀은 수정/삭제/자동매칭 배정 불가
- 잠금된 팀 소속 참가자는 팀 변경/삭제 불가
- 팀 최대 인원: 5명

## 참고

- 각 `useXxx` 훅은 고유한 채널명으로 Supabase Realtime을 구독합니다 (동일 훅 다중 인스턴스 충돌 방지).
- `isDone` (마일스톤 완료 여부)은 DB에 저장하지 않고 프론트에서 `date < 오늘`로 계산합니다.
- 참석 투표 마감 시간은 서버(Edge Function)와 프론트 모두 KST 기준으로 동일하게 계산합니다.
