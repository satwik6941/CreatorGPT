import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, BarChart3, FileText, Download, RefreshCw, TrendingUp } from "lucide-react";
import DashboardDisplay from "@/components/DashboardDisplay";
import apiService, { AnalysisResults } from "@/services/api";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalysisResults | null>(
    location.state?.results || null
  );
  const [channelId] = useState<string>(location.state?.channelId || '');
  const [loading, setLoading] = useState(!results);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no results were passed via navigation state, try to fetch them
    if (!results) {
      fetchResults();
    }
  }, [results]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const analysisResults = await apiService.getResults();
      setResults(analysisResults);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin mr-3 text-purple-600" />
            <span className="text-lg text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button onClick={fetchResults} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/analysis-realtime')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analysis
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Analysis Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Complete sentiment analysis results and insights
              </p>
            </div>
          </div>
          
          <Button 
            onClick={fetchResults}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* Channel Info */}
        {channelId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Channel ID</div>
                  <div className="font-mono text-sm font-semibold text-blue-700 break-all">
                    {channelId}
                  </div>
                </div>
                {results?.total_comments && (
                  <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Comments</div>
                    <div className="text-2xl font-bold text-green-700">
                      {results.total_comments.toLocaleString()}
                    </div>
                  </div>
                )}
                {results?.average_sentiment && (
                  <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Average Sentiment</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {results.average_sentiment.toFixed(1)}/100
                    </div>
                  </div>
                )}
                {results?.sentiment_breakdown && (
                  <div className="bg-gradient-to-r from-orange-100 to-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Positive Comments</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {results.sentiment_breakdown.positive.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Display */}
        <DashboardDisplay />

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Additional tools and options for your analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => navigate('/analysis-realtime')}
                variant="outline"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
              <Button 
                onClick={() => navigate('/creator-profile')}
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze Different Channel
              </Button>
              <Button 
                onClick={fetchResults}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
