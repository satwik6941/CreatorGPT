import React from 'react';
import FullScreenDashboard from '@/components/FullScreenDashboard';

const Dashboard = () => {
  const handleNewAnalysis = () => {
    // Navigate back to start a new analysis
    window.location.href = '/creator-profile';
  };

  // Always show the dashboard directly
  return <FullScreenDashboard onNewAnalysis={handleNewAnalysis} />;
};

export default Dashboard;
