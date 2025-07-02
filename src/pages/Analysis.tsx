import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  Youtube,
  BarChart3,
  RefreshCw
} from "lucide-react";
import apiService, { AnalysisStatus, ChannelInfo, AnalysisResults } from "@/services/api";
import DashboardDisplay from "@/components/DashboardDisplay";

const Analysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('channelId') || '';
  
  const [status, setStatus] = useState<AnalysisStatus>({
    status: 'idle',
    step: '',
    message: '',
    progress: 0
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Start analysis when component mounts
  useEffect(() => {
    if (!channelId) {
      navigate('/creator-profile');
      return;
    }

    startAnalysis();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [channelId]);

  const startAnalysis = async () => {
    try {
      setAnalysisStarted(true);
      await apiService.startAnalysis(channelId);
      
      // Start polling for status updates
      intervalRef.current = setInterval(async () => {
        try {
          const currentStatus = await apiService.getStatus();
          setStatus(currentStatus);
          
          // Get logs
          const currentLogs = await apiService.getLogs();
          setLogs(currentLogs.logs);
          
          // If analysis is completed or error, stop polling and get results
          if (currentStatus.status === 'completed' || currentStatus.status === 'error') {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            
            if (currentStatus.status === 'completed') {
              try {
                const analysisResults = await apiService.getResults();
                setResults(analysisResults);
              } catch (error) {
                console.error('Failed to get results:', error);
              }
            }
          }
        } catch (error) {
          console.error('Failed to get status:', error);
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error: any) {
      setStatus({
        status: 'error',
        step: 'initialization',
        message: 'Failed to start analysis',
        progress: 0,
        error: error.message
      });
    }
  };

  const resetAnalysis = async () => {
    try {
      await apiService.resetAnalysis();
      setStatus({
        status: 'idle',
        step: '',
        message: '',
        progress: 0
      });
      setLogs([]);
      setResults(null);
      setAnalysisStarted(false);
    } catch (error) {
      console.error('Failed to reset analysis:', error);
    }
  };

  const getStepIcon = (step: string, currentStep: string) => {
    if (step === currentStep && status.status === 'running') {
      return <Loader2 className="w-5 h-5 animate-spin text-electric-blue" />;
    } else if (status.progress > getStepProgress(step)) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status.status === 'error' && step === currentStep) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
    }
  };

  const getStepProgress = (step: string) => {
    switch (step) {
      case 'youtube_extraction': return 10;
      case 'llm_processing': return 50;
      case 'sentiment_analysis': return 80;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const steps = [
    { id: 'youtube_extraction', name: 'YouTube Extraction', description: 'Fetching comments from YouTube' },
    { id: 'llm_processing', name: 'AI Processing', description: 'Analyzing comments with AI' },
    { id: 'sentiment_analysis', name: 'Sentiment Analysis', description: 'Computing sentiment scores' },
    { id: 'completed', name: 'Complete', description: 'Analysis finished successfully' }
  ];

  return (
    <div className="min-h-screen bg-deep-black text-white">
      {/* Header */}
      <nav className="p-6 border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-electric-blue to-bright-red rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Brain className="w-5 h-5 text-white transition-transform duration-300 group-hover:animate-pulse" />
            </div>
            <span className="text-xl font-bold transition-colors duration-300 group-hover:text-electric-blue">Creator GPT</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Home
            </Button>
            {status.status === 'completed' || status.status === 'error' ? (
              <Button 
                onClick={resetAnalysis}
                variant="outline"
                className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Progress and Status */}
          <div className="space-y-6">
            {/* Channel Info */}
            {status.channel_info && (
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Youtube className="w-6 h-6 text-electric-blue" />
                    <span>Channel Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Channel Name:</span>
                    <span className="font-semibold text-electric-blue">{status.channel_info.channel_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Subscribers:</span>
                    <Badge variant="outline" className="border-electric-blue text-electric-blue">
                      <Users className="w-4 h-4 mr-1" />
                      {status.channel_info.subscriber_count}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Comments Found:</span>
                    <Badge variant="outline" className="border-electric-blue text-electric-blue">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {status.channel_info.total_comments.toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Card */}
            <Card className="glass-effect border-electric-blue/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-6 h-6 text-electric-blue" />
                  <span>Analysis Progress</span>
                </CardTitle>
                <CardDescription>
                  Channel ID: {channelId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{status.message || 'Waiting to start...'}</span>
                    <span>{status.progress}%</span>
                  </div>
                  <Progress value={status.progress} className="h-2" />
                </div>

                {/* Status Badge */}
                <div className="flex justify-center">
                  <Badge 
                    variant={status.status === 'completed' ? 'default' : status.status === 'error' ? 'destructive' : 'secondary'}
                    className={
                      status.status === 'running' ? 'bg-electric-blue text-black animate-pulse' :
                      status.status === 'completed' ? 'bg-green-600 text-white' :
                      status.status === 'error' ? 'bg-red-600 text-white' :
                      ''
                    }
                  >
                    {status.status === 'running' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {status.status === 'completed' && <CheckCircle className="w-4 h-4 mr-1" />}
                    {status.status === 'error' && <XCircle className="w-4 h-4 mr-1" />}
                    {status.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Error Message */}
                {status.error && (
                  <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
                    <p className="text-red-400 text-sm">{status.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Steps */}
            <Card className="glass-effect border-electric-blue/20">
              <CardHeader>
                <CardTitle>Analysis Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-4">
                      {getStepIcon(step.id, status.step)}
                      <div className="flex-1">
                        <h4 className="font-medium">{step.name}</h4>
                        <p className="text-sm text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            {results && (
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-6 h-6 text-electric-blue" />
                    <span>Analysis Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.average_sentiment !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Average Sentiment:</span>
                      <Badge variant="outline" className="border-electric-blue text-electric-blue">
                        {results.average_sentiment.toFixed(1)}/100
                      </Badge>
                    </div>
                  )}
                  
                  {results.sentiment_breakdown && (
                    <div className="space-y-2">
                      <span className="text-gray-300">Sentiment Distribution:</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-green-900/20 rounded">
                          <div className="text-green-400 font-bold">{results.sentiment_breakdown.positive.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400">Positive</div>
                        </div>
                        <div className="text-center p-2 bg-gray-900/20 rounded">
                          <div className="text-gray-400 font-bold">{results.sentiment_breakdown.neutral.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400">Neutral</div>
                        </div>
                        <div className="text-center p-2 bg-red-900/20 rounded">
                          <div className="text-red-400 font-bold">{results.sentiment_breakdown.negative.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400">Negative</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {results.total_comments && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Total Comments Processed:</span>
                      <Badge variant="outline" className="border-electric-blue text-electric-blue">
                        {results.total_comments.toLocaleString()}
                      </Badge>
                    </div>
                  )}

                  {results.generated_files && results.generated_files.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-gray-300">Generated Files:</span>
                      <div className="space-y-1">
                        {results.generated_files.map((file, index) => (
                          <div key={index} className="text-sm text-electric-blue bg-electric-blue/10 px-2 py-1 rounded">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dashboard Section - Shows when analysis is complete */}
            {status.status === 'completed' && (
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-6 h-6 text-electric-blue" />
                    <span>Dashboard & Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Generated charts and visualizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DashboardDisplay />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Live Logs */}
          <div>
            <Card className="glass-effect border-electric-blue/20 h-full">
              <CardHeader>
                <CardTitle>Live Analysis Logs</CardTitle>
                <CardDescription>
                  Real-time output from the analysis process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] w-full">
                  <div className="space-y-1 font-mono text-sm">
                    {logs.length === 0 ? (
                      <div className="text-gray-400 italic">Waiting for analysis to start...</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className={`p-2 rounded ${
                          log.includes('ERROR') ? 'bg-red-900/20 text-red-400' :
                          log.includes('SUCCESS') ? 'bg-green-900/20 text-green-400' :
                          log.includes('WARNING') ? 'bg-yellow-900/20 text-yellow-400' :
                          'bg-gray-900/20 text-gray-300'
                        }`}>
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
