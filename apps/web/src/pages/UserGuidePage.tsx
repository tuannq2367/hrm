import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserGuideContent } from '../components/UserGuide/UserGuideContent';

export const UserGuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '4px 0 24px 0' }}>
      <UserGuideContent onNavigateTo={(path) => navigate(path)} />
    </div>
  );
};
