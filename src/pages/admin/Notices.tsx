import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useNotices } from '../../hooks/useNotices';
import { apiAddNotice, apiUpdateNotice, apiDeleteNotice } from '../../api/notices';
import type { Notice } from '../../data/mockData';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

type FormMode = 'add' | 'edit';

export default function Notices() {
  const { data: notices, refetch } = useNotices();

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    setFormMode('add');
    setTitleInput('');
    setContentInput('');
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (notice: Notice) => {
    setFormMode('edit');
    setTitleInput(notice.title);
    setContentInput(notice.content);
    setEditId(notice.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setTitleInput('');
    setContentInput('');
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!titleInput.trim() || !contentInput.trim()) return;
    setSaving(true);
    try {
      if (formMode === 'add') {
        await apiAddNotice({ title: titleInput.trim(), content: contentInput.trim() });
      } else if (editId) {
        await apiUpdateNotice(editId, { title: titleInput.trim(), content: contentInput.trim() });
      }
      refetch();
      closeForm();
    } catch {
      console.error('공지 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteNotice(id);
      refetch();
    } catch {
      console.error('공지 삭제 실패');
    }
  };

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
          공지사항 ({notices.length})
        </h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          공지 작성
        </button>
      </div>

      {/* ── 작성/수정 폼 ── */}
      {showForm && (
        <Card className="mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {formMode === 'add' ? '새 공지 작성' : '공지 수정'}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 placeholder-gray-300"
            />
            <textarea
              placeholder="내용을 입력하세요"
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30 placeholder-gray-300 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!titleInput.trim() || !contentInput.trim() || saving}
                className="px-4 py-2 text-sm text-white bg-[#80766b] rounded-lg hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : formMode === 'add' ? '등록' : '저장'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── 공지 목록 ── */}
      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => {
            const expanded = expandedIds.has(notice.id);
            return (
              <Card key={notice.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{notice.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {notice.date} · {notice.author}
                    </p>
                    <p className={`text-sm text-gray-500 mt-2 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}>
                      {notice.content}
                    </p>
                    <button
                      onClick={() => toggleExpand(notice.id)}
                      className="flex items-center gap-1 mt-1.5 text-xs text-[#80766b] hover:text-[#6e645a] transition-colors"
                    >
                      {expanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" />접기</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" />더보기</>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(notice)}
                      className="p-1.5 text-gray-400 hover:text-[#80766b] hover:bg-[#80766b]/10 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">등록된 공지사항이 없습니다.</p>
          <button
            onClick={openAdd}
            className="mt-3 text-[#80766b] text-sm font-medium hover:underline"
          >
            첫 공지를 작성해보세요
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
