import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
// Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Participants from './pages/admin/Participants';
import AdminNotices from './pages/admin/Notices';
import AdminMilestones from './pages/admin/Milestones';
import Submissions from './pages/admin/Submissions';
import Scoring from './pages/admin/Scoring';
import ScoreInput from './pages/admin/ScoreInput';
import AdminSettings from './pages/admin/Settings';
// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import Timeline from './pages/participant/Timeline';
import ParticipantNotices from './pages/participant/Notices';
import Submit from './pages/participant/Submit';
import ParticipantScores from './pages/participant/Scores';
import Notifications from './pages/participant/Notifications';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 루트: 로그인 페이지로 */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 로그인 */}
          <Route path="/login" element={<Login />} />

          {/* 비밀번호 변경 (최초 로그인) */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* ── 관리자 전용 ─────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedRoute roles={['admin']}>
                <Participants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/milestones"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminMilestones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminNotices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/submissions"
            element={
              <ProtectedRoute roles={['admin']}>
                <Submissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scores"
            element={
              <ProtectedRoute roles={['admin', 'judge']}>
                <Scoring />
              </ProtectedRoute>
            }
          />

          {/* 점수 입력 — 관리자 + 심사위원 모두 접근 가능 */}
          <Route
            path="/admin/score-input"
            element={
              <ProtectedRoute roles={['admin', 'judge']}>
                <ScoreInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* ── 참가자 전용 ─────────────────────────────────────── */}
          <Route
            path="/participant"
            element={
              <ProtectedRoute roles={['participant']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/schedule"
            element={
              <ProtectedRoute roles={['participant']}>
                <Timeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/notices"
            element={
              <ProtectedRoute roles={['participant']}>
                <ParticipantNotices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/submit"
            element={
              <ProtectedRoute roles={['participant']}>
                <Submit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/scores"
            element={
              <ProtectedRoute roles={['participant']}>
                <ParticipantScores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/notifications"
            element={
              <ProtectedRoute roles={['participant']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
