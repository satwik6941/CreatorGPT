import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Brain, CheckCircle, TrendingUp } from "lucide-react";
import RealTimeLogger from "@/components/RealTimeLogger";
import apiService, { AnalysisResults } from "@/services/api";

const AnalysisWithRealTimeLogs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('channelId') || '';
  
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  useEffect(() => {
    if (!channelId) {
      navigate('/creator-profile');
      return;
    }
  }, [channelId, navigate]);

  const handleAnalysisComplete = async (analysisState: any) => {
    console.log('Analysis completed:', analysisState);
    setIsAnalysisComplete(true);
    
    // Fetch the complete results
    try {
      const analysisResults = await apiService.getResults();
      setResults(analysisResults);
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      // Still set as complete even if results fetch fails
      // The DashboardDisplay component will handle loading files directly
    }
  };

  const goToDashboard = () => {
    if (results) {
      navigate('/dashboard', { 
        state: { 
          results,
          channelId 
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/creator-profile')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Channel Input
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Real-Time Analysis
              </h1>
              <p className="text-gray-600 mt-1">
                Watch your YouTube channel analysis happen in real-time
              </p>
            </div>
          </div>
          
          {isAnalysisComplete && results && (
            <Button 
              onClick={goToDashboard}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Dashboard
            </Button>
          )}
        </div>

        {/* Channel Info */}
        {channelId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Analysis Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Channel ID:</div>
                <div className="font-mono text-lg font-semibold text-purple-700">
                  {channelId}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-Time Logger Component */}
        <RealTimeLogger 
          channelId={channelId}
          onAnalysisComplete={handleAnalysisComplete}
        />

        {/* Analysis Complete Card */}
        {isAnalysisComplete && (
          <Card className="mt-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Analysis Complete!
              </CardTitle>
              <CardDescription className="text-green-700">
                Your YouTube channel analysis has been completed successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      ✅
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Comments Extracted
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      🤖
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      AI Analysis Complete
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      📊
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Sentiment Analysis Done
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={goToDashboard}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Detailed Results
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/creator-profile')}
                  >
                    Analyze Another Channel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">💡 What's Happening?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <span className="text-blue-600">1️⃣</span>
                </div>
                <div>
                  <div className="font-medium">YouTube Extraction</div>
                  <div className="text-gray-600">Fetching comments from your channel videos</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <span className="text-purple-600">2️⃣</span>
                </div>
                <div>
                  <div className="font-medium">AI Processing</div>
                  <div className="text-gray-600">Analyzing themes and extracting insights</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <span className="text-green-600">3️⃣</span>
                </div>
                <div>
                  <div className="font-medium">Sentiment Analysis</div>
                  <div className="text-gray-600">Calculating emotional tone of comments</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 p-2 rounded-full">
                  <span className="text-orange-600">4️⃣</span>
                </div>
                <div>
                  <div className="font-medium">Dashboard Creation</div>
                  <div className="text-gray-600">Generating visual insights and reports</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisWithRealTimeLogs;
