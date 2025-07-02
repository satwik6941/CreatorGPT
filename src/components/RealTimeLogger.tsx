import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Play, Square, RefreshCw, Wifi, WifiOff, BarChart3, CheckCircle } from 'lucide-react';
import DashboardDisplay from '@/components/DashboardDisplay';

interface AnalysisState {
  status: string;
  step: string;
  message: string;
  progress: number;
  channel_info?: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  error?: string;
  logs: Array<string | { message: string; timestamp: string }>;
}

interface RealTimeLoggerProps {
  channelId?: string;
  onAnalysisComplete?: (results: any) => void;
}

const RealTimeLogger: React.FC<RealTimeLoggerProps> = ({ 
  channelId, 
  onAnalysisComplete 
}) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    step: '',
    message: '',
    progress: 0,
    logs: []
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [inputChannelId, setInputChannelId] = useState(channelId || '');
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Construct WebSocket URL based on environment
      let wsUrl: string;
      
      if (process.env.NODE_ENV === 'production') {
        // In production, use same host with appropriate protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws/analysis`;
      } else {
        // In development, connect directly to backend server
        wsUrl = 'ws://localhost:8000/ws/analysis';
      }
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully to:', wsUrl);
          setIsConnected(true);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data: AnalysisState = JSON.parse(event.data);
            console.log('WebSocket received:', data); // Debug log
            
            setAnalysisState(prevState => {
              // Properly merge new data with existing state
              const newState = {
                ...prevState,
                ...data,
                // Always use logs from incoming data if present, otherwise keep existing
                logs: Array.isArray(data.logs) ? data.logs : prevState.logs
              };
              console.log('Updated analysis state:', newState); // Debug log
              return newState;
            });
            
            // Auto-scroll to bottom when new logs arrive
            if (scrollAreaRef.current && data.logs && data.logs.length > 0) {
              setTimeout(() => {
                const scrollArea = scrollAreaRef.current;
                if (scrollArea) {
                  scrollArea.scrollTop = scrollArea.scrollHeight;
                }
              }, 100);
            }
            
            // Handle analysis completion
            if (data.status === 'completed') {
              console.log('Analysis completed!'); // Debug log
              setIsCompleted(true);
              setIsAnalyzing(false);
              if (onAnalysisComplete) {
                onAnalysisComplete(data);
              }
            }
            
            if (data.status === 'error') {
              console.log('Analysis error:', data.error); // Debug log
              setIsAnalyzing(false);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.error('Raw message:', event.data);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected from:', wsUrl);
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (!isCompleted) { // Only reconnect if analysis is not completed
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }
          }, 3000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onAnalysisComplete]);

  const startAnalysis = async () => {
    if (!inputChannelId.trim()) {
      alert('Please enter a valid Channel ID');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/analyze' 
        : 'http://localhost:8000/api/analyze';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: inputChannelId.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start analysis');
      }

      console.log('Analysis started successfully');
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert(`Failed to start analysis: ${error}`);
      setIsAnalyzing(false);
    }
  };

  const testWebSocket = async () => {
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/test-websocket' 
        : 'http://localhost:8000/api/test-websocket';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('WebSocket test result:', result);
      }
    } catch (error) {
      console.error('Error testing WebSocket:', error);
    }
  };

  const stopAnalysis = async () => {
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/reset' 
        : 'http://localhost:8000/api/reset';
        
      await fetch(apiUrl, {
        method: 'POST',
      });
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error stopping analysis:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': case 'starting': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const startNewAnalysis = () => {
    setIsCompleted(false);
    setAnalysisState({
      status: 'idle',
      step: '',
      message: '',
      progress: 0,
      logs: []
    });
  };

  const getStatusIcon = () => {
    if (isAnalyzing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    return analysisState.status === 'completed' ? '✅' : '⏸️';
  };

  // If analysis is completed, show dashboard only
  if (isCompleted) {
    return (
      <div className="space-y-6">
        {/* Completion Header */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              Analysis Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-green-700">
                Your YouTube channel analysis has been completed successfully. 
                View the comprehensive dashboard below.
              </div>
              <Button 
                onClick={startNewAnalysis}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-100"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Display */}
        <DashboardDisplay />
      </div>
    );
  }

  // Analysis UI (shown when not completed)
  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Analysis Control</span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter YouTube Channel ID"
              value={inputChannelId}
              onChange={(e) => setInputChannelId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isAnalyzing}
            />
            {!isAnalyzing ? (
              <Button 
                onClick={startAnalysis}
                disabled={!inputChannelId.trim() || !isConnected}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            ) : (
              <Button 
                onClick={stopAnalysis}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            
            {/* Debug WebSocket Test Button */}
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch(
                    process.env.NODE_ENV === 'production' 
                      ? '/api/test-websocket' 
                      : 'http://localhost:8000/api/test-websocket',
                    { method: 'POST' }
                  );
                  const result = await response.json();
                  console.log('WebSocket test result:', result);
                  alert(`WebSocket test: ${result.status} - ${result.message}`);
                } catch (error) {
                  console.error('WebSocket test failed:', error);
                  alert('WebSocket test failed');
                }
              }}
              variant="outline"
              size="sm"
            >
              Test WS
            </Button>
          </div>
          
          {/* Debug controls */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button 
              onClick={testWebSocket}
              variant="outline"
              size="sm"
              disabled={!isConnected}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <span className="text-xs text-gray-500 flex items-center">
              Debug: Test real-time updates
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Status Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Analysis Status</span>
            <Badge className={getStatusColor(analysisState.status)}>
              {analysisState.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{analysisState.step.replace(/_/g, ' ').toUpperCase()}</span>
              <span>{analysisState.progress}%</span>
            </div>
            <Progress value={analysisState.progress} className="w-full" />
          </div>

          {/* Current Message */}
          <div className="text-sm text-gray-600">
            {analysisState.message || 'Ready to start analysis...'}
          </div>

          {/* Channel Info */}
          {analysisState.channel_info && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <div className="font-medium text-blue-900">
                📺 {analysisState.channel_info.channel_name}
              </div>
              <div className="text-sm text-blue-700">
                👥 {analysisState.channel_info.subscriber_count} subscribers
              </div>
              <div className="text-sm text-blue-700">
                💬 {analysisState.channel_info.total_comments.toLocaleString()} comments processed
              </div>
            </div>
          )}

          {/* Error Display */}
          {analysisState.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="font-medium text-red-900">Error:</div>
              <div className="text-sm text-red-700">{analysisState.error}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Logs</span>
            <Badge variant="outline">
              {analysisState.logs.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea 
            className="h-64 w-full border rounded-md p-3 bg-gray-50"
            ref={scrollAreaRef}
          >
            <div className="space-y-1 font-mono text-xs">
              {analysisState.logs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet...</div>
              ) : (
                analysisState.logs.map((log, index) => {
                  // Handle both string and object log formats
                  const logText = typeof log === 'string' ? log : log.message;
                  const logTime = typeof log === 'string' 
                    ? new Date().toLocaleTimeString() 
                    : new Date(log.timestamp).toLocaleTimeString();
                  
                  return (
                    <div 
                      key={index} 
                      className={`${
                        logText.startsWith('ERROR:') 
                          ? 'text-red-600' 
                          : logText.startsWith('PROGRESS:')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">
                        [{logTime}]
                      </span>{' '}
                      {logText}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeLogger;
