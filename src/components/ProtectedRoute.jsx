import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { volunteer, ready } = useAuth();

  if (!ready) return null;
  if (!volunteer) return <Navigate to="/login" replace />;

  return children;
}
