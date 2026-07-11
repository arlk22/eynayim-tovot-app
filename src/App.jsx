import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PatrolSignupPage from './pages/PatrolSignupPage';
import EmbeddedFormPage from './pages/EmbeddedFormPage';
import NewsPage from './pages/NewsPage';
import SharePage from './pages/SharePage';
import EmergencyPage from './pages/EmergencyPage';
import CoordinatorRoute from './components/CoordinatorRoute';
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage';
import MokadRoute from './components/MokadRoute';
import MokadDashboardPage from './pages/MokadDashboardPage';
import CommunityPage from './pages/CommunityPage';
import './App.css';

const EVENT_REPORT_URL = 'https://gdform1.fillout.com/t/fzNH38HwdYus';
const HAZARD_REPORT_URL = 'https://gdform1.fillout.com/gdform1';

function TopBar() {
  const location = useLocation();
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/community') return null;
  return (
    <div className="top-bar">
      <Link to="/" className="top-bar__back">
        › חזרה לבית
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TopBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patrols"
            element={
              <ProtectedRoute>
                <PatrolSignupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-event"
            element={
              <ProtectedRoute>
                <EmbeddedFormPage title="דיווח אירוע" src={EVENT_REPORT_URL} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-hazard"
            element={
              <ProtectedRoute>
                <EmbeddedFormPage title="דיווח מפגע" src={HAZARD_REPORT_URL} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/news"
            element={
              <ProtectedRoute>
                <NewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/share"
            element={
              <ProtectedRoute>
                <SharePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency"
            element={
              <ProtectedRoute>
                <EmergencyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute>
                <CoordinatorRoute>
                  <CoordinatorDashboardPage />
                </CoordinatorRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mokad"
            element={
              <ProtectedRoute>
                <MokadRoute>
                  <MokadDashboardPage />
                </MokadRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
