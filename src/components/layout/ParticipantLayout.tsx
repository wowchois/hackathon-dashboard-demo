import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Calendar, Megaphone, Upload, Bell } from 'lucide-react';
import { notifications } from '../../data/mockData';

// 읽지 않은 알림 수 (실제 앱에선 상태/컨텍스트로 관리)
const UNREAD_COUNT = notifications.filter((n) => !n.isRead).length;

// 임시 참가자 정보 (실제 앱에선 인증 컨텍스트에서 가져옴)
const CURRENT_USER = { name: '김민준', team: '1조' };

const NAV_ITEMS = [
  { path: '/participant',              label: '내 팀',    icon: Users },
  { path: '/participant/schedule',     label: '일정',     icon: Calendar },
  { path: '/participant/notices',      label: '공지사항', icon: Megaphone },
  { path: '/participant/submit',       label: '제출하기', icon: Upload },
  { path: '/participant/notifications', label: '알림',   icon: Bell },
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── 데스크탑 사이드바 ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-30">
        {/* 로고 + 사용자 정보 */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/participant" className="text-base font-bold text-[#80766b] tracking-tight">
            해커톤 2026
          </Link>
          <p className="mt-2 text-xs text-gray-500 font-medium">{CURRENT_USER.team}</p>
          <p className="text-xs text-gray-400">{CURRENT_USER.name}</p>
        </div>

        {/* 사이드바 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showBadge = path === '/participant/notifications' && UNREAD_COUNT > 0;
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
                    {showBadge && (
                      <UnreadBadge count={UNREAD_COUNT} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
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
            <span className="text-sm font-semibold text-gray-800">{CURRENT_USER.team}</span>
            <span className="text-xs text-gray-400 mt-0.5">{CURRENT_USER.name}</span>
          </div>

          {/* 우측: 모바일 알림 아이콘 */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/participant/notifications"
              className="lg:hidden relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Bell className="w-5 h-5" />
              {UNREAD_COUNT > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {UNREAD_COUNT > 9 ? '9+' : UNREAD_COUNT}
                </span>
              )}
            </Link>

            {/* 데스크탑: 참가자 상태 뱃지 */}
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#80766b]/10 text-[#80766b] ring-1 ring-[#80766b]/20">
              참가자
            </span>
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
              const showBadge = path === '/participant/notifications' && UNREAD_COUNT > 0;
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
                          {UNREAD_COUNT > 9 ? '9+' : UNREAD_COUNT}
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
