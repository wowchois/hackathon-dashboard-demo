import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  FileCheck,
  Trophy,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/admin',              label: '대시보드',    icon: LayoutDashboard, roles: ['admin'] },
  { path: '/admin/participants', label: '참가자 관리', icon: Users,           roles: ['admin'] },
  { path: '/admin/notices',      label: '공지사항',    icon: Megaphone,       roles: ['admin'] },
  { path: '/admin/submissions',  label: '제출 현황',   icon: FileCheck,       roles: ['admin'] },
  { path: '/admin/scores',       label: '심사 점수판', icon: Trophy,          roles: ['admin'] },
];

function useActiveNav() {
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === '/admin' ? pathname === path : pathname.startsWith(path);
  const currentLabel =
    NAV_ITEMS.find((item) => isActive(item.path))?.label ?? '점수 입력';
  return { isActive, currentLabel };
}

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isActive, currentLabel } = useActiveNav();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const isJudge = user?.role === 'judge';
  const roleLabel = isJudge ? '심사위원' : '관리자';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── 데스크탑 사이드바 ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-30">
        <SidebarContent isActive={isActive} isJudge={isJudge} user={user} onLogout={handleLogout} />
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
        className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-50 flex flex-col lg:hidden
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <Logo />
          <button
            onClick={closeSidebar}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarNav isActive={isActive} isJudge={isJudge} onNavigate={closeSidebar} />
        <SidebarFooter user={user} onLogout={handleLogout} />
      </aside>

      {/* ── 메인 영역 ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        {/* 공통 헤더 */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
          {/* 모바일: 햄버거 + 로고 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>

          {/* 데스크탑: 현재 페이지명 */}
          <span className="hidden lg:block text-sm font-semibold text-gray-700">
            {currentLabel}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {/* 사용자 이름 (데스크탑) */}
            {user && (
              <span className="hidden lg:block text-sm text-gray-600">
                {user.name}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#80766b]/10 text-[#80766b] ring-1 ring-[#80766b]/20">
              {roleLabel}
            </span>
            {/* 로그아웃 (데스크탑 헤더는 아이콘만) */}
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

        {/* ── 모바일 하단 탭 바 (관리자만) ─────────────────── */}
        {!isJudge && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100">
            <ul className="flex">
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <li key={path} className="flex-1">
                    <Link
                      to={path}
                      className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                        ${active ? 'text-[#fcaf17]' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-[#fcaf17]' : ''}`} />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────

function Logo() {
  return (
    <Link to="/admin" className="text-base font-bold text-[#80766b] tracking-tight">
      해커톤 2026
    </Link>
  );
}

function SidebarContent({
  isActive,
  isJudge,
  user,
  onLogout,
}: {
  isActive: (path: string) => boolean;
  isJudge: boolean;
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo />
        <p className="mt-0.5 text-xs text-gray-400">{isJudge ? '심사위원 패널' : '관리자 패널'}</p>
      </div>
      <SidebarNav isActive={isActive} isJudge={isJudge} />
      <SidebarFooter user={user} onLogout={onLogout} />
    </>
  );
}

function SidebarNav({
  isActive,
  isJudge,
  onNavigate,
}: {
  isActive: (path: string) => boolean;
  isJudge: boolean;
  onNavigate?: () => void;
}) {
  const visibleItems = isJudge ? [] : NAV_ITEMS;

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {visibleItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <li key={path}>
              <Link
                to={path}
                onClick={onNavigate}
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
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarFooter({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
}) {
  return (
    <div className="px-3 py-4 border-t border-gray-100">
      {user && (
        <div className="px-3 mb-2">
          <p className="text-xs font-medium text-gray-700 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      )}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        로그아웃
      </button>
    </div>
  );
}
