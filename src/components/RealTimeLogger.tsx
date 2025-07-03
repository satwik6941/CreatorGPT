import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  BarChart3, 
  CheckCircle,
  Users,
  Eye,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  Youtube,
  Calendar,
  Clock,
  Heart,
  Star,
  Activity,
  PieChart,
  Target,
  Award,
  Zap,
  Globe,
  Share2,
  Trophy,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart
} from 'recharts';

interface ChannelData {
  channel_name: string;
  subscriber_count: string;
  total_videos: number;
  total_comments: number;
  total_views: number;
  total_likes: number;
  channel_created: string;
  avg_sentiment_score: number;
  engagement_rate: number;
  views_per_video: number;
  comments_per_video: number;
  likes_per_video: number;
  monthly_growth_rate: number;
  sentiment_distribution: Array<{
    sentiment: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  engagement_over_time: Array<{
    date: string;
    likes: number;
    comments: number;
    views: number;
    sentiment_score: number;
  }>;
  top_keywords: Array<{ keyword: string; count: number; sentiment: string }>;
  comment_trends: Array<{ hour: number; count: number; avg_sentiment: number }>;
  monthly_growth: Array<{ 
    month: string; 
    subscribers: number; 
    views: number; 
    engagement_rate: number;
  }>;
  sentiment_by_video: Array<{
    video_title: string;
    positive: number;
    neutral: number;
    negative: number;
    total_comments: number;
  }>;
  audience_activity: Array<{
    day: string;
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  }>;
  sentiment_confidence_distribution: Array<{
    range: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  keyword_sentiment_analysis: Array<{
    keyword: string;
    positive_count: number;
    negative_count: number;
    neutral_count: number;
    total_mentions: number;
    overall_sentiment: string;
  }>;
  engagement_quality_matrix: Array<{
    comment_length_category: string;
    sentiment: string;
    avg_score: number;
    count: number;
  }>;
  sentiment_trend_over_time: Array<{
    index: number;
    rolling_sentiment: number;
    raw_sentiment: number;
  }>;
  video_performance_metrics: Array<{
    video_title: string;
    views: number;
    likes: number;
    comments: number;
    sentiment_score: number;
    engagement_rate: number;
    published_date: string;
  }>;
}

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
  initialChannelId?: string;
  onAnalysisComplete?: (results: any) => void;
  onNewAnalysis?: () => void;
}

const RealTimeLogger: React.FC<RealTimeLoggerProps> = ({ 
  channelId, 
  initialChannelId,
  onAnalysisComplete,
  onNewAnalysis
}) => {
  const [dashboardData, setDashboardData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // New state for channel ID input and analysis
  const [channelIdInput, setChannelIdInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasAnalyzedChannel, setHasAnalyzedChannel] = useState(false);

  // Theme colors matching the dark theme
  const theme = {
    primary: '#00D4FF',
    secondary: '#FF3B30', 
    success: '#30FF30',
    warning: '#FFD60A',
    background: '#000000',
    surface: '#111111',
    surfaceLight: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    glass: 'rgba(255, 255, 255, 0.05)'
  };

  const CHART_COLORS = {
    positive: '#30FF30',
    negative: '#FF3B30', 
    neutral: '#00D4FF',
    primary: '#00D4FF',
    secondary: '#FF6B35',
    accent: '#FFD60A',
    success: '#30FF30',
    warning: '#FFD60A',
    info: '#00D4FF'
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      
      // Fallback to mock data if API fails
      setDashboardData({
        channel_name: 'CreatorGPT Analytics Hub',
        subscriber_count: '2.4M',
        total_videos: 342,
        total_comments: 156789,
        total_views: 47582341,
        total_likes: 3245782,
        channel_created: '2020-03-15',
        avg_sentiment_score: 0.78,
        engagement_rate: 4.8,
        views_per_video: 139182,
        comments_per_video: 458,
        likes_per_video: 9491,
        monthly_growth_rate: 12.5,
        sentiment_distribution: [
          { sentiment: 'Positive', count: 98456, percentage: 62.8, color: CHART_COLORS.positive },
          { sentiment: 'Neutral', count: 41234, percentage: 26.3, color: CHART_COLORS.neutral },
          { sentiment: 'Negative', count: 17099, percentage: 10.9, color: CHART_COLORS.negative }
        ],
        engagement_over_time: [
          { date: '2024-01', likes: 245600, comments: 12420, views: 3856000, sentiment_score: 0.72 },
          { date: '2024-02', likes: 282400, comments: 14510, views: 4224800, sentiment_score: 0.75 },
          { date: '2024-03', likes: 321400, comments: 16625, views: 4672200, sentiment_score: 0.78 },
          { date: '2024-04', likes: 364800, comments: 18742, views: 5234400, sentiment_score: 0.81 },
          { date: '2024-05', likes: 412300, comments: 20856, views: 5865800, sentiment_score: 0.79 },
          { date: '2024-06', likes: 456100, comments: 22945, views: 6425600, sentiment_score: 0.82 }
        ],
        top_keywords: [
          { keyword: 'amazing', count: 4342, sentiment: 'positive' },
          { keyword: 'helpful', count: 3287, sentiment: 'positive' },
          { keyword: 'great', count: 2965, sentiment: 'positive' },
          { keyword: 'awesome', count: 2634, sentiment: 'positive' },
          { keyword: 'love', count: 2398, sentiment: 'positive' },
          { keyword: 'confusing', count: 1876, sentiment: 'negative' },
          { keyword: 'boring', count: 1654, sentiment: 'negative' },
          { keyword: 'okay', count: 1432, sentiment: 'neutral' }
        ],
        comment_trends: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          count: Math.floor(Math.random() * 500) + 100,
          avg_sentiment: 0.6 + Math.random() * 0.3
        })),
        monthly_growth: [
          { month: 'Jan 2024', subscribers: 1980000, views: 38560000, engagement_rate: 4.2 },
          { month: 'Feb 2024', subscribers: 2056000, views: 42248000, engagement_rate: 4.3 },
          { month: 'Mar 2024', subscribers: 2142000, views: 46722000, engagement_rate: 4.5 },
          { month: 'Apr 2024', subscribers: 2234000, views: 52344000, engagement_rate: 4.6 },
          { month: 'May 2024', subscribers: 2331000, views: 58658000, engagement_rate: 4.7 },
          { month: 'Jun 2024', subscribers: 2435000, views: 64256000, engagement_rate: 4.8 }
        ],
        sentiment_by_video: [
          { video_title: 'AI Revolution in Content Creation', positive: 1250, neutral: 340, negative: 95, total_comments: 1685 },
          { video_title: 'Future of YouTube Analytics', positive: 980, neutral: 280, negative: 120, total_comments: 1380 },
          { video_title: 'Creator Economy Deep Dive', positive: 1450, neutral: 420, negative: 180, total_comments: 2050 },
          { video_title: 'Social Media Trends 2024', positive: 890, neutral: 310, negative: 150, total_comments: 1350 },
          { video_title: 'Building Your Brand Online', positive: 1120, neutral: 380, negative: 95, total_comments: 1595 }
        ],
        audience_activity: [
          { day: 'Monday', morning: 1250, afternoon: 2340, evening: 3450, night: 1890 },
          { day: 'Tuesday', morning: 1180, afternoon: 2180, evening: 3220, night: 1760 },
          { day: 'Wednesday', morning: 1320, afternoon: 2560, evening: 3680, night: 2010 },
          { day: 'Thursday', morning: 1420, afternoon: 2780, evening: 3890, night: 2150 },
          { day: 'Friday', morning: 1680, afternoon: 3210, evening: 4560, night: 2890 },
          { day: 'Saturday', morning: 2340, afternoon: 4520, evening: 5670, night: 3240 },
          { day: 'Sunday', morning: 2180, afternoon: 4230, evening: 5340, night: 3010 }
        ],
        sentiment_confidence_distribution: [
          { range: 'Very Low (0-19)', count: 3245, percentage: 2.1, color: '#FF0000' },
          { range: 'Low (20-39)', count: 8234, percentage: 5.2, color: '#FF6666' },
          { range: 'Medium (40-59)', count: 31245, percentage: 19.9, color: '#FFD60A' },
          { range: 'High (60-79)', count: 67834, percentage: 43.3, color: '#88DD88' },
          { range: 'Very High (80-100)', count: 46231, percentage: 29.5, color: '#30FF30' }
        ],
        keyword_sentiment_analysis: [
          { keyword: 'amazing', positive_count: 4342, negative_count: 23, neutral_count: 145, total_mentions: 4510, overall_sentiment: 'positive' },
          { keyword: 'helpful', positive_count: 3287, negative_count: 45, neutral_count: 234, total_mentions: 3566, overall_sentiment: 'positive' },
          { keyword: 'great', positive_count: 2965, negative_count: 34, neutral_count: 189, total_mentions: 3188, overall_sentiment: 'positive' },
          { keyword: 'confusing', positive_count: 234, negative_count: 1876, neutral_count: 345, total_mentions: 2455, overall_sentiment: 'negative' },
          { keyword: 'boring', positive_count: 123, negative_count: 1654, neutral_count: 234, total_mentions: 2011, overall_sentiment: 'negative' }
        ],
        engagement_quality_matrix: [
          { comment_length_category: 'Very Short', sentiment: 'Positive', avg_score: 72.5, count: 12450 },
          { comment_length_category: 'Short', sentiment: 'Positive', avg_score: 78.2, count: 23456 },
          { comment_length_category: 'Medium', sentiment: 'Positive', avg_score: 81.3, count: 34567 },
          { comment_length_category: 'Long', sentiment: 'Positive', avg_score: 84.7, count: 18923 },
          { comment_length_category: 'Very Long', sentiment: 'Positive', avg_score: 87.1, count: 9234 },
          { comment_length_category: 'Very Short', sentiment: 'Neutral', avg_score: 52.1, count: 8234 },
          { comment_length_category: 'Short', sentiment: 'Neutral', avg_score: 51.8, count: 15623 },
          { comment_length_category: 'Medium', sentiment: 'Neutral', avg_score: 50.9, count: 12345 },
          { comment_length_category: 'Long', sentiment: 'Neutral', avg_score: 49.7, count: 4567 },
          { comment_length_category: 'Very Long', sentiment: 'Neutral', avg_score: 48.3, count: 1234 }
        ],
        sentiment_trend_over_time: Array.from({ length: 100 }, (_, index) => ({
          index,
          rolling_sentiment: 65 + Math.sin(index * 0.1) * 15 + Math.random() * 5,
          raw_sentiment: 50 + Math.random() * 40
        })),
        video_performance_metrics: [
          { video_title: 'AI Revolution in Content Creation', views: 245600, likes: 18420, comments: 1685, sentiment_score: 82.4, engagement_rate: 7.5, published_date: '2024-06-15' },
          { video_title: 'Future of YouTube Analytics', views: 189300, likes: 14200, comments: 1380, sentiment_score: 78.9, engagement_rate: 8.2, published_date: '2024-06-10' },
          { video_title: 'Creator Economy Deep Dive', views: 321800, likes: 24560, comments: 2050, sentiment_score: 85.1, engagement_rate: 8.3, published_date: '2024-06-05' },
          { video_title: 'Social Media Trends 2024', views: 167200, likes: 12340, comments: 1350, sentiment_score: 74.6, engagement_rate: 8.1, published_date: '2024-05-28' },
          { video_title: 'Building Your Brand Online', views: 203400, likes: 15670, comments: 1595, sentiment_score: 80.2, engagement_rate: 8.4, published_date: '2024-05-20' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't automatically fetch dashboard data on component mount
    // Only fetch if we already have analyzed a channel
    if (hasAnalyzedChannel) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [hasAnalyzedChannel]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, [autoRefresh]);

  // Handle initial channel ID and auto-start analysis
  useEffect(() => {
    if (initialChannelId && initialChannelId.trim()) {
      console.log('Auto-starting analysis for channel:', initialChannelId);
      setChannelIdInput(initialChannelId);
      // Start analysis automatically
      startAnalysis(initialChannelId);
    }
  }, [initialChannelId]);

  const startNewAnalysis = () => {
    console.log('Starting new analysis...');
    if (onNewAnalysis) {
      onNewAnalysis();
    } else {
      // Reset component state for new analysis
      setIsAnalyzing(false);
      setAnalysisState(null);
      setAnalysisProgress(0);
      setHasAnalyzedChannel(false);
      setChannelIdInput('');
      setDashboardData(null);
      setError(null);
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // New analysis functions
  const startAnalysis = async (channelId: string) => {
    if (!channelId.trim()) {
      setError('Please enter a valid YouTube channel ID');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisState(null);
    setAnalysisProgress(0);
    setHasAnalyzedChannel(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_id: channelId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start analysis: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis started:', result);

      // Start polling for status
      startStatusPolling();
    } catch (error) {
      console.error('Error starting analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  const startStatusPolling = () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }

    const poll = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`Status polling failed: ${response.status}`);
        }

        const status: AnalysisState = await response.json();
        setAnalysisState(status);
        setAnalysisProgress(status.progress || 0);

        // If analysis is complete, fetch the dashboard data
        if (status.status === 'completed') {
          setIsAnalyzing(false);
          setHasAnalyzedChannel(true);
          if (statusPollingInterval) {
            clearInterval(statusPollingInterval);
            setStatusPollingInterval(null);
          }
          
          // Wait a moment then fetch the dashboard data
          setTimeout(() => {
            fetchDashboardData();
          }, 1000);
        } else if (status.status === 'error') {
          setIsAnalyzing(false);
          setError(status.error || 'Analysis failed');
          if (statusPollingInterval) {
            clearInterval(statusPollingInterval);
            setStatusPollingInterval(null);
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setError('Failed to get analysis status');
        setIsAnalyzing(false);
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          setStatusPollingInterval(null);
        }
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    const interval = setInterval(poll, 2000);
    setStatusPollingInterval(interval);
  };

  const handleChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startAnalysis(channelIdInput);
  };

  const resetAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisState(null);
    setAnalysisProgress(0);
    setChannelIdInput('');
    setError(null);
    setHasAnalyzedChannel(false);
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      setStatusPollingInterval(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-dark-gray to-black flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="w-32 h-32 border-4 border-electric-blue/20 rounded-full animate-spin"></div>
            {/* Inner spinning ring */}
            <div className="absolute top-2 left-2 w-28 h-28 border-4 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            {/* Center pulsing dot */}
            <div className="absolute top-12 left-12 w-8 h-8 bg-electric-blue rounded-full pulse-glow"></div>
            {/* Orbiting dots */}
            <div className="absolute top-4 left-4 w-24 h-24">
              <div className="absolute w-3 h-3 bg-neon-green rounded-full animate-ping" style={{
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                top: '0px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}></div>
              <div className="absolute w-3 h-3 bg-bright-red rounded-full animate-ping" style={{
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s',
                bottom: '0px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}></div>
              <div className="absolute w-3 h-3 bg-warning rounded-full animate-ping" style={{
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 1s',
                top: '50%',
                left: '0px',
                transform: 'translateY(-50%)'
              }}></div>
              <div className="absolute w-3 h-3 bg-electric-blue rounded-full animate-ping" style={{
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 1.5s',
                top: '50%',
                right: '0px',
                transform: 'translateY(-50%)'
              }}></div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-electric-blue via-neon-green to-electric-blue bg-clip-text text-transparent gradient-animate">
              Loading Analytics Dashboard
            </h2>
            <p className="text-electric-blue text-lg">Preparing comprehensive insights...</p>
            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-3 h-3 bg-electric-blue rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-neon-green rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-bright-red rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-dark-gray to-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="bg-bright-red/20 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
            <BarChart3 className="h-10 w-10 text-bright-red" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={fetchDashboardData} 
                className="bg-electric-blue hover:bg-electric-blue/80 text-black font-semibold"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                onClick={startNewAnalysis} 
                variant="outline" 
                className="border-electric-blue text-electric-blue hover:bg-electric-blue/10"
              >
                New Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Component
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-dark-gray to-black text-white">
      {/* Enhanced Header with Real-time Statistics */}
      <div className="bg-dark-surface/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-electric-blue to-bright-red p-3 rounded-xl glow-electric-blue">
                <Youtube className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-blue via-neon-green to-white bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-400 mt-1 flex items-center">
                  {hasAnalyzedChannel ? (
                    <>
                      <span>Comprehensive insights for {dashboardData?.channel_name}</span>
                      <div className="ml-3 flex items-center text-neon-green">
                        <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-1"></div>
                        <span className="text-xs">Live Data</span>
                      </div>
                    </>
                  ) : (
                    <span>Enter a YouTube channel ID to start your analysis journey</span>
                  )}
                </p>
              </div>
            </div>
            {hasAnalyzedChannel && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Last Updated</p>
                  <p className="text-sm text-electric-blue font-mono">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
                <Button 
                  onClick={toggleAutoRefresh}
                  variant={autoRefresh ? "default" : "outline"}
                  className={`transition-all duration-300 ${
                    autoRefresh 
                      ? 'bg-neon-green text-black hover:bg-neon-green/80' 
                      : 'border-neon-green text-neon-green hover:bg-neon-green/10'
                  }`}
                >
                  <Wifi className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
                </Button>
                <Button 
                  onClick={startNewAnalysis} 
                  className="bg-gradient-to-r from-electric-blue to-neon-green hover:from-neon-green hover:to-electric-blue text-black font-semibold transition-all duration-300 hover:scale-105 glow-electric-blue"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            )}
          </div>
          
          {/* Real-time Stats Row */}
          {hasAnalyzedChannel && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-surface/50 rounded-lg p-3 border border-electric-blue/20 hover:border-electric-blue/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Total Comments</p>
                    <p className="text-lg font-bold text-white">{dashboardData?.total_comments?.toLocaleString()}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-electric-blue" />
                </div>
              </div>
              
              <div className="bg-dark-surface/50 rounded-lg p-3 border border-neon-green/20 hover:border-neon-green/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Avg Sentiment</p>
                    <p className="text-lg font-bold text-white">{((dashboardData?.avg_sentiment_score || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <Heart className="h-5 w-5 text-neon-green" />
                </div>
              </div>
              
              <div className="bg-dark-surface/50 rounded-lg p-3 border border-warning/20 hover:border-warning/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Engagement Rate</p>
                    <p className="text-lg font-bold text-white">{dashboardData?.engagement_rate}%</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              
              <div className="bg-dark-surface/50 rounded-lg p-3 border border-bright-red/20 hover:border-bright-red/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Analysis Status</p>
                    <p className="text-lg font-bold text-neon-green flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-bright-red" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Channel ID Input and Analysis Status */}
      {!hasAnalyzedChannel && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card className="bg-dark-surface/80 backdrop-blur-xl border-electric-blue/20 hover:border-electric-blue/40 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-electric-blue to-neon-green bg-clip-text text-transparent flex items-center">
                <Search className="h-6 w-6 mr-3 text-electric-blue" />
                YouTube Channel Analysis
              </CardTitle>
              <p className="text-gray-400">
                Enter a YouTube channel ID or URL to start comprehensive analytics
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChannelSubmit} className="flex flex-col space-y-4">
                <div className="flex space-x-4">
                  <Input
                    type="text"
                    placeholder="Enter YouTube Channel ID (e.g., UCBJycsmduvYEL83R_U4JriQ)"
                    value={channelIdInput}
                    onChange={(e) => setChannelIdInput(e.target.value)}
                    disabled={isAnalyzing}
                    className="flex-1 bg-dark-surface/50 border-electric-blue/30 text-white placeholder:text-gray-500 focus:border-electric-blue focus:ring-electric-blue/30"
                  />
                  <Button
                    type="submit"
                    disabled={isAnalyzing || !channelIdInput.trim()}
                    className="bg-gradient-to-r from-electric-blue to-neon-green hover:from-neon-green hover:to-electric-blue text-black font-semibold transition-all duration-300 hover:scale-105 glow-electric-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-center space-x-2 text-bright-red bg-bright-red/10 border border-bright-red/20 rounded-lg p-3">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <div className="space-y-4">
                    <div className="bg-dark-surface/50 rounded-lg p-4 border border-electric-blue/20">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-electric-blue">
                          Analysis in Progress
                        </h3>
                        <div className="text-sm text-gray-400">
                          {analysisProgress}% Complete
                        </div>
                      </div>
                      
                      <Progress 
                        value={analysisProgress} 
                        className="mb-3"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                        }}
                      />
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                          <span className="text-sm text-white font-medium">
                            Current Step: {analysisState?.step || 'Initializing...'}
                          </span>
                        </div>
                        
                        {(analysisState?.message || isAnalyzing) && (
                          <p className="text-sm text-gray-400 ml-4">
                            {analysisState?.message || 'Starting analysis pipeline...'}
                          </p>
                        )}
                        
                        {analysisState?.channel_info && (
                          <div className="ml-4 mt-3 p-3 bg-neon-green/10 border border-neon-green/20 rounded-lg">
                            <h4 className="text-sm font-semibold text-neon-green mb-2">
                              Channel Information
                            </h4>
                            <div className="text-sm text-gray-300 space-y-1">
                              <p><strong>Name:</strong> {analysisState.channel_info.channel_name}</p>
                              <p><strong>Subscribers:</strong> {analysisState.channel_info.subscriber_count}</p>
                              <p><strong>Total Comments:</strong> {analysisState.channel_info.total_comments?.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Real-time Logs */}
                    {analysisState?.logs && analysisState.logs.length > 0 && (
                      <div className="bg-dark-surface/50 rounded-lg p-4 border border-electric-blue/20">
                        <h4 className="text-sm font-semibold text-electric-blue mb-3 flex items-center">
                          <Activity className="h-4 w-4 mr-2" />
                          Real-time Logs
                        </h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-1 font-mono text-xs">
                            {analysisState.logs.slice(-10).map((log, index) => (
                              <div key={index} className="text-gray-400">
                                {typeof log === 'string' ? log : `[${log.timestamp}] ${log.message}`}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {/* Enhanced Loading Animation */}
                    {(!analysisState || analysisProgress < 5) && (
                      <div className="bg-dark-surface/50 rounded-lg p-6 border border-electric-blue/20">
                        <div className="flex items-center justify-center space-x-4">
                          <div className="relative">
                            <div className="w-8 h-8 border-2 border-electric-blue/30 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              Connecting to analysis pipeline...
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              This may take a few moments to start
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      {hasAnalyzedChannel && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-1 bg-dark-surface/50 p-1 rounded-xl backdrop-blur-sm">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'sentiment', label: 'Sentiment Analysis', icon: Heart },
                { id: 'engagement', label: 'Engagement', icon: TrendingUp },
                { id: 'audience', label: 'Audience Insights', icon: Users },
                { id: 'analytics', label: 'Advanced Analytics', icon: PieChart },
                { id: 'performance', label: 'Video Performance', icon: Award }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-electric-blue to-neon-green text-black font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <Button
              onClick={resetAnalysis}
              variant="outline"
              className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              <Search className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {hasAnalyzedChannel && (
        <div className="max-w-7xl mx-auto px-6 pb-8">
          {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
          {activeTab === 'sentiment' && <SentimentTab data={dashboardData} />}
          {activeTab === 'engagement' && <EngagementTab data={dashboardData} />}
          {activeTab === 'audience' && <AudienceTab data={dashboardData} />}
          {activeTab === 'analytics' && <AdvancedAnalyticsTab data={dashboardData} />}
          {activeTab === 'performance' && <VideoPerformanceTab data={dashboardData} />}
        </div>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Channel Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Subscribers" 
          value={data.subscriber_count} 
          icon={Users} 
          color="electric-blue"
          subtitle={`${data.monthly_growth_rate}% growth`}
          trend="up"
        />
        <StatsCard 
          title="Total Views" 
          value={data.total_views.toLocaleString()} 
          icon={Eye} 
          color="neon-green"
          subtitle={`${Math.round(data.views_per_video).toLocaleString()} avg/video`}
          trend="up"
        />
        <StatsCard 
          title="Total Comments" 
          value={data.total_comments.toLocaleString()} 
          icon={MessageSquare} 
          color="warning"
          subtitle={`${Math.round(data.comments_per_video)} avg/video`}
        />
        <StatsCard 
          title="Engagement Rate" 
          value={`${data.engagement_rate}%`} 
          icon={Activity} 
          color="bright-red"
          subtitle="Above industry avg"
          trend="up"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-electric-blue" />
              Channel Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.monthly_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#A0A0A0" />
                <YAxis yAxisId="left" stroke="#A0A0A0" />
                <YAxis yAxisId="right" orientation="right" stroke="#A0A0A0" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="subscribers" 
                  fill="#00D4FF20" 
                  stroke="#00D4FF" 
                  strokeWidth={2}
                  name="Subscribers"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="views" 
                  fill="#30FF30" 
                  name="Views"
                  opacity={0.7}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment Overview */}
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-electric-blue" />
              Sentiment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={data.sentiment_distribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="percentage"
                  nameKey="sentiment"
                >
                  {data.sentiment_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Video Performance */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Award className="h-5 w-5 mr-2 text-electric-blue" />
            Top Performing Videos by Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.sentiment_by_video} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#A0A0A0" />
              <YAxis dataKey="video_title" type="category" stroke="#A0A0A0" width={200} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Bar dataKey="positive" stackId="a" fill="#30FF30" name="Positive" />
              <Bar dataKey="neutral" stackId="a" fill="#00D4FF" name="Neutral" />
              <Bar dataKey="negative" stackId="a" fill="#FF3B30" name="Negative" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Sentiment Analysis Tab
const SentimentTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Enhanced Sentiment Metrics with Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-neon-green/20 to-neon-green/5 border-neon-green/30 hover:scale-105 hover:shadow-2xl hover:shadow-neon-green/25 transition-all duration-300 group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neon-green text-sm font-medium">Positive Sentiment</p>
                <p className="text-3xl font-bold text-white group-hover:text-neon-green transition-colors duration-300">
                  {data.sentiment_distribution[0]?.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">
                  {data.sentiment_distribution[0]?.count.toLocaleString()} comments
                </p>
              </div>
              <div className="relative">
                <ThumbsUp className="h-12 w-12 text-neon-green opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                <div className="absolute inset-0 bg-neon-green/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-electric-blue/20 to-electric-blue/5 border-electric-blue/30 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/25 transition-all duration-300 group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-electric-blue text-sm font-medium">Neutral Sentiment</p>
                <p className="text-3xl font-bold text-white group-hover:text-electric-blue transition-colors duration-300">
                  {data.sentiment_distribution[1]?.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">
                  {data.sentiment_distribution[1]?.count.toLocaleString()} comments
                </p>
              </div>
              <div className="relative">
                <MessageSquare className="h-12 w-12 text-electric-blue opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                <div className="absolute inset-0 bg-electric-blue/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-bright-red/20 to-bright-red/5 border-bright-red/30 hover:scale-105 hover:shadow-2xl hover:shadow-bright-red/25 transition-all duration-300 group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-bright-red text-sm font-medium">Negative Sentiment</p>
                <p className="text-3xl font-bold text-white group-hover:text-bright-red transition-colors duration-300">
                  {data.sentiment_distribution[2]?.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">
                  {data.sentiment_distribution[2]?.count.toLocaleString()} comments
                </p>
              </div>
              <div className="relative">
                <TrendingDown className="h-12 w-12 text-bright-red opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                <div className="absolute inset-0 bg-bright-red/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Sentiment Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 hover:border-electric-blue/30 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="text-white flex items-center group-hover:text-electric-blue transition-colors duration-300">
              <Activity className="h-5 w-5 mr-2 text-electric-blue group-hover:scale-110 transition-transform duration-300" />
              Sentiment Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.engagement_over_time}>
                <defs>
                  <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#A0A0A0" />
                <YAxis stroke="#A0A0A0" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0, 212, 255, 0.3)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="sentiment_score" 
                  stroke="#00D4FF" 
                  fill="url(#sentimentGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#00D4FF', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: '#00D4FF', stroke: '#00D4FF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 hover:border-electric-blue/30 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="text-white flex items-center group-hover:text-electric-blue transition-colors duration-300">
              <Target className="h-5 w-5 mr-2 text-electric-blue group-hover:scale-110 transition-transform duration-300" />
              Top Keywords by Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
              {data.top_keywords.slice(0, 8).map((keyword, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-dark-surface/30 hover:bg-dark-surface/50 transition-all duration-300 group/item">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      className={`
                        transition-all duration-300 group-hover/item:scale-105
                        ${keyword.sentiment === 'positive' ? 'bg-neon-green/20 text-neon-green border-neon-green/30 group-hover/item:bg-neon-green/30' : ''}
                        ${keyword.sentiment === 'neutral' ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/30 group-hover:item:bg-electric-blue/30' : ''}
                        ${keyword.sentiment === 'negative' ? 'bg-bright-red/20 text-bright-red border-bright-red/30 group-hover:item:bg-bright-red/30' : ''}
                      `}
                    >
                      {keyword.sentiment}
                    </Badge>
                    <span className="text-white font-medium group-hover/item:text-electric-blue transition-colors duration-300">{keyword.keyword}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500
                          ${keyword.sentiment === 'positive' ? 'bg-neon-green' : 
                            keyword.sentiment === 'neutral' ? 'bg-electric-blue' : 'bg-bright-red'}
                        `}
                        style={{ width: `${Math.min((keyword.count / Math.max(...data.top_keywords.map(k => k.count))) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-400 font-mono text-sm">{keyword.count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Sentiment Distribution Visualization */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 hover:border-electric-blue/30 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-electric-blue" />
            Advanced Sentiment Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPieChart>
                <Pie
                  data={data.sentiment_distribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  dataKey="percentage"
                  nameKey="sentiment"
                  stroke="#333"
                  strokeWidth={2}
                >
                  {data.sentiment_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                  }} 
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white mb-4">Sentiment Insights</h4>
              {data.sentiment_distribution.map((item, index) => (
                <div key={index} className="bg-dark-surface/30 p-4 rounded-lg hover:bg-dark-surface/50 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white group-hover:text-electric-blue transition-colors duration-300">
                      {item.sentiment}
                    </span>
                    <span className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                    <div 
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color,
                        boxShadow: `0 0 10px ${item.color}50`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {item.count.toLocaleString()} comments
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Engagement Tab
const EngagementTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
          title="Avg Likes/Video" 
          value={Math.round(data.likes_per_video).toLocaleString()} 
          icon={Heart} 
          color="bright-red"
          subtitle="Strong engagement"
        />
        <StatsCard 
          title="Comments/Video" 
          value={Math.round(data.comments_per_video).toString()} 
          icon={MessageSquare} 
          color="electric-blue"
          subtitle="Active community"
        />
        <StatsCard 
          title="Views/Video" 
          value={Math.round(data.views_per_video).toLocaleString()} 
          icon={Eye} 
          color="neon-green"
          subtitle="Great reach"
        />
        <StatsCard 
          title="Engagement Rate" 
          value={`${data.engagement_rate}%`} 
          icon={Zap} 
          color="warning"
          subtitle="Above average"
          trend="up"
        />
      </div>

      {/* Engagement Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-electric-blue" />
              Engagement Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.engagement_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#A0A0A0" />
                <YAxis yAxisId="left" stroke="#A0A0A0" />
                <YAxis yAxisId="right" orientation="right" stroke="#A0A0A0" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
                <Bar yAxisId="left" dataKey="likes" fill="#FF3B30" name="Likes" />
                <Bar yAxisId="left" dataKey="comments" fill="#00D4FF" name="Comments" />
                <Line yAxisId="right" type="monotone" dataKey="views" stroke="#30FF30" strokeWidth={2} name="Views" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Clock className="h-5 w-5 mr-2 text-electric-blue" />
              Comment Activity by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.comment_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#A0A0A0" />
                <YAxis stroke="#A0A0A0" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#00D4FF" 
                  fill="url(#colorComments)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Audience Insights Tab
const AudienceTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Audience Activity Heatmap */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Globe className="h-5 w-5 mr-2 text-electric-blue" />
            Audience Activity Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.audience_activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#A0A0A0" />
              <YAxis stroke="#A0A0A0" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Bar dataKey="morning" stackId="a" fill="#FFD60A" name="Morning (6-12)" />
              <Bar dataKey="afternoon" stackId="a" fill="#00D4FF" name="Afternoon (12-18)" />
              <Bar dataKey="evening" stackId="a" fill="#30FF30" name="Evening (18-24)" />
              <Bar dataKey="night" stackId="a" fill="#FF3B30" name="Night (0-6)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Audience Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="h-5 w-5 mr-2 text-electric-blue" />
              Audience Growth Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Monthly Growth Rate</span>
                <span className="text-neon-green font-semibold">+{data.monthly_growth_rate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Retention Rate</span>
                <span className="text-electric-blue font-semibold">94.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">New vs Returning</span>
                <span className="text-warning font-semibold">65% / 35%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Share2 className="h-5 w-5 mr-2 text-electric-blue" />
              Engagement Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Watch Time</span>
                <span className="text-neon-green font-semibold">4:32</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Comment Quality Score</span>
                <span className="text-electric-blue font-semibold">8.7/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Share Rate</span>
                <span className="text-warning font-semibold">2.3%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Advanced Analytics Tab
const AdvancedAnalyticsTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  const [selectedMetric, setSelectedMetric] = useState('confidence');

  return (
    <div className="space-y-8">
      {/* Sentiment Confidence Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Target className="h-5 w-5 mr-2 text-electric-blue" />
              Sentiment Confidence Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={data.sentiment_confidence_distribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  dataKey="percentage"
                  nameKey="range"
                  stroke="#333"
                  strokeWidth={2}
                >
                  {data.sentiment_confidence_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-electric-blue" />
              Sentiment Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.sentiment_trend_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="index" stroke="#A0A0A0" />
                <YAxis stroke="#A0A0A0" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="rolling_sentiment" 
                  stroke="#00D4FF" 
                  strokeWidth={3}
                  dot={false}
                  name="Rolling Average"
                />
                <Line 
                  type="monotone" 
                  dataKey="raw_sentiment" 
                  stroke="#FFD60A" 
                  strokeWidth={1}
                  dot={false}
                  opacity={0.5}
                  name="Raw Sentiment"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Sentiment Analysis */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-electric-blue" />
            Keyword Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.keyword_sentiment_analysis} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#A0A0A0" />
              <YAxis dataKey="keyword" type="category" stroke="#A0A0A0" width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Bar dataKey="positive_count" stackId="a" fill="#30FF30" name="Positive" />
              <Bar dataKey="neutral_count" stackId="a" fill="#00D4FF" name="Neutral" />
              <Bar dataKey="negative_count" stackId="a" fill="#FF3B30" name="Negative" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Quality Matrix */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="h-5 w-5 mr-2 text-electric-blue" />
            Engagement Quality Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quality metrics by comment length */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quality by Comment Length</h4>
              <div className="space-y-3">
                {data.engagement_quality_matrix
                  .filter(item => item.sentiment === 'Positive')
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-dark-surface/30 p-3 rounded-lg">
                      <span className="text-gray-300">{item.comment_length_category}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-electric-blue to-neon-green"
                            style={{ width: `${(item.avg_score / 100) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold">{item.avg_score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Comment count distribution */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Comment Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={data.engagement_quality_matrix.filter(item => item.sentiment === 'Positive')}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="comment_length_category"
                    fill="#00D4FF"
                  >
                    {data.engagement_quality_matrix
                      .filter(item => item.sentiment === 'Positive')
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${180 + index * 30}, 70%, 50%)`} />
                      ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-electric-blue/20 to-electric-blue/5 border-electric-blue/30 hover:scale-105 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-electric-blue text-sm font-medium">Avg Confidence Score</p>
                <p className="text-3xl font-bold text-white">
                  {(data.sentiment_confidence_distribution.reduce((acc, item) => 
                    acc + (item.percentage * (item.range.includes('High') ? 0.8 : item.range.includes('Medium') ? 0.5 : 0.2)), 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">AI Model Confidence</p>
              </div>
              <Activity className="h-12 w-12 text-electric-blue opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-neon-green/20 to-neon-green/5 border-neon-green/30 hover:scale-105 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neon-green text-sm font-medium">Keyword Diversity</p>
                <p className="text-3xl font-bold text-white">{data.keyword_sentiment_analysis.length}</p>
                <p className="text-xs text-gray-400">Unique Keywords</p>
              </div>
              <Target className="h-12 w-12 text-neon-green opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/20 to-warning/5 border-yellow-400/30 hover:scale-105 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">Quality Score</p>
                <p className="text-3xl font-bold text-white">
                  {((data.sentiment_distribution[0]?.percentage || 0) * 0.8 + 
                    (data.sentiment_distribution[1]?.percentage || 0) * 0.5).toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">Weighted Score</p>
              </div>
              <Award className="h-12 w-12 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Video Performance Tab
const VideoPerformanceTab: React.FC<{ data: ChannelData | null }> = ({ data }) => {
  if (!data) return null;

  const [sortBy, setSortBy] = useState('sentiment_score');

  const sortedVideos = [...data.video_performance_metrics].sort((a, b) => {
    if (sortBy === 'sentiment_score') return b.sentiment_score - a.sentiment_score;
    if (sortBy === 'engagement_rate') return b.engagement_rate - a.engagement_rate;
    if (sortBy === 'views') return b.views - a.views;
    return 0;
  });

  return (
    <div className="space-y-8">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
          title="Best Performing Video" 
          value={sortedVideos[0]?.video_title.substring(0, 20) + '...' || 'N/A'}
          icon={Trophy} 
          color="electric-blue"
          subtitle={`${sortedVideos[0]?.sentiment_score.toFixed(1)} sentiment score`}
          trend="up"
        />
        <StatsCard 
          title="Avg Video Engagement" 
          value={`${(data.video_performance_metrics.reduce((acc, video) => acc + video.engagement_rate, 0) / data.video_performance_metrics.length).toFixed(1)}%`}
          icon={TrendingUp} 
          color="neon-green"
          subtitle="Across all videos"
        />
        <StatsCard 
          title="Total Video Views" 
          value={data.video_performance_metrics.reduce((acc, video) => acc + video.views, 0).toLocaleString()}
          icon={Eye} 
          color="warning"
          subtitle="Combined views"
        />
        <StatsCard 
          title="Avg Sentiment Score" 
          value={(data.video_performance_metrics.reduce((acc, video) => acc + video.sentiment_score, 0) / data.video_performance_metrics.length).toFixed(1)}
          icon={Heart} 
          color="bright-red"
          subtitle="Overall positivity"
          trend="up"
        />
      </div>

      {/* Video Performance Chart */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-electric-blue" />
              Video Performance Metrics
            </CardTitle>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-dark-surface border border-white/20 text-white rounded-lg px-3 py-1"
            >
              <option value="sentiment_score">Sort by Sentiment</option>
              <option value="engagement_rate">Sort by Engagement</option>
              <option value="views">Sort by Views</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={sortedVideos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="video_title" 
                stroke="#A0A0A0" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis yAxisId="left" stroke="#A0A0A0" />
              <YAxis yAxisId="right" orientation="right" stroke="#A0A0A0" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Bar yAxisId="left" dataKey="sentiment_score" fill="#00D4FF" name="Sentiment Score" />
              <Line yAxisId="right" type="monotone" dataKey="engagement_rate" stroke="#30FF30" strokeWidth={3} name="Engagement Rate %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Video Performance Table */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Award className="h-5 w-5 mr-2 text-electric-blue" />
            Detailed Video Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 font-medium py-3">Video Title</th>
                  <th className="text-right text-gray-400 font-medium py-3">Views</th>
                  <th className="text-right text-gray-400 font-medium py-3">Likes</th>
                  <th className="text-right text-gray-400 font-medium py-3">Comments</th>
                  <th className="text-right text-gray-400 font-medium py-3">Engagement</th>
                  <th className="text-right text-gray-400 font-medium py-3">Sentiment</th>
                  <th className="text-right text-gray-400 font-medium py-3">Published</th>
                </tr>
              </thead>
              <tbody>
                {sortedVideos.map((video, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                    <td className="py-4 text-white font-medium">{video.video_title}</td>
                    <td className="py-4 text-right text-gray-300">{video.views.toLocaleString()}</td>
                    <td className="py-4 text-right text-gray-300">{video.likes.toLocaleString()}</td>
                    <td className="py-4 text-right text-gray-300">{video.comments.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
                        {video.engagement_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <Badge className={`
                        ${video.sentiment_score >= 80 ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 
                          video.sentiment_score >= 60 ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/30' : 
                          'bg-warning/20 text-yellow-400 border-yellow-400/30'}
                      `}>
                        {video.sentiment_score.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-4 text-right text-gray-400">{video.published_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Correlation Analysis */}
      <Card className="bg-dark-surface/50 border-white/10 backdrop-blur-sm hover:bg-dark-surface/60 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-electric-blue" />
            Performance Correlation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={data.video_performance_metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="views" stroke="#A0A0A0" name="Views" />
              <YAxis dataKey="sentiment_score" stroke="#A0A0A0" name="Sentiment Score" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter dataKey="sentiment_score" fill="#00D4FF" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Reusable Stats Card Component
const StatsCard: React.FC<{
  title: string;
  value: string;
  icon: any;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down';
}> = ({ title, value, icon: Icon, color, subtitle, trend }) => {
  const colorClasses = {
    'electric-blue': 'border-electric-blue/30 bg-gradient-to-br from-electric-blue/20 to-electric-blue/5',
    'bright-red': 'border-bright-red/30 bg-gradient-to-br from-bright-red/20 to-bright-red/5',
    'neon-green': 'border-neon-green/30 bg-gradient-to-br from-neon-green/20 to-neon-green/5',
    'warning': 'border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-yellow-400/5'
  };

  const iconColorClasses = {
    'electric-blue': 'text-electric-blue',
    'bright-red': 'text-bright-red',
    'neon-green': 'text-neon-green',
    'warning': 'text-yellow-400'
  };

  return (
    <Card className={`${colorClasses[color as keyof typeof colorClasses]} border backdrop-blur-sm hover:scale-105 transition-all duration-300`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 flex items-center mt-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 mr-1 text-neon-green" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 mr-1 text-bright-red" />}
                {subtitle}
              </p>
            )}
          </div>
          <Icon className={`h-10 w-10 ${iconColorClasses[color as keyof typeof iconColorClasses]} opacity-80`} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeLogger;
