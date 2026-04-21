import { supabase } from '../lib/supabase';

export interface MyAttendance {
  milestoneId: string;
  attending: boolean;
}

interface DBAttendanceRow {
  id: string;
  milestone_id: string;
  participant_id: string;
  attending: boolean;
  updated_at: string;
  participants: {
    name: string;
    email: string;
    department: string;
    position: string;
    is_leader: boolean;
    teams: { name: string } | null;
  } | null;
}

export interface MilestoneAttendance {
  id: string;
  milestoneId: string;
  participantId: string;
  attending: boolean;
  updatedAt: string;
  participantName: string;
  participantEmail: string;
  participantDepartment: string;
  participantPosition: string;
  isLeader: boolean;
  teamName: string;
}

async function edgeFnHeaders(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증 세션이 없습니다.');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function throwFromInvokeError(error: unknown): Promise<never> {
  if (error && typeof error === 'object' && 'context' in error) {
    try {
      const body = await (error as { context: Response }).context.json() as { error?: string };
      if (body.error) throw new Error(body.error);
    } catch (inner) {
      if (inner instanceof Error && inner.message) throw inner;
    }
  }
  throw error as Error;
}

export async function apiFetchMyAttendances(participantId: string): Promise<MyAttendance[]> {
  const { data, error } = await supabase
    .from('milestone_attendances')
    .select('milestone_id, attending')
    .eq('participant_id', participantId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    milestoneId: row.milestone_id as string,
    attending: row.attending as boolean,
  }));
}

export async function apiVoteAttendance(milestoneId: string, attending: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body: { action: 'vote-attendance', milestone_id: milestoneId, attending },
    headers: await edgeFnHeaders(),
  });
  if (error) await throwFromInvokeError(error);
  if (data?.error) throw new Error(data.error);
}

export async function apiFetchMilestoneAttendances(milestoneId: string): Promise<MilestoneAttendance[]> {
  const { data, error } = await supabase
    .from('milestone_attendances')
    .select(`
      id,
      milestone_id,
      participant_id,
      attending,
      updated_at,
      participants (
        name,
        email,
        department,
        position,
        is_leader,
        teams ( name )
      )
    `)
    .eq('milestone_id', milestoneId)
    .eq('attending', true);
  if (error) throw error;
  return (data as unknown as DBAttendanceRow[])
    .map((row) => ({
      id: row.id,
      milestoneId: row.milestone_id,
      participantId: row.participant_id,
      attending: row.attending,
      updatedAt: row.updated_at,
      participantName: row.participants?.name ?? '',
      participantEmail: row.participants?.email ?? '',
      participantDepartment: row.participants?.department ?? '',
      participantPosition: row.participants?.position ?? '',
      isLeader: row.participants?.is_leader ?? false,
      teamName: row.participants?.teams?.name ?? '-',
    }))
    .sort((a, b) => {
      if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName, 'ko');
      if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
      return a.participantName.localeCompare(b.participantName, 'ko');
    });
}
