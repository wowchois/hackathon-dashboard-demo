import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Participants from './pages/admin/Participants';
import AdminNotices from './pages/admin/Notices';
import Submissions from './pages/admin/Submissions';
import Scoring from './pages/admin/Scoring';
import ScoreInput from './pages/admin/ScoreInput';
// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import Timeline from './pages/participant/Timeline';
import ParticipantNotices from './pages/participant/Notices';
import Submit from './pages/participant/Submit';
import Notifications from './pages/participant/Notifications';

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl shadow p-10 text-center max-w-md w-full">
        <h1 className="text-4xl font-bold text-indigo-600 mb-8">Hackathon Dashboard</h1>
        <div className="flex gap-4 justify-center">
          <Link
            to="/admin"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Admin
          </Link>
          <Link
            to="/participant"
            className="px-6 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Participant
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Admin */}
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/participants" element={<Participants />} />
        <Route path="/admin/notices" element={<AdminNotices />} />
        <Route path="/admin/submissions" element={<Submissions />} />
        <Route path="/admin/scores" element={<Scoring />} />
        <Route path="/admin/score-input" element={<ScoreInput />} />
        {/* Participant */}
        <Route path="/participant" element={<ParticipantDashboard />} />
        <Route path="/participant/schedule" element={<Timeline />} />
        <Route path="/participant/notices" element={<ParticipantNotices />} />
        <Route path="/participant/submit" element={<Submit />} />
        <Route path="/participant/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}
