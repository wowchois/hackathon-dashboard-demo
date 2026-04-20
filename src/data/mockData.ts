// ─── 타입 정의 ───────────────────────────────────────────────

export interface Participant {
  id: string;
  name: string;
  email: string;
  team: string;
  status: 'approved' | 'pending' | 'rejected';
  department: string;
  position: string;
  userId?: string;   // auth.users.id (신규 등록 참가자만 존재)
  isLeader?: boolean;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  idea: string;
  submitStatus: 'submitted' | 'not-submitted';
  score: number | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description?: string;
  isPublic: boolean;
  isDone: boolean; // date < today 로 프론트에서 계산
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  isRead: boolean;
}

export interface Score {
  teamId: string;
  creativity: number;
  completion: number;
  presentation: number;
  total: number;
}

// ─── 참가자 (15명, 팀별 3~4명) ───────────────────────────────

export const participants: Participant[] = [
  // Team Alpha (4명)
  { id: 'p01', name: '김민준', email: 'minjun.kim@example.com', team: 't1', status: 'approved', department: '개발팀', position: '대리' },
  { id: 'p02', name: '이서연', email: 'seoyeon.lee@example.com', team: 't1', status: 'approved', department: '디자인팀', position: '주임' },
  { id: 'p03', name: '박지호', email: 'jiho.park@example.com', team: 't1', status: 'approved', department: '개발팀', position: '사원' },
  { id: 'p04', name: '최수아', email: 'sua.choi@example.com', team: 't1', status: 'pending', department: '기획팀', position: '대리' },

  // Team Beta (4명)
  { id: 'p05', name: '정우진', email: 'woojin.jung@example.com', team: 't2', status: 'approved', department: '개발팀', position: '과장' },
  { id: 'p06', name: '강예린', email: 'yerin.kang@example.com', team: 't2', status: 'approved', department: '마케팅팀', position: '대리' },
  { id: 'p07', name: '윤도현', email: 'dohyeon.yoon@example.com', team: 't2', status: 'approved', department: '개발팀', position: '주임' },
  { id: 'p08', name: '임하은', email: 'haeun.lim@example.com', team: 't2', status: 'rejected', department: '디자인팀', position: '사원' },

  // Team Gamma (3명)
  { id: 'p09', name: '오승민', email: 'seungmin.oh@example.com', team: 't3', status: 'approved', department: '데이터분석팀', position: '대리' },
  { id: 'p10', name: '한지원', email: 'jiwon.han@example.com', team: 't3', status: 'approved', department: '개발팀', position: '주임' },
  { id: 'p11', name: '신유나', email: 'yuna.shin@example.com', team: 't3', status: 'pending', department: '기획팀', position: '사원' },

  // Team Delta (4명)
  { id: 'p12', name: '배태양', email: 'taeyang.bae@example.com', team: 't4', status: 'approved', department: '개발팀', position: '과장' },
  { id: 'p13', name: '류채원', email: 'chaewon.ryu@example.com', team: 't4', status: 'approved', department: 'UX팀', position: '대리' },
  { id: 'p14', name: '문성호', email: 'seongho.moon@example.com', team: 't4', status: 'approved', department: '개발팀', position: '주임' },
  { id: 'p15', name: '노아름', email: 'areum.noh@example.com', team: 't4', status: 'pending', department: '기획팀', position: '사원' },
];

// ─── 팀 (4개) ────────────────────────────────────────────────

export const teams: Team[] = [
  {
    id: 't1',
    name: '1조',
    members: ['p01', 'p02', 'p03', 'p04'],
    idea: 'AI 기반 실시간 재난 대응 플랫폼 — 시민 제보와 공공 데이터를 결합해 재난 상황을 빠르게 파악하고 대응 자원을 자동 배치합니다.',
    submitStatus: 'submitted',
    score: 88,
  },
  {
    id: 't2',
    name: '2조',
    members: ['p05', 'p06', 'p07', 'p08'],
    idea: '탄소 발자국 트래커 앱 — 일상 소비 패턴을 분석해 개인 탄소 배출량을 시각화하고 친환경 대안을 추천합니다.',
    submitStatus: 'submitted',
    score: 92,
  },
  {
    id: 't3',
    name: '3조',
    members: ['p09', 'p10', 'p11'],
    idea: '지역 소상공인 연결 마켓플레이스 — 동네 가게와 주민을 잇는 하이퍼로컬 커머스 플랫폼입니다.',
    submitStatus: 'submitted',
    score: 79,
  },
  {
    id: 't4',
    name: '4조',
    members: ['p12', 'p13', 'p14', 'p15'],
    idea: '시니어를 위한 디지털 문해력 코칭 서비스 — AI 튜터가 맞춤형 강의와 1:1 과제 피드백을 제공합니다.',
    submitStatus: 'not-submitted',
    score: null,
  },
];

// ─── 공지사항 (5개) ───────────────────────────────────────────

export const notices: Notice[] = [
  {
    id: 'n01',
    title: '해커톤 참가 안내 및 일정 공지',
    content:
      '2025 해커톤에 참가해주셔서 감사합니다. 행사는 총 48시간 동안 진행되며, 개회식은 4월 19일(토) 오전 9시에 시작합니다. 장소는 서울 코엑스 B홀입니다.',
    date: '2025-04-10',
    author: '운영팀',
  },
  {
    id: 'n02',
    title: '팀 아이디어 제출 마감 안내',
    content:
      '팀 아이디어 초안을 4월 19일 오후 2시까지 제출 포털에 업로드해 주세요. 양식은 공지 첨부 파일을 참고하시기 바랍니다.',
    date: '2025-04-12',
    author: '운영팀',
  },
  {
    id: 'n03',
    title: '멘토링 세션 일정 안내',
    content:
      '멘토 배정 결과가 완료되었습니다. 각 팀은 4월 19일 오후 4시와 4월 20일 오전 11시에 멘토링 세션에 참가하게 됩니다. 구체적인 장소는 개회식에서 안내드립니다.',
    date: '2025-04-15',
    author: '멘토링 담당',
  },
  {
    id: 'n04',
    title: '심사 기준 및 발표 형식 공지',
    content:
      '최종 발표는 팀당 5분 발표 + 3분 질의응답으로 진행됩니다. 심사 기준은 창의성(40%), 완성도(35%), 발표력(25%)이며, 심사위원단은 총 5명으로 구성됩니다.',
    date: '2025-04-16',
    author: '심사위원회',
  },
  {
    id: 'n05',
    title: '시상식 및 폐회식 안내',
    content:
      '시상식은 4월 20일(일) 오후 6시에 진행됩니다. 대상 1팀, 최우수상 1팀, 우수상 2팀이 선정되며, 시상 후 네트워킹 파티가 이어집니다.',
    date: '2025-04-17',
    author: '운영팀',
  },
];

// ─── 마일스톤 (5개: 2개 완료, 3개 예정) ─────────────────────

export const milestones: Milestone[] = [
  { id: 'm01', title: '참가 신청 마감',      date: '2025-04-13', isDone: true,  isPublic: true },
  { id: 'm02', title: '팀 아이디어 제출',    date: '2025-04-19', isDone: true,  isPublic: true },
  { id: 'm03', title: '중간 점검 및 멘토링', date: '2025-04-19', isDone: false, isPublic: true },
  { id: 'm04', title: '최종 결과물 제출',    date: '2025-04-20', isDone: false, isPublic: true },
  { id: 'm05', title: '최종 발표 및 시상식', date: '2025-04-20', isDone: false, isPublic: true },
];

// ─── 알림 (8개: 3개 읽음, 5개 안읽음) ───────────────────────

export const notifications: Notification[] = [
  { id: 'noti01', message: 'Team Beta가 최종 결과물을 제출했습니다.', time: '10분 전', isRead: false },
  { id: 'noti02', message: '김민준 님의 참가 신청이 승인되었습니다.', time: '32분 전', isRead: false },
  { id: 'noti03', message: '새 공지사항이 등록되었습니다: 심사 기준 및 발표 형식 공지', time: '1시간 전', isRead: false },
  { id: 'noti04', message: 'Team Alpha 멘토링 세션이 1시간 후 시작됩니다.', time: '2시간 전', isRead: false },
  { id: 'noti05', message: '노아름 님의 참가 신청이 대기 중입니다.', time: '3시간 전', isRead: false },
  { id: 'noti06', message: 'Team Gamma가 아이디어를 제출했습니다.', time: '어제', isRead: true },
  { id: 'noti07', message: '임하은 님의 참가 신청이 거절되었습니다.', time: '어제', isRead: true },
  { id: 'noti08', message: '마일스톤 "팀 아이디어 제출"이 완료 처리되었습니다.', time: '2일 전', isRead: true },
];

// ─── 심사 점수 (4팀) ─────────────────────────────────────────

export const scores: Score[] = [
  { teamId: 't1', creativity: 36, completion: 30, presentation: 22, total: 88 },
  { teamId: 't2', creativity: 38, completion: 32, presentation: 22, total: 92 },
  { teamId: 't3', creativity: 30, completion: 28, presentation: 21, total: 79 },
  { teamId: 't4', creativity: 0, completion: 0, presentation: 0, total: 0 },
];
