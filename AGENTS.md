# AGENTS.md

## 프로젝트 구조

```
src/
  components/
    layout/
      AdminLayout.tsx
      Header.tsx
      ParticipantLayout.tsx
    ui/
      Badge.tsx
      Button.tsx
      Card.tsx
      StatCard.tsx
  data/
    hackathonStore.ts
    index.ts
    mockData.ts
    scoreStore.ts
  hooks/
    useParticipants.ts
    useScores.ts
    useTeams.ts
  pages/
    admin/
      Dashboard.tsx
      Notices.tsx
      Participants.tsx
      ScoreInput.tsx
      Scoring.tsx
      Submissions.tsx
      index.tsx
    participant/
      Dashboard.tsx
      Notices.tsx
      Notifications.tsx
      Submit.tsx
      Timeline.tsx
      index.tsx
  App.tsx
  index.css
  main.tsx
```

## Build / Lint

```bash
npm run build
npm run lint
```

## 상태 관리

- 참가자/팀 상태: src/data/hackathonStore.ts
- 점수 상태: src/data/scoreStore.ts
- 상태 변경은 반드시 store helper 함수를 통해야 함 (직접 변경 금지)

## 자동 매칭 규칙

- 대상: approved + team === '' 인 참가자만
- 잠금 팀에는 배정 불가

## 팀 잠금 규칙

- 잠금된 팀: 수정/삭제/자동매칭 배정 불가
- 잠금된 팀 소속 참가자: 팀 변경/삭제 불가

## 브랜드 컬러

- 메인: #80766b
- 강조: #fcaf17
