import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Eye, EyeOff } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, formData);
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.userId);
        localStorage.setItem('username', res.data.username);
        navigate('/dashboard');
      } else {
        alert('Account created! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Authentication failed.';
      alert(errMsg);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader
        actions={
          <>
            <button type="button" onClick={() => navigate('/employer/register')} className="ghost-btn">For employers</button>
            <button type="button" onClick={() => navigate('/')} className="ghost-btn">Home</button>
          </>
        }
      />

      <div className="auth-layout">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="micro-badge">Candidate workspace</div>
            <h2>Evaluate. Adapt. <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent-2)' }}>Hire.</em></h2>
            <p className="lede">A composed interview room — adaptive questions, persistent skill memory, and scoring you can stand behind.</p>

            <div className="feature-list">
              {[
                'AI-graded technical interviews',
                'Adaptive follow-up questions',
                'Skill progression across sessions'
              ].map((item) => (
                <div key={item} className="feature-list-item">
                  <span style={{ color: 'var(--mint)', display: 'inline-flex' }}>
                    <BadgeCheck size={18} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-card">
            <h3>{isLogin ? 'Welcome back' : 'Create your profile'}</h3>
            <p className="form-subtitle">
              {isLogin ? 'Continue your evaluation journey.' : 'A few details, then your first interview.'}
            </p>

            <form onSubmit={handleSubmit} className="form-grid">
              {!isLogin && (
                <div className="field">
                  <label htmlFor="username">Full name</label>
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    placeholder="Jordan Hale"
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  placeholder="you@studio.com"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    placeholder="••••••••"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: 52 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="ghost-btn"
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: '8px 10px',
                      borderRadius: 12,
                      minWidth: 40,
                      justifyContent: 'center'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="primary-btn full-width-btn">
                {isLogin ? 'Enter workspace' : 'Create account'} <ArrowRight size={16} />
              </button>
            </form>

            <div className="auth-footer">
              {isLogin ? 'New here?' : 'Already registered?'}{' '}
              <button type="button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Create account' : 'Log in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
