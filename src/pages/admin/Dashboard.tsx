import AdminLayout from '../../components/layout/AdminLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useTeams } from '../../hooks/useTeams';
import { useParticipants } from '../../hooks/useParticipants';
import { useScores } from '../../hooks/useScores';
import { useSettings } from '../../hooks/useSettings';
import { useNotices } from '../../hooks/useNotices';
import { Users, Flag, FileCheck, Trophy } from 'lucide-react';

export default function Dashboard() {
  const teams = useTeams();
  const { data: participants } = useParticipants();
  const scores = useScores();
  const settings = useSettings();
  const { data: notices } = useNotices();

  const submittedCount = teams.filter((t) => t.submitStatus === 'submitted').length;
  const scoredCount = scores.filter((s) => s.total > 0).length;
  const recentNotices = notices.slice(0, 5);
  const mobileRecentNotices = notices.slice(0, 2);

  const top3 = [...scores]
    .filter((s) => s.judgeCount > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((s) => ({ ...s, team: teams.find((t) => t.id === s.teamId) }))
    .filter((s) => s.team !== undefined);

  return (
    <AdminLayout>
      {/* ── StatCards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="총 참가자" value={participants.length} icon={Users} color="indigo" />
        <StatCard title="총 팀 수" value={teams.length} icon={Flag} color="blue" />
        <StatCard
          title="제출 완료"
          value={`${submittedCount}/${teams.length}`}
          icon={FileCheck}
          color="green"
        />
        <StatCard
          title="심사 완료"
          value={`${scoredCount}/${teams.length}`}
          icon={Trophy}
          color="purple"
        />
      </div>

      {/* ── 시상 결과 (결과 공개 시) ── */}
      {settings.scoresPublished && top3.length > 0 && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-b from-amber-50 to-white">
          {/* 헤더 */}
          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-2xl font-extrabold text-gray-800 tracking-tight">
              🏆 최종 순위 발표
            </p>
            <p className="text-sm text-gray-500 mt-1">
              🎊 모든 심사가 완료되었습니다 · 심사위원 {top3[0]?.judgeCount ?? 0}명 기준
            </p>
          </div>

          {/* 시상대 */}
          <div className="px-4 sm:px-10 pb-0 flex items-end justify-center gap-2 sm:gap-4">

            {/* 🥈 2등 */}
            {top3[1] ? (
              <div className="flex flex-col items-center flex-1 max-w-[160px]">
                <div className="w-full p-3 rounded-xl bg-white border border-gray-200 shadow-sm text-center mb-0">
                  <p className="text-2xl mb-1">🥈</p>
                  <p className="text-xs font-bold text-gray-700 truncate">{top3[1].team!.name}</p>
                  <p className="text-base font-bold text-gray-500 mt-0.5">{top3[1].total}점</p>
                </div>
                <div className="w-full h-14 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-500">2등</span>
                </div>
              </div>
            ) : <div className="flex-1 max-w-[160px]" />}

            {/* 🥇 1등 */}
            {top3[0] && (
              <div className="flex flex-col items-center flex-1 max-w-[200px]">
                <div className="w-full p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-md text-center mb-0">
                  <p className="text-3xl mb-1">🥇</p>
                  <p className="text-sm font-extrabold text-gray-800 truncate">{top3[0].team!.name}</p>
                  <p className="text-xl font-extrabold text-amber-600 mt-0.5">{top3[0].total}점</p>
                  <p className="text-xs text-amber-500 mt-0.5">팀원 {top3[0].team!.members.length}명</p>
                </div>
                <div className="w-full h-24 bg-amber-400 rounded-t-lg flex items-center justify-center">
                  <span className="text-sm font-extrabold text-white">🎖️ 1등</span>
                </div>
              </div>
            )}

            {/* 🥉 3등 */}
            {top3[2] ? (
              <div className="flex flex-col items-center flex-1 max-w-[160px]">
                <div className="w-full p-3 rounded-xl bg-white border border-orange-200 shadow-sm text-center mb-0">
                  <p className="text-2xl mb-1">🥉</p>
                  <p className="text-xs font-bold text-gray-700 truncate">{top3[2].team!.name}</p>
                  <p className="text-base font-bold text-orange-500 mt-0.5">{top3[2].total}점</p>
                </div>
                <div className="w-full h-8 bg-amber-700/40 rounded-t-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-900">3등</span>
                </div>
              </div>
            ) : <div className="flex-1 max-w-[160px]" />}

          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {/* ── 팀별 제출 현황 ── */}
        <Card title="팀별 제출 현황" className="order-2 lg:order-1">
          <div className="max-h-[460px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {teams.map((team) => {
                const submitted = team.submitStatus === 'submitted';
                return (
                  <div
                    key={team.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-3 transition-colors ${
                      submitted
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${submitted ? 'text-indigo-800' : 'text-gray-700'}`}>
                        {team.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">팀원 {team.members.length}명</p>
                    </div>
                    <Badge status={team.submitStatus} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── 최근 공지사항 ── */}
        <Card title="최근 공지사항" className="order-1 lg:order-2">
          <ul className="divide-y divide-gray-100 lg:hidden">
            {mobileRecentNotices.map((notice) => (
              <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{notice.title}</p>
                  <span className="text-xs text-gray-400 shrink-0">{notice.date}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{notice.author}</p>
                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{notice.content}</p>
              </li>
            ))}
          </ul>

          <ul className="hidden divide-y divide-gray-100 lg:block">
            {recentNotices.map((notice) => (
              <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{notice.title}</p>
                  <span className="text-xs text-gray-400 shrink-0">{notice.date}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{notice.author}</p>
                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{notice.content}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}
