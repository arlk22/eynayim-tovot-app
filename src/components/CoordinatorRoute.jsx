import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CoordinatorGate from '../pages/CoordinatorGate';

export default function CoordinatorRoute({ children }) {
  const { volunteer, ready, coordinatorSession } = useAuth();

  if (!ready) return null;
  if (!volunteer) return <Navigate to="/login" replace />;
  if (!volunteer.isCoordinator) return <Navigate to="/" replace />;
  if (!coordinatorSession || coordinatorSession.volunteerId !== volunteer.id) {
    return <CoordinatorGate />;
  }

  return children;
}
