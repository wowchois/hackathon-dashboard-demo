import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useParticipants } from '../../hooks/useParticipants';
import { useTeams } from '../../hooks/useTeams';
import {
  addParticipant,
  updateParticipant,
  deleteParticipant,
  addTeam,
  updateTeam,
  deleteTeam,
  toggleTeamLock,
  autoMatch,
} from '../../data/hackathonStore';
import type { AutoMatchOptions } from '../../data/hackathonStore';
import type { Participant } from '../../data/mockData';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Users,
  X,
  Shuffle,
} from 'lucide-react';

type Tab = 'participants' | 'teams';

interface ParticipantFormState {
  name: string;
  email: string;
  team: string;
  department: string;
  position: string;
  status: 'approved' | 'pending' | 'rejected';
}

interface TeamFormState {
  name: string;
  idea: string;
}

const EMPTY_P_FORM: ParticipantFormState = {
  name: '',
  email: '',
  team: '',
  department: '',
  position: '',
  status: 'pending',
};

const EMPTY_T_FORM: TeamFormState = { name: '', idea: '' };

// ── 토스트 ────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  message: string;
}

function Toast({ toast, onHide }: { toast: ToastState; onHide: () => void }) {
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, onHide]);

  if (!toast.visible) return null;

  return (
    <div
      className="fixed z-[100] bottom-6 bg-gray-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg"
      style={{ left: 'calc(50% + 120px)', transform: 'translateX(-50%)' }}
    >
      {toast.message}
    </div>
  );
}

// ── FormField 헬퍼 ────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-[#80766b]/30'
  }`;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function Participants() {
  const participants = useParticipants();
  const teams = useTeams();

  const [tab, setTab] = useState<Tab>('participants');
  const [search, setSearch] = useState('');

  // ── 참가자 모달 상태 ──────────────────────────────────────
  const [pModal, setPModal] = useState<
    { mode: 'add' } | { mode: 'edit'; id: string } | null
  >(null);
  const [pForm, setPForm] = useState<ParticipantFormState>(EMPTY_P_FORM);
  const [pErrors, setPErrors] = useState<Partial<ParticipantFormState>>({});

  // ── 팀 모달 상태 ──────────────────────────────────────────
  const [tModal, setTModal] = useState<
    { mode: 'add' } | { mode: 'edit'; id: string } | null
  >(null);
  const [tForm, setTForm] = useState<TeamFormState>(EMPTY_T_FORM);
  const [tErrors, setTErrors] = useState<Partial<TeamFormState>>({});

  // ── 자동 매칭 상태 ────────────────────────────────────────
  const [matchOptions, setMatchOptions] = useState<AutoMatchOptions>({
    teamSize: 4,
    spreadDepartment: true,
    spreadPosition: true,
    limitLeader: true,
  });
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });

  // ── 참가자 필터 ──────────────────────────────────────────
  const filtered = participants.filter((p) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      p.name.includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.department.includes(q)
    );
  });

  const teamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.name ?? (teamId ? '(알 수 없음)' : '-');

  const isInLockedTeam = (p: Participant) => {
    const team = teams.find((t) => t.id === p.team);
    return !!team?.locked;
  };

  // ── 참가자 모달 ──────────────────────────────────────────
  const openPAdd = () => {
    setPForm(EMPTY_P_FORM);
    setPErrors({});
    setPModal({ mode: 'add' });
  };

  const openPEdit = (p: Participant) => {
    setPForm({
      name: p.name,
      email: p.email,
      team: p.team,
      department: p.department,
      position: p.position,
      status: p.status,
    });
    setPErrors({});
    setPModal({ mode: 'edit', id: p.id });
  };

  const closePModal = () => setPModal(null);

  const validateP = (): boolean => {
    const next: Partial<ParticipantFormState> = {};
    if (!pForm.name.trim()) next.name = '이름을 입력하세요';
    if (!pForm.email.trim()) next.email = '이메일을 입력하세요';
    setPErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePSubmit = async () => {
    if (!validateP()) return;
    try {
      const data = {
        name: pForm.name.trim(),
        email: pForm.email.trim(),
        team: pForm.team,
        department: pForm.department.trim(),
        position: pForm.position.trim(),
        status: pForm.status,
      };
      if (pModal?.mode === 'add') {
        await addParticipant(data);
      } else if (pModal?.mode === 'edit') {
        await updateParticipant(pModal.id, data);
      }
      closePModal();
    } catch {
      setToast({ visible: true, message: '저장 중 오류가 발생했습니다' });
    }
  };

  const setPField = (key: keyof ParticipantFormState, value: string) => {
    setPForm((prev) => ({ ...prev, [key]: value }));
    if (pErrors[key]) setPErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleDeleteParticipant = async (id: string) => {
    const p = participants.find((pp) => pp.id === id);
    const team = teams.find((t) => t.id === p?.team);
    if (team?.locked) {
      setToast({ visible: true, message: '잠긴 팀 소속 참가자는 삭제할 수 없습니다' });
      return;
    }
    try {
      await deleteParticipant(id);
    } catch {
      setToast({ visible: true, message: '삭제 중 오류가 발생했습니다' });
    }
  };

  // 수정 모달에서: 현재 팀이 잠겨있으면 팀 select 비활성화
  const editingParticipant =
    pModal?.mode === 'edit'
      ? participants.find((p) => p.id === pModal.id)
      : null;
  const currentTeamLocked = editingParticipant
    ? (teams.find((t) => t.id === editingParticipant.team)?.locked ?? false)
    : false;

  // ── 팀 모달 ──────────────────────────────────────────────
  const openTAdd = () => {
    setTForm(EMPTY_T_FORM);
    setTErrors({});
    setTModal({ mode: 'add' });
  };

  const openTEdit = (teamId: string) => {
    const t = teams.find((t) => t.id === teamId);
    if (!t) return;
    setTForm({ name: t.name, idea: t.idea });
    setTErrors({});
    setTModal({ mode: 'edit', id: teamId });
  };

  const closeTModal = () => setTModal(null);

  const validateT = (): boolean => {
    const next: Partial<TeamFormState> = {};
    if (!tForm.name.trim()) next.name = '팀 이름을 입력하세요';
    setTErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleTSubmit = async () => {
    if (!validateT()) return;
    const t = tModal?.mode === 'edit' ? teams.find((t) => t.id === (tModal as { mode: 'edit'; id: string }).id) : null;
    if (t?.locked) {
      setToast({ visible: true, message: '잠긴 팀은 수정할 수 없습니다' });
      closeTModal();
      return;
    }
    try {
      if (tModal?.mode === 'add') {
        await addTeam({ name: tForm.name.trim(), idea: tForm.idea.trim() });
      } else if (tModal?.mode === 'edit') {
        await updateTeam(tModal.id, { name: tForm.name.trim(), idea: tForm.idea.trim() });
      }
      closeTModal();
    } catch {
      setToast({ visible: true, message: '저장 중 오류가 발생했습니다' });
    }
  };

  const handleDeleteTeam = async (id: string) => {
    const team = teams.find((t) => t.id === id);
    if (team?.locked) {
      setToast({ visible: true, message: '잠긴 팀은 삭제할 수 없습니다' });
      return;
    }
    try {
      await deleteTeam(id);
    } catch {
      setToast({ visible: true, message: '팀 삭제 중 오류가 발생했습니다' });
    }
  };

  // ── 자동 매칭 ────────────────────────────────────────────
  const handleAutoMatch = async () => {
    try {
      const result = await autoMatch(matchOptions);
      setToast({
        visible: true,
        message: `${result.matched}명 매칭 완료, ${result.unmatched}명 미배정`,
      });
    } catch {
      setToast({ visible: true, message: '자동 매칭 중 오류가 발생했습니다' });
    }
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const isPFormValid = pForm.name.trim() && pForm.email.trim();

  return (
    <AdminLayout>
      <Toast toast={toast} onHide={hideToast} />

      {/* ── 탭 ── */}
      <div className="flex border-b border-gray-200 mb-5">
        {(['participants', 'teams'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#fcaf17] text-[#80766b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'participants'
              ? `참가자 목록 (${participants.length})`
              : `팀 목록 (${teams.length})`}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <ParticipantsTab
          filtered={filtered}
          search={search}
          setSearch={setSearch}
          teamName={teamName}
          isInLockedTeam={isInLockedTeam}
          onAdd={openPAdd}
          onEdit={openPEdit}
          onDelete={handleDeleteParticipant}
        />
      ) : (
        <TeamsTab
          teams={teams}
          participants={participants}
          matchOptions={matchOptions}
          setMatchOptions={setMatchOptions}
          onAutoMatch={handleAutoMatch}
          onAddTeam={openTAdd}
          onEditTeam={openTEdit}
          onDeleteTeam={handleDeleteTeam}
          onToggleLock={(id) => toggleTeamLock(id, teams.find((t) => t.id === id)?.locked ?? false)}
        />
      )}

      {/* ── 참가자 추가/수정 모달 ── */}
      {pModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800">
                {pModal.mode === 'add' ? '참가자 추가' : '참가자 정보 수정'}
              </h3>
              <button
                onClick={closePModal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="이름" required error={pErrors.name}>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={pForm.name}
                  onChange={(e) => setPField('name', e.target.value)}
                  className={inputClass(!!pErrors.name)}
                />
              </FormField>

              <FormField label="이메일" required error={pErrors.email}>
                <input
                  type="email"
                  placeholder="example@company.com"
                  value={pForm.email}
                  onChange={(e) => setPField('email', e.target.value)}
                  className={inputClass(!!pErrors.email)}
                />
              </FormField>

              <FormField label="팀">
                <select
                  value={pForm.team}
                  onChange={(e) => setPField('team', e.target.value)}
                  disabled={currentTeamLocked}
                  className={`${inputClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">팀 선택 (선택사항)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.locked ? ' (잠김)' : ''}
                    </option>
                  ))}
                </select>
                {currentTeamLocked && (
                  <p className="text-xs text-amber-500 mt-1">
                    잠긴 팀 소속 참가자의 팀은 변경할 수 없습니다
                  </p>
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="부서">
                  <input
                    type="text"
                    placeholder="개발팀"
                    value={pForm.department}
                    onChange={(e) => setPField('department', e.target.value)}
                    className={inputClass(false)}
                  />
                </FormField>
                <FormField label="직급">
                  <input
                    type="text"
                    placeholder="대리"
                    value={pForm.position}
                    onChange={(e) => setPField('position', e.target.value)}
                    className={inputClass(false)}
                  />
                </FormField>
              </div>

              <FormField label="상태">
                <select
                  value={pForm.status}
                  onChange={(e) =>
                    setPField('status', e.target.value as ParticipantFormState['status'])
                  }
                  className={inputClass(false)}
                >
                  <option value="pending">대기</option>
                  <option value="approved">승인</option>
                  <option value="rejected">거절</option>
                </select>
              </FormField>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={closePModal}
                className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handlePSubmit}
                disabled={!isPFormValid}
                className="flex-1 py-2.5 text-sm text-white bg-[#80766b] rounded-xl hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {pModal.mode === 'add' ? '추가' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 팀 추가/수정 모달 ── */}
      {tModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeTModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800">
                {tModal.mode === 'add' ? '팀 추가' : '팀 정보 수정'}
              </h3>
              <button
                onClick={closeTModal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="팀 이름" required error={tErrors.name}>
                <input
                  type="text"
                  placeholder="5조"
                  value={tForm.name}
                  onChange={(e) => {
                    setTForm((prev) => ({ ...prev, name: e.target.value }));
                    if (tErrors.name) setTErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={inputClass(!!tErrors.name)}
                />
              </FormField>

              <FormField label="아이디어">
                <textarea
                  placeholder="팀 아이디어를 입력하세요"
                  value={tForm.idea}
                  onChange={(e) => setTForm((prev) => ({ ...prev, idea: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 transition-colors resize-none"
                />
              </FormField>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={closeTModal}
                className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleTSubmit}
                disabled={!tForm.name.trim()}
                className="flex-1 py-2.5 text-sm text-white bg-[#80766b] rounded-xl hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {tModal.mode === 'add' ? '추가' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── 참가자 탭 ─────────────────────────────────────────────────

import type { Team } from '../../data/hackathonStore';

function ParticipantsTab({
  filtered,
  search,
  setSearch,
  teamName,
  isInLockedTeam,
  onAdd,
  onEdit,
  onDelete,
}: {
  filtered: Participant[];
  search: string;
  setSearch: (v: string) => void;
  teamName: (id: string) => string;
  isInLockedTeam: (p: Participant) => boolean;
  onAdd: () => void;
  onEdit: (p: Participant) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 이메일, 부서 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
          />
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">참가자 추가</span>
        </button>
      </div>

      {/* 데스크탑 테이블 */}
      <div className="hidden sm:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <th className="pb-3 pr-4">이름</th>
                  <th className="pb-3 pr-4">이메일</th>
                  <th className="pb-3 pr-4">팀</th>
                  <th className="pb-3 pr-4">부서</th>
                  <th className="pb-3 pr-4">직급</th>
                  <th className="pb-3 pr-4 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => {
                  const locked = isInLockedTeam(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-3 pr-4 font-medium text-gray-800">{p.name}</td>
                      <td className="py-3 pr-4 text-gray-500">{p.email}</td>
                      <td className="py-3 pr-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          {teamName(p.team)}
                          {locked && <Lock className="w-3 h-3 text-amber-500" />}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{p.department}</td>
                      <td className="py-3 pr-4 text-gray-500">{p.position}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => onEdit(p)}
                            className="p-1.5 text-gray-300 hover:text-[#80766b] hover:bg-[#80766b]/10 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <div className="relative group/del">
                            <button
                              onClick={() => onDelete(p.id)}
                              disabled={locked}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={locked ? '잠긴 팀 소속 참가자는 삭제할 수 없습니다' : '삭제'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {locked && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/del:block w-max max-w-xs bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none z-10">
                                잠긴 팀 소속 참가자는 삭제할 수 없습니다
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
            )}
          </div>
        </Card>
      </div>

      {/* 모바일 카드 */}
      <div className="sm:hidden space-y-3">
        {filtered.map((p) => {
          const locked = isInLockedTeam(p);
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{p.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-gray-500">{teamName(p.team)}</p>
                    {locked && <Lock className="w-3 h-3 text-amber-500" />}
                  </div>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">{p.department}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.position}</p>
                  </div>
                  <button
                    onClick={() => onEdit(p)}
                    className="p-1.5 text-gray-400 hover:text-[#80766b] hover:bg-[#80766b]/10 rounded-lg transition-colors"
                    title="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    disabled={locked}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={locked ? '잠긴 팀 소속 참가자는 삭제할 수 없습니다' : '삭제'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
        )}
      </div>
    </>
  );
}

// ── 팀 탭 ─────────────────────────────────────────────────────

function TeamsTab({
  teams,
  participants,
  matchOptions,
  setMatchOptions,
  onAutoMatch,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onToggleLock,
}: {
  teams: Team[];
  participants: Participant[];
  matchOptions: AutoMatchOptions;
  setMatchOptions: React.Dispatch<React.SetStateAction<AutoMatchOptions>>;
  onAutoMatch: () => void;
  onAddTeam: () => void;
  onEditTeam: (id: string) => void;
  onDeleteTeam: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  return (
    <>
      {/* 자동 매칭 섹션 */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Shuffle className="w-5 h-5 text-[#80766b]" />
          <h3 className="text-sm font-semibold text-gray-700">자동 매칭</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">팀 크기</label>
            <input
              type="number"
              min={1}
              max={20}
              value={matchOptions.teamSize}
              onChange={(e) =>
                setMatchOptions((prev) => ({
                  ...prev,
                  teamSize: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { key: 'spreadDepartment' as const, label: '부서 분산' },
              { key: 'spreadPosition' as const, label: '직급 분산' },
              { key: 'limitLeader' as const, label: '리더급 제한' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={matchOptions[key]}
                  onChange={(e) =>
                    setMatchOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#80766b]"
                />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={onAutoMatch}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#fcaf17] text-white text-sm font-semibold rounded-lg hover:bg-[#e09c10] transition-colors shrink-0"
          >
            <Shuffle className="w-4 h-4" />
            자동 매칭 실행
          </button>
        </div>
      </Card>

      {/* 팀 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onAddTeam}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          팀 추가
        </button>
      </div>

      {/* 팀 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((team) => {
          const members = participants.filter((p) => p.team === team.id);
          return (
            <Card key={team.id} className={team.locked ? 'ring-1 ring-amber-200' : ''}>
              {/* 팀 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{team.name}</h3>
                  {team.locked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-md shrink-0">
                      <Lock className="w-3 h-3" />
                      잠김
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleLock(team.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      team.locked
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title={team.locked ? '잠금 해제' : '잠금'}
                  >
                    {team.locked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onEditTeam(team.id)}
                    disabled={team.locked}
                    className="p-1.5 text-gray-400 hover:text-[#80766b] hover:bg-[#80766b]/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTeam(team.id)}
                    disabled={team.locked}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {team.idea && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{team.idea}</p>
              )}

              {/* 팀원 목록 */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">
                    팀원 {members.length}명
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">배정된 팀원이 없습니다</p>
                ) : (
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-medium text-gray-700">{m.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-gray-400">{m.department}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{m.position}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
