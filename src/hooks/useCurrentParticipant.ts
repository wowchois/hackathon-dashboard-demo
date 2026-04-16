import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  apiFetchParticipantByUserId,
  apiFetchParticipantByEmail,
  apiLinkParticipant,
} from '../api/participants';
import { apiFetchTeamById } from '../api/teams';
import type { Participant } from '../data/mockData';
import type { TeamRow } from '../api/teams';

export interface CurrentParticipant {
  participant: Participant | null;
  team: TeamRow | null;
  loading: boolean;
}

export function useCurrentParticipant(): CurrentParticipant {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const email = user?.email ?? null;
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId || !email) return;

    let cancelled = false;
    async function load() {
      setLoading(true);

      // 1. userId로 먼저 조회 (신규 등록 참가자)
      let p = await apiFetchParticipantByUserId(userId!);

      if (!cancelled && !p) {
        // 2. 없으면 email로 조회 (레거시 참가자)
        p = await apiFetchParticipantByEmail(email!);
        // 3. 찾았고 user_id가 미설정이면 자동 연결
        if (!cancelled && p && !p.userId) {
          await apiLinkParticipant(p.id, userId!);
        }
      }

      if (cancelled) return;
      setParticipant(p);

      if (p?.team) {
        const t = await apiFetchTeamById(p.team);
        if (!cancelled) setTeam(t);
      } else {
        if (!cancelled) setTeam(null);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId, email]);

  return {
    participant: userId ? participant : null,
    team: userId ? team : null,
    loading: userId ? loading : false,
  };
}
