import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { useScores } from '../../hooks/useScores';
import { useSettings } from '../../hooks/useSettings';
import { SCORE_CRITERIA } from '../../data/scoreStore';
import { Clock, Star, Trophy } from 'lucide-react';

export default function ParticipantScores() {
  const { team, loading } = useCurrentParticipant();
  const allScores = useScores();
  const settings = useSettings();

  const criteriaMax: Record<string, number> = {
    creativity: settings.creativityMax,
    practicality: settings.practicalityMax,
    completion: settings.completionMax,
    presentation: settings.presentationMax,
  };

  const myScore = team ? allScores.find((s) => s.teamId === team.id) : undefined;
  const scoredTeams = allScores
    .filter((s) => s.judgeCount > 0)
    .sort((a, b) => b.total - a.total);
  const totalScoredTeams = scoredTeams.length;
  const myRank =
    myScore && myScore.judgeCount > 0
      ? scoredTeams.filter((s) => s.total > myScore.total).length + 1
      : null;

  if (loading) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      <Card title="평가 결과">
        {!settings.scoresPublished ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <Clock className="w-6 h-6 text-gray-300 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-500">결과 미공개</p>
              <p className="text-xs text-gray-400 mt-0.5">심사가 완료되면 관리자가 결과를 공개합니다.</p>
            </div>
          </div>
        ) : !myScore || myScore.judgeCount === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Star className="w-6 h-6 text-blue-300 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-600">심사 진행 중</p>
              <p className="text-xs text-blue-400 mt-0.5">아직 평가가 완료되지 않았습니다.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100 mb-4">
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-200 shrink-0">
                <Trophy className="w-4 h-4 text-amber-500 mb-0.5" />
                <span className="text-lg font-bold text-amber-700 leading-none">{myRank}</span>
                <span className="text-xs text-amber-600 leading-none">등</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {myScore.total}
                  <span className="text-sm font-normal text-gray-400 ml-1">/ 100점</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{totalScoredTeams}개 팀 중 {myRank}위</p>
              </div>
            </div>
            <div className="space-y-3">
              {SCORE_CRITERIA.map(({ key, label }) => {
                const max = criteriaMax[key];
                const score = myScore[key];
                const pct = max > 0 ? Math.round((score / max) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{label}</span>
                      <span className="text-xs font-medium text-gray-700">{score} / {max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-right">
              심사위원 {myScore.judgeCount}명 평가 기준
            </p>
          </div>
        )}
      </Card>
    </ParticipantLayout>
  );
}
