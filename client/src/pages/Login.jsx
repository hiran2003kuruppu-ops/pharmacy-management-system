import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@pharmacare.lk');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="logo-badge" style={{ margin: '0 auto 12px', width: '48px', height: '48px', fontSize: '24px' }}>+</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>PharmaCare Pro</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MERN Role-Based Authentication Portal</p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', color: '#991b1b', fontSize: '12.5px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div><strong>Demo Test Credentials:</strong></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ flex: 1, fontSize: '11px' }}
              onClick={() => { setEmail('admin@pharmacare.lk'); setPassword('admin123'); }}
            >
              Fill Admin
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ flex: 1, fontSize: '11px' }}
              onClick={() => { setEmail('pharmacist@pharmacare.lk'); setPassword('pharma123'); }}
            >
              Fill Pharmacist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
