import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

  // 세션 로딩 중 — 빈 화면 (짧은 순간이라 스피너 생략)
  if (loading) return null;

  // 미인증
  if (!user) return <Navigate to={redirectTo} replace />;

  // 역할 체크
  if (roles && !roles.includes(user.role)) {
    // 역할별 홈으로 리다이렉트
    const home =
      user.role === 'admin' ? '/admin' :
      user.role === 'judge' ? '/admin/score-input' :
      '/participant';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
