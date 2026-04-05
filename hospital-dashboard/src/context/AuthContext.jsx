import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('hospital_token');
    if (!token) { setLoading(false); return; }
    const timeout = setTimeout(() => setLoading(false), 10000);
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        connectSocket(token);
      })
      .catch(() => localStorage.removeItem('hospital_token'))
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

  function connectSocket(token) {
    const s = io(window.location.origin, { auth: { token } });
    s.on('connect', () => console.log('WebSocket connected'));
    setSocket(s);
  }

  async function login(username, password) {
    const { data } = await api.post('/auth/staff/login', { username, password });
    if (data.user.role !== 'provider') throw new Error('Access denied: providers only');
    localStorage.setItem('hospital_token', data.token);
    setUser(data.user);
    connectSocket(data.token);
  }

  function logout() {
    localStorage.removeItem('hospital_token');
    socket?.disconnect();
    setUser(null);
    setSocket(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, socket }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
