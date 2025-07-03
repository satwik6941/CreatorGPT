import React from 'react';
import { useSearchParams } from 'react-router-dom';
import RealTimeLogger from '@/components/FinalRealTimeLogger';

const Analysis = () => {
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('channelId') || '';

  const handleNewAnalysis = () => {
    // Navigate back to start a new analysis
    window.location.href = '/creator-profile';
  };

  return (
    <div className="min-h-screen bg-deep-black">
      <RealTimeLogger />
    </div>
  );
};

export default Analysis;
