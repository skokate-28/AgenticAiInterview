import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Sparkles } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const InterviewSetup = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) return alert('Please select a PDF resume first.');

    const userId = localStorage.getItem('userId');
    if (!userId) return alert('User ID missing. Please log in again.');

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', userId);

    try {
      const res = await axios.post('http://localhost:5000/api/interview/start', formData);
      navigate('/interview-session', { state: { initialData: res.data } });
    } catch (err) {
      console.error(err);
      alert('Upload failed. Ensure backend is running and Groq API key is valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <AppHeader
        onBrandClick={() => navigate('/dashboard')}
        actions={
          <button type="button" onClick={() => navigate('/dashboard')} className="ghost-btn">Dashboard</button>
        }
      />

      <div className="dashboard-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="panel" style={{ width: '100%', maxWidth: 560 }}>
          <div className="panel-inner" style={{ padding: 32 }}>
            <div className="panel-header" style={{ display: 'block', marginBottom: 14 }}>
              <div className="feature-icon" style={{ marginBottom: 18 }}>
                <BrainCircuit size={20} />
              </div>
              <div className="page-kicker">Session</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '2rem' }}>Upload your résumé</h3>
            </div>

            <p className="muted" style={{ marginBottom: 24 }}>
              Our AI will extract your skills and instantly begin a tailored technical interview.
            </p>

            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="resumeFile">Resume PDF</label>
              <input
                id="resumeFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ padding: 14 }}
              />
            </div>

            <button onClick={handleUpload} disabled={loading || !file} className="primary-btn full-width-btn">
              <Sparkles size={16} />
              {loading ? 'Analyzing Resume & Booting AI...' : 'Start Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;