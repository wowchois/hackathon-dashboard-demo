import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useTeams } from '../../hooks/useTeams';
import { FileCheck, ExternalLink, Clock, AlertCircle } from 'lucide-react';

interface SubmissionDetail {
  github: string;
  slides: string;
  submittedAt: string;
}

const SUBMISSION_DETAILS: Record<string, SubmissionDetail> = {
  t1: {
    github: 'https://github.com/team-alpha/disaster-response',
    slides: 'https://docs.example.com/alpha-slides',
    submittedAt: '2025-04-20 14:23',
  },
  t2: {
    github: 'https://github.com/team-beta/carbon-tracker',
    slides: 'https://docs.example.com/beta-slides',
    submittedAt: '2025-04-20 13:47',
  },
  t3: {
    github: 'https://github.com/team-gamma/local-market',
    slides: 'https://docs.example.com/gamma-slides',
    submittedAt: '2025-04-20 15:02',
  },
};

export default function Submissions() {
  const teams = useTeams();
  const submittedCount = teams.filter((t) => t.submitStatus === 'submitted').length;
  const total = teams.length;

  return (
    <AdminLayout>
      {/* ── 요약 배너 ── */}
      <div
        className={`flex items-center gap-4 rounded-xl border px-5 py-4 mb-6 ${
          submittedCount === total
            ? 'bg-green-50 border-green-100'
            : 'bg-indigo-50 border-indigo-100'
        }`}
      >
        <FileCheck
          className={`w-9 h-9 shrink-0 ${
            submittedCount === total ? 'text-green-500' : 'text-indigo-500'
          }`}
        />
        <div>
          <p
            className={`font-semibold text-base ${
              submittedCount === total ? 'text-green-800' : 'text-indigo-800'
            }`}
          >
            제출 완료 {submittedCount}/{total}팀
          </p>
          <p
            className={`text-xs mt-0.5 ${
              submittedCount === total ? 'text-green-600' : 'text-indigo-500'
            }`}
          >
            {submittedCount === total
              ? '모든 팀이 제출을 완료했습니다.'
              : `${total - submittedCount}팀이 아직 제출하지 않았습니다.`}
          </p>
        </div>
        {/* 진행률 */}
        <div className="ml-auto hidden sm:block text-right">
          <p
            className={`text-2xl font-bold ${
              submittedCount === total ? 'text-green-600' : 'text-indigo-600'
            }`}
          >
            {total > 0 ? Math.round((submittedCount / total) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400">완료율</p>
        </div>
      </div>

      {/* ── 팀별 카드 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((team) => {
          const submitted = team.submitStatus === 'submitted';
          const detail = SUBMISSION_DETAILS[team.id];

          return (
            <Card key={team.id} className={submitted ? '' : 'opacity-60'}>
              {/* 팀 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{team.name}</h3>
                <Badge status={team.submitStatus} />
              </div>

              {submitted && detail ? (
                <div className="space-y-3">
                  {/* 제출 시각 */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{detail.submittedAt} 제출</span>
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {/* GitHub */}
                    <a
                      href={detail.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-indigo-50 transition-colors shrink-0">
                        <svg
                          className="w-4 h-4 text-gray-600 group-hover:text-indigo-600"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      </span>
                      <span className="flex-1 font-medium">GitHub 저장소</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    </a>

                    {/* Slides */}
                    <a
                      href={detail.slides}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-indigo-50 transition-colors shrink-0">
                        <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                      </span>
                      <span className="flex-1 font-medium">발표 자료</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>아직 제출하지 않은 팀입니다.</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
