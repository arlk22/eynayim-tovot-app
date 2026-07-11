import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MokadGate from '../pages/MokadGate';

export default function MokadRoute({ children }) {
  const { volunteer, ready, mokadSession } = useAuth();

  if (!ready) return null;
  if (!volunteer) return <Navigate to="/login" replace />;
  if (!volunteer.isMokad) return <Navigate to="/" replace />;
  if (!mokadSession || mokadSession.volunteerId !== volunteer.id) {
    return <MokadGate />;
  }

  return children;
}
