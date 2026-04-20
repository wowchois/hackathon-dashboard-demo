import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useMilestones } from '../../hooks/useMilestones';
import {
  apiAddMilestone,
  apiUpdateMilestone,
  apiDeleteMilestone,
} from '../../api/milestones';
import type { Milestone } from '../../data/mockData';
import { Plus, Pencil, Trash2, X, CalendarDays, Lock, Globe, CheckCircle2, Circle } from 'lucide-react';

interface FormState {
  title: string;
  date: string;
  description: string;
  isPublic: boolean;
}

const EMPTY_FORM: FormState = { title: '', date: '', description: '', isPublic: true };

interface ConfirmDialog {
  message: string;
  onConfirm: () => void;
}

export default function Milestones() {
  const { data: milestones, refetch } = useMilestones();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [toast, setToast] = useState('');

  const publicCount = milestones.filter((m) => m.isPublic).length;
  const doneCount = milestones.filter((m) => m.isDone).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: Milestone) => {
    setEditTarget(m);
    setForm({
      title: m.title,
      date: m.date,
      description: m.description ?? '',
      isPublic: m.isPublic,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiUpdateMilestone(editTarget.id, {
          title: form.title.trim(),
          date: form.date,
          description: form.description.trim() || undefined,
          isPublic: form.isPublic,
        });
        showToast('마일스톤이 수정됐습니다.');
      } else {
        await apiAddMilestone({
          title: form.title.trim(),
          date: form.date,
          description: form.description.trim() || undefined,
          isPublic: form.isPublic,
        });
        showToast('마일스톤이 추가됐습니다.');
      }
      refetch();
      closeForm();
    } catch {
      showToast('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: Milestone) => {
    setConfirmDialog({
      message: `'${m.title}'을(를) 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiDeleteMilestone(m.id);
          refetch();
          showToast('마일스톤이 삭제됐습니다.');
        } catch {
          showToast('삭제에 실패했습니다.');
        }
      },
    });
  };

  const currentIdx = milestones.findIndex((m) => !m.isDone);

  return (
    <AdminLayout>
      {/* ── 요약 배너 ── */}
      <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 mb-6">
        <CalendarDays className="w-9 h-9 shrink-0 text-indigo-500" />
        <div>
          <p className="font-semibold text-base text-indigo-800">
            전체 {milestones.length}개 일정
          </p>
          <p className="text-xs mt-0.5 text-indigo-500">
            공개 {publicCount}개 · 완료 {doneCount}개
          </p>
        </div>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          마일스톤 추가
        </button>
      </div>

      {/* ── 추가/수정 폼 ── */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              {editTarget ? '마일스톤 수정' : '마일스톤 추가'}
            </h3>
            <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="마일스톤 제목"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">날짜 *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">설명 (선택)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="참가자에게 표시할 설명을 입력하세요"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.isPublic
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                {form.isPublic
                  ? <><Globe className="w-3.5 h-3.5" />참가자 공개</>
                  : <><Lock className="w-3.5 h-3.5" />관리자 전용</>}
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.title.trim() || !form.date}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : editTarget ? '수정 완료' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 스텝퍼 목록 ── */}
      {milestones.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          등록된 마일스톤이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-5">
          <ol className="relative">
            {milestones.map((m, idx) => {
              const isCurrent = idx === currentIdx;
              const isLast = idx === milestones.length - 1;

              return (
                <li key={m.id} className="flex gap-4">
                  {/* 왼쪽: 도트 + 세로선 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 z-10 mt-1 flex items-center justify-center ${
                        m.isDone
                          ? 'bg-green-500 border-green-500'
                          : isCurrent
                          ? 'bg-white border-indigo-500 ring-4 ring-indigo-100'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {m.isDone && <CheckCircle2 className="w-full h-full text-white" strokeWidth={3} />}
                      {isCurrent && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                      {!m.isDone && !isCurrent && <Circle className="w-full h-full text-gray-300" />}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 ${m.isDone ? 'bg-green-200' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  {/* 오른쪽: 내용 */}
                  <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                    <div
                      className={`rounded-xl p-3 border ${
                        isCurrent
                          ? 'bg-indigo-50 border-indigo-200'
                          : m.isDone
                          ? 'bg-gray-50 border-gray-100'
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      {/* 1행: 제목 + 공개 뱃지 */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${
                          m.isDone ? 'line-through text-gray-400' : isCurrent ? 'text-indigo-700' : 'text-gray-700'
                        }`}>
                          {m.title}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                          m.isPublic
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {m.isPublic
                            ? <><Globe className="w-3 h-3" />공개</>
                            : <><Lock className="w-3 h-3" />비공개</>}
                        </span>
                      </div>

                      {/* 2행: 날짜 + 수정/삭제 버튼 */}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className={`text-xs ${m.isDone ? 'text-gray-300' : isCurrent ? 'text-indigo-400' : 'text-gray-400'}`}>
                          {m.date}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 3행: 설명 */}
                      {m.description && (
                        <p className={`text-xs mt-1.5 leading-relaxed ${m.isDone ? 'text-gray-300' : 'text-gray-500'}`}>
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── 확인 다이얼로그 ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-sm text-gray-700 mb-5 text-center">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-6 z-50 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
}
