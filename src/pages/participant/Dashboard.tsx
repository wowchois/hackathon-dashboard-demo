import { useState } from 'react';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useParticipants } from '../../hooks/useParticipants';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { useScores } from '../../hooks/useScores';
import { useSettings } from '../../hooks/useSettings';
import { CheckCircle2, Clock, Crown, Lock, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createParticipantWithAuth } from '../../data/hackathonStore';

function Initials({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#80766b]/10 flex items-center justify-center text-[#80766b] font-bold text-sm shrink-0">
      {name.slice(0, 1)}
    </div>
  );
}

interface AddMemberForm {
  name: string;
  email: string;
  department: string;
  position: string;
}

const EMPTY_FORM: AddMemberForm = { name: '', email: '', department: '', position: '' };
const MAX_TEAM_MEMBERS = 5;
const TEAM_MEMBER_LIMIT_MESSAGE = `팀은 최대 ${MAX_TEAM_MEMBERS}명까지 구성할 수 있습니다.`;

export default function ParticipantDashboard() {
  const { data: participants, upsertLocal } = useParticipants();
  const { participant, team, loading } = useCurrentParticipant();
  const allScores = useScores();
  const settings = useSettings();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLockAlert, setShowLockAlert] = useState(false);
  const [form, setForm] = useState<AddMemberForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLeader = participant?.isLeader ?? false;
  const isLocked = team?.locked ?? false;

  const myMembers = team
    ? participants.filter((p) => p.team === team.id)
    : [];

  if (loading) {
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

  const submitStatus = team.submit_status;
  const submitted = submitStatus === 'submitted';

  const myScore = allScores.find((s) => s.teamId === team.id);
  const isEvaluated = settings.scoresPublished && !!myScore && myScore.judgeCount > 0;
  const displayBadgeStatus = isEvaluated ? 'evaluated' : submitStatus;

  const openAddModal = () => {
    if (myMembers.length >= MAX_TEAM_MEMBERS) {
      setError(TEAM_MEMBER_LIMIT_MESSAGE);
      setShowAddModal(true);
      return;
    }

    setForm(EMPTY_FORM);
    setError('');
    setShowAddModal(true);
  };

  const handleAddMember = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('이름과 이메일은 필수입니다.');
      return;
    }
    if (myMembers.length >= MAX_TEAM_MEMBERS) {
      setError(TEAM_MEMBER_LIMIT_MESSAGE);
      return;
    }
    const emailLower = form.email.trim().toLowerCase();
    if (participants.some((p) => p.email.toLowerCase() === emailLower)) {
      setError('이미 등록된 이메일입니다.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const createdParticipant = await createParticipantWithAuth({
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
        team: team.id,
        status: 'pending',
        isLeader: false,
      });
      upsertLocal(createdParticipant);
      setShowAddModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '팀원 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ParticipantLayout>
      {/* ── 팀 헤더 카드 ── */}
      <Card className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{team.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">팀원 {myMembers.length}명</p>
          </div>
          <Badge status={displayBadgeStatus} />
        </div>
        {isEvaluated && (
          <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-indigo-600">
            <Link to="/participant/scores" className="font-medium underline underline-offset-2">
              🏆 심사가 완료됐어요. 우리 팀 순위 보러 가기
            </Link>
          </p>
        )}
      </Card>

      {/* ── 팀원 목록 ── */}
      <Card
        title="팀원 목록"
        className="mb-5"
        headerRight={
          isLeader ? (
            <button
              onClick={isLocked ? () => setShowLockAlert(true) : openAddModal}
              disabled={false}
              className={`flex items-center gap-1 text-xs font-medium ${
                isLocked
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#80766b] hover:text-[#6e645a]'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              팀원 추가
            </button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <Initials name={member.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-800">{member.name}</p>
                  {member.isLeader && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      <Crown className="w-3 h-3" />
                      팀장
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{member.email}</p>
              </div>
              <Badge status={member.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── 팀 아이디어 ── */}
      <Card title="팀 아이디어" className="mb-5">
        <p className="text-sm text-gray-600 leading-relaxed">{team.idea}</p>
      </Card>

      {/* ── 제출 현황 요약 ── */}
      <Card title="제출 현황" className="mb-5">
        <div
          className={`flex items-center gap-4 p-4 rounded-xl border ${
            submitted
              ? 'bg-green-50 border-green-100'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          {submitted ? (
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          ) : (
            <Clock className="w-8 h-8 text-gray-400 shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${submitted ? 'text-green-800' : 'text-gray-600'}`}>
              {submitted ? '제출 완료' : '아직 제출하지 않았습니다'}
            </p>
            <p className={`text-xs mt-0.5 ${submitted ? 'text-green-600' : 'text-gray-400'}`}>
              {submitted
                ? '심사위원회에서 검토 중입니다.'
                : '제출하기 메뉴에서 결과물을 제출해주세요.'}
            </p>
          </div>
        </div>
      </Card>

      {/* ── 팀 잠금 알림 팝업 ── */}
      {showLockAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-gray-500 shrink-0" />
              <h2 className="text-base font-semibold text-gray-800">팀 잠금</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              잠금된 팀에는 팀원을 추가할 수 없습니다. 관리자에게 문의하세요.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowLockAlert(false)}
                className="rounded-lg bg-[#80766b] px-4 py-2 text-sm font-medium text-white hover:bg-[#6e645a]"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 팀원 추가 모달 (팀장 전용) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">팀원 추가</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: '이름', key: 'name', placeholder: '홍길동', required: true },
                { label: '이메일', key: 'email', placeholder: 'hong@example.com', required: true },
                { label: '부서', key: 'department', placeholder: '개발팀', required: false },
                { label: '직급', key: 'position', placeholder: '대리', required: false },
              ].map(({ label, key, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {label}{required && <span className="ml-0.5 text-red-400">*</span>}
                  </label>
                  <input
                    type={key === 'email' ? 'email' : 'text'}
                    placeholder={placeholder}
                    value={form[key as keyof AddMemberForm]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                  />
                </div>
              ))}
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleAddMember}
                disabled={saving}
                className="rounded-lg bg-[#80766b] px-4 py-2 text-sm font-medium text-white hover:bg-[#6e645a] disabled:opacity-40"
              >
                {saving ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ParticipantLayout>
  );
}
