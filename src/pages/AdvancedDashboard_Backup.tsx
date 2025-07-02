import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import {
  Brain,
  ArrowLeft,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Users,
  BarChart3,
  FileText,
  Lightbulb,
  Star,
  AlertCircle,
  RefreshCw,
  PieChart as PieChartIcon
} from "lucide-react";
import apiService, { AnalyzedContent, ChartData } from "@/services/api";

const AdvancedDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('channelId') || '';
  
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [analyzedContent, setAnalyzedContent] = useState<AnalyzedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load chart data and analyzed content
      const [charts, content] = await Promise.all([
        apiService.getChartData(),
        apiService.getAnalyzedContent()
      ]);
      
      setChartData(charts);
      setAnalyzedContent(content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-surface border border-electric-blue/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = {
    positive: '#10B981',
    neutral: '#6B7280', 
    negative: '#EF4444'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-electric-blue mx-auto mb-4" />
          <p className="text-xl">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-deep-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-xl mb-4">Error loading dashboard: {error}</p>
          <Button onClick={loadDashboardData} className="bg-electric-blue text-black">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-black text-white">
      {/* Header */}
      <nav className="p-6 border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-electric-blue to-bright-red rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Brain className="w-5 h-5 text-white transition-transform duration-300 group-hover:animate-pulse" />
            </div>
            <span className="text-xl font-bold transition-colors duration-300 group-hover:text-electric-blue">Creator GPT Dashboard</span>
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
            <Button 
              onClick={loadDashboardData}
              variant="outline"
              className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect border-electric-blue/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Comments</p>
                  <p className="text-2xl font-bold text-electric-blue">{chartData?.total_comments?.toLocaleString() || 0}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-electric-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-electric-blue/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Sentiment</p>
                  <p className="text-2xl font-bold text-electric-blue">{chartData?.average_sentiment?.toFixed(1) || 0}/100</p>
                </div>
                <TrendingUp className="w-8 h-8 text-electric-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-electric-blue/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Batches Analyzed</p>
                  <p className="text-2xl font-bold text-electric-blue">{analyzedContent.length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-electric-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-electric-blue/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Channel ID</p>
                  <p className="text-sm font-mono text-electric-blue truncate">{channelId}</p>
                </div>
                <Users className="w-8 h-8 text-electric-blue" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-dark-surface border border-electric-blue/20">
            <TabsTrigger value="charts" className="data-[state=active]:bg-electric-blue data-[state=active]:text-black">
              📊 Charts & Analytics
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-electric-blue data-[state=active]:text-black">
              💡 AI Insights
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-electric-blue data-[state=active]:text-black">
              💬 Top Comments
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Distribution Pie Chart */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChartIcon className="w-5 h-5 text-electric-blue" />
                    <span>Sentiment Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData?.sentiment_distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData?.sentiment_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Score Ranges Bar Chart */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-electric-blue" />
                    <span>Confidence Score Ranges</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData?.score_ranges || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fill: '#9CA3AF' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sentiment Trends Line Chart */}
              <Card className="glass-effect border-electric-blue/20 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-electric-blue" />
                    <span>Sentiment Trends Across Batches</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData?.sentiment_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="batch" tick={{ fill: '#9CA3AF' }} />
                      <YAxis tick={{ fill: '#9CA3AF' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={2} />
                      <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Theme Analysis Bar Chart */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-electric-blue" />
                    <span>Theme Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData?.theme_analysis || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="theme" 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tick={{ fill: '#9CA3AF' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill="#10B981"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Enhanced Metrics Cards */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-electric-blue" />
                    <span>Engagement Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gradient-to-r from-green-900/20 to-green-700/20 rounded-lg border border-green-600/30">
                        <div className="text-green-400 text-2xl font-bold">
                          {chartData?.sentiment_distribution
                            .find(item => item.name === 'Positive')?.value?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-400">Positive Sentiment</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-r from-red-900/20 to-red-700/20 rounded-lg border border-red-600/30">
                        <div className="text-red-400 text-2xl font-bold">
                          {chartData?.sentiment_distribution
                            .find(item => item.name === 'Negative')?.value?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-400">Negative Sentiment</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-electric-blue/30">
                      <div className="text-electric-blue text-lg font-bold">
                        {(() => {
                          if (chartData?.average_sentiment && chartData.average_sentiment > 60) return '🟢 High Confidence';
                          if (chartData?.average_sentiment && chartData.average_sentiment > 40) return '🟡 Medium Confidence';
                          return '🔴 Low Confidence';
                        })()}
                      </div>
                      <div className="text-xs text-gray-400">Engagement Quality</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analyzedContent.map((content, index) => (
                <Card key={index} className="glass-effect border-electric-blue/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Batch {content.batch_number} Analysis</span>
                      <Badge variant="outline" className="border-electric-blue text-electric-blue">
                        {content.total_comments_processed} comments
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sentiment Breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-green-900/20 rounded">
                        <div className="text-green-400 font-bold">{content.sentiment_breakdown.positive.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Positive</div>
                      </div>
                      <div className="text-center p-2 bg-gray-900/20 rounded">
                        <div className="text-gray-400 font-bold">{content.sentiment_breakdown.neutral.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Neutral</div>
                      </div>
                      <div className="text-center p-2 bg-red-900/20 rounded">
                        <div className="text-red-400 font-bold">{content.sentiment_breakdown.negative.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Negative</div>
                      </div>
                    </div>

                    {/* Themes and Insights */}
                    <Tabs defaultValue="positive" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-dark-surface/50">
                        <TabsTrigger value="positive" className="text-xs">Positive</TabsTrigger>
                        <TabsTrigger value="negative" className="text-xs">Negative</TabsTrigger>
                        <TabsTrigger value="suggestions" className="text-xs">Suggestions</TabsTrigger>
                        <TabsTrigger value="recommendations" className="text-xs">Recs</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="positive" className="mt-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-green-400 flex items-center">
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Positive Themes
                          </h4>
                          <ScrollArea className="h-24">
                            {content.positive_themes.slice(0, 3).map((theme, i) => (
                              <div key={i} className="text-xs text-gray-300 mb-1 p-1 bg-green-900/10 rounded">
                                • {theme}
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="negative" className="mt-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-red-400 flex items-center">
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Negative Themes
                          </h4>
                          <ScrollArea className="h-24">
                            {content.negative_themes.slice(0, 3).map((theme, i) => (
                              <div key={i} className="text-xs text-gray-300 mb-1 p-1 bg-red-900/10 rounded">
                                • {theme}
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="suggestions" className="mt-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-blue-400 flex items-center">
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Viewer Suggestions
                          </h4>
                          <ScrollArea className="h-24">
                            {content.viewer_suggestions.slice(0, 3).map((suggestion, i) => (
                              <div key={i} className="text-xs text-gray-300 mb-1 p-1 bg-blue-900/10 rounded">
                                • {suggestion}
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="recommendations" className="mt-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-yellow-400 flex items-center">
                            <Star className="w-4 h-4 mr-2" />
                            Content Recommendations
                          </h4>
                          <ScrollArea className="h-24">
                            {content.content_recommendations.slice(0, 3).map((rec, i) => (
                              <div key={i} className="text-xs text-gray-300 mb-1 p-1 bg-yellow-900/10 rounded">
                                • {rec}
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Top Comments Tab */}
          <TabsContent value="comments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Positive Comments */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-400">
                    <ThumbsUp className="w-5 h-5" />
                    <span>Top Positive Comments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {analyzedContent.flatMap((content, batchIndex) => 
                        content.top_positive_comments.slice(0, 2).map((comment, commentIndex) => (
                          <div key={`positive-${batchIndex}-${commentIndex}`} className="p-3 bg-green-900/10 border border-green-600/20 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                                Batch {content.batch_number}
                              </Badge>
                              <ThumbsUp className="w-4 h-4 text-green-400" />
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{comment}</p>
                          </div>
                        ))
                      }
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Top Negative Comments */}
              <Card className="glass-effect border-electric-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-400">
                    <ThumbsDown className="w-5 h-5" />
                    <span>Top Negative Comments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {analyzedContent.flatMap((content, batchIndex) => 
                        content.top_negative_comments.slice(0, 2).map((comment, commentIndex) => (
                          <div key={`negative-${batchIndex}-${commentIndex}`} className="p-3 bg-red-900/10 border border-red-600/20 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                                Batch {content.batch_number}
                              </Badge>
                              <ThumbsDown className="w-4 h-4 text-red-400" />
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{comment}</p>
                          </div>
                        ))
                      }
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedDashboard;
