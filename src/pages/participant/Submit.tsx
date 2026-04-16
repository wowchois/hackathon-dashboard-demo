import { useState, useEffect } from 'react';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { apiFetchSubmission, apiUpsertSubmission } from '../../api/submissions';
import type { Submission } from '../../api/submissions';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

function getSafeHttpsHref(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getUrlError(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label}을 입력해 주세요.`;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return `${label}은 https URL만 사용할 수 있습니다.`;
    }
    return null;
  } catch {
    return `${label} 형식이 올바르지 않습니다.`;
  }
}

export default function Submit() {
  const { team, loading: teamLoading } = useCurrentParticipant();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);

  const [github, setGithub] = useState('');
  const [slides, setSlides] = useState('');
  const [description, setDescription] = useState('');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [slidesError, setSlidesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!team?.id) return;
    setLoadingSubmission(true);
    apiFetchSubmission(team.id)
      .then((data) => {
        setSubmission(data);
        if (data) {
          setGithub(data.githubUrl);
          setSlides(data.slidesUrl);
          setDescription(data.description);
          setGithubError(null);
          setSlidesError(null);
        }
      })
      .finally(() => setLoadingSubmission(false));
  }, [team?.id]);

  const submitted = submission !== null;
  const isFormValid = github.trim() && slides.trim() && description.trim();
  const githubHref = submission ? getSafeHttpsHref(submission.githubUrl) : null;
  const slidesHref = submission ? getSafeHttpsHref(submission.slidesUrl) : null;

  const handleSubmit = async () => {
    if (!isFormValid || !team?.id) return;

    const nextGithubError = getUrlError(github, 'GitHub URL');
    const nextSlidesError = getUrlError(slides, '발표 자료 URL');
    setGithubError(nextGithubError);
    setSlidesError(nextSlidesError);
    if (nextGithubError || nextSlidesError) return;

    setSaving(true);
    try {
      await apiUpsertSubmission(team.id, {
        githubUrl: github.trim(),
        slidesUrl: slides.trim(),
        description: description.trim(),
      });
      const updated = await apiFetchSubmission(team.id);
      setSubmission(updated);
    } catch {
      console.error('제출 실패');
    } finally {
      setSaving(false);
    }
  };

  if (teamLoading) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      </ParticipantLayout>
    );
  }

  if (!team) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">아직 지정된 팀이 없습니다.</p>
      </ParticipantLayout>
    );
  }

  if (loadingSubmission) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      {/* ── 현재 제출 상태 ── */}
      <div
        className={`flex items-center gap-4 rounded-xl border px-5 py-4 mb-6 ${
          submitted ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'
        }`}
      >
        {submitted ? (
          <CheckCircle2 className="w-9 h-9 text-green-500 shrink-0" />
        ) : (
          <AlertCircle className="w-9 h-9 text-gray-400 shrink-0" />
        )}
        <div>
          <p className={`font-semibold ${submitted ? 'text-green-800' : 'text-gray-700'}`}>
            {submitted ? '제출 완료' : '미제출'}
          </p>
          <p className={`text-xs mt-0.5 ${submitted ? 'text-green-600' : 'text-gray-400'}`}>
            {submitted ? `${submission!.submittedAt} 제출됨` : '아직 제출하지 않았습니다.'}
          </p>
        </div>
      </div>

      {/* ── 제출 완료 상태 ── */}
      {submitted ? (
        <>
          <Card title="제출 내역" className="mb-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">GitHub 저장소</p>
                {githubHref ? (
                  <a
                    href={githubHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#80766b] hover:underline break-all"
                  >
                    {submission!.githubUrl}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-red-600 break-all">{submission!.githubUrl}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">발표 자료</p>
                {slidesHref ? (
                  <a
                    href={slidesHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#80766b] hover:underline break-all"
                  >
                    {submission!.slidesUrl}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-red-600 break-all">{submission!.slidesUrl}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">프로젝트 설명</p>
                <p className="text-sm text-gray-700 leading-relaxed">{submission!.description}</p>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p>
              제출 내용 수정이 필요한 경우 운영진에게 문의해주세요.
              <br />
              <span className="text-amber-600 text-xs">contact@hackathon2026.com</span>
            </p>
          </div>
        </>
      ) : (
        <>
          {/* ── 주의사항 ── */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <ul className="space-y-1 text-xs leading-relaxed">
              <li>• GitHub 저장소는 <strong>public</strong>으로 설정해주세요.</li>
              <li>• 발표 자료는 심사위원이 접근 가능한 링크여야 합니다.</li>
              <li>• 제출 후 수정은 운영진에게 별도 문의가 필요합니다.</li>
              <li>• 제출 마감 이후 접수된 결과물은 심사에서 제외될 수 있습니다.</li>
            </ul>
          </div>

          {/* ── 제출 폼 ── */}
          <Card title="결과물 제출">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  GitHub URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/your-team/project"
                  value={github}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGithub(value);
                    setGithubError(getUrlError(value, 'GitHub URL'));
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 placeholder-gray-300"
                />
                {githubError && <p className="mt-1 text-xs text-red-600">{githubError}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  발표 자료 URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://slides.example.com/your-presentation"
                  value={slides}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSlides(value);
                    setSlidesError(getUrlError(value, '발표 자료 URL'));
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 placeholder-gray-300"
                />
                {slidesError && <p className="mt-1 text-xs text-red-600">{slidesError}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  프로젝트 설명 <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="프로젝트 소개, 주요 기능, 기술 스택 등을 간략히 설명해주세요."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 placeholder-gray-300 resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || saving}
                className="w-full py-2.5 bg-[#80766b] text-white text-sm font-semibold rounded-lg hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </Card>
        </>
      )}
    </ParticipantLayout>
  );
}
