import React from 'react';

const CandidateListModal = ({ open, onClose, jobTitle, skills, candidates }) => {
  if (!open) return null;

  const formatScore = (score) => {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) return '—';
    return numericScore <= 1 ? `${Math.round(numericScore * 100)}%` : numericScore;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 16 }}>
          <div>
            <div className="page-kicker">Ranked talent</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '2.2rem' }}>{jobTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="ghost-btn">Close</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 className="muted" style={{ marginBottom: 12, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            Extracted skills & weights
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((s) => (
              <div key={s.skill} className="badge violet">
                {s.skill} <span style={{ opacity: 0.75 }}>· {s.weight}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {candidates.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 160 }}>
              <div className="empty-inner">
                <p className="empty-copy">No candidates matched this role yet.</p>
              </div>
            </div>
          ) : candidates.map((c) => (
            <div key={c.userId} className="job-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>
                    {c.username} <span className="muted" style={{ fontWeight: 500 }}>· {c.email}</span>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Composite score <strong style={{ color: 'var(--text-primary)' }}>{c.totalScore}</strong>
                  </div>
                </div>
                <span className="badge violet">{c.preferences?.preferredType || '—'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
                {c.skills.map((s) => (
                  <div key={s.skill} className="metric-box" style={{ padding: 12 }}>
                    <div className="small-label">{s.skill}</div>
                    <strong className="mid" style={{ fontSize: '1.2rem' }}>{formatScore(s.score)}</strong>
                  </div>
                ))}
              </div>

              <div className="muted" style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.85rem' }}>
                <span>Roles: {(c.preferences?.preferredRoles || []).join(', ') || '—'}</span>
                <span>Pay: {c.preferences?.preferredPay || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandidateListModal;
