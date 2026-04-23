import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── 타입 ────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'judge' | 'participant';

export interface AuthUser {
  id: string;
  employeeId: string; // 사번: 알파벳 1자 + 숫자 6자리 (대문자 정규화), 예: D123456
  role: UserRole;
  name: string;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (employeeId: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────

function toAuthUser(user: User): AuthUser {
  // role: app_metadata 우선 (서버 전용, 위변조 불가), user_metadata 폴백 (레거시 계정 호환)
  // name, mustChangePassword: user_metadata (사용자/서버 모두 수정 가능)
  const appMeta = user.app_metadata ?? {};
  const userMeta = user.user_metadata ?? {};
  // 이메일 {사번}@hackathon.com 형식에서 사번 추출 후 대문자 정규화
  const rawEmail = user.email ?? '';
  const employeeId = rawEmail.endsWith('@hackathon.com')
    ? rawEmail.slice(0, rawEmail.lastIndexOf('@')).toUpperCase()
    : rawEmail.toUpperCase();
  return {
    id: user.id,
    employeeId,
    role: ((appMeta.role ?? userMeta.role) as UserRole) ?? 'participant',
    name: (userMeta.name as string) ?? employeeId,
    mustChangePassword: (userMeta.must_change_password as boolean) ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 로드
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ? toAuthUser(data.session.user) : null);
      })
      .catch((error) => {
        console.error('Failed to restore auth session', error);
        if (!mounted) return;
        setSession(null);
        setUser(null);
        void supabase.auth.signOut({ scope: 'local' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 세션 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ? toAuthUser(s.user) : null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (employeeId: string, password: string): Promise<{ error: string | null }> => {
    const email = `${employeeId.toUpperCase()}@hackathon.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export { AuthContext };
