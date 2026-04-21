import { useState, useCallback } from 'react';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import { useMilestones } from '../../hooks/useMilestones';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { useMyAttendances } from '../../hooks/useMyAttendances';
import { apiVoteAttendance } from '../../api/attendances';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

// ── 투표 가능 기간 유틸 (KST 기준) ────────────────────────────

function getVotingOpenTime(dateStr: string): Date {
  const kstMidnight = new Date(`${dateStr}T00:00:00+09:00`);
  return new Date(kstMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
}

function getVotingCloseTime(dateStr: string): Date {
  // 정오 KST(03:00 UTC)로 파싱하면 UTC 날짜와 KST 날짜가 동일해 getUTCDay()로 요일 판단 가능
  const dayOfWeek = new Date(`${dateStr}T12:00:00+09:00`).getUTCDay(); // 0=일, 6=토
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const closeHour = isWeekend ? 10 : 18;
  return new Date(`${dateStr}T${String(closeHour).padStart(2, '0')}:00:00+09:00`);
}

function isVotingOpen(dateStr: string): boolean {
  const now = new Date();
  return now >= getVotingOpenTime(dateStr) && now <= getVotingCloseTime(dateStr);
}

function getVoteDeadlineLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+09:00`);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = d.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  return `${month}/${day}(${weekdays[dow]}) ${isWeekend ? '오전 10시' : '오후 6시'}`;
}

// ── D-day 유틸 ────────────────────────────────────────────────

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

// ── 메인 컴포넌트 ────────────────────────────────────────────

export default function Timeline() {
  const { data: allMilestones } = useMilestones();
  const { participant } = useCurrentParticipant();
  const attendanceMap = useMyAttendances(participant?.id);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 투표 완료 후 잠금 해제(재투표) 요청된 milestoneId Set
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  // 낙관적 업데이트: 서버 응답 즉시 UI에 반영
  const [localVotes, setLocalVotes] = useState<Map<string, boolean>>(new Map());

  const milestones = allMilestones.filter((m) => m.isPublic);
  const doneMilestones = milestones.filter((m) => m.isDone);
  const progress = milestones.length > 0
    ? Math.round((doneMilestones.length / milestones.length) * 100)
    : 0;

  const currentIdx = milestones.findIndex((m) => !m.isDone);
  const nextMilestone = currentIdx !== -1 ? milestones[currentIdx] : null;
  const ddayValue = nextMilestone ? getDday(nextMilestone.date) : null;

  const getMyVote = (id: string): boolean | undefined =>
    localVotes.has(id) ? localVotes.get(id) : attendanceMap.get(id);
  const getHasVote = (id: string): boolean =>
    localVotes.has(id) || attendanceMap.has(id);

  const handleVote = useCallback(async (milestoneId: string, attending: boolean) => {
    if (savingId) return;
    setSavingId(milestoneId);
    setErrorMsg(null);
    try {
      await apiVoteAttendance(milestoneId, attending);
      // 낙관적 업데이트 + 잠금
      setLocalVotes((prev) => new Map(prev).set(milestoneId, attending));
      setRetryingIds((prev) => { const next = new Set(prev); next.delete(milestoneId); return next; });
      setSuccessMsg('투표되었습니다.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '투표에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  }, [savingId]);

  const handleRetry = useCallback((milestoneId: string) => {
    setRetryingIds((prev) => new Set(prev).add(milestoneId));
  }, []);

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
            const votingOpen = isVotingOpen(milestone.date);
            const myVote = getMyVote(milestone.id);
            const hasVote = getHasVote(milestone.id);
            const isSaving = savingId === milestone.id;
            // 투표 완료 후 잠금 상태: 재투표 버튼 표시
            const isLocked = votingOpen && hasVote && !retryingIds.has(milestone.id);

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
                    {isDone && <CheckCircle2 className="w-full h-full text-white" strokeWidth={3} />}
                    {isCurrent && <div className="w-2 h-2 bg-indigo-500 rounded-full m-auto mt-[3px]" />}
                    {!isDone && !isCurrent && <Circle className="w-full h-full text-gray-300" />}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
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
                    {/* 제목 + 상태 배지 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium ${
                          isDone ? 'line-through text-gray-400' : isCurrent ? 'text-indigo-700' : 'text-gray-700'
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
                      {isDone && <span className="text-xs text-green-600 font-medium shrink-0">완료</span>}
                    </div>

                    {/* 날짜 */}
                    <p className={`text-xs mt-1 ${isDone ? 'text-gray-300' : isCurrent ? 'text-indigo-400' : 'text-gray-400'}`}>
                      {milestone.date}
                    </p>

                    {/* 설명 */}
                    {milestone.description && (
                      <p className={`text-xs mt-1 leading-relaxed ${isDone ? 'text-gray-300' : 'text-gray-400'}`}>
                        {milestone.description}
                      </p>
                    )}

                    {/* ── 투표 영역 ── */}
                    {(votingOpen || hasVote) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {isLocked ? (
                          /* 투표 완료 잠금: 결과 표시 + 재투표 버튼 */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                  myVote === true
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-50 text-red-500'
                                }`}
                              >
                                {myVote === true ? '✓ 참석' : '✗ 불참'}
                              </span>
                              <span className="text-xs text-gray-400">으로 투표됨</span>
                            </div>
                            <button
                              onClick={() => handleRetry(milestone.id)}
                              className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition-colors"
                            >
                              재투표
                            </button>
                          </div>
                        ) : votingOpen ? (
                          /* 투표 버튼 */
                          <>
                            <p className="text-xs text-gray-400 mb-2">
                              참석 여부 · 마감 {getVoteDeadlineLabel(milestone.date)}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVote(milestone.id, true)}
                                disabled={isSaving}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                  myVote === true
                                    ? 'bg-green-500 text-white'
                                    : 'border border-green-300 text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : '참석'}
                              </button>
                              <button
                                onClick={() => handleVote(milestone.id, false)}
                                disabled={isSaving}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                  myVote === false
                                    ? 'bg-red-400 text-white'
                                    : 'border border-red-200 text-red-400 hover:bg-red-50'
                                }`}
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : '불참'}
                              </button>
                            </div>
                          </>
                        ) : (
                          /* 투표 마감 후 읽기 전용 */
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">내 투표:</span>
                            <span className={`text-xs font-medium ${myVote === true ? 'text-green-600' : 'text-red-400'}`}>
                              {myVote === true ? '참석 ✓' : '불참'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* ── 성공 토스트 ── */}
      {successMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-6 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
          {successMsg}
        </div>
      )}

      {/* ── 에러 토스트 ── */}
      {errorMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-6 z-50 bg-red-500 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
          {errorMsg}
        </div>
      )}
    </ParticipantLayout>
  );
}
