import React from 'react';

const EmployerJobCard = ({ job, onShowCandidates }) => {
  const isInternship = job.type === 'internship';

  return (
    <div className="job-card">
      <div className="job-card-head">
        <div>
          <h4>{job.title}</h4>
          <div className="job-meta">{isInternship ? 'Internship' : 'Full-time'} · {job.pay}</div>
        </div>
        <span className={`badge ${isInternship ? 'amber' : 'violet'}`}>
          {isInternship ? 'Internship' : 'Full-time'}
        </span>
      </div>

      <div className="job-meta" style={{ marginTop: 12, marginBottom: 12 }}>
        {new Date(job.createdAt).toLocaleDateString()}
      </div>

      <p className="muted">{job.description}</p>

      <div className="job-card-footer">
        <button type="button" onClick={() => onShowCandidates(job._id)} className="primary-btn">
          View candidates
        </button>
        <span className="badge amber">Live</span>
      </div>
    </div>
  );
};

export default EmployerJobCard;
