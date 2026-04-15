import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useTeams } from '../../hooks/useTeams';
import { useJudgeScores } from '../../hooks/useJudgeScores';
import { useAuth } from '../../contexts/useAuth';
import {
  SCORE_CRITERIA,
  type JudgeScore,
  updateScore,
} from '../../data/scoreStore';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';

type TeamDraft = { creativity: number; completion: number; presentation: number };
type DraftScores = Record<string, TeamDraft>;

function buildDraft(scores: JudgeScore[]): DraftScores {
  return Object.fromEntries(
    scores.map((s) => [
      s.teamId,
      { creativity: s.creativity, completion: s.completion, presentation: s.presentation },
    ])
  );
}

export default function ScoreInput() {
  const allTeams = useTeams();
  const teams = allTeams.filter((t) => t.submitStatus === 'submitted');
  const { user } = useAuth();

  // 로그인된 사용자를 심사위원으로 사용
  const judgeId = user?.id ?? '';
  const judgeName = user?.name ?? '';

  const { data: judgeScores, refetch: refetchJudgeScores } = useJudgeScores(judgeId, judgeName);

  const [draft, setDraft] = useState<DraftScores>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const effectiveDraft = useMemo(
    () => (Object.keys(draft).length > 0 ? draft : buildDraft(judgeScores)),
    [draft, judgeScores]
  );
  const isHydrated = judgeScores.length > 0;

  // judgeScores는 비동기로 로드되므로 첫 데이터 도착 시 한 번만 draft를 초기화

  const setField = (
    teamId: string,
    field: 'creativity' | 'completion' | 'presentation',
    raw: string
  ) => {
    const max = SCORE_CRITERIA.find((c) => c.key === field)!.max;
    const val = Math.min(max, Math.max(0, Number(raw) || 0));
    setDraft((prev) => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] ??
          effectiveDraft[teamId] ?? { creativity: 0, completion: 0, presentation: 0 }),
        [field]: val,
      },
    }));
    setSaved((prev) => {
      const next = new Set(prev);
      next.delete(teamId);
      return next;
    });
  };

  const handleSave = async (teamId: string) => {
    const d = effectiveDraft[teamId] ?? { creativity: 0, completion: 0, presentation: 0 };
    try {
      await updateScore(judgeId, judgeName, teamId, d);
      const refreshed = await refetchJudgeScores();
      setDraft(buildDraft(refreshed));
      setSaved((prev) => new Set(prev).add(teamId));
    } catch {
      console.error('점수 저장 실패');
    }
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        teams.map((t) => {
          const d = effectiveDraft[t.id] ?? { creativity: 0, completion: 0, presentation: 0 };
          return updateScore(judgeId, judgeName, t.id, d);
        })
      );
      const refreshed = await refetchJudgeScores();
      setDraft(buildDraft(refreshed));
      setSaved(new Set(teams.map((t) => t.id)));
    } catch {
      console.error('전체 점수 저장 실패');
    }
  };

  const getTotal = (teamId: string) => {
    const d = effectiveDraft[teamId] ?? { creativity: 0, completion: 0, presentation: 0 };
    return d.creativity + d.completion + d.presentation;
  };

  const isChanged = (teamId: string) => {
    const original = judgeScores.find((s) => s.teamId === teamId);
    if (!original) return true;
    const d = effectiveDraft[teamId] ?? { creativity: 0, completion: 0, presentation: 0 };
    return (
      d.creativity !== original.creativity ||
      d.completion !== original.completion ||
      d.presentation !== original.presentation
    );
  };

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/scores"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            점수판으로
          </Link>
          <span className="text-gray-300">/</span>
          <h2 className="text-base font-semibold text-gray-800">점수 입력</h2>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={!isHydrated}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          전체 저장
        </button>
      </div>

      {/* ── 심사위원 정보 ── */}
      <div className="mb-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium text-gray-800">{judgeName}</span>
        <span className="text-gray-400">심사위원으로 입력 중</span>
      </div>

      {/* ── 제출 팀 안내 ── */}
      {allTeams.length > teams.length && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
          미제출 팀 {allTeams.length - teams.length}개는 심사 대상에서 제외됩니다.
        </div>
      )}

      {/* ── 평가 기준 안내 ── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {SCORE_CRITERIA.map((c) => (
          <div key={c.key} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-gray-700">{c.max}점</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── 데스크탑 테이블 입력 ── */}
      <div className="hidden sm:block mb-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <th className="pb-3 pr-4 text-left">팀명</th>
                  {SCORE_CRITERIA.map((c) => (
                    <th key={c.key} className="pb-3 pr-4 text-center">
                      {c.label}
                      <span className="text-gray-300 font-normal ml-1">/ {c.max}</span>
                    </th>
                  ))}
                  <th className="pb-3 pr-4 text-center">합계</th>
                  <th className="pb-3 text-center">저장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teams.map((team) => {
                  const d = effectiveDraft[team.id] ?? { creativity: 0, completion: 0, presentation: 0 };
                  const total = getTotal(team.id);
                  const isSaved = saved.has(team.id);
                  const changed = isChanged(team.id);
                  return (
                    <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 pr-4 font-medium text-gray-800">{team.name}</td>
                      {SCORE_CRITERIA.map((c) => (
                        <td key={c.key} className="py-3.5 pr-4">
                          <input
                            type="number"
                            min={0}
                            max={c.max}
                            value={d[c.key]}
                            onChange={(e) => setField(team.id, c.key, e.target.value)}
                            className="w-20 px-2 py-1.5 text-center text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                          />
                        </td>
                      ))}
                      <td className="py-3.5 pr-4 text-center">
                        <span className={`font-bold text-base ${total === 0 ? 'text-gray-300' : 'text-gray-800'}`}>
                          {total}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {isSaved && !changed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            저장됨
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSave(team.id)}
                            disabled={!changed}
                            className="px-3 py-1.5 text-xs font-medium bg-[#80766b] text-white rounded-lg hover:bg-[#6e645a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            저장
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── 모바일 카드 입력 ── */}
      <div className="sm:hidden space-y-4">
        {teams.map((team) => {
          const d = effectiveDraft[team.id] ?? { creativity: 0, completion: 0, presentation: 0 };
          const total = getTotal(team.id);
          const isSaved = saved.has(team.id);
          const changed = isChanged(team.id);
          return (
            <Card key={team.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{team.name}</h3>
                <span className={`text-2xl font-bold ${total === 0 ? 'text-gray-200' : 'text-gray-800'}`}>
                  {total}<span className="text-sm font-normal text-gray-400">점</span>
                </span>
              </div>
              <div className="space-y-3">
                {SCORE_CRITERIA.map((c) => (
                  <div key={c.key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-14 shrink-0">{c.label}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={c.max}
                        value={d[c.key]}
                        onChange={(e) => setField(team.id, c.key, e.target.value)}
                        className="w-20 px-3 py-2 text-center text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                      />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#80766b] rounded-full transition-all"
                          style={{ width: `${Math.min((d[c.key] / c.max) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">/ {c.max}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                {isSaved && !changed ? (
                  <div className="flex items-center justify-center gap-1.5 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    저장 완료
                  </div>
                ) : (
                  <button
                    onClick={() => handleSave(team.id)}
                    disabled={!changed}
                    className="w-full py-2 text-sm font-medium bg-[#80766b] text-white rounded-lg hover:bg-[#6e645a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    저장하기
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
