import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, Megaphone, Upload, Trophy, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useCurrentParticipant } from '../../hooks/useCurrentParticipant';
import {
  MilestonesNotificationProvider,
  useMilestonesNotification,
} from '../../contexts/MilestonesNotification';
import {
  NoticesNotificationProvider,
  useNoticesNotification,
} from '../../contexts/NoticesNotification';

const NAV_ITEMS = [
  { path: '/participant',          label: '내 팀',    icon: Users },
  { path: '/participant/schedule', label: '일정',     icon: Calendar },
  { path: '/participant/notices',  label: '공지사항', icon: Megaphone },
  { path: '/participant/submit',   label: '제출하기', icon: Upload },
  { path: '/participant/scores',   label: '평가 결과', icon: Trophy },
];

const SCHEDULE_PATH = '/participant/schedule';
const NOTICES_PATH = '/participant/notices';

function useActiveNav() {
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === '/participant' ? pathname === path : pathname.startsWith(path);
  return { isActive };
}

interface ParticipantLayoutProps {
  children: ReactNode;
}

// Provider로 감싼 진입점
export default function ParticipantLayout({ children }: ParticipantLayoutProps) {
  return (
    <MilestonesNotificationProvider>
      <NoticesNotificationProvider>
        <ParticipantLayoutContent>{children}</ParticipantLayoutContent>
      </NoticesNotificationProvider>
    </MilestonesNotificationProvider>
  );
}

// 실제 레이아웃 — context 소비
function ParticipantLayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isActive } = useActiveNav();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { team } = useCurrentParticipant();
  const { hasNew } = useMilestonesNotification();
  const { hasNew: hasNewNotices } = useNoticesNotification();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const displayName = user?.name ?? '참가자';
  const displayTeam = team?.name ?? '내 팀';

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* ── 데스크탑 사이드바 ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/participant" className="text-base font-bold text-[#80766b] tracking-tight">
            {new Date().getFullYear()} KBDS AI 해커톤
          </Link>
          <p className="mt-2 text-xs text-gray-500 font-medium">{displayTeam}</p>
          <p className="text-xs text-gray-400">{displayName}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showDot = (path === SCHEDULE_PATH && hasNew) || (path === NOTICES_PATH && hasNewNotices);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? 'bg-[#80766b]/10 text-[#80766b]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <span className="relative shrink-0">
                      <Icon className={`w-4 h-4 ${active ? 'text-[#80766b]' : 'text-gray-400'}`} />
                      {showDot && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
                      )}
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

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

      {/* ── 모바일 오버레이 ─────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* ── 모바일 슬라이드 사이드바 ────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 z-50 flex flex-col lg:hidden
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-[#80766b] tracking-tight">{new Date().getFullYear()} KBDS AI 해커톤</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{displayTeam}</p>
            <p className="text-xs text-gray-400">{displayName}</p>
          </div>
          <button
            onClick={closeSidebar}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showDot = (path === SCHEDULE_PATH && hasNew) || (path === NOTICES_PATH && hasNewNotices);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? 'bg-[#80766b]/10 text-[#80766b]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <span className="relative shrink-0">
                      <Icon className={`w-4 h-4 ${active ? 'text-[#80766b]' : 'text-gray-400'}`} />
                      {showDot && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
                      )}
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
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
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/participant"
            className="lg:hidden text-sm font-bold text-[#80766b] tracking-tight"
          >
            {new Date().getFullYear()} KBDS AI 해커톤
          </Link>

          <div className="hidden lg:flex flex-col leading-none">
            <span className="text-sm font-semibold text-gray-800">{displayTeam}</span>
            <span className="text-xs text-gray-400 mt-0.5">{displayName}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#80766b]/10 text-[#80766b] ring-1 ring-[#80766b]/20">
              참가자
            </span>
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* ── 모바일 하단 탭 바 ─────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100">
          <ul className="flex">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              const showDot = (path === SCHEDULE_PATH && hasNew) || (path === NOTICES_PATH && hasNewNotices);
              return (
                <li key={path} className="flex-1">
                  <Link
                    to={path}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                      ${active ? 'text-[#fcaf17]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="relative">
                      <Icon className={`w-5 h-5 ${active ? 'text-[#fcaf17]' : ''}`} />
                      {showDot && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
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
