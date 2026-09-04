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
import StatsPage from './pages/StatsPage';
import RoutesBuilderPage from './pages/RoutesBuilderPage';
import MyRoutePage from './pages/MyRoutePage';
import './App.css';

const EVENT_REPORT_FILLOUT_ID = 'fzNH38HwdYus';
const HAZARD_REPORT_FILLOUT_ID = 'ufY8ENvVuwus';

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
                <EmbeddedFormPage title="דיווח אירוע" filloutId={EVENT_REPORT_FILLOUT_ID} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-hazard"
            element={
              <ProtectedRoute>
                <EmbeddedFormPage title="דיווח מפגע" filloutId={HAZARD_REPORT_FILLOUT_ID} />
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
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
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
            path="/routes"
            element={
              <ProtectedRoute>
                <CoordinatorRoute>
                  <RoutesBuilderPage />
                </CoordinatorRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-route"
            element={
              <ProtectedRoute>
                <MyRoutePage />
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
