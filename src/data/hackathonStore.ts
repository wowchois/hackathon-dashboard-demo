// Phase 4: in-memory 싱글톤 제거 → Supabase API 위임
// 데이터 읽기: useParticipants / useTeams 훅이 Supabase에서 직접 fetch
// 데이터 쓰기: 아래 async 함수들이 Supabase API를 호출

import {
  apiFetchParticipants,
  apiAddParticipant,
  apiUpdateParticipant,
  apiDeleteParticipant,
} from '../api/participants';
import { apiFetchTeams, apiAddTeam, apiUpdateTeam, apiDeleteTeam } from '../api/teams';
import type { Participant } from './mockData';

// ── 타입 정의 ──────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  members: string[];       // participant ids (훅이 participants 기준으로 계산)
  idea: string;
  submitStatus: 'submitted' | 'not-submitted';
  score: number | null;
  locked: boolean;
}

export interface AutoMatchOptions {
  teamSize: number;
  spreadDepartment: boolean;
  spreadPosition: boolean;
  limitLeader: boolean;
}

export interface AutoMatchResult {
  matched: number;
  unmatched: number;
}

const LEADER_POSITIONS = ['과장', '차장', '부장', '팀장', '수석'];

// ── 참가자 mutations ──────────────────────────────────────────

export async function addParticipant(data: Omit<Participant, 'id'>): Promise<void> {
  await apiAddParticipant(data);
}

export async function updateParticipant(
  id: string,
  partial: Partial<Omit<Participant, 'id'>>
): Promise<void> {
  await apiUpdateParticipant(id, partial);
}

export async function deleteParticipant(id: string): Promise<void> {
  await apiDeleteParticipant(id);
}

// ── 팀 mutations ──────────────────────────────────────────────

export async function addTeam(data: Pick<Team, 'name' | 'idea'>): Promise<void> {
  await apiAddTeam(data);
}

export async function updateTeam(
  id: string,
  partial: Partial<Omit<Team, 'id' | 'members' | 'score'>>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if ('name' in partial) patch.name = partial.name;
  if ('idea' in partial) patch.idea = partial.idea;
  if ('submitStatus' in partial) patch.submit_status = partial.submitStatus;
  if ('locked' in partial) patch.locked = partial.locked;
  await apiUpdateTeam(id, patch as Parameters<typeof apiUpdateTeam>[1]);
}

export async function deleteTeam(id: string): Promise<void> {
  // 팀 삭제 전 소속 참가자 team_id 해제
  const participants = await apiFetchParticipants();
  const teamParticipants = participants.filter((p) => p.team === id);
  await Promise.all(teamParticipants.map((p) => apiUpdateParticipant(p.id, { team: '' })));
  await apiDeleteTeam(id);
}

export async function toggleTeamLock(id: string, currentLocked: boolean): Promise<void> {
  await apiUpdateTeam(id, { locked: !currentLocked });
}

// ── 자동 매칭 ─────────────────────────────────────────────────

export async function autoMatch(options: AutoMatchOptions): Promise<AutoMatchResult> {
  const { teamSize, spreadDepartment, spreadPosition, limitLeader } = options;

  const [participants, teamRows] = await Promise.all([
    apiFetchParticipants(),
    apiFetchTeams(),
  ]);

  // 미배정 + 승인된 참가자
  const candidates = participants.filter((p) => p.status === 'approved' && p.team === '');
  if (candidates.length === 0) return { matched: 0, unmatched: 0 };

  const availableTeams = teamRows.filter((t) => !t.locked);
  if (availableTeams.length === 0) return { matched: 0, unmatched: candidates.length };

  // 현재 팀별 배정 인원 추적
  const teamAssignments = new Map<string, Participant[]>();
  for (const team of availableTeams) {
    teamAssignments.set(
      team.id,
      participants.filter((p) => p.team === team.id && p.status === 'approved')
    );
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const assigned: { participantId: string; teamId: string }[] = [];

  for (const candidate of shuffled) {
    let bestTeamId: string | null = null;
    let bestScore = -Infinity;

    for (const team of availableTeams) {
      const currentAssigned = teamAssignments.get(team.id) ?? [];
      if (currentAssigned.length >= teamSize) continue;

      // 리더급 제한
      const isLeader = LEADER_POSITIONS.some((pos) => candidate.position.includes(pos));
      if (limitLeader && isLeader) {
        const leaderCount = currentAssigned.filter((p) =>
          LEADER_POSITIONS.some((pos) => p.position.includes(pos))
        ).length;
        if (leaderCount >= 1) continue;
      }

      let score = 0;
      if (spreadDepartment)
        score -= currentAssigned.filter((p) => p.department === candidate.department).length * 10;
      if (spreadPosition)
        score -= currentAssigned.filter((p) => p.position === candidate.position).length * 5;
      score -= currentAssigned.length * 2;

      if (score > bestScore) { bestScore = score; bestTeamId = team.id; }
    }

    if (bestTeamId !== null) {
      assigned.push({ participantId: candidate.id, teamId: bestTeamId });
      const arr = teamAssignments.get(bestTeamId) ?? [];
      arr.push(candidate);
      teamAssignments.set(bestTeamId, arr);
    }
  }

  // Supabase에 배정 결과 저장
  await Promise.all(
    assigned.map(({ participantId, teamId }) =>
      apiUpdateParticipant(participantId, { team: teamId })
    )
  );

  return { matched: assigned.length, unmatched: candidates.length - assigned.length };
}
