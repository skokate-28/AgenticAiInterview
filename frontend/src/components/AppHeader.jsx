import React from 'react';
import { useNavigate } from 'react-router-dom';

const AppHeader = ({ actions, onBrandClick }) => {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        aria-label="SmartInterview"
        onClick={() => (onBrandClick ? onBrandClick() : navigate('/'))}
      >
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span className="brand-text">
          Smart<span>Interview</span>
        </span>
      </button>
      <div className="topbar-actions">{actions}</div>
    </header>
  );
};

export default AppHeader;
