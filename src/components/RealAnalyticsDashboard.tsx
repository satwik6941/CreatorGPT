import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, MessageSquare, ThumbsUp, ThumbsDown, Eye, Star, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '@/services/api';

interface BatchAnalysis {
  batchNumber: number;
  totalComments: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  positiveThemes: string[];
  negativeThemes: string[];
  suggestions: string[];
  appreciation: string[];
  recommendations: string[];
  topPositiveComments: string[];
  topNegativeComments: string[];
  processingDate: string;
}

interface ChannelData {
  channelName: string;
  totalComments: number;
  totalBatches: number;
  overallPositive: number;
  overallNeutral: number;
  overallNegative: number;
  processingDate: string;
}

const RealAnalyticsDashboard: React.FC = () => {
  const [batchAnalyses, setBatchAnalyses] = useState<BatchAnalysis[]>([]);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.getBatchAnalysis();
        
        if (response.success) {
          setBatchAnalyses(response.batchAnalyses || []);
          setChannelData(response.channelData || null);
        } else {
          throw new Error('Failed to load batch analysis data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
        console.error('Error loading real data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  const sentimentData = [
    { name: 'Positive', value: channelData?.overallPositive || 0, color: '#22c55e' },
    { name: 'Neutral', value: channelData?.overallNeutral || 0, color: '#6b7280' },
    { name: 'Negative', value: channelData?.overallNegative || 0, color: '#ef4444' }
  ];

  const batchTrendData = batchAnalyses.map(batch => ({
    batch: `Batch ${batch.batchNumber}`,
    positive: batch.positivePercentage,
    neutral: batch.neutralPercentage,
    negative: batch.negativePercentage
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Loading Real Analytics...</p>
          <p className="text-sm text-gray-500">Reading batch analysis files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-red-600 mb-2">Failed to Load Analytics</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500 mb-4">
            Make sure the batch analysis files (analyzed_comments_batch_*.txt) are available in the project directory.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!channelData || batchAnalyses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-yellow-600 mb-2">No Analytics Data Found</p>
          <p className="text-sm text-gray-600 mb-4">
            No batch analysis files were found. Please run the analysis first.
          </p>
          <Button onClick={() => window.location.href = '/creator-profile'} className="mt-4">
            Start Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {channelData?.channelName} Analytics Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Real-time insights from {channelData?.totalComments.toLocaleString()} comments across {channelData?.totalBatches} batches
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {channelData?.processingDate}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-4 py-2 text-lg">
                <Eye className="w-4 h-4 mr-2" />
                Live Data
              </Badge>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{channelData?.totalComments.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Across {channelData?.totalBatches} batches</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Positive Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{channelData?.overallPositive.toFixed(1)}%</div>
              <Progress value={channelData?.overallPositive} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Neutral Sentiment</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{channelData?.overallNeutral.toFixed(1)}%</div>
              <Progress value={channelData?.overallNeutral} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Negative Sentiment</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{channelData?.overallNegative.toFixed(1)}%</div>
              <Progress value={channelData?.overallNegative} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="positive">Positive Themes</TabsTrigger>
            <TabsTrigger value="negative">Negative Themes</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="comments">Top Comments</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Distribution */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" />
                    Sentiment Distribution
                  </CardTitle>
                  <CardDescription>Overall sentiment breakdown across all batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      positive: { label: "Positive", color: "#22c55e" },
                      neutral: { label: "Neutral", color: "#6b7280" },
                      negative: { label: "Negative", color: "#ef4444" }
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Batch Trends */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Sentiment Trends by Batch</CardTitle>
                  <CardDescription>Sentiment evolution across different batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      positive: { label: "Positive", color: "#22c55e" },
                      neutral: { label: "Neutral", color: "#6b7280" },
                      negative: { label: "Negative", color: "#ef4444" }
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={batchTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="batch" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="positive" fill="#22c55e" />
                        <Bar dataKey="neutral" fill="#6b7280" />
                        <Bar dataKey="negative" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positive" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ThumbsUp className="w-5 h-5 mr-2 text-green-600" />
                  Common Positive Themes
                </CardTitle>
                <CardDescription>What viewers appreciate most about your content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {batchAnalyses.map((batch, index) => (
                    <div key={index}>
                      <h3 className="font-semibold text-lg mb-3">Batch {batch.batchNumber}</h3>
                      <div className="grid gap-3">
                        {batch.positiveThemes.map((theme, themeIndex) => (
                          <div key={themeIndex} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <p className="text-sm text-gray-700">{theme}</p>
                          </div>
                        ))}
                      </div>
                      {index < batchAnalyses.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="negative" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ThumbsDown className="w-5 h-5 mr-2 text-red-600" />
                  Common Negative Themes
                </CardTitle>
                <CardDescription>Areas that need attention and improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {batchAnalyses.map((batch, index) => (
                    <div key={index}>
                      <h3 className="font-semibold text-lg mb-3">Batch {batch.batchNumber}</h3>
                      <div className="grid gap-3">
                        {batch.negativeThemes.map((theme, themeIndex) => (
                          <div key={themeIndex} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <p className="text-sm text-gray-700">{theme}</p>
                          </div>
                        ))}
                      </div>
                      {index < batchAnalyses.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Viewer Suggestions</CardTitle>
                  <CardDescription>What your audience wants to see more of</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {batchAnalyses.map((batch, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-sm text-gray-500 mb-2">Batch {batch.batchNumber}</h4>
                        <div className="space-y-2">
                          {batch.suggestions.map((suggestion, suggestionIndex) => (
                            <div key={suggestionIndex} className="p-2 bg-blue-50 rounded-md">
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                        {index < batchAnalyses.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Content Recommendations</CardTitle>
                  <CardDescription>Actionable improvements based on feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {batchAnalyses.map((batch, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-sm text-gray-500 mb-2">Batch {batch.batchNumber}</h4>
                        <div className="space-y-2">
                          {batch.recommendations.map((rec, recIndex) => (
                            <div key={recIndex} className="p-2 bg-purple-50 rounded-md">
                              <p className="text-sm text-gray-700">{rec}</p>
                            </div>
                          ))}
                        </div>
                        {index < batchAnalyses.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ThumbsUp className="w-5 h-5 mr-2 text-green-600" />
                    Top Positive Comments
                  </CardTitle>
                  <CardDescription>Most appreciated comments from viewers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {batchAnalyses.map((batch, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-sm text-gray-500 mb-2">Batch {batch.batchNumber}</h4>
                        <div className="space-y-2">
                          {batch.topPositiveComments.map((comment, commentIndex) => (
                            <div key={commentIndex} className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-gray-700 italic">"{comment}"</p>
                            </div>
                          ))}
                        </div>
                        {index < batchAnalyses.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ThumbsDown className="w-5 h-5 mr-2 text-red-600" />
                    Top Negative Comments
                  </CardTitle>
                  <CardDescription>Critical feedback that needs attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {batchAnalyses.map((batch, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-sm text-gray-500 mb-2">Batch {batch.batchNumber}</h4>
                        <div className="space-y-2">
                          {batch.topNegativeComments.map((comment, commentIndex) => (
                            <div key={commentIndex} className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-sm text-gray-700 italic">"{comment}"</p>
                            </div>
                          ))}
                        </div>
                        {index < batchAnalyses.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Batch Analysis Summary</CardTitle>
                <CardDescription>Detailed breakdown of each batch analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Batch</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Comments</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Positive %</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Neutral %</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Negative %</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Processing Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchAnalyses.map((batch, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 font-medium">
                            Batch {batch.batchNumber}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {batch.totalComments.toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className="text-green-600 font-medium">{batch.positivePercentage}%</span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className="text-gray-600 font-medium">{batch.neutralPercentage}%</span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className="text-red-600 font-medium">{batch.negativePercentage}%</span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-500">
                            {new Date(batch.processingDate).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealAnalyticsDashboard;
