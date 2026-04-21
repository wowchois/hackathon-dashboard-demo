import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 허용할 역할 목록. 생략하면 로그인만 확인 */
  roles?: UserRole[];
  /** 미인증 시 리다이렉트 경로 (기본: /login) */
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  roles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-7 h-7 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  // 미인증
  if (!user) return <Navigate to={redirectTo} replace />;

  // 비밀번호 변경 강제 (최초 로그인)
  if (user.mustChangePassword && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 역할 체크
  if (roles && !roles.includes(user.role)) {
    // 역할별 홈으로 리다이렉트
    const home =
      user.role === 'admin' ? '/admin' :
      user.role === 'judge' ? '/admin/scores' :
      '/participant';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
