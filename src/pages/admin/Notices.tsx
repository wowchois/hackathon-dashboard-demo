import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useNotices } from '../../hooks/useNotices';
import { apiAddNotice, apiUpdateNotice, apiDeleteNotice } from '../../api/notices';
import { apiGetUploadUrl, apiUploadToS3, apiGetDownloadUrl, apiDeleteNoticeFile } from '../../api/noticeFiles';
import type { Notice } from '../../data/mockData';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  Globe, Lock, Paperclip, Download, FileText, Loader2,
} from 'lucide-react';
import NoticeContent from '../../components/ui/NoticeContent';

type FormMode = 'add' | 'edit';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function Notices() {
  const { data: notices, refetch } = useNotices();
  const location = useLocation();
  const lastScrolledHash = useRef('');

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isPublicInput, setIsPublicInput] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; msg: string } | null>(null);
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

  const openAdd = () => {
    setFormMode('add');
    setTitleInput('');
    setContentInput('');
    setIsPublicInput(true);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (notice: Notice) => {
    setFormMode('edit');
    setTitleInput(notice.title);
    setContentInput(notice.content);
    setIsPublicInput(notice.isPublic ?? true);
    setEditId(notice.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setTitleInput('');
    setContentInput('');
    setIsPublicInput(true);
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!titleInput.trim() || !contentInput.trim()) return;
    setSaving(true);
    try {
      if (formMode === 'add') {
        await apiAddNotice({ title: titleInput.trim(), content: contentInput.trim(), isPublic: isPublicInput });
      } else if (editId) {
        await apiUpdateNotice(editId, { title: titleInput.trim(), content: contentInput.trim(), isPublic: isPublicInput });
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

  const handleFileUpload = async (noticeId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setUploadError({ id: noticeId, msg: '파일 크기는 10MB를 초과할 수 없습니다.' });
      return;
    }
    setUploadError(null);
    setUploadingId(noticeId);
    try {
      const { uploadUrl } = await apiGetUploadUrl(noticeId, file.name, file.size, file.type);
      await apiUploadToS3(uploadUrl, file);
      refetch();
    } catch (e) {
      setUploadError({ id: noticeId, msg: e instanceof Error ? e.message : '업로드에 실패했습니다.' });
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await apiDeleteNoticeFile(fileId);
      refetch();
    } catch {
      console.error('파일 삭제 실패');
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
                  {saving ? '저장 중...' : formMode === 'add' ? '등록' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── 공지 목록 ── */}
      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => {
            const expanded = expandedIds.has(notice.id);
            const isPublic = notice.isPublic !== false;
            const isUploading = uploadingId === notice.id;
            const fileError = uploadError?.id === notice.id ? uploadError.msg : null;

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

                    {/* ── 파일 섹션 (펼쳐진 경우) ── */}
                    {expanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {notice.files && notice.files.length > 0 && (
                          <div className="space-y-1.5 mb-2">
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
                                <button
                                  onClick={() => handleFileDelete(f.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="파일 삭제"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className={`inline-flex items-center gap-1 text-xs transition-colors ${
                          isUploading
                            ? 'text-gray-400'
                            : 'text-[#80766b] hover:text-[#6e645a] cursor-pointer'
                        }`}>
                          <input
                            type="file"
                            accept={ACCEPTED_TYPES}
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              handleFileUpload(notice.id, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                          {isUploading
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />업로드 중...</>
                            : <><Paperclip className="w-3.5 h-3.5" />파일 추가</>}
                        </label>
                        {fileError && (
                          <p className="text-xs text-red-500 mt-1">{fileError}</p>
                        )}
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
                      onClick={() => handleDelete(notice.id)}
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
    </AdminLayout>
  );
}
