import AdminLayout from '../../components/layout/AdminLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { notices } from '../../data/mockData';
import { useTeams } from '../../hooks/useTeams';
import { useParticipants } from '../../hooks/useParticipants';
import { useScores } from '../../hooks/useScores';
import { Users, Flag, FileCheck, Trophy } from 'lucide-react';

export default function Dashboard() {
  const teams = useTeams();
  const participants = useParticipants();
  const scores = useScores();

  const submittedCount = teams.filter((t) => t.submitStatus === 'submitted').length;
  const scoredCount = scores.filter((s) => s.total > 0).length;
  const recentNotices = [...notices].reverse().slice(0, 3);

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

      {/* ── 팀별 제출 현황 ── */}
      <Card title="팀별 제출 현황" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </Card>

      {/* ── 최근 공지사항 ── */}
      <Card title="최근 공지사항">
        <ul className="divide-y divide-gray-100">
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
    </AdminLayout>
  );
}
