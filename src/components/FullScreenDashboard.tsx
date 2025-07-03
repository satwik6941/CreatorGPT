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
  TrendingDown
} from 'lucide-react';

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
  secondary: '#8B5CF6', 
  accent: '#F59E0B',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#00D4FF',
  background: '#000000', // deep-black
  cardBg: '#1A1A1A',    // dark-surface
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: 'rgba(255, 255, 255, 0.08)',
  glass: 'rgba(255, 255, 255, 0.03)',
  chart: {
    grid: 'rgba(255, 255, 255, 0.1)',
    text: '#B0B0B0',
    axis: 'rgba(255, 255, 255, 0.2)'
  }
};

const FullScreenDashboard: React.FC<FullScreenDashboardProps> = ({ onNewAnalysis }) => {
  const [dashboardData, setDashboardData] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/dashboard-data' 
        : 'http://localhost:8000/api/dashboard-data';
        
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      
      // Mock data for development/testing with enhanced analytics
      setDashboardData({
        channel_name: 'Sample Creator Channel',
        subscriber_count: '125,423',
        total_videos: 87,
        total_comments: 4250,
        total_views: 2847632,
        channel_created: '2021-03-15',
        avg_sentiment_score: 0.72,
        sentiment_distribution: [
          { sentiment: 'Positive', count: 2785, percentage: 65.5 },
          { sentiment: 'Neutral', count: 935, percentage: 22.0 },
          { sentiment: 'Negative', count: 530, percentage: 12.5 }
        ],
        engagement_over_time: [
          { date: '2024-01', likes: 15600, comments: 420, views: 185600 },
          { date: '2024-02', likes: 18200, comments: 510, views: 224800 },
          { date: '2024-03', likes: 21400, comments: 625, views: 267200 },
          { date: '2024-04', likes: 24800, comments: 742, views: 312400 },
          { date: '2024-05', likes: 28300, comments: 856, views: 365800 },
          { date: '2024-06', likes: 32100, comments: 945, views: 425600 }
        ],
        top_keywords: [
          { keyword: 'amazing', count: 342 },
          { keyword: 'helpful', count: 287 },
          { keyword: 'great', count: 265 },
          { keyword: 'awesome', count: 234 },
          { keyword: 'love', count: 198 },
          { keyword: 'fantastic', count: 176 },
          { keyword: 'excellent', count: 154 },
          { keyword: 'perfect', count: 132 }
        ],
        comment_trends: [
          { hour: 0, count: 45 }, { hour: 1, count: 28 }, { hour: 2, count: 18 },
          { hour: 3, count: 12 }, { hour: 4, count: 15 }, { hour: 5, count: 25 },
          { hour: 6, count: 58 }, { hour: 7, count: 89 }, { hour: 8, count: 134 },
          { hour: 9, count: 167 }, { hour: 10, count: 201 }, { hour: 11, count: 245 },
          { hour: 12, count: 289 }, { hour: 13, count: 312 }, { hour: 14, count: 334 },
          { hour: 15, count: 378 }, { hour: 16, count: 425 }, { hour: 17, count: 467 },
          { hour: 18, count: 523 }, { hour: 19, count: 589 }, { hour: 20, count: 612 },
          { hour: 21, count: 545 }, { hour: 22, count: 434 }, { hour: 23, count: 267 }
        ],
        monthly_growth: [
          { month: 'Jan 2024', subscribers: 98420, views: 1456000 },
          { month: 'Feb 2024', subscribers: 105680, views: 1687000 },
          { month: 'Mar 2024', subscribers: 112450, views: 1892000 },
          { month: 'Apr 2024', subscribers: 118920, views: 2134000 },
          { month: 'May 2024', subscribers: 122340, views: 2387000 },
          { month: 'Jun 2024', subscribers: 125423, views: 2847632 }
        ]
      });
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
              <BarChart3 className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Channel Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Users className="h-6 w-6 mr-2 text-electric-blue" />
            Channel Overview
          </h2>
          
          {/* Channel Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card border-l-4 border-l-electric-blue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Channel Name</CardTitle>
                <Youtube className="h-4 w-4 text-electric-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{dashboardData?.channel_name}</div>
                <p className="text-xs text-gray-500 mt-1">Active since {dashboardData?.channel_created}</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-neon-green">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-neon-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{dashboardData?.subscriber_count}</div>
                <p className="text-xs text-neon-green flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Growing audience
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-purple-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Videos</CardTitle>
                <Eye className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{dashboardData?.total_videos}</div>
                <p className="text-xs text-gray-500 mt-1">Content library</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-orange-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Views</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.total_views?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-orange-400 flex items-center mt-1">
                  <Eye className="h-3 w-3 mr-1" />
                  Lifetime views
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="glass-card border-l-4 border-l-bright-red">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-bright-red" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{dashboardData?.total_comments.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Comments analyzed</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-pink-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Overall Sentiment</CardTitle>
                <Heart className="h-4 w-4 text-pink-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {((dashboardData?.avg_sentiment_score || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-pink-400 flex items-center mt-1">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {(dashboardData?.avg_sentiment_score || 0) > 0.6 ? 'Positive Community' : 'Mixed Sentiment'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Charts Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-electric-blue" />
            Analytics & Insights
          </h2>

          {/* Sentiment Analysis Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Heart className="h-5 w-5 text-pink-400" />
                Sentiment Distribution
              </CardTitle>
              <p className="text-gray-400">Analysis of comment sentiment across your content</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboardData?.sentiment_distribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ sentiment, percentage }) => `${sentiment}: ${percentage}%`}
                      >
                        {dashboardData?.sentiment_distribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.sentiment === 'Positive' ? COLORS.positive :
                              entry.sentiment === 'Negative' ? COLORS.negative :
                              COLORS.neutral
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), 'Comments']}
                        contentStyle={{
                          backgroundColor: 'rgba(26, 26, 26, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary Stats */}
                <div className="flex flex-col justify-center space-y-4">
                  {dashboardData?.sentiment_distribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg glass-effect">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: item.sentiment === 'Positive' ? COLORS.positive :
                                           item.sentiment === 'Negative' ? COLORS.negative :
                                           COLORS.neutral
                          }}
                        />
                        <span className="font-medium text-white">{item.sentiment}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{item.count.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Over Time Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-electric-blue" />
                Engagement Trends Over Time
              </CardTitle>
              <p className="text-gray-400">Monthly performance across key metrics</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardData?.engagement_over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                  <XAxis dataKey="date" tick={{ fill: COLORS.chart.text }} />
                  <YAxis tick={{ fill: COLORS.chart.text }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString()]}
                    contentStyle={{
                      backgroundColor: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: COLORS.chart.text }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stackId="1" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary}
                    fillOpacity={0.7}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="likes" 
                    stackId="2" 
                    stroke={COLORS.positive} 
                    fill={COLORS.positive}
                    fillOpacity={0.7}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="comments" 
                    stackId="3" 
                    stroke={COLORS.accent} 
                    fill={COLORS.accent}
                    fillOpacity={0.7}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Keywords Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-neon-green" />
                Most Popular Keywords
              </CardTitle>
              <p className="text-gray-400">Words most frequently used in comments</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={dashboardData?.top_keywords} 
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                  <XAxis type="number" tick={{ fill: COLORS.chart.text }} />
                  <YAxis dataKey="keyword" type="category" width={80} tick={{ fill: COLORS.chart.text }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Mentions']}
                    contentStyle={{
                      backgroundColor: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.secondary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Comment Activity by Hour */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-orange-400" />
                Daily Activity Patterns
              </CardTitle>
              <p className="text-gray-400">When your audience is most active throughout the day</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.comment_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(hour) => `${hour}:00`}
                    tick={{ fill: COLORS.chart.text }}
                  />
                  <YAxis tick={{ fill: COLORS.chart.text }} />
                  <Tooltip 
                    labelFormatter={(hour) => `${hour}:00`}
                    formatter={(value: number) => [value, 'Comments']}
                    contentStyle={{
                      backgroundColor: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Growth Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Channel Growth Over Time
              </CardTitle>
              <p className="text-gray-400">Subscriber and view growth progression</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.monthly_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chart.grid} />
                  <XAxis dataKey="month" tick={{ fill: COLORS.chart.text }} />
                  <YAxis yAxisId="left" tick={{ fill: COLORS.chart.text }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: COLORS.chart.text }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString()]}
                    contentStyle={{
                      backgroundColor: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend wrapperStyle={{ color: COLORS.chart.text }} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="subscribers" 
                    stroke={COLORS.secondary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.secondary, r: 5 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="views" 
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Summary Footer */}
        <Card className="mt-8 glass-effect border border-electric-blue/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Analysis Complete!</h3>
              <p className="text-gray-400 mb-6">
                Your channel shows strong engagement with a positive community sentiment. 
                Keep creating great content to maintain this momentum!
              </p>
              <Button 
                onClick={onNewAnalysis}
                size="lg"
                className="bg-gradient-to-r from-electric-blue to-bright-red hover:from-electric-blue/90 hover:to-bright-red/90 text-black font-semibold glow-button"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Analyze Another Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FullScreenDashboard;
