import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as loginRequest, coordinatorAuth } from '../lib/api';

const STORAGE_KEY = 'eynayim-tovot.volunteer';
const COORDINATOR_KEY = 'eynayim-tovot.coordinator';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [volunteer, setVolunteer] = useState(null);
  const [coordinatorSession, setCoordinatorSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVolunteer(JSON.parse(raw));
      const rawCoordinator = localStorage.getItem(COORDINATOR_KEY);
      if (rawCoordinator) setCoordinatorSession(JSON.parse(rawCoordinator));
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  const login = useCallback(async (phone) => {
    const data = await loginRequest(phone);
    setVolunteer(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }, []);

  const unlockCoordinator = useCallback(
    async (password) => {
      if (!volunteer) throw new Error('not_logged_in');
      await coordinatorAuth(volunteer.id, password);
      const session = { volunteerId: volunteer.id, password };
      setCoordinatorSession(session);
      localStorage.setItem(COORDINATOR_KEY, JSON.stringify(session));
      return session;
    },
    [volunteer]
  );

  const lockCoordinator = useCallback(() => {
    setCoordinatorSession(null);
    localStorage.removeItem(COORDINATOR_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ volunteer, ready, login, coordinatorSession, unlockCoordinator, lockCoordinator }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
