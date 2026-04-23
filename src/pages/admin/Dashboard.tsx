import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useTeams } from '../../hooks/useTeams';
import { useParticipants } from '../../hooks/useParticipants';
import { useScores } from '../../hooks/useScores';
import { useSettings } from '../../hooks/useSettings';
import { useNotices } from '../../hooks/useNotices';
import { useMilestones } from '../../hooks/useMilestones';
import { Users, Flag, FileCheck, Trophy, ChevronRight } from 'lucide-react';

function getDday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDday(days: number): string {
  if (days === 0) return 'D-Day';
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

export default function Dashboard() {
  const teams = useTeams();
  const { data: participants } = useParticipants();
  const scores = useScores();
  const settings = useSettings();
  const { data: notices } = useNotices();
  const { data: allMilestones } = useMilestones();

  const milestones = allMilestones;
  const doneMilestones = milestones.filter((m) => m.isDone);
  const upcomingMilestones = milestones.filter((m) => !m.isDone);
  const currentIdx = milestones.findIndex((m) => !m.isDone);
  const nextMilestone = currentIdx !== -1 ? milestones[currentIdx] : null;
  const ddayValue = nextMilestone ? getDday(nextMilestone.date) : null;
  const progress = milestones.length > 0 ? Math.round((doneMilestones.length / milestones.length) * 100) : 0;

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
          <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
              🏆 최종 순위 발표
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              🎊 모든 심사가 완료되었습니다 · 심사위원 {top3[0]?.judgeCount ?? 0}명 기준
            </p>
          </div>

          {/* 모바일: 리스트형 */}
          <div className="sm:hidden px-4 pb-4 space-y-2">
            {top3.map((item, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const scoreColors = ['text-amber-600', 'text-gray-500', 'text-orange-500'];
              const cardCls = [
                'bg-amber-50 border-amber-200',
                'bg-white border-gray-200',
                'bg-orange-50 border-orange-200',
              ];
              return (
                <div key={item.teamId} className={`flex items-center gap-3 rounded-xl p-3 border ${cardCls[i]}`}>
                  <span className="text-2xl shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{item.team!.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">팀원 {item.team!.members.length}명</p>
                  </div>
                  <p className={`text-base font-extrabold shrink-0 ${scoreColors[i]}`}>{item.total}점</p>
                </div>
              );
            })}
          </div>

          {/* 태블릿+: 시상대형 */}
          <div className="hidden sm:flex px-10 pb-0 items-end justify-center gap-4">

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

      {/* ── 다음 일정 + 최근 공지사항 (PC: 2열) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* 다음 일정 */}
        <Card title="다음 일정">
          {nextMilestone && ddayValue !== null ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-700 truncate">{nextMilestone.title}</p>
                    {!nextMilestone.isPublic && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">비공개</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{nextMilestone.date}</p>
                </div>
                <span className="text-3xl font-black text-indigo-600 shrink-0 tabular-nums">
                  {formatDday(ddayValue)}
                </span>
              </div>
              {/* 모바일: 가로 점 인디케이터 */}
            <div className="flex items-center lg:hidden">
                {milestones.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center ${i < milestones.length - 1 ? 'flex-1' : ''}`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        m.isDone
                          ? 'bg-emerald-500'
                          : i === currentIdx
                          ? 'bg-indigo-500 ring-2 ring-indigo-200 ring-offset-1'
                          : 'bg-gray-200'
                      }`}
                    />
                    {i < milestones.length - 1 && (
                      <div className={`flex-1 h-px ${m.isDone ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* PC: 세로 리스트 (진행 중 + 앞으로 일정만, 최대 4개) */}
              {upcomingMilestones.length > 0 ? (
                <ol className="hidden lg:block">
                  {upcomingMilestones.slice(0, 4).map((m, i) => {
                    const isCurrent = i === 0;
                    const visibleCount = Math.min(upcomingMilestones.length, 4);
                    const isLast = i === visibleCount - 1;
                    return (
                      <li key={m.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                              isCurrent
                                ? 'border-indigo-500 bg-white ring-2 ring-indigo-100'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isCurrent && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[10px]" />}
                        </div>
                        <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-2.5'}`}>
                          <p className="text-[11px] text-gray-400">{m.date}</p>
                          <p className={`text-sm font-medium mt-0.5 truncate ${isCurrent ? 'text-indigo-700' : 'text-gray-600'}`}>
                            {m.title}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                  {upcomingMilestones.length > 4 && (
                    <li className="flex gap-3 mt-1">
                      <div className="w-3 shrink-0" />
                      <p className="text-xs text-gray-400">외 {upcomingMilestones.length - 4}개 일정</p>
                    </li>
                  )}
                </ol>
              ) : (
                <p className="hidden lg:block text-sm text-gray-400 text-center py-2">앞으로 남은 일정이 없습니다.</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                <span>{doneMilestones.length}/{milestones.length} 완료 · {progress}%</span>
                <Link
                  to="/admin/milestones"
                  className="flex items-center gap-0.5 font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
                >
                  전체 보기 <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm font-semibold text-gray-700">모든 일정이 완료됐습니다!</p>
              <Link
                to="/admin/milestones"
                className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
              >
                일정 확인 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </Card>

        {/* 최근 공지사항 */}
        <Card title="최근 공지사항">
          <ul className="divide-y divide-gray-100 lg:hidden">
            {mobileRecentNotices.map((notice) => (
              <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                <Link to={`/admin/notices#${notice.id}`} className="block hover:opacity-70 transition-opacity">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{notice.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{notice.date}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{notice.author}</p>
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{notice.content}</p>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="hidden divide-y divide-gray-100 lg:block">
            {recentNotices.map((notice) => (
              <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                <Link to={`/admin/notices#${notice.id}`} className="block hover:opacity-70 transition-opacity">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{notice.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{notice.date}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{notice.author}</p>
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{notice.content}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── 팀별 제출 현황 ── */}
      <Card
        title="팀별 제출 현황"
        headerRight={
          <Link
            to="/admin/submissions"
            className="flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
          >
            제출 관리 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    </AdminLayout>
  );
}
