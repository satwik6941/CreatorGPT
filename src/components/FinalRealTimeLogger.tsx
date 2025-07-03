import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  BarChart3, 
  Activity,
  Loader2,
  AlertCircle,
  Youtube,
  MessageSquare,
  Heart,
  Target
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: Record<string, unknown>;
}

interface DashboardData {
  total_videos: number;
  total_comments: number;
  avg_sentiment: number;
  processing_progress: number;
}

const RealTimeLogger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [channelUrl, setChannelUrl] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const addLog = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    };
    setLogs(prev => [...prev, newLog]);
  };

  const getBadgeVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const connectWebSocket = () => {
    if (isConnected) return;
    addLog('info', 'Attempting to connect to WebSocket...');
    setIsConnected(true);
  };

  const startAnalysis = async () => {
    if (!channelUrl.trim()) {
      addLog('error', 'Please enter a valid YouTube channel URL');
      return;
    }

    setIsProcessing(true);
    addLog('info', `Starting analysis for: ${channelUrl}`);
    
    // Simulate processing
    setTimeout(() => {
      addLog('success', 'Analysis started successfully');
      setIsProcessing(false);
      setData({
        total_videos: 150,
        total_comments: 15000,
        avg_sentiment: 0.75,
        processing_progress: 85
      });
    }, 2000);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  useEffect(() => {
    addLog('info', 'Dashboard initialized');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6 space-y-6">
      {/* Header Controls */}
      <Card className="glass-effect border-white/10 hover:border-electric-blue/30 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="h-6 w-6 mr-3 text-electric-blue" />
            Real-Time YouTube Sentiment Analysis Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter YouTube channel URL..."
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="bg-black/30 border-white/20 text-white placeholder-gray-400 focus:border-electric-blue"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startAnalysis}
                disabled={isProcessing}
                className="bg-gradient-to-r from-electric-blue to-neon-green hover:from-electric-blue/80 hover:to-neon-green/80 text-black font-medium"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={connectWebSocket}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 mr-2 text-green-400" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-2 text-red-400" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border-white/10">
          <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-electric-blue data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-white data-[state=active]:bg-electric-blue data-[state=active]:text-black">
            <Activity className="h-4 w-4 mr-2" />
            Real-Time Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-electric-blue/20 to-electric-blue/5 border-electric-blue/30 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/25 transition-all duration-300 glass-effect">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-electric-blue/80 text-sm font-medium">Total Videos</p>
                      <p className="text-3xl font-bold text-white">{data.total_videos.toLocaleString()}</p>
                    </div>
                    <Youtube className="h-12 w-12 text-electric-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-neon-green/20 to-neon-green/5 border-neon-green/30 hover:scale-105 hover:shadow-2xl hover:shadow-neon-green/25 transition-all duration-300 glass-effect">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-neon-green/80 text-sm font-medium">Total Comments</p>
                      <p className="text-3xl font-bold text-white">{data.total_comments.toLocaleString()}</p>
                    </div>
                    <MessageSquare className="h-12 w-12 text-neon-green" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 glass-effect">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-400/80 text-sm font-medium">Avg Sentiment</p>
                      <p className="text-3xl font-bold text-white">{data.avg_sentiment.toFixed(2)}</p>
                    </div>
                    <Heart className="h-12 w-12 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 glass-effect">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-400/80 text-sm font-medium">Progress</p>
                      <p className="text-3xl font-bold text-white">{data.processing_progress}%</p>
                      <Progress value={data.processing_progress} className="mt-2" />
                    </div>
                    <Target className="h-12 w-12 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass-effect border-white/10">
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-electric-blue mx-auto mb-4" />
                  <p className="text-white text-lg">Loading dashboard data...</p>
                  <p className="text-gray-400 mt-2">Start an analysis to see real-time insights</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card className="glass-effect border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-electric-blue" />
                Real-Time Analysis Logs
              </CardTitle>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Square className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full rounded-md border border-white/10 bg-black/20 p-4" ref={scrollAreaRef}>
                {logs.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs yet. Start an analysis or connect to see real-time updates.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors">
                        <Badge variant={getBadgeVariant(log.level)} className="mt-0.5 shrink-0">
                          {log.level}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400 font-mono">{log.timestamp}</span>
                          </div>
                          <p className={`text-sm ${getLevelColor(log.level)} break-words`}>
                            {log.message}
                          </p>
                          {log.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                Show details
                              </summary>
                              <pre className="text-xs text-gray-400 mt-1 p-2 bg-black/40 rounded border border-white/5 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeLogger;
