import { Link } from 'react-router-dom';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { useParticipants } from '../../hooks/useParticipants';
import { useNotices } from '../../hooks/useNotices';
import { useMilestones } from '../../hooks/useMilestones';
import { useScores } from '../../hooks/useScores';
import { useSettings } from '../../hooks/useSettings';
import { Crown, Trophy, ChevronRight, CheckCircle2 } from 'lucide-react';

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

export default function ParticipantDashboard() {
  const { participant, team, loading } = useCurrentParticipant();
  const { data: allParticipants } = useParticipants();
  const { data: notices } = useNotices();
  const { data: allMilestones } = useMilestones();
  const allScores = useScores();
  const settings = useSettings();

  // 팀원 목록
  const teamMembers = team ? allParticipants.filter((p) => p.team === team.id) : [];

  // 다음 일정
  const milestones = allMilestones.filter((m) => m.isPublic);
  const doneMilestones = milestones.filter((m) => m.isDone);
  const currentIdx = milestones.findIndex((m) => !m.isDone);
  const nextMilestone = currentIdx !== -1 ? milestones[currentIdx] : null;
  const ddayValue = nextMilestone ? getDday(nextMilestone.date) : null;

  // 최근 공지사항
  const recentNotices = [...notices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // 평가 결과
  const myScore = team ? allScores.find((s) => s.teamId === team.id) : undefined;
  const scoredTeams = allScores.filter((s) => s.judgeCount > 0).sort((a, b) => b.total - a.total);
  const myRank =
    myScore && myScore.judgeCount > 0
      ? scoredTeams.filter((s) => s.total > myScore.total).length + 1
      : null;
  const evaluationDone = settings.scoresPublished && myScore && myScore.judgeCount > 0;

  if (loading) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      {/* ── 평가 완료 배너 ── */}
      {evaluationDone && myRank !== null && (
        <div
          className={`mb-5 rounded-2xl p-5 border ${
            myRank <= 3 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                myRank <= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              평가완료
            </span>
          </div>
          <p className={`text-base font-bold ${myRank <= 3 ? 'text-emerald-700' : 'text-blue-700'}`}>
            {myRank === 1
              ? '🏆 심사가 완료됐어요! 대상을 수상하셨습니다!'
              : myRank === 2
              ? '🥈 심사가 완료됐어요! 최우수상을 수상하셨습니다!'
              : myRank === 3
              ? '🥉 심사가 완료됐어요! 우수상을 수상하셨습니다!'
              : '🎉 심사가 완료됐어요! 수고 많으셨습니다!'}
          </p>
          <p className={`text-sm mt-1 ${myRank <= 3 ? 'text-emerald-600' : 'text-blue-500'}`}>
            {myRank <= 3
              ? myRank === 1
                ? '최고의 아이디어와 실력으로 대상을 거머쥐었습니다. 진심으로 축하드립니다!'
                : myRank === 2
                ? '뛰어난 완성도와 열정이 빛났습니다. 진심으로 축하드립니다!'
                : '창의력과 노력이 인정받았습니다. 진심으로 축하드립니다!'
              : '짧은 시간 안에 아이디어를 현실로 만들어낸 경험 자체가 값진 성취입니다.'}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-current/10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-gray-700">
                {myRank}위 · {myScore!.total}점
              </span>
            </div>
            <Link
              to="/participant/scores"
              className="flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
            >
              자세히 보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── ① 내 팀 정보 + ② 다음 일정 ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-5">
        {/* 내 팀 정보 */}
        <Card title="내 팀">
          {!team ? (
            <p className="text-sm text-gray-400 text-center py-6">팀 배정 대기 중입니다.</p>
          ) : (
            <>
              <p className="text-base font-bold text-gray-800 mb-3">{team.name}</p>
              {teamMembers.length > 0 ? (
                <ul className="space-y-2">
                  {teamMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 min-w-0">
                      {m.isLeader ? (
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">{m.name}</span>
                      {(m.department || m.position) && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {[m.department, m.position].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">팀원 정보를 불러오는 중입니다.</p>
              )}
            </>
          )}
        </Card>

        {/* 다음 일정 D-day */}
        <Card title="다음 일정">
          {nextMilestone && ddayValue !== null ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{nextMilestone.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{nextMilestone.date}</p>
                </div>
                <span className="text-3xl font-black text-indigo-600 shrink-0 tabular-nums">
                  {formatDday(ddayValue)}
                </span>
              </div>
              <div className="flex items-center mt-1">
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
              <div className="flex justify-end mt-2">
                <Link
                  to="/participant/schedule"
                  className="flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
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
                to="/participant/schedule"
                className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
              >
                일정 확인 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ── ③ 최근 공지사항 ── */}
      <Card
        title="최근 공지사항"
        headerRight={
          <Link
            to="/participant/notices"
            className="flex items-center gap-0.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
          >
            전체 보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {recentNotices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">등록된 공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentNotices.map((notice) => (
              <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  to={`/participant/notices#${notice.id}`}
                  className="block hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {notice.date === todayStr && (
                      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                        NEW
                      </span>
                    )}
                    <p className="text-sm font-medium text-gray-800 truncate">{notice.title}</p>
                    <span className="text-xs text-gray-400 shrink-0 ml-auto">{notice.date}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1 whitespace-pre-line">
                    {notice.content}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ParticipantLayout>
  );
}
