import ParticipantLayout from '../../components/layout/ParticipantLayout';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const { list, loading, markRead, markAllRead } = useNotifications();

  const unreadCount = list.filter((n) => !n.isRead).length;

  return (
    <ParticipantLayout>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">알림</h2>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-medium text-[#80766b] hover:text-[#6e645a] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            전체 읽음
          </button>
        )}
      </div>

      {/* ── 알림 목록 ── */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-20">불러오는 중...</p>
      ) : list.length > 0 ? (
        <div className="space-y-2">
          {list.map((noti) => (
            <button
              key={noti.id}
              onClick={() => markRead(noti.id)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors ${
                !noti.isRead
                  ? 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              {/* 읽지 않은 알림 파란 점 */}
              <span className="mt-1.5 shrink-0">
                {!noti.isRead ? (
                  <span className="block w-2 h-2 rounded-full bg-blue-500" />
                ) : (
                  <span className="block w-2 h-2 rounded-full bg-transparent" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${
                    !noti.isRead ? 'font-semibold text-gray-900' : 'font-normal text-gray-400'
                  }`}
                >
                  {noti.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">{noti.time}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">새로운 알림이 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">새 알림이 오면 여기에 표시됩니다.</p>
        </div>
      )}

    </ParticipantLayout>
  );
}
