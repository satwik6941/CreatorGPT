import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Heart, 
  ThumbsUp, 
  BarChart3,
  Eye,
  Calendar,
  RefreshCw,
  Youtube,
  Clock,
  TrendingDown,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiService } from '@/services/api';

interface SentimentData {
  sentiment: string;
  count: number;
  percentage: number;
}

interface EngagementData {
  date: string;
  likes: number;
  comments: number;
  views: number;
}

interface VideoPerformance {
  title: string;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
}

interface AudienceDemographics {
  age_group: string;
  percentage: number;
  count: number;
}

interface WatchTimeData {
  day: string;
  hours: number;
}

interface ContentCategory {
  category: string;
  count: number;
  avg_views: number;
  engagement: number;
}

interface SentimentTrend {
  month: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface ChannelStats {
  channel_name: string;
  subscriber_count: string;
  total_videos: number;
  total_comments: number;
  total_views: number;
  channel_created: string;
  avg_sentiment_score: number;
  sentiment_distribution: SentimentData[];
  engagement_over_time: EngagementData[];
  video_performance: VideoPerformance[];
  audience_demographics: AudienceDemographics[];
  watch_time_by_day: WatchTimeData[];
  content_categories: ContentCategory[];
  sentiment_trends: SentimentTrend[];
  top_keywords: Array<{ keyword: string; count: number }>;
  comment_trends: Array<{ hour: number; count: number }>;
  monthly_growth: Array<{ month: string; subscribers: number; views: number }>;
}

interface FullScreenDashboardProps {
  onNewAnalysis: () => void;
}

const COLORS = {
  positive: '#30FF30',  // neon-green
  negative: '#FF3B30',  // bright-red  
  neutral: '#00D4FF',   // electric-blue
  primary: '#00D4FF',   // electric-blue
  secondary: '#8B5CF6', // purple
  tertiary: '#F59E0B',  // orange
  accent: '#F59E0B',    // orange
  success: '#22C55E',   // green
  warning: '#F59E0B',   // orange
  info: '#00D4FF',      // electric-blue
  pink: '#EC4899',      // pink
  purple: '#8B5CF6',    // purple
  indigo: '#6366F1',    // indigo
  cyan: '#06B6D4',      // cyan
  teal: '#14B8A6',      // teal
  lime: '#84CC16',      // lime
  background: '#000000', // deep-black
  cardBg: '#1A1A1A',    // dark-surface
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: 'rgba(255, 255, 255, 0.08)',
  glass: 'rgba(255, 255, 255, 0.03)',
  chart: {
    grid: 'rgba(255, 255, 255, 0.15)',  // More visible grid
    text: '#E5E5E5',                    // Brighter text
    axis: 'rgba(255, 255, 255, 0.3)'    // More visible axis
  }
};

// Helper function to extract keywords from batch analysis data
const extractKeywords = (batchAnalyses: any[]): Array<{ keyword: string; count: number }> => {
  const keywordMap = new Map<string, number>();
  
  batchAnalyses.forEach(batch => {
    // Extract keywords from positive and negative themes
    [...(batch.positiveThemes || []), ...(batch.negativeThemes || [])].forEach(theme => {
      const words = theme.toLowerCase().split(/\s+/);
      words.forEach(word => {
        // Filter out common words and keep meaningful keywords
        if (word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'your', 'their', 'would', 'could', 'should'].includes(word)) {
          keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
        }
      });
    });
    
    // Extract keywords from comments
    [...(batch.topPositiveComments || []), ...(batch.topNegativeComments || [])].forEach(comment => {
      const words = comment.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'your', 'their', 'would', 'could', 'should'].includes(word)) {
          keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
        }
      });
    });
  });
  
  // Convert to array and sort by count
  return Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Return top 10 keywords
};

const FullScreenDashboard: React.FC<FullScreenDashboardProps> = ({ onNewAnalysis }) => {
  const [dashboardData, setDashboardData] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching real batch analysis data...');
      const response = await apiService.getBatchAnalysis();
      
      if (response.success && response.channelData && response.batchAnalyses) {
        const { channelData, batchAnalyses } = response;
        
        // Transform real data to match dashboard format
        const transformedData: ChannelStats = {
          channel_name: channelData.channelName,
          subscriber_count: 'N/A', // Not available in batch analysis
          total_videos: 0, // Not available in batch analysis
          total_comments: channelData.totalComments,
          total_views: 0, // Not available in batch analysis
          channel_created: channelData.processingDate,
          avg_sentiment_score: channelData.overallPositive / 100,
          sentiment_distribution: [
            { sentiment: 'Positive', count: Math.round(channelData.totalComments * channelData.overallPositive / 100), percentage: channelData.overallPositive },
            { sentiment: 'Neutral', count: Math.round(channelData.totalComments * channelData.overallNeutral / 100), percentage: channelData.overallNeutral },
            { sentiment: 'Negative', count: Math.round(channelData.totalComments * channelData.overallNegative / 100), percentage: channelData.overallNegative }
          ],
          // Create engagement data from batch analysis
          engagement_over_time: batchAnalyses.map((batch: any, index: number) => ({
            date: `Batch ${batch.batchNumber}`,
            likes: 0, // Not available
            comments: batch.totalComments,
            views: 0 // Not available
          })),
          // Transform batch data for video performance (using batches as proxy)
          video_performance: batchAnalyses.slice(0, 5).map((batch: any) => ({
            title: `Analysis Batch ${batch.batchNumber}`,
            views: 0, // Not available
            likes: 0, // Not available
            comments: batch.totalComments,
            engagement_rate: batch.positivePercentage
          })),
          // Default demographics (not available in batch analysis)
          audience_demographics: [
            { age_group: 'Data not available', percentage: 100, count: channelData.totalComments }
          ],
          // Default watch time (not available)
          watch_time_by_day: [
            { day: 'No data available', hours: 0 }
          ],
          // Transform themes into content categories
          content_categories: batchAnalyses.slice(0, 5).map((batch: any) => ({
            category: `Batch ${batch.batchNumber} Analysis`,
            count: 1,
            avg_views: 0,
            engagement: batch.positivePercentage
          })),
          // Create sentiment trends from batch data
          sentiment_trends: batchAnalyses.slice(0, 6).map((batch: any, index: number) => ({
            month: `Batch ${batch.batchNumber}`,
            positive: batch.positivePercentage,
            neutral: batch.neutralPercentage,
            negative: batch.negativePercentage
          })),
          // Extract keywords from themes and comments
          top_keywords: extractKeywords(batchAnalyses),
          // Default comment trends (not available in batch data)
          comment_trends: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: Math.round(channelData.totalComments / 24)
          })),
          // Default monthly growth (not available)
          monthly_growth: [
            { month: 'Analysis Date', subscribers: 0, views: 0 }
          ]
        };
        
        setDashboardData(transformedData);
        console.log('Dashboard data loaded successfully:', transformedData);
      } else {
        throw new Error('No batch analysis data found');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      
      // Fallback: try to show what we can with minimal data
      if (error instanceof Error && error.message.includes('No batch analysis data found')) {
        setError('No analysis data available. Please run an analysis first.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-electric-blue mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Loading Dashboard</h2>
          <p className="text-gray-400">Preparing your analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="bg-bright-red/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-bright-red/30">
            <BarChart3 className="h-8 w-8 text-bright-red" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Dashboard Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="mr-3 bg-electric-blue hover:bg-electric-blue/90 text-black">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={onNewAnalysis} variant="outline" className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black">
            New Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="glass-effect border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-electric-blue to-bright-red p-3 rounded-lg">
                <Youtube className="h-8 w-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard & Analytics</h1>
                <p className="text-gray-400 mt-1">
                  Comprehensive insights for {dashboardData?.channel_name || 'Your Channel'}
                </p>
              </div>
            </div>
            <Button onClick={onNewAnalysis} className="bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold glow-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Channel Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card border-electric-blue/20 hover:border-electric-blue/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-electric-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardData?.total_comments?.toLocaleString() || '0'}</div>
              <p className="text-xs text-gray-500 mt-1">Analyzed by AI</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-neon-green/20 hover:border-neon-green/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Positive Sentiment</CardTitle>
              <ThumbsUp className="h-4 w-4 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neon-green">
                {dashboardData?.sentiment_distribution?.find(s => s.sentiment === 'Positive')?.percentage?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Overall positivity</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-bright-red/20 hover:border-bright-red/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Negative Sentiment</CardTitle>
              <TrendingDown className="h-4 w-4 text-bright-red" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-bright-red">
                {dashboardData?.sentiment_distribution?.find(s => s.sentiment === 'Negative')?.percentage?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Areas to improve</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-orange/20 hover:border-orange/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Analysis Date</CardTitle>
              <Calendar className="h-4 w-4 text-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange">
                {dashboardData?.channel_created || 'N/A'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Last processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-electric-blue" />
                Sentiment Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData?.sentiment_distribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {dashboardData?.sentiment_distribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.sentiment === 'Positive' ? COLORS.positive :
                        entry.sentiment === 'Negative' ? COLORS.negative :
                        COLORS.neutral
                      } />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-neon-green" />
                Comments by Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData?.engagement_over_time || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                  <XAxis dataKey="date" stroke={COLORS.chart.text} />
                  <YAxis stroke={COLORS.chart.text} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="comments" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Keywords */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-electric-blue" />
              Top Keywords from Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dashboardData?.top_keywords?.map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="border-electric-blue/30 text-electric-blue bg-electric-blue/10 hover:bg-electric-blue/20"
                >
                  {keyword.keyword} ({keyword.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Trends */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-neon-green" />
              Sentiment Trends Across Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={dashboardData?.sentiment_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                <XAxis dataKey="month" stroke={COLORS.chart.text} />
                <YAxis stroke={COLORS.chart.text} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="positive" 
                  stackId="1" 
                  stroke={COLORS.positive}
                  fill={COLORS.positive}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="neutral" 
                  stackId="1" 
                  stroke={COLORS.neutral}
                  fill={COLORS.neutral}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="negative" 
                  stackId="1" 
                  stroke={COLORS.negative}
                  fill={COLORS.negative}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FullScreenDashboard;
