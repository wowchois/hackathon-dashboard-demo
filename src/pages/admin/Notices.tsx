import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { notices as initialNotices } from '../../data/mockData';
import type { Notice } from '../../data/mockData';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

type FormMode = 'add' | 'edit';

export default function Notices() {
  const [noticeList, setNoticeList] = useState<Notice[]>(initialNotices);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const handleSubmit = () => {
    if (!titleInput.trim() || !contentInput.trim()) return;

    if (formMode === 'add') {
      const newNotice: Notice = {
        id: `n${Date.now()}`,
        title: titleInput.trim(),
        content: contentInput.trim(),
        date: new Date().toISOString().split('T')[0],
        author: '관리자',
      };
      setNoticeList((prev) => [newNotice, ...prev]);
    } else if (editId) {
      setNoticeList((prev) =>
        prev.map((n) =>
          n.id === editId
            ? { ...n, title: titleInput.trim(), content: contentInput.trim() }
            : n
        )
      );
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    setNoticeList((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
          공지사항 ({noticeList.length})
        </h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300"
            />
            <textarea
              placeholder="내용을 입력하세요"
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300 resize-none"
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
                disabled={!titleInput.trim() || !contentInput.trim()}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {formMode === 'add' ? '등록' : '저장'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── 공지 목록 ── */}
      {noticeList.length > 0 ? (
        <div className="space-y-3">
          {noticeList.map((notice) => {
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
                    className="flex items-center gap-1 mt-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
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
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
            className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
          >
            첫 공지를 작성해보세요
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
