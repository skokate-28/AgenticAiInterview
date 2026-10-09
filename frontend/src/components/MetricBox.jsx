import React from 'react';

const MetricBox = ({ label, value, color, icon, isText = false, tone }) => {
  const toneClass = tone || (color?.includes('emerald') ? 'good' : color?.includes('rose') ? 'bad' : 'mid');

  return (
    <div className="metric-box">
      <div className="small-label">
        {icon} {label}
      </div>
      <strong className={toneClass}>
        {value !== undefined ? (isText ? value : Number(value).toFixed(3)) : 'N/A'}
      </strong>
    </div>
  );
};

export default MetricBox;
