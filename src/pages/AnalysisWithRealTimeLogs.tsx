import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import RealTimeAnalysis from '@/components/RealTimeAnalysis';
import FullScreenDashboard from '@/components/FullScreenDashboard';

interface AnalysisData {
  channel_info?: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  sentiment_summary?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  // Add other properties as needed
}

const AnalysisWithRealTimeLogs = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showDashboard, setShowDashboard] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  const channelId = searchParams.get('channelId');

  useEffect(() => {
    // If no channel ID is provided, redirect to creator profile
    if (!channelId) {
      navigate('/creator-profile');
    }
  }, [channelId, navigate]);

  const handleAnalysisComplete = (data: AnalysisData) => {
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
