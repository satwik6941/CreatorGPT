import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import RealTimeAnalysis from '@/components/RealTimeAnalysis';
import FullScreenDashboard from '@/components/FullScreenDashboard';

const AnalysisWithRealTimeLogs = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showDashboard, setShowDashboard] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  
  const channelId = searchParams.get('channelId');

  useEffect(() => {
    // If no channel ID is provided, redirect to creator profile
    if (!channelId) {
      navigate('/creator-profile');
    }
  }, [channelId, navigate]);

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setShowDashboard(true);
  };

  const handleNewAnalysis = () => {
    setShowDashboard(false);
    setAnalysisData(null);
    navigate('/creator-profile');
  };

  if (showDashboard) {
    return <FullScreenDashboard onNewAnalysis={handleNewAnalysis} />;
  }

  return (
    <RealTimeAnalysis onAnalysisComplete={handleAnalysisComplete} />
  );
};

export default AnalysisWithRealTimeLogs;
