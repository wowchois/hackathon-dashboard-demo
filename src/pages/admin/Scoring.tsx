import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useTeams } from '../../hooks/useTeams';
import { useScores } from '../../hooks/useScores';
import { useAllJudgeScores } from '../../hooks/useAllJudgeScores';
import { SCORE_CRITERIA } from '../../data/scoreStore';
import { Trophy, Pencil, ChevronDown, ChevronUp, Users } from 'lucide-react';

const MAX_SCORE = 100;

export default function Scoring() {
  const teams = useTeams();
  const scores = useScores();
  const allJudgeScores = useAllJudgeScores();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // 점수를 입력한 심사위원 목록 (judgeId 기준 dedup)
  const judges = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    allJudgeScores.forEach((s) => {
      if (!map.has(s.judgeId)) map.set(s.judgeId, { id: s.judgeId, name: s.judgeName });
    });
    return [...map.values()];
  }, [allJudgeScores]);

  const TOTAL_JUDGES = judges.length;

  const ranked = [...scores]
    .sort((a, b) => b.total - a.total)
    .map((s, idx) => ({
      ...s,
      rank: s.total > 0 ? idx + 1 : null,
      team: teams.find((t) => t.id === s.teamId),
    }))
    .filter((row) => row.team !== undefined);

  const toggleExpand = (teamId: string) =>
    setExpandedTeam((prev) => (prev === teamId ? null : teamId));

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>심사위원 {judges.length}명 입력 · 집계 방식: 평균</span>
        </div>
        <Link
          to="/admin/score-input"
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] transition-colors"
        >
          <Pencil className="w-4 h-4" />
          점수 입력
        </Link>
      </div>

      {/* ── 평가 항목 안내 ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {SCORE_CRITERIA.map((c) => {
          const colorMap = {
            creativity:   { text: 'text-[#fcaf17]', bg: 'bg-[#fcaf17]/10' },
            completion:   { text: 'text-[#80766b]', bg: 'bg-[#80766b]/10' },
            presentation: { text: 'text-green-600', bg: 'bg-green-50' },
          } as const;
          const color = colorMap[c.key];
          return (
            <div key={c.key} className={`${color.bg} rounded-xl p-3 sm:p-5 text-center`}>
              <p className={`text-2xl sm:text-3xl font-bold ${color.text}`}>{c.max}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {c.label}<span className="hidden sm:inline"> 점</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* ── 데스크탑 테이블 ── */}
      <div className="hidden sm:block mb-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide">
                  <th className="pb-3 pr-4 text-left text-gray-400 w-14">순위</th>
                  <th className="pb-3 pr-4 text-left text-gray-400">팀명</th>
                  {SCORE_CRITERIA.map((c) => (
                    <th key={c.key} className={`pb-3 pr-4 text-right ${
                      c.key === 'creativity' ? 'text-[#fcaf17]' :
                      c.key === 'completion' ? 'text-[#80766b]' : 'text-green-500'
                    }`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="pb-3 pr-4 text-right text-gray-600">평균 합계</th>
                  <th className="pb-3 text-center text-gray-400">입력 현황</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((row) => {
                  const isFirst = row.rank === 1;
                  const isExpanded = expandedTeam === row.teamId;
                  const teamJudgeScores = allJudgeScores.filter((s) => s.teamId === row.teamId);

                  return (
                    <>
                      <tr
                        key={row.teamId}
                        className={`transition-colors border-b border-gray-50 ${isFirst ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3.5 pr-4">
                          {isFirst ? <Trophy className="w-4 h-4 text-yellow-500" />
                            : row.rank ? <span className="text-gray-500 font-medium">{row.rank}위</span>
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-3.5 pr-4 font-medium text-gray-800">{row.team!.name}</td>
                        <td className="py-3.5 pr-4 text-right text-[#fcaf17] font-medium">
                          {row.creativity || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-3.5 pr-4 text-right text-[#80766b] font-medium">
                          {row.completion || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-3.5 pr-4 text-right text-green-600 font-medium">
                          {row.presentation || <span className="text-gray-300">-</span>}
                        </td>
                        <td className={`py-3.5 pr-4 text-right font-bold text-base ${isFirst ? 'text-yellow-600' : 'text-gray-800'}`}>
                          {row.total || <span className="text-gray-300 font-normal text-sm">미입력</span>}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            TOTAL_JUDGES > 0 && row.judgeCount === TOTAL_JUDGES
                              ? 'bg-green-100 text-green-700'
                              : row.judgeCount > 0
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {TOTAL_JUDGES > 0 ? `${row.judgeCount}/${TOTAL_JUDGES}명` : '-'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-2">
                          <button
                            onClick={() => toggleExpand(row.teamId)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            title="심사위원별 점수 보기"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* 심사위원별 상세 점수 */}
                      {isExpanded && (
                        <tr key={`${row.teamId}-detail`} className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">심사위원별 점수</p>
                            <div className="grid grid-cols-3 gap-2">
                              {judges.map((judge) => {
                                const js = teamJudgeScores.find((s) => s.judgeId === judge.id);
                                const hasScore = js && (js.creativity > 0 || js.completion > 0 || js.presentation > 0);
                                return (
                                  <div key={judge.id} className={`rounded-lg p-3 border text-xs ${hasScore ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-100'}`}>
                                    <p className={`font-medium mb-1.5 ${hasScore ? 'text-gray-700' : 'text-gray-400'}`}>
                                      {judge.name}
                                    </p>
                                    {hasScore && js ? (
                                      <div className="space-y-0.5 text-gray-500">
                                        <p>창의성 <span className="text-[#fcaf17] font-semibold">{js.creativity}</span></p>
                                        <p>완성도 <span className="text-[#80766b] font-semibold">{js.completion}</span></p>
                                        <p>발표력 <span className="text-green-600 font-semibold">{js.presentation}</span></p>
                                        <p className="border-t border-gray-100 pt-1 mt-1 font-medium text-gray-700">
                                          합계 {js.creativity + js.completion + js.presentation}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-gray-400">미입력</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── 모바일 점수 카드 ── */}
      <div className="sm:hidden space-y-3 mb-6">
        {ranked.map((row) => {
          const isFirst = row.rank === 1;
          const isExpanded = expandedTeam === row.teamId;
          const teamJudgeScores = allJudgeScores.filter((s) => s.teamId === row.teamId);

          return (
            <div key={row.teamId} className={`rounded-xl border ${isFirst ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isFirst && <Trophy className="w-4 h-4 text-yellow-500" />}
                    <span className="font-semibold text-gray-800">{row.team!.name}</span>
                    {row.rank && !isFirst && <span className="text-xs text-gray-400">{row.rank}위</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      TOTAL_JUDGES > 0 && row.judgeCount === TOTAL_JUDGES ? 'bg-green-100 text-green-700'
                      : row.judgeCount > 0 ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {TOTAL_JUDGES > 0 ? `${row.judgeCount}/${TOTAL_JUDGES}` : '-'}
                    </span>
                    <span className={`text-2xl font-bold ${isFirst ? 'text-yellow-600' : row.total > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                      {row.total > 0 ? row.total : '-'}
                    </span>
                  </div>
                </div>

                {row.total > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#fcaf17]/10 rounded-lg py-2">
                      <p className="text-[#fcaf17] font-bold text-lg">{row.creativity}</p>
                      <p className="text-gray-400 text-xs mt-0.5">창의성</p>
                    </div>
                    <div className="bg-[#80766b]/10 rounded-lg py-2">
                      <p className="text-[#80766b] font-bold text-lg">{row.completion}</p>
                      <p className="text-gray-400 text-xs mt-0.5">완성도</p>
                    </div>
                    <div className="bg-green-50 rounded-lg py-2">
                      <p className="text-green-600 font-bold text-lg">{row.presentation}</p>
                      <p className="text-gray-400 text-xs mt-0.5">발표력</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">점수 미입력</p>
                )}

                <button
                  onClick={() => toggleExpand(row.teamId)}
                  className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" />접기</> : <><ChevronDown className="w-3.5 h-3.5" />심사위원별 점수 보기</>}
                </button>
              </div>

              {/* 심사위원별 상세 */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-xl">
                  <div className="space-y-2">
                    {judges.map((judge) => {
                      const js = teamJudgeScores.find((s) => s.judgeId === judge.id);
                      const hasScore = js && (js.creativity > 0 || js.completion > 0 || js.presentation > 0);
                      return (
                        <div key={judge.id} className="flex items-center justify-between text-xs">
                          <span className={hasScore ? 'text-gray-700 font-medium' : 'text-gray-400'}>{judge.name}</span>
                          {hasScore && js ? (
                            <span className="text-gray-500">
                              <span className="text-[#fcaf17]">{js.creativity}</span>
                              {' + '}
                              <span className="text-[#80766b]">{js.completion}</span>
                              {' + '}
                              <span className="text-green-600">{js.presentation}</span>
                              {' = '}
                              <span className="font-semibold text-gray-700">{js.creativity + js.completion + js.presentation}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">미입력</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 막대 차트 ── */}
      <Card title="팀별 평균 점수 비교">
        <div className="space-y-4">
          {ranked.map((row) => {
            const isFirst = row.rank === 1;
            const pct = Math.round((row.total / MAX_SCORE) * 100);
            return (
              <div key={row.teamId}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    {isFirst && <Trophy className="w-3.5 h-3.5 text-yellow-500" />}
                    <span className="font-medium text-gray-700">{row.team!.name}</span>
                    <span className="text-xs text-gray-400">({row.judgeCount}명 입력)</span>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {row.total > 0 ? `평균 ${row.total} / ${MAX_SCORE}점` : '미입력'}
                  </span>
                </div>
                <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg flex items-center justify-end pr-2.5 text-xs font-semibold text-white transition-all duration-700 ${isFirst ? 'bg-yellow-400' : 'bg-[#80766b]'}`}
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 20 && `${row.total}점`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-right">
          만점: 창의성 {SCORE_CRITERIA[0].max} + 완성도 {SCORE_CRITERIA[1].max} + 발표력 {SCORE_CRITERIA[2].max} = {MAX_SCORE}점 (심사위원 평균)
        </p>
      </Card>
    </AdminLayout>
  );
}
