import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, CircleDashed, Send, Target } from 'lucide-react';
import AppHeader from '../components/AppHeader';

const InterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(location.state?.initialData);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastMetrics, setLastMetrics] = useState(null);

  if (!sessionData) {
    return (
      <div className="page-shell" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="panel" style={{ maxWidth: 420, width: '100%' }}>
          <div className="panel-inner" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 10 }}>Invalid session data.</h3>
            <button onClick={() => navigate('/interview-setup')} className="primary-btn">
              Go back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    const currentQuestion = sessionData?.question || '';
    try {
      const res = await axios.post('http://localhost:5000/api/interview/answer', {
        threadId: sessionData.threadId,
        answer,
        question: currentQuestion,
        userId: localStorage.getItem('userId')
      });

      if (res.data.metrics) {
        setLastMetrics(res.data.metrics);
      }

      if (res.data.isFinished) {
        navigate('/dashboard');
      } else {
        setSessionData((prev) => ({
          ...prev,
          question: res.data.question,
          currentSkill: res.data.currentSkill,
          questionMeta: res.data.questionMeta || null
        }));
        setShowFeedback(true);
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting answer.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setAnswer('');
  };

  return (
    <div className="page-shell">
      <AppHeader
        onBrandClick={() => navigate('/dashboard')}
        actions={
          <button type="button" onClick={() => navigate('/dashboard')} className="ghost-btn">Leave session</button>
        }
      />
      <div className="interview-shell" style={{ paddingTop: 28 }}>
      <div className="interview-wrap">
        {!showFeedback ? (
          <>
            <div className="interview-top">
              <div className="interview-tag">
                <Target size={14} />
                Current Topic: {sessionData?.currentSkill || 'Initializing...'}
              </div>

              <div className="question-card">
                <div className="label">Question</div>
                <h3>{sessionData?.question}</h3>
                {sessionData?.questionMeta?.weakAreaTargeted && (
                  <div className="badge amber" style={{ marginTop: 18 }}>Weak Area Resolution</div>
                )}
              </div>
            </div>

            <div className="answer-box">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your detailed technical explanation here..."
              />
              <div className="char-count">{answer.length} characters</div>
            </div>

            <button onClick={handleSubmitAnswer} disabled={loading || !answer.trim()} className="primary-btn full-width-btn" style={{ marginTop: 18 }}>
              {loading ? (
                <>
                  <CircleDashed size={16} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...
                </>
              ) : (
                <>
                  Submit Answer <Send size={16} />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="feedback-card" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 12 }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem' }}>Answer Evaluated</h3>
                  <p className="muted">Technical metrics have been updated based on your response depth.</p>
                </div>
              </div>
            </div>

            {lastMetrics && lastMetrics.weakAreaDetected && lastMetrics.comment && String(lastMetrics.comment).trim().length > 0 && (
              <div className="feedback-card" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="brand-mark" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239, 68, 68, 0.16)' }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Concept to Review</div>
                    <p style={{ fontSize: '1.03rem', lineHeight: 1.6 }}>“{lastMetrics.comment}”</p>
                  </div>
                </div>
              </div>
            )}

            <div className="metric-grid">
              <MetricBox label="Last Score" value={lastMetrics?.score} tone="good" icon={<CheckCircle2 size={16} />} />
              <MetricBox label="Cumulative Score" value={lastMetrics?.ct} tone="mid" icon={<BarChart3 size={16} />} />
              <MetricBox label="Uncertainty Width" value={lastMetrics?.wt} tone="mid" icon={<Target size={16} />} />
              <MetricBox label="Difficulty" value={lastMetrics?.difficulty} tone="bad" icon={<AlertTriangle size={16} />} isText />
            </div>

            <button onClick={handleNextQuestion} className="primary-btn full-width-btn" style={{ marginTop: 18 }}>
              Proceed to Next Question <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

const MetricBox = ({ label, value, tone, icon, isText = false }) => (
  <div className="metric-box">
    <div className="small-label">{icon} {label}</div>
    <strong className={tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'mid'}>
      {value !== undefined ? (isText ? value : Number(value).toFixed(3)) : 'N/A'}
    </strong>
  </div>
);

export default InterviewSession;