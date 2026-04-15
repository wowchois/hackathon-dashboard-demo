import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetchParticipantByEmail } from '../api/participants';
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
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const p = await apiFetchParticipantByEmail(user!.email);
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
  }, [user?.email]);

  return { participant, team, loading };
}
