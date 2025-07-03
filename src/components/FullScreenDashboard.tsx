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
  positive: '#10B981',
  negative: '#EF4444', 
  neutral: '#6B7280',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  success: '#059669',
  warning: '#D97706',
  info: '#0284C7',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Preparing your analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="mr-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={onNewAnalysis} variant="outline">
            New Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 p-3 rounded-lg">
                <Youtube className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard & Analytics</h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive insights for {dashboardData?.channel_name || 'Your Channel'}
                </p>
              </div>
            </div>
            <Button onClick={onNewAnalysis} className="bg-blue-600 hover:bg-blue-700">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Channel Overview
          </h2>
          
          {/* Channel Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Channel Name</CardTitle>
                <Youtube className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{dashboardData?.channel_name}</div>
                <p className="text-xs text-gray-500 mt-1">Active since {dashboardData?.channel_created}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{dashboardData?.subscriber_count}</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Growing audience
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Videos</CardTitle>
                <Eye className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{dashboardData?.total_videos}</div>
                <p className="text-xs text-gray-500 mt-1">Content library</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_views?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Eye className="h-3 w-3 mr-1" />
                  Lifetime views
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{dashboardData?.total_comments.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Comments analyzed</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overall Sentiment</CardTitle>
                <Heart className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {((dashboardData?.avg_sentiment_score || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-pink-600 flex items-center mt-1">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {(dashboardData?.avg_sentiment_score || 0) > 0.6 ? 'Positive Community' : 'Mixed Sentiment'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Charts Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
            Analytics & Insights
          </h2>

          {/* Sentiment Analysis Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Sentiment Distribution
              </CardTitle>
              <p className="text-gray-600">Analysis of comment sentiment across your content</p>
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
                      <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Comments']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary Stats */}
                <div className="flex flex-col justify-center space-y-4">
                  {dashboardData?.sentiment_distribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: item.sentiment === 'Positive' ? COLORS.positive :
                                           item.sentiment === 'Negative' ? COLORS.negative :
                                           COLORS.neutral
                          }}
                        />
                        <span className="font-medium">{item.sentiment}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{item.count.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Over Time Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Engagement Trends Over Time
              </CardTitle>
              <p className="text-gray-600">Monthly performance across key metrics</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardData?.engagement_over_time}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [value.toLocaleString()]} />
                  <Legend />
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
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Most Popular Keywords
              </CardTitle>
              <p className="text-gray-600">Words most frequently used in comments</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={dashboardData?.top_keywords} 
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="keyword" type="category" width={80} />
                  <Tooltip formatter={(value: any) => [value, 'Mentions']} />
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
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Daily Activity Patterns
              </CardTitle>
              <p className="text-gray-600">When your audience is most active throughout the day</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.comment_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(hour) => `${hour}:00`}
                    formatter={(value: any) => [value, 'Comments']}
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
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Channel Growth Over Time
              </CardTitle>
              <p className="text-gray-600">Subscriber and view growth progression</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData?.monthly_growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value: any) => [value.toLocaleString()]} />
                  <Legend />
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
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Analysis Complete!</h3>
              <p className="text-gray-600 mb-6">
                Your channel shows strong engagement with a positive community sentiment. 
                Keep creating great content to maintain this momentum!
              </p>
              <Button 
                onClick={onNewAnalysis}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
