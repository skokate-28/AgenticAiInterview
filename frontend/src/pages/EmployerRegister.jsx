import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const EmployerRegister = () => {
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name || !uid) return alert('Name and UID required');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/employer/register', { name, uid });
      localStorage.setItem('companyId', res.data.companyId);
      localStorage.setItem('companyName', res.data.name);
      localStorage.setItem('companyUid', res.data.uid);
      navigate('/employer/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="app-shell">
      <AppHeader
        actions={
          <>
            <button type="button" onClick={() => navigate('/login')} className="ghost-btn">For candidates</button>
            <button type="button" onClick={() => navigate('/')} className="ghost-btn">Home</button>
          </>
        }
      />

      <div className="auth-layout">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="micro-badge">Employer workspace</div>
            <h2>Signal over volume.</h2>
            <p className="lede">Post a role once. Let the graph extract skills and rank candidates by evidence, not résumé theater.</p>

            <div className="feature-list">
              {[
                'Post roles in minutes',
                'Extract JD skills automatically',
                'Rank talent with accumulated scores'
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
            <h3>Register your company</h3>
            <p className="form-subtitle">Create a workspace to post roles and review ranked candidates.</p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="companyName">Company name</label>
                <input
                  id="companyName"
                  type="text"
                  value={name}
                  placeholder="Northwind Labs"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="companyUid">Company UID</label>
                <input
                  id="companyUid"
                  type="text"
                  value={uid}
                  placeholder="northwind-2026"
                  onChange={(e) => setUid(e.target.value)}
                />
              </div>

              <button type="button" onClick={handleSubmit} className="primary-btn full-width-btn" disabled={loading}>
                {loading ? 'Creating workspace…' : 'Create workspace'} <ArrowRight size={16} />
              </button>
            </div>

            <div className="auth-footer">
              Already registered?{' '}
              <button type="button" onClick={() => navigate('/login')}>
                Candidate login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerRegister;
