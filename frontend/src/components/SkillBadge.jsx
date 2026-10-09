import React from 'react';

const SkillBadge = ({ skill, className = '' }) => {
  return <span className={`badge violet ${className}`.trim()}>{skill}</span>;
};

export default SkillBadge;
