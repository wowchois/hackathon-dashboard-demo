-- ============================================================
-- PRD 초기 설정 쿼리 (처음 한 번만 실행)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  idea          text,
  submit_status text NOT NULL DEFAULT 'not-submitted'
                CONSTRAINT chk_submit_status
                CHECK (submit_status IN ('not-submitted', 'submitted')),
  locked        boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  team_id     uuid REFERENCES teams(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending'
              CONSTRAINT chk_status
              CHECK (status IN ('pending', 'approved', 'rejected')),
  department  text NOT NULL DEFAULT '',
  position    text NOT NULL DEFAULT '',
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX participants_user_id_idx
  ON participants(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE notices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  content    text NOT NULL DEFAULT '',
  author     text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  date        date,
  description text DEFAULT '',
  is_public   boolean NOT NULL DEFAULT true,
  sort_order  int DEFAULT 0
);

CREATE TABLE scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id      uuid REFERENCES teams(id) ON DELETE CASCADE,
  judge_name   text NOT NULL DEFAULT '',
  creativity   int NOT NULL DEFAULT 0,
  practicality int NOT NULL DEFAULT 0,
  completion   int NOT NULL DEFAULT 0,
  presentation int NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(judge_id, team_id)
);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message    text NOT NULL,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  github_url   text NOT NULL DEFAULT '',
  slides_url   text NOT NULL DEFAULT '',
  description  text NOT NULL DEFAULT '',
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(team_id)
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION approve_participant_on_first_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE participants
  SET status = 'approved'
  WHERE user_id = auth.uid()
    AND status = 'pending';
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions   ENABLE ROW LEVEL SECURITY;

-- teams
CREATE POLICY "read" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_write" ON teams
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- participants: admin 전체 읽기 / 본인 행만 읽기 (OR 합산)
CREATE POLICY "admin_read" ON participants
  FOR SELECT USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');
CREATE POLICY "own_read" ON participants
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_write" ON participants
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- notices
CREATE POLICY "read" ON notices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_write" ON notices
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- milestones
CREATE POLICY "read" ON milestones
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_write" ON milestones
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- scores
CREATE POLICY "read" ON scores
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "judge_write" ON scores
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'judge'
    AND auth.uid() = judge_id
  );

-- notifications
CREATE POLICY "own" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- submissions
CREATE POLICY "read" ON submissions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_write" ON submissions
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');
CREATE POLICY "team_insert" ON submissions
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM participants WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "team_update" ON submissions
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM participants WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- settings (운영 설정 — 단일 row, id=1 고정)
-- ============================================================

CREATE TABLE settings (
  id                  int PRIMARY KEY DEFAULT 1,
  submission_deadline timestamptz,
  scores_published    boolean NOT NULL DEFAULT false,
  creativity_max      int     NOT NULL DEFAULT 25,
  practicality_max    int     NOT NULL DEFAULT 25,
  completion_max      int     NOT NULL DEFAULT 25,
  presentation_max    int     NOT NULL DEFAULT 25
);

-- 초기 row 삽입
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 전체 읽기 (참가자도 deadline·scores_published 조회 필요)
CREATE POLICY "settings_read" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자만 수정
CREATE POLICY "settings_write" ON settings
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ============================================================
-- 계정 역할 설정 (Supabase Auth에서 계정 생성 후 실행)
-- ============================================================

-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
-- WHERE email = 'admin@xxx.com';

-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role":"judge"}'::jsonb
-- WHERE email = 'judge1@xxx.com';


-- ============================================================
-- MIGRATION: 참석 투표 기능 추가
-- ============================================================

-- 1. 마일스톤별 참가자 참석 투표 테이블
CREATE TABLE milestone_attendances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id   uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  attending      boolean NOT NULL,
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(milestone_id, participant_id)
);

-- 2. RLS
ALTER TABLE milestone_attendances ENABLE ROW LEVEL SECURITY;

-- 인증된 전체 사용자 읽기 (관리자 집계 + 참가자 본인 확인)
CREATE POLICY "read" ON milestone_attendances
  FOR SELECT USING (auth.role() = 'authenticated');

-- 참가자 write는 Edge Function(service_role)이 처리하므로 별도 정책 불필요
-- 이미 위 쿼리로 테이블이 생성된 경우 아래 쿼리만 실행
-- ============================================================

-- 1. participants 테이블에 팀장 구분 컬럼 추가
ALTER TABLE participants
  ADD COLUMN is_leader boolean NOT NULL DEFAULT false;

-- 2. participants 자기 참조 RLS의 무한 재귀를 방지하기 위한 헬퍼 함수
--    SECURITY DEFINER 로 실행되어 RLS 우회 후 호출자의 team_id 반환
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM participants WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. participants RLS 변경
--    own_read → own_read + same_team_read (Dashboard 팀원 목록 정상 동작)
DROP POLICY IF EXISTS "own_read" ON participants;

CREATE POLICY "own_read" ON participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "same_team_read" ON participants
  FOR SELECT USING (
    team_id IS NOT NULL AND team_id = get_my_team_id()
  );

-- 4. submissions RLS 변경
--    팀원 전체 → 팀장만 제출/수정 가능
DROP POLICY IF EXISTS "team_insert" ON submissions;
DROP POLICY IF EXISTS "team_update" ON submissions;

CREATE POLICY "leader_insert" ON submissions
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM participants
      WHERE user_id = auth.uid() AND is_leader = true
    )
  );

CREATE POLICY "leader_update" ON submissions
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM participants
      WHERE user_id = auth.uid() AND is_leader = true
    )
  );
