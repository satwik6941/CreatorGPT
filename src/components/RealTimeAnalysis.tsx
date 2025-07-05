import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { apiService } from '@/services/api';
import { 
  Play, 
  Brain, 
  Youtube, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  BarChart3,
  ArrowLeft
} from 'lucide-react';

interface AnalysisProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  step: string;
  message: string;
  progress: number;
  channel_info?: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  error?: string;
  logs?: string[];
}

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

interface Props {
  onAnalysisComplete?: (data: AnalysisData) => void;
}

const RealTimeAnalysis: React.FC<Props> = ({ onAnalysisComplete }) => {
  const [searchParams] = useSearchParams();
  const [channelId, setChannelId] = useState(searchParams.get('channelId') || '');
  const [analysisState, setAnalysisState] = useState<AnalysisProgress>({
    status: 'idle',
    step: '',
    message: '',
    progress: 0,
    logs: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const startAnalysis = useCallback(async (channelIdToUse?: string) => {
    const idToUse = channelIdToUse || channelId;
    if (!idToUse.trim()) {
      return;
    }

    setIsAnalyzing(true);
    setLogs([]);
    setAnalysisState({
      status: 'running',
      step: 'initialization',
      message: 'Starting analysis...',
      progress: 0,
      logs: []
    });

    try {
      await apiService.startAnalysis(idToUse);
    } catch (error) {
      console.error('Error starting analysis:', error);
      setAnalysisState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start analysis. Please check your connection and try again.',
      }));
      setIsAnalyzing(false);
    }
  }, [channelId]);

  // Auto-start analysis if channel ID is provided in URL
  useEffect(() => {
    const urlChannelId = searchParams.get('channelId');
    if (urlChannelId && !isAnalyzing && analysisState.status === 'idle') {
      setChannelId(urlChannelId);
      console.log('Auto-starting analysis for channel:', urlChannelId);
      // Start analysis automatically with a short delay
      setTimeout(() => {
        startAnalysis(urlChannelId);
      }, 500);
    }
  }, [searchParams, isAnalyzing, analysisState.status, startAnalysis]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (isAnalyzing) {
      console.log('Establishing WebSocket connection...');
      const ws = apiService.createWebSocket(
        (data) => {
          console.log('Received WebSocket data:', data);
          setAnalysisState(data);
          
          // Add new log entries
          if (data.message) {
            setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${data.message}`]);
          }
          
          // Check if analysis is complete
          if (data.status === 'completed' && data.progress >= 100) {
            setIsAnalyzing(false);
            setTimeout(() => {
              if (onAnalysisComplete) {
                // Map WebSocketMessage to AnalysisData
                const analysisData: AnalysisData = {
                  channel_info: data.channel_info,
                  sentiment_summary: {
                    positive: 0,
                    negative: 0,
                    neutral: 0
                  }
                };
                onAnalysisComplete(analysisData);
              }
            }, 2000); // Show completion for 2 seconds before transitioning
          } else if (data.status === 'error') {
            setIsAnalyzing(false);
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          setAnalysisState(prev => ({
            ...prev,
            status: 'error',
            error: 'Connection error. Please check your network and try again.'
          }));
        }
      );
      
      wsRef.current = ws;
      
      return () => {
        if (ws) {
          ws.close();
        }
      };
    }
  }, [isAnalyzing, onAnalysisComplete]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      startAnalysis();
    }
  };

  const handleBackToHome = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    window.location.href = '/';
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'youtube_extraction':
      case 'youtube_start':
      case 'youtube_complete':
        return <Youtube className="w-5 h-5" />;
      case 'llm_processing':
      case 'llm_start':
      case 'llm_complete':
        return <Brain className="w-5 h-5" />;
      case 'sentiment_analysis':
      case 'dashboard_generation':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-neon-green';
      case 'error':
        return 'text-bright-red';
      case 'running':
        return 'text-electric-blue';
      default:
        return 'text-gray-400';
    }
  };

  if (analysisState.status === 'completed') {
    return (
      <div className="loading-container">
        <div className="loading-background"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <Card className="glass-card max-w-2xl mx-auto">
            <CardContent className="p-12">
              <div className="mb-8">
                <CheckCircle className="w-20 h-20 text-neon-green mx-auto mb-6 animate-bounce" />
                <h2 className="text-3xl font-bold text-neon-green mb-4">Analysis Complete!</h2>
                <p className="text-gray-300 text-lg">
                  Your YouTube channel analysis has been completed successfully.
                </p>
              </div>
              
              {analysisState.channel_info && (
                <div className="glass-effect p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-electric-blue">
                    {analysisState.channel_info.channel_name}
                  </h3>
                  <div className="flex justify-center space-x-6 text-sm text-gray-300">
                    <span>Subscribers: {analysisState.channel_info.subscriber_count}</span>
                    <span>Comments Analyzed: {analysisState.channel_info.total_comments?.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    if (onAnalysisComplete) {
                      const analysisData: AnalysisData = {
                        channel_info: analysisState.channel_info,
                        sentiment_summary: {
                          positive: 65,
                          negative: 15,
                          neutral: 20
                        }
                      };
                      onAnalysisComplete(analysisData);
                    }
                  }}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-white py-3 text-lg font-semibold transition-all duration-300 hover:scale-105"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  View Dashboard
                </Button>
                
                <Button
                  onClick={handleBackToHome}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Start New Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="loading-container">
        <div className="loading-background"></div>
        <div className="container mx-auto px-6 relative z-10">
          <Card className="glass-card max-w-4xl mx-auto">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-electric-blue mb-2">
                Analyzing Your Channel
              </CardTitle>
              {analysisState.channel_info && (
                <div className="text-lg text-gray-300">
                  {analysisState.channel_info.channel_name}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">
                    Overall Progress
                  </span>
                  <span className="text-sm text-electric-blue font-bold">
                    {analysisState.progress}%
                  </span>
                </div>
                <Progress 
                  value={analysisState.progress} 
                  className="h-3 bg-dark-gray border border-electric-blue/30"
                />
              </div>

              {/* Current Step */}
              <div className="glass-effect p-6 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`${getStatusColor(analysisState.status)} animate-pulse`}>
                    {getStepIcon(analysisState.step)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-electric-blue text-electric-blue bg-electric-blue/10"
                  >
                    {analysisState.step.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {analysisState.message || 'Processing...'}
                </p>
              </div>

              {/* Channel Info */}
              {analysisState.channel_info && (
                <div className="glass-effect p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-electric-blue">
                        {analysisState.channel_info.subscriber_count}
                      </div>
                      <div className="text-sm text-gray-400">Subscribers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-neon-green">
                        {analysisState.channel_info.total_comments?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-gray-400">Comments</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-bright-red">
                        {Math.round((analysisState.progress / 100) * (analysisState.channel_info.total_comments || 0)).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Processed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Logs */}
              <div className="glass-effect p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Live Progress
                </h4>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                  {logs.slice(-10).map((log, index) => (
                    <div key={index} className="text-xs text-gray-400 font-mono">
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-xs text-gray-500 italic">
                      Waiting for updates...
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`glass-effect p-4 rounded-lg transition-all duration-300 ${
                  analysisState.step.includes('youtube') ? 'border-electric-blue/50 glow-electric-blue' : 'opacity-60'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Youtube className="w-5 h-5 text-electric-blue" />
                    <span className="font-semibold text-sm">Data Collection</span>
                  </div>
                  <p className="text-xs text-gray-400">Extracting YouTube comments and metadata</p>
                </div>
                
                <div className={`glass-effect p-4 rounded-lg transition-all duration-300 ${
                  analysisState.step.includes('llm') ? 'border-neon-green/50 glow-neon-green' : 'opacity-60'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-5 h-5 text-neon-green" />
                    <span className="font-semibold text-sm">AI Processing</span>
                  </div>
                  <p className="text-xs text-gray-400">Analyzing content with advanced AI models</p>
                </div>
                
                <div className={`glass-effect p-4 rounded-lg transition-all duration-300 ${
                  analysisState.step.includes('sentiment') || analysisState.step.includes('dashboard') ? 'border-bright-red/50 glow-bright-red' : 'opacity-60'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-bright-red" />
                    <span className="font-semibold text-sm">Insight Generation</span>
                  </div>
                  <p className="text-xs text-gray-400">Creating visualizations and insights</p>
                </div>
              </div>

              {/* Error State */}
              {analysisState.status === 'error' && (
                <div className="glass-effect p-4 rounded-lg border border-bright-red/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-bright-red" />
                    <span className="font-semibold text-bright-red">Analysis Error</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {analysisState.error || 'An unexpected error occurred'}
                  </p>
                  <Button
                    onClick={() => {
                      setIsAnalyzing(false);
                      setAnalysisState({
                        status: 'idle',
                        step: '',
                        message: '',
                        progress: 0,
                        logs: []
                      });
                    }}
                    variant="outline"
                    className="mt-4 border-bright-red text-bright-red hover:bg-bright-red hover:text-white"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className="loading-background"></div>
      <div className="container mx-auto px-6 text-center relative z-10">
        {/* Header with back button */}
        <div className="absolute top-6 left-6">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Home
          </Button>
        </div>

        <Card className="glass-card max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-electric-blue mb-2">
              Analysis Required
            </CardTitle>
            <p className="text-gray-300">
              No active analysis found. Please start a new analysis from the Creator Profile page.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = '/creator-profile'}
                className="w-full bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold glow-button"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Start New Analysis
              </Button>
              
              <Button
                onClick={() => window.location.href = '/real-analytics'}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                size="lg"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics Dashboard
              </Button>
            </div>
            
            {/* Testing Options */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 text-center">Testing Options</p>
              <Button
                onClick={() => {
                  if (onAnalysisComplete) {
                    const analysisData: AnalysisData = {
                      channel_info: {
                        channel_name: "Test Channel",
                        subscriber_count: "1.2M",
                        total_comments: 5000
                      },
                      sentiment_summary: {
                        positive: 65,
                        negative: 15,
                        neutral: 20
                      }
                    };
                    onAnalysisComplete(analysisData);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full border-neon-green/30 text-neon-green hover:bg-neon-green/10"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Test Mock Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealTimeAnalysis;
