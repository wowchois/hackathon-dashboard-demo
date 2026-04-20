import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import { useMilestones } from '../../hooks/useMilestones';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

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

export default function Timeline() {
  const { data: allMilestones } = useMilestones();
  const milestones = allMilestones.filter((m) => m.isPublic);

  const doneMilestones = milestones.filter((m) => m.isDone);
  const progress = milestones.length > 0
    ? Math.round((doneMilestones.length / milestones.length) * 100)
    : 0;

  // 첫 번째 미완료 마일스톤 = 현재 진행 중
  const currentIdx = milestones.findIndex((m) => !m.isDone);
  const nextMilestone = currentIdx !== -1 ? milestones[currentIdx] : null;
  const ddayValue = nextMilestone ? getDday(nextMilestone.date) : null;

  return (
    <ParticipantLayout>
      {/* ── D-day 카드 ── */}
      {nextMilestone && ddayValue !== null ? (
        <div className="bg-indigo-600 rounded-2xl p-6 mb-6 text-white text-center">
          <p className="text-sm font-medium text-indigo-200 mb-1">다음 마일스톤까지</p>
          <p className="text-6xl sm:text-7xl font-black tracking-tight mb-2">
            {formatDday(ddayValue)}
          </p>
          <p className="text-indigo-100 font-medium">{nextMilestone.title}</p>
          <p className="text-indigo-300 text-sm mt-0.5">{nextMilestone.date}</p>
        </div>
      ) : (
        <div className="bg-green-600 rounded-2xl p-6 mb-6 text-white text-center">
          <p className="text-5xl font-black mb-2">🎉</p>
          <p className="font-semibold text-lg">모든 일정이 완료됐습니다!</p>
        </div>
      )}

      {/* ── 전체 진행률 ── */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700">전체 진행률</span>
          <span className="text-indigo-600 font-semibold">
            {doneMilestones.length}/{milestones.length} 완료
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{progress}%</p>
      </Card>

      {/* ── 타임라인 리스트 ── */}
      <Card title="전체 일정">
        <ol className="relative">
          {milestones.map((milestone, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = milestone.isDone;
            const isLast = idx === milestones.length - 1;

            return (
              <li key={milestone.id} className="flex gap-4">
                {/* 왼쪽: 선 + 도트 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 z-10 mt-0.5 ${
                      isDone
                        ? 'bg-green-500 border-green-500'
                        : isCurrent
                        ? 'bg-white border-indigo-500 ring-4 ring-indigo-100'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {isDone && (
                      <CheckCircle2 className="w-full h-full text-white" strokeWidth={3} />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full m-auto mt-[3px]" />
                    )}
                    {!isDone && !isCurrent && (
                      <Circle className="w-full h-full text-gray-300" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 my-1 ${
                        isDone ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* 오른쪽: 내용 */}
                <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                  <div
                    className={`rounded-xl p-3 border ${
                      isCurrent
                        ? 'bg-indigo-50 border-indigo-200'
                        : isDone
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium ${
                          isDone
                            ? 'line-through text-gray-400'
                            : isCurrent
                            ? 'text-indigo-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {milestone.title}
                      </p>
                      {isCurrent && (
                        <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          진행 중
                        </span>
                      )}
                      {isDone && (
                        <span className="text-xs text-green-600 font-medium shrink-0">완료</span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        isDone ? 'text-gray-300' : isCurrent ? 'text-indigo-400' : 'text-gray-400'
                      }`}
                    >
                      {milestone.date}
                    </p>
                    {milestone.description && (
                      <p className={`text-xs mt-1 leading-relaxed ${isDone ? 'text-gray-300' : 'text-gray-400'}`}>
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </ParticipantLayout>
  );
}
