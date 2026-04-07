import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { participants, teams } from '../../data/mockData';
import { Search } from 'lucide-react';

type Tab = 'participants' | 'teams';

export default function Participants() {
  const [tab, setTab] = useState<Tab>('participants');
  const [search, setSearch] = useState('');

  const participantById = (id: string) => participants.find((p) => p.id === id);
  const teamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? '-';

  const filtered = participants.filter((p) => {
    const q = search.trim().toLowerCase();
    return !q || p.name.includes(q) || p.email.toLowerCase().includes(q) || p.department.includes(q);
  });

  return (
    <AdminLayout>
      {/* ── 탭 ── */}
      <div className="flex border-b border-gray-200 mb-5">
        {(['participants', 'teams'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'participants'
              ? `참가자 목록 (${participants.length})`
              : `팀 목록 (${teams.length})`}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <>
          {/* ── 검색 ── */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 이메일, 부서 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* ── 데스크탑 테이블 ── */}
          <div className="hidden sm:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <th className="pb-3 pr-4">이름</th>
                      <th className="pb-3 pr-4">이메일</th>
                      <th className="pb-3 pr-4">팀</th>
                      <th className="pb-3 pr-4">부서</th>
                      <th className="pb-3">직급</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-gray-800">{p.name}</td>
                        <td className="py-3 pr-4 text-gray-500">{p.email}</td>
                        <td className="py-3 pr-4 text-gray-500">{teamName(p.team)}</td>
                        <td className="py-3 pr-4 text-gray-500">{p.department}</td>
                        <td className="py-3 text-gray-500">{p.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ── 모바일 카드 ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{p.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{teamName(p.team)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-700">{p.department}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.position}</p>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
            )}
          </div>
        </>
      ) : (
        /* ── 팀 카드 그리드 ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => {
            const members = team.members.map((id) => participantById(id)).filter(Boolean);
            return (
              <Card key={team.id}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{team.name}</h3>
                  <span className="text-xs text-gray-400">팀원 {members.length}명</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{team.idea}</p>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {members.map((m) => m && (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-gray-500">{m.department}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{m.position}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
