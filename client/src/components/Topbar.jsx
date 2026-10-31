import React from 'react';
import { Moon, Sun, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ title, theme, toggleTheme }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        {/* Dark / Light Mode Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Pill */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="user-badge">
              <div className="user-avatar">{user?.name ? user.name.charAt(0) : 'U'}</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700' }}>{user?.name || 'Pharmacist Admin'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {user?.role || 'admin'} (NMRA Licensed)
                </div>
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
