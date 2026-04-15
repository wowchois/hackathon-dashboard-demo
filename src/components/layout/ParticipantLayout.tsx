import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, Megaphone, Upload, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import { useNotifications } from '../../hooks/useNotifications';

const NAV_ITEMS = [
  { path: '/participant',               label: '내 팀',    icon: Users },
  { path: '/participant/schedule',      label: '일정',     icon: Calendar },
  { path: '/participant/notices',       label: '공지사항', icon: Megaphone },
  { path: '/participant/submit',        label: '제출하기', icon: Upload },
  { path: '/participant/notifications', label: '알림',     icon: Bell },
];

function useActiveNav() {
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === '/participant' ? pathname === path : pathname.startsWith(path);
  return { isActive };
}

interface ParticipantLayoutProps {
  children: ReactNode;
}

export default function ParticipantLayout({ children }: ParticipantLayoutProps) {
  const { isActive } = useActiveNav();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { team } = useCurrentParticipant();
  const { list: notifications } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name ?? '참가자';
  const displayTeam = team?.name ?? '내 팀';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── 데스크탑 사이드바 ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-30">
        {/* 로고 + 사용자 정보 */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/participant" className="text-base font-bold text-[#80766b] tracking-tight">
            해커톤 2026
          </Link>
          <p className="mt-2 text-xs text-gray-500 font-medium">{displayTeam}</p>
          <p className="text-xs text-gray-400">{displayName}</p>
        </div>

        {/* 사이드바 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showBadge = path === '/participant/notifications' && unreadCount > 0;
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${
                        active
                          ? 'bg-[#80766b]/10 text-[#80766b]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? 'text-[#80766b]' : 'text-gray-400'}`}
                    />
                    <span className="flex-1">{label}</span>
                    {showBadge && <UnreadBadge count={unreadCount} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 mb-2">
            <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        {/* 공통 헤더 */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
          {/* 로고 (모바일) */}
          <Link
            to="/participant"
            className="lg:hidden text-sm font-bold text-[#80766b] tracking-tight"
          >
            해커톤 2026
          </Link>

          {/* 팀명 + 이름 (데스크탑) */}
          <div className="hidden lg:flex flex-col leading-none">
            <span className="text-sm font-semibold text-gray-800">{displayTeam}</span>
            <span className="text-xs text-gray-400 mt-0.5">{displayName}</span>
          </div>

          {/* 우측 */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/participant/notifications"
              className="lg:hidden relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#80766b]/10 text-[#80766b] ring-1 ring-[#80766b]/20">
              참가자
            </span>

            {/* 로그아웃 아이콘 (데스크탑) */}
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* ── 모바일 하단 탭 바 ─────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100">
          <ul className="flex">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showBadge = path === '/participant/notifications' && unreadCount > 0;
              return (
                <li key={path} className="flex-1">
                  <Link
                    to={path}
                    className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                      ${active ? 'text-[#fcaf17]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="relative">
                      <Icon className={`w-5 h-5 ${active ? 'text-[#fcaf17]' : ''}`} />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1.5 flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold bg-red-500 text-white rounded-full">
      {count > 9 ? '9+' : count}
    </span>
  );
}
