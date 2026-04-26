import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useNotices } from '../../hooks/useNotices';
import { apiAddNotice, apiUpdateNotice, apiDeleteNotice } from '../../api/notices';
import { apiGetUploadUrl, apiUploadToS3, apiGetDownloadUrl, apiDeleteNoticeFile } from '../../api/noticeFiles';
import type { Notice, NoticeFile } from '../../data/mockData';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  Globe, Lock, Paperclip, Download, FileText, Loader2,
} from 'lucide-react';
import NoticeContent from '../../components/ui/NoticeContent';

type FormMode = 'add' | 'edit';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 3;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function Notices() {
  const { data: notices, refetch } = useNotices();
  const location = useLocation();
  const lastScrolledHash = useRef('');
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isPublicInput, setIsPublicInput] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 폼 파일 상태
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [formFileError, setFormFileError] = useState<string | null>(null);

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // 조회 화면 다운로드 상태
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || notices.length === 0 || lastScrolledHash.current === id) return;
    if (!notices.some((n) => n.id === id)) return;
    lastScrolledHash.current = id;
    setExpandedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [location.hash, notices]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFileState = () => {
    setPendingFiles([]);
    setPendingDeletes([]);
    setFormFileError(null);
  };

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openAdd = () => {
    setFormMode('add');
    setTitleInput('');
    setContentInput('');
    setIsPublicInput(true);
    setEditId(null);
    setSaveError(null);
    resetFileState();
    setShowForm(true);
    scrollToForm();
  };

  const openEdit = (notice: Notice) => {
    setFormMode('edit');
    setTitleInput(notice.title);
    setContentInput(notice.content);
    setIsPublicInput(notice.isPublic ?? true);
    setEditId(notice.id);
    setSaveError(null);
    resetFileState();
    setShowForm(true);
    scrollToForm();
  };

  const closeForm = () => {
    setShowForm(false);
    setTitleInput('');
    setContentInput('');
    setIsPublicInput(true);
    setEditId(null);
    setSaveError(null);
    resetFileState();
  };

  // 수정 폼에서 보여줄 기존 파일 (삭제 예약 제외)
  const editingNotice = formMode === 'edit' ? notices.find((n) => n.id === editId) : null;
  const existingFiles: NoticeFile[] = (editingNotice?.files ?? []).filter(
    (f) => !pendingDeletes.includes(f.id)
  );
  const totalFileCount = existingFiles.length + pendingFiles.length;
  const canAddMore = totalFileCount < MAX_FILES;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFormFileError('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }
    setFormFileError(null);
    setPendingFiles((prev) => [...prev, file]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const stageDelete = (fileId: string) => {
    setPendingDeletes((prev) => [...prev, fileId]);
  };

  const handleSubmit = async () => {
    if (!titleInput.trim() || !contentInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      // 1. 공지 저장 → noticeId 확보
      let noticeId: string;
      if (formMode === 'add') {
        const created = await apiAddNotice({
          title: titleInput.trim(),
          content: contentInput.trim(),
          isPublic: isPublicInput,
        });
        noticeId = created.id;
      } else {
        noticeId = editId!;
        await apiUpdateNotice(editId!, {
          title: titleInput.trim(),
          content: contentInput.trim(),
          isPublic: isPublicInput,
        });
      }

      // 2. 새 파일 업로드 (실패 시 기존 파일은 안전)
      for (const file of pendingFiles) {
        const { uploadUrl } = await apiGetUploadUrl(noticeId, file.name, file.size, file.type);
        await apiUploadToS3(uploadUrl, file);
      }

      // 3. 삭제 예약 파일 제거 (업로드 성공 후)
      for (const fileId of pendingDeletes) {
        await apiDeleteNoticeFile(fileId);
      }

      refetch();
      closeForm();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await apiDeleteNotice(deleteTarget.id);
      refetch();
    } catch {
      console.error('공지 삭제 실패');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDownload = async (fileId: string) => {
    setDownloadingId(fileId);
    try {
      const url = await apiGetDownloadUrl(fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      console.error('다운로드 실패');
    } finally {
      setDownloadingId(null);
    }
  };

  const publicCount = notices.filter((n) => n.isPublic !== false).length;

  return (
    <AdminLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">
            공지사항 ({notices.length})
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">공개 {publicCount}개 · 비공개 {notices.length - publicCount}개</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          공지 작성
        </button>
      </div>

      {/* ── 작성/수정 폼 ── */}
      <div ref={formRef} className="scroll-mt-4">
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

            {/* ── 파일 첨부 ── */}
            <div className="border border-gray-200 rounded-lg px-3 py-2.5 space-y-1.5">
              {/* 기존 파일 (수정 모드) */}
              {existingFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{f.fileName}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatSize(f.fileSize)}</span>
                  <button
                    type="button"
                    onClick={() => stageDelete(f.id)}
                    className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제 예약"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 새로 추가할 파일 */}
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs text-indigo-600 flex-1 min-w-0 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(i)}
                    className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="취소"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* 파일 추가 버튼 */}
              {canAddMore ? (
                <label className="inline-flex items-center gap-1 text-xs text-[#80766b] hover:text-[#6e645a] cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Paperclip className="w-3.5 h-3.5" />
                  파일 추가 ({totalFileCount}/{MAX_FILES})
                </label>
              ) : (
                <p className="text-xs text-gray-400">최대 {MAX_FILES}개까지 첨부 가능합니다.</p>
              )}

              {formFileError && (
                <p className="text-xs text-red-500">{formFileError}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPublicInput((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  isPublicInput
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                {isPublicInput
                  ? <><Globe className="w-3.5 h-3.5" />참가자 공개</>
                  : <><Lock className="w-3.5 h-3.5" />관리자 전용</>}
              </button>
              <div className="flex gap-2">
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
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      저장 중...
                    </span>
                  ) : formMode === 'add' ? '등록' : '저장'}
                </button>
              </div>
            </div>
            {saveError && (
              <p className="text-xs text-red-500 text-right">{saveError}</p>
            )}
          </div>
        </Card>
      )}
      </div>

      {/* ── 공지 목록 ── */}
      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => {
            const expanded = expandedIds.has(notice.id);
            const isPublic = notice.isPublic !== false;

            return (
              <div key={notice.id} id={notice.id} className="scroll-mt-4">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 제목 + 공개 배지 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{notice.title}</p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                        isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isPublic
                          ? <><Globe className="w-3 h-3" />공개</>
                          : <><Lock className="w-3 h-3" />비공개</>}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {notice.date} · {notice.author}
                    </p>

                    {/* 내용 */}
                    <NoticeContent
                      content={notice.content}
                      className={`text-sm text-gray-500 mt-2 whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-2'}`}
                    />

                    {/* 더보기/접기 */}
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

                    {/* ── 첨부 파일 (다운로드 전용) ── */}
                    {expanded && notice.files && notice.files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        {notice.files.map((f) => (
                          <div key={f.id} className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{f.fileName}</span>
                            <span className="text-xs text-gray-400 shrink-0">{formatSize(f.fileSize)}</span>
                            <button
                              onClick={() => handleDownload(f.id)}
                              disabled={downloadingId === f.id}
                              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                              title="다운로드"
                            >
                              {downloadingId === f.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(notice)}
                      className="p-1.5 text-gray-400 hover:text-[#80766b] hover:bg-[#80766b]/10 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: notice.id, title: notice.title })}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
              </div>
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
      {/* ── 삭제 확인 모달 ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                <Trash2 className="w-4 h-4 text-red-500" />
                공지사항 삭제
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">다음 공지사항을 삭제하시겠습니까?</p>
            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-sm text-gray-700 font-medium break-words">
              {deleteTarget.title}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
