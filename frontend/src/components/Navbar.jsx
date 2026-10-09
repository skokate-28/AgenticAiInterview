import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AppHeader from './AppHeader';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username') || 'Candidate';

  if (location.pathname === '/') return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <AppHeader
      onBrandClick={() => navigate('/dashboard')}
      actions={
        <>
          <div className="identity-chip">
            <span className="identity-kicker">Signed in</span>
            <span className="identity-name">{username}</span>
          </div>
          <button type="button" onClick={handleLogout} className="ghost-btn danger">
            <LogOut size={15} /> Logout
          </button>
        </>
      }
    />
  );
};

export default Navbar;
