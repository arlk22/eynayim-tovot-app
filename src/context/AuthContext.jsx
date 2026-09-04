import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as loginRequest, refreshVolunteer, coordinatorAuth, mokadAuth } from '../lib/api';

const STORAGE_KEY = 'eynayim-tovot.volunteer';
const COORDINATOR_KEY = 'eynayim-tovot.coordinator';
const MOKAD_KEY = 'eynayim-tovot.mokad';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [volunteer, setVolunteer] = useState(null);
  const [coordinatorSession, setCoordinatorSession] = useState(null);
  const [mokadSession, setMokadSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [profileRefreshed, setProfileRefreshed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVolunteer(JSON.parse(raw));
      const rawCoordinator = localStorage.getItem(COORDINATOR_KEY);
      if (rawCoordinator) setCoordinatorSession(JSON.parse(rawCoordinator));
      const rawMokad = localStorage.getItem(MOKAD_KEY);
      if (rawMokad) setMokadSession(JSON.parse(rawMokad));
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  // Picks up profile fields added after this device's original login (e.g.
  // phone) without requiring a coordinator to reset the device and the
  // volunteer to log in again — silent, and never blocks the cached session
  // if it fails (offline, etc). `profileRefreshed` lets a page that depends
  // on a fresh field (e.g. the report form needing `phone`) wait for this to
  // settle instead of racing it — without it, opening the app and jumping
  // straight to that page could render before the refresh resolves.
  useEffect(() => {
    if (!volunteer?.id) {
      setProfileRefreshed(true);
      return;
    }
    setProfileRefreshed(false);
    refreshVolunteer(volunteer.id)
      .then((data) => {
        setVolunteer(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      })
      .catch(() => {})
      .finally(() => setProfileRefreshed(true));
  }, [volunteer?.id]);

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

  const unlockMokad = useCallback(
    async (password) => {
      if (!volunteer) throw new Error('not_logged_in');
      const { name } = await mokadAuth(volunteer.id, password);
      const session = { volunteerId: volunteer.id, password, name };
      setMokadSession(session);
      localStorage.setItem(MOKAD_KEY, JSON.stringify(session));
      return session;
    },
    [volunteer]
  );

  const lockMokad = useCallback(() => {
    setMokadSession(null);
    localStorage.removeItem(MOKAD_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        volunteer,
        ready,
        profileRefreshed,
        login,
        coordinatorSession,
        unlockCoordinator,
        lockCoordinator,
        mokadSession,
        unlockMokad,
        lockMokad,
      }}
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
