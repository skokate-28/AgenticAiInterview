import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, LogOut, PlayCircle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const Dashboard = () => {
  const [data, setData] = useState({ sessions: [], weakAreas: [] });
  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();

  const CHART_COLORS = ['#6C63FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/interview/dashboard/${userId}`);
        setData(res.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const formatChartData = (sessions) => {
    return sessions.map((session) => {
      const formattedData = { timestamp: new Date(session.timestamp).toLocaleDateString() };
      session.skillScores.forEach((scoreObj) => {
        formattedData[scoreObj.skill] = scoreObj.finalScore;
      });
      return formattedData;
    });
  };

  const getUniqueSkills = (sessions) => {
    const skills = new Set();
    sessions.forEach((session) => {
      session.skillScores.forEach((scoreObj) => skills.add(scoreObj.skill));
    });
    return Array.from(skills);
  };

  const chartData = formatChartData(data.sessions);
  const uniqueSkills = getUniqueSkills(data.sessions);
  const weakAreasBySkill = data.weakAreas.reduce((acc, area) => {
    if (!acc[area.skill]) acc[area.skill] = [];
    acc[area.skill].push(area);
    return acc;
  }, {});
  const weakAreaSkills = Object.keys(weakAreasBySkill);

  const totalSessions = data.sessions.length;
  const totalSkills = uniqueSkills.length;
  const weakAreaCount = data.weakAreas.length;
  const averageScore = data.sessions.length
    ? (data.sessions.reduce((sum, session) => sum + (session.skillScores?.reduce((s, score) => s + Number(score.finalScore || 0), 0) || 0), 0) / Math.max(data.sessions.length, 1))
    : 0;

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
            <div className="identity-chip">
              <span className="identity-kicker">Candidate</span>
              <span className="identity-name">{localStorage.getItem('username') || 'Candidate'}</span>
            </div>
            <button type="button" onClick={logout} className="ghost-btn danger">
              <LogOut size={15} /> Logout
            </button>
          </>
        }
      />

      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <div className="page-kicker">Workspace</div>
            <h1>Your evaluation graph</h1>
          </div>
          <div className="dashboard-header-actions">
            <button onClick={() => navigate('/preferences')} className="ghost-btn">Preferences</button>
            <button onClick={() => navigate('/interview-setup')} className="primary-btn">
              <PlayCircle size={18} /> Start New Interview
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{totalSessions}</div>
            <label>Sessions Completed</label>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalSkills}</div>
            <label>Skills Assessed</label>
          </div>
          <div className="stat-card">
            <div className="stat-number">{weakAreaCount}</div>
            <label>Weak Areas Remaining</label>
          </div>
          <div className="stat-card">
            <div className="stat-number">{averageScore ? Number(averageScore).toFixed(2) : '0.00'}</div>
            <label>Average Score</label>
          </div>
        </div>

        {data.sessions.length > 0 ? (
          <div className="dashboard-stack">
            <div className="panel">
              <div className="panel-inner">
                <div className="panel-header">
                  <h3>Skill Progression</h3>
                  <span className="badge violet">Live</span>
                </div>

                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2E3148" />
                      <XAxis dataKey="timestamp" stroke="#94A3B8" />
                      <YAxis domain={[0, 1]} stroke="#94A3B8" />
                      <Tooltip
                        contentStyle={{ background: '#10121c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#F5F4F8' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      {uniqueSkills.map((skill, index) => (
                        <Line
                          key={skill}
                          type="monotone"
                          dataKey={skill}
                          name={skill}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-inner">
                <div className="panel-header">
                  <h3>Your Skill Profile</h3>
                </div>

                <div className="skill-profile">
                  {uniqueSkills.map((skill) => {
                    const skillScores = data.sessions.flatMap((session) => session.skillScores || []).filter((score) => score.skill === skill);
                    const latestScore = skillScores.length ? Number(skillScores[skillScores.length - 1].finalScore || 0) * 100 : 0;
                    return (
                      <div key={skill} className="skill-row">
                        <strong>{skill}</strong>
                        <div className="skill-track-large"><span style={{ width: `${Math.max(0, Math.min(100, latestScore))}%` }} /></div>
                        <div className="skill-score">{Math.round(latestScore)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-inner">
                <div className="panel-header">
                  <h3>Areas to Improve</h3>
                </div>

                {weakAreaSkills.length > 0 ? (
                  <div className="weak-area-list">
                    {weakAreaSkills.map((skill) => (
                      <div key={skill} className="weak-area-item">
                        <div className="weak-area-head">
                          <strong>{skill}</strong>
                          <span className="badge amber">Will be revisited</span>
                        </div>
                        <div className="muted">
                          {weakAreasBySkill[skill].map((area, index) => (
                            <div key={`${skill}-${index}`} style={{ marginTop: index ? 8 : 0 }}>
                              {area.difficulty} • {area.comment}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ minHeight: 180 }}>
                    <div className="empty-inner">
                      <div className="empty-icon"><AlertCircle size={28} /></div>
                      <h4 style={{ marginBottom: 8 }}>No weak areas yet</h4>
                      <p className="empty-copy">Start your first interview to build your skill profile.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-inner" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div className="empty-icon" style={{ marginBottom: 18 }}><Target size={28} /></div>
              <h3 style={{ marginBottom: 8 }}>No Interview Data Yet</h3>
              <p className="empty-copy" style={{ marginBottom: 20 }}>Complete your first interview to see your progress and metrics here.</p>
              <button onClick={() => navigate('/interview-setup')} className="primary-btn">
                <PlayCircle size={18} /> Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;