import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const Preferences = () => {
  const [prefs, setPrefs] = useState({ preferredRoles: [], preferredType: 'internship', preferredPay: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } });
        const p = res.data.preferences || {};
        setPrefs({ preferredRoles: p.preferredRoles || [], preferredType: p.preferredType || 'internship', preferredPay: p.preferredPay || '' });
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    };
    fetch();
    // eslint-disable-next-line
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/user/preferences', { preferredRoles: prefs.preferredRoles, preferredType: prefs.preferredType, preferredPay: prefs.preferredPay }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Preferences saved');
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="page-shell">
      <AppHeader
        onBrandClick={() => navigate('/dashboard')}
        actions={
          <>
            <button type="button" onClick={() => navigate('/dashboard')} className="ghost-btn">Dashboard</button>
            <button type="button" onClick={logout} className="ghost-btn danger">
              <LogOut size={15} /> Logout
            </button>
          </>
        }
      />

      <div className="dashboard-page" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="panel" style={{ width: '100%', maxWidth: 720 }}>
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <div className="page-kicker">Candidate</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '2rem' }}>Job preferences</h3>
              </div>
              <span className="badge violet"><Sparkles size={12} /> Matching</span>
            </div>

            <div className="form-stack">
              <div className="field">
                <label htmlFor="roles">Preferred Roles</label>
                <input
                  id="roles"
                  value={prefs.preferredRoles.join(', ')}
                  onChange={(e) => setPrefs({ ...prefs, preferredRoles: e.target.value.split(',').map((s) => s.trim()) })}
                  placeholder="Frontend, Backend, Data" 
                />
              </div>

              <div className="field">
                <label htmlFor="type">Preferred Type</label>
                <select id="type" value={prefs.preferredType} onChange={(e) => setPrefs({ ...prefs, preferredType: e.target.value })}>
                  <option value="internship">Internship</option>
                  <option value="full-time">Full Time</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="pay">Preferred Pay</label>
                <input
                  id="pay"
                  type="number"
                  value={prefs.preferredPay}
                  onChange={(e) => setPrefs({ ...prefs, preferredPay: e.target.value })}
                  placeholder="500000"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={handleSave} className="primary-btn">{loading ? 'Saving...' : 'Save Preferences'}</button>
                <button onClick={() => navigate('/dashboard')} className="ghost-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
