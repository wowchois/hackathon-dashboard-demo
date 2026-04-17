import { useState } from 'react';
import ParticipantLayout from '../../components/layout/ParticipantLayout';
import { useNotices } from '../../hooks/useNotices';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ParticipantNotices() {
  const { data: notices } = useNotices();
  const sorted = [...notices].sort((a, b) => b.date.localeCompare(a.date));
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
              className={`rounded-xl border overflow-hidden transition-colors ${
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
                  <p className="text-sm text-gray-600 leading-relaxed pt-3">
                    {notice.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ParticipantLayout>
  );
}
