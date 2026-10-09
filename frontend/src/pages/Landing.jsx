import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Building2, PlayCircle, Sparkles, Workflow } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const Landing = () => {
  const navigate = useNavigate();

  const featureCards = [
    {
      icon: <BrainCircuit size={18} />,
      title: 'Adaptive questioning',
      description: 'Difficulty shifts in real time from cumulative performance — not a static question bank.'
    },
    {
      icon: <Workflow size={18} />,
      title: 'Cross-session memory',
      description: 'Skill profiles persist. Every interview resumes exactly where the last one left off.'
    },
    {
      icon: <Building2 size={18} />,
      title: 'Evidence-based matching',
      description: 'Employers post a JD. Required skills are extracted and candidates ranked by accumulated evidence.'
    }
  ];

  return (
    <div className="app-shell">
      <AppHeader
        actions={
          <>
            <button type="button" onClick={() => navigate('/employer/register')} className="ghost-btn">
              For employers
            </button>
            <button type="button" onClick={() => navigate('/login')} className="primary-btn">
              For candidates
            </button>
          </>
        }
      />

      <main>
        <section className="hero">
          <div className="hero-copy rise">
            <div className="micro-badge">
              <Sparkles size={12} /> Powered by agentic AI
            </div>
            <h1>
              Hire with <em>precision.</em>
              <br />
              Interview with depth.
            </h1>
            <p>
              An evaluation platform that grades technical interviews, tracks skill growth across sessions, and surfaces the strongest talent — automatically.
            </p>

            <div className="hero-actions">
              <button type="button" onClick={() => navigate('/employer/register')} className="primary-btn">
                Get started as employer <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate('/login')} className="ghost-btn">
                <PlayCircle size={16} /> Take an interview
              </button>
            </div>

            <div className="hero-trust">
              <span>Adaptive questioning</span>
              <span>Cross-session memory</span>
              <span>Grounded scoring</span>
            </div>
          </div>

        </section>

        <section className="section section-surface">
          <div className="section-narrow">
            <div className="section-heading">
              <div className="section-kicker">The difference</div>
              <h2>Built unlike every other interview tool.</h2>
              <p>Designed for signal, not theater — a quieter, more rigorous way to evaluate talent.</p>
            </div>

            <div className="features-grid">
              {featureCards.map(({ icon, title, description }) => (
                <div key={title} className="feature-card">
                  <div className="feature-icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-narrow">
            <div className="section-heading">
              <div className="section-kicker">How it works</div>
              <h2>Two paths. One evaluation graph.</h2>
            </div>

            <div className="how-grid">
              <div className="step-card">
                <h3>For candidates</h3>
                <div className="step-list">
                  {[
                    ['Create a profile', 'Register and upload a resume to seed your skill graph.'],
                    ['Sit the interview', 'Answer questions that adapt to demonstrated strength and gaps.'],
                    ['Track the trajectory', 'Review skill progress and keep compounding across sessions.']
                  ].map(([title, copy], index) => (
                    <div key={title} className="step-item">
                      <div className="step-number">{String(index + 1).padStart(2, '0')}</div>
                      <div>
                        <h4>{title}</h4>
                        <p>{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="step-card">
                <h3>For employers</h3>
                <div className="step-list">
                  {[
                    ['Register the company', 'Secure a unique employer UID and workspace.'],
                    ['Post the role', 'Share a description, type, and compensation details.'],
                    ['Review ranked talent', 'See candidates ordered by evidence against the JD.']
                  ].map(([title, copy], index) => (
                    <div key={title} className="step-item">
                      <div className="step-number">{String(index + 1).padStart(2, '0')}</div>
                      <div>
                        <h4>{title}</h4>
                        <p>{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2>Ready when you are.</h2>
            <p>Start evaluating with a quieter, more exacting interview stack.</p>
          </div>
          <button type="button" onClick={() => navigate('/employer/register')} className="primary-btn">
            Open employer workspace <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <footer className="footer">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-text">Smart<span>Interview</span></span>
        </div>
        <div>Agentic AI · LangGraph · Groq</div>
      </footer>
    </div>
  );
};

export default Landing;
