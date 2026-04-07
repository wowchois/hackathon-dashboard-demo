import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { participants as initialParticipants, teams } from '../../data/mockData';
import type { Participant } from '../../data/mockData';
import { Search, Plus, Pencil, X } from 'lucide-react';

type Tab = 'participants' | 'teams';

interface FormState {
  name: string;
  email: string;
  team: string;
  department: string;
  position: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', team: '', department: '', position: '' };

export default function Participants() {
  const [tab, setTab] = useState<Tab>('participants');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<Participant[]>(initialParticipants);

  // 모달 상태: null=닫힘, { mode:'add' } 또는 { mode:'edit', id }
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; id: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const teamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? '-';
  const teamMembers = (teamId: string) => list.filter((p) => p.team === teamId);

  const filtered = list.filter((p) => {
    const q = search.trim().toLowerCase();
    return !q || p.name.includes(q) || p.email.toLowerCase().includes(q) || p.department.includes(q);
  });

  // ── 모달 열기 ────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal({ mode: 'add' });
  };

  const openEdit = (p: Participant) => {
    setForm({ name: p.name, email: p.email, team: p.team, department: p.department, position: p.position });
    setErrors({});
    setModal({ mode: 'edit', id: p.id });
  };

  const closeModal = () => setModal(null);

  // ── 유효성 검사 ──────────────────────────────────────────────
  const validate = (): boolean => {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = '이름을 입력하세요';
    if (!form.email.trim()) next.email = '이메일을 입력하세요';
    if (!form.team) next.team = '팀을 선택하세요';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── 저장 ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;

    if (modal?.mode === 'add') {
      const newP: Participant = {
        id: `p${Date.now()}`,
        name: form.name.trim(),
        email: form.email.trim(),
        team: form.team,
        status: 'pending',
        department: form.department.trim(),
        position: form.position.trim(),
      };
      setList((prev) => [...prev, newP]);
    } else if (modal?.mode === 'edit') {
      const id = modal.id;
      setList((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, name: form.name.trim(), email: form.email.trim(), team: form.team, department: form.department.trim(), position: form.position.trim() }
            : p
        )
      );
    }
    closeModal();
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const isFormValid = form.name.trim() && form.email.trim() && form.team;

  return (
    <AdminLayout>
      {/* ── 탭 ── */}
      <div className="flex border-b border-gray-200 mb-5">
        {(['participants', 'teams'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'participants' ? `참가자 목록 (${list.length})` : `팀 목록 (${teams.length})`}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <>
          {/* ── 검색 + 추가 버튼 ── */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 이메일, 부서 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">참가자 추가</span>
            </button>
          </div>

          {/* ── 데스크탑 테이블 ── */}
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
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-3 pr-4 font-medium text-gray-800">{p.name}</td>
                        <td className="py-3 pr-4 text-gray-500">{p.email}</td>
                        <td className="py-3 pr-4 text-gray-500">{teamName(p.team)}</td>
                        <td className="py-3 pr-4 text-gray-500">{p.department}</td>
                        <td className="py-3 pr-4 text-gray-500">{p.position}</td>
                        <td className="py-3">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ── 모바일 카드 ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{p.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{teamName(p.team)}</p>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">{p.department}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.position}</p>
                    </div>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">검색 결과가 없습니다.</p>
            )}
          </div>
        </>
      ) : (
        /* ── 팀 카드 그리드 ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => {
            const members = teamMembers(team.id);
            return (
              <Card key={team.id}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{team.name}</h3>
                  <span className="text-xs text-gray-400">팀원 {members.length}명</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{team.idea}</p>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {members.map((m) => m && (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-gray-500">{m.department}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{m.position}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── 참가자 추가/수정 모달 ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 오버레이 */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          {/* 모달 카드 */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800">
                {modal.mode === 'add' ? '참가자 추가' : '참가자 정보 수정'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폼 */}
            <div className="space-y-4">
              {/* 이름 */}
              <FormField label="이름" required error={errors.name}>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={inputClass(!!errors.name)}
                />
              </FormField>

              {/* 이메일 */}
              <FormField label="이메일" required error={errors.email}>
                <input
                  type="email"
                  placeholder="example@company.com"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass(!!errors.email)}
                />
              </FormField>

              {/* 팀 선택 */}
              <FormField label="팀" required error={errors.team}>
                <select
                  value={form.team}
                  onChange={(e) => setField('team', e.target.value)}
                  className={inputClass(!!errors.team)}
                >
                  <option value="">팀 선택</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </FormField>

              {/* 부서 + 직급 (2열) */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="부서">
                  <input
                    type="text"
                    placeholder="개발팀"
                    value={form.department}
                    onChange={(e) => setField('department', e.target.value)}
                    className={inputClass(false)}
                  />
                </FormField>
                <FormField label="직급">
                  <input
                    type="text"
                    placeholder="대리"
                    value={form.position}
                    onChange={(e) => setField('position', e.target.value)}
                    className={inputClass(false)}
                  />
                </FormField>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className="flex-1 py-2.5 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {modal.mode === 'add' ? '추가' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────

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
      : 'border-gray-200 focus:ring-indigo-300'
  }`;
}
