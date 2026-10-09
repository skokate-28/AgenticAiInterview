import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EmployerJobCard from '../components/EmployerJobCard';
import { useNavigate } from 'react-router-dom';
import CandidateListModal from '../components/CandidateListModal';
import { Briefcase, Sparkles, LogOut } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const companyId = localStorage.getItem('companyId');
  const companyName = localStorage.getItem('companyName');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'internship', pay: '' });
  const [candidatesModal, setCandidatesModal] = useState({ open: false, jobTitle: '', skills: [], candidates: [] });

  useEffect(() => {
    if (!companyId) return navigate('/employer/register');
    fetchJobs();
    // eslint-disable-next-line
  }, [companyId]);

  const fetchJobs = async () => {
    try {
      const uid = localStorage.getItem('companyUid');
      const res = await axios.get(`http://localhost:5000/api/employer/${companyId}/jobs`, { headers: { 'x-company-uid': uid } });
      setJobs(res.data.jobs || []);
    } catch (err) { console.error(err); }
  };

  const createJob = async () => {
    if (!form.title || !form.description || !form.pay) return alert('Fill fields');
    setLoading(true);
    try {
      const uid = localStorage.getItem('companyUid');
      await axios.post(`http://localhost:5000/api/employer/${companyId}/jobs`, form, { headers: { 'x-company-uid': uid } });
      setForm({ title: '', description: '', type: 'internship', pay: '' });
      fetchJobs();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleShowCandidates = async (jobId, jobTitle) => {
    try {
      const uid = localStorage.getItem('companyUid');
      if (!uid) {
        alert('Missing company UID. Please register the workspace again.');
        return;
      }

      const res = await axios.get(`http://localhost:5000/api/employer/${companyId}/jobs/${jobId}/candidates`, {
        headers: { 'x-company-uid': uid }
      });
      setCandidatesModal({ open: true, jobTitle: jobTitle || 'Job', skills: res.data.skills || [], candidates: res.data.candidates || [] });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch candidates');
    }
  };

  const logout = () => {
    localStorage.removeItem('companyId');
    localStorage.removeItem('companyName');
    localStorage.removeItem('companyUid');
    navigate('/');
  };

  return (
    <div className="page-shell">
      <AppHeader
        onBrandClick={() => navigate('/employer/dashboard')}
        actions={
          <>
            <div className="identity-chip">
              <span className="identity-kicker">Company</span>
              <span className="identity-name">{companyName || 'Employer'}</span>
            </div>
            <button type="button" onClick={logout} className="ghost-btn danger">
              <LogOut size={15} /> Logout
            </button>
          </>
        }
      />

      <div className="dashboard-page">
        <div className="dashboard-layout">
          <aside className="panel">
            <div className="panel-inner">
              <div className="panel-header">
                <h3>Post a role</h3>
                <span className="badge violet"><Sparkles size={12} /> AI match</span>
              </div>

              <p className="muted" style={{ marginBottom: 20 }}>
                Our AI will extract required skills and rank matching candidates automatically.
              </p>

              <div className="form-stack">
                <div className="field">
                  <label htmlFor="jobTitle">Job Title</label>
                  <input id="jobTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Frontend Engineer" />
                </div>

                <div className="field">
                  <label htmlFor="jobDescription">Job Description</label>
                  <textarea id="jobDescription" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the role, responsibilities, and requirements..." />
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="jobType">Job Type</label>
                    <select id="jobType" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="internship">Internship</option>
                      <option value="full-time">Full-time</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="jobPay">Pay per month</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                      <input id="jobPay" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} placeholder="220000" style={{ paddingLeft: 28 }} />
                    </div>
                  </div>
                </div>

                <button onClick={createJob} className="primary-btn full-width-btn" disabled={loading}>
                  <Sparkles size={16} /> {loading ? 'Posting...' : 'Post Job'}
                </button>
              </div>
            </div>
          </aside>

          <section className="panel">
            <div className="panel-inner">
              <div className="panel-header">
                <h3>Your Listings</h3>
                <span className="badge violet">{jobs.length} jobs</span>
              </div>

              {jobs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-inner">
                    <div className="empty-icon"><Briefcase size={28} /></div>
                    <h4 style={{ marginBottom: 8 }}>No listings yet</h4>
                    <p className="empty-copy">Post your first role to start matching candidates.</p>
                  </div>
                </div>
              ) : (
                <div className="job-list">
                  {jobs.map((job) => (
                    <EmployerJobCard key={job._id} job={job} onShowCandidates={(id) => handleShowCandidates(id, job.title)} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <CandidateListModal open={candidatesModal.open} onClose={() => setCandidatesModal({ ...candidatesModal, open: false })} jobTitle={candidatesModal.jobTitle} skills={candidatesModal.skills} candidates={candidatesModal.candidates} />
    </div>
  );
};

export default EmployerDashboard;
