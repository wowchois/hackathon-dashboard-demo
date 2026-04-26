import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import { useNotices } from '../../hooks/useNotices';
import { apiGetDownloadUrl } from '../../api/noticeFiles';
import { ChevronDown, ChevronUp, FileText, Download, Loader2 } from 'lucide-react';
import NoticeContent from '../../components/ui/NoticeContent';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function ParticipantNotices() {
  const { data: notices } = useNotices({ publicOnly: true });
  const location = useLocation();
  const lastScrolledHash = useRef('');
  const sorted = [...notices].sort((a, b) => b.date.localeCompare(a.date));
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || notices.length === 0 || lastScrolledHash.current === id) return;
    if (!notices.some((n) => n.id === id)) return;
    lastScrolledHash.current = id;
    setTimeout(() => {
      setExpanded((prev) => { const next = new Set(prev); next.add(id); return next; });
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [location.hash, notices]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  return (
    <ParticipantLayout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
          공지사항 ({notices.length})
        </h2>
      </div>

      <div className="space-y-2">
        {sorted.map((notice) => {
          const isOpen = expanded.has(notice.id);
          const isNew = notice.date === today;

          return (
            <div
              key={notice.id}
              id={notice.id}
              className={`scroll-mt-4 rounded-xl border overflow-hidden transition-colors ${
                isOpen ? 'border-[#80766b]/30' : 'border-gray-100'
              } bg-white`}
            >
              {/* 아코디언 헤더 */}
              <button
                onClick={() => toggle(notice.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isNew && (
                      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white tracking-wide">
                        NEW
                      </span>
                    )}
                    <p
                      className={`text-sm font-medium truncate ${
                        isOpen ? 'text-[#80766b]' : 'text-gray-800'
                      }`}
                    >
                      {notice.title}
                    </p>
                    {notice.files && notice.files.length > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                        <FileText className="w-3 h-3" />
                        {notice.files.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {notice.date} · {notice.author}
                  </p>
                </div>
                <span className="text-gray-400 shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* 아코디언 내용 */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <NoticeContent
                    content={notice.content}
                    className="text-sm text-gray-600 leading-relaxed pt-3 whitespace-pre-wrap break-words"
                  />

                  {/* 첨부 파일 */}
                  {notice.files && notice.files.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      {notice.files.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleDownload(f.id)}
                          disabled={downloadingId === f.id}
                          className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs text-indigo-600 flex-1 min-w-0 truncate">{f.fileName}</span>
                          <span className="text-xs text-gray-400 shrink-0">{formatSize(f.fileSize)}</span>
                          {downloadingId === f.id
                            ? <Loader2 className="w-3.5 h-3.5 text-gray-400 shrink-0 animate-spin" />
                            : <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ParticipantLayout>
  );
}
