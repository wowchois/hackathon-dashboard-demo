import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useTeams } from '../../hooks/useTeams';
import { SCORE_CRITERIA } from '../../data/scoreStore';
import { useScores } from '../../hooks/useScores';
import { Trophy, Pencil } from 'lucide-react';

const MAX_SCORE = 100;

export default function Scoring() {
  const teams = useTeams();
  const scores = useScores();

  const ranked = [...scores]
    .sort((a, b) => b.total - a.total)
    .map((s, idx) => ({
      ...s,
      rank: s.total > 0 ? idx + 1 : null,
      team: teams.find((t) => t.id === s.teamId),
    }))
    .filter((row) => row.team !== undefined);

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-6">
        <div /> {/* spacer */}
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
            creativity:   { text: 'text-[#fcaf17]',  bg: 'bg-[#fcaf17]/10' },
            completion:   { text: 'text-[#80766b]',  bg: 'bg-[#80766b]/10' },
            presentation: { text: 'text-green-600',  bg: 'bg-green-50' },
          } as const;
          const color = colorMap[c.key];
          return (
            <div key={c.key} className={`${color.bg} rounded-xl p-3 sm:p-5 text-center`}>
              <p className={`text-2xl sm:text-3xl font-bold ${color.text}`}>{c.max}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {c.label} <span className="hidden sm:inline">점</span>
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
                  <th className="pb-3 text-right text-gray-600">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ranked.map((row) => {
                  const isFirst = row.rank === 1;
                  return (
                    <tr
                      key={row.teamId}
                      className={`transition-colors ${isFirst ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3.5 pr-4">
                        {isFirst ? (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        ) : row.rank ? (
                          <span className="text-gray-500 font-medium">{row.rank}위</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
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
                      <td className={`py-3.5 text-right font-bold text-base ${
                        isFirst ? 'text-yellow-600' : 'text-gray-800'
                      }`}>
                        {row.total || <span className="text-gray-300 font-normal text-sm">미입력</span>}
                      </td>
                    </tr>
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
          return (
            <div
              key={row.teamId}
              className={`rounded-xl border p-4 ${
                isFirst ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isFirst && <Trophy className="w-4 h-4 text-yellow-500" />}
                  <span className="font-semibold text-gray-800">{row.team!.name}</span>
                  {row.rank && !isFirst && (
                    <span className="text-xs text-gray-400">{row.rank}위</span>
                  )}
                </div>
                <span className={`text-2xl font-bold ${
                  isFirst ? 'text-yellow-600' : row.total > 0 ? 'text-gray-800' : 'text-gray-300'
                }`}>
                  {row.total > 0 ? row.total : '-'}
                </span>
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
            </div>
          );
        })}
      </div>

      {/* ── 막대 차트 ── */}
      <Card title="팀별 합계 점수 비교">
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
                  </div>
                  <span className="text-gray-400 text-xs">
                    {row.total > 0 ? `${row.total} / ${MAX_SCORE}점` : '미입력'}
                  </span>
                </div>
                <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg flex items-center justify-end pr-2.5 text-xs font-semibold text-white transition-all duration-700 ${
                      isFirst ? 'bg-yellow-400' : 'bg-[#80766b]'
                    }`}
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
          만점: 창의성 {SCORE_CRITERIA[0].max} + 완성도 {SCORE_CRITERIA[1].max} + 발표력 {SCORE_CRITERIA[2].max} = {MAX_SCORE}점
        </p>
      </Card>
    </AdminLayout>
  );
}
