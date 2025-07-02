import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  Download, 
  Image as ImageIcon, 
  FileText, 
  RefreshCw,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import apiService from "@/services/api";

interface AvailableFiles {
  dashboard: string | null;
  charts: string[];
  reports: string[];
  data_files: string[];
}

const DashboardDisplay = () => {
  const [availableFiles, setAvailableFiles] = useState<AvailableFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);

  const loadAvailableFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const files = await apiService.getAvailableFiles();
      setAvailableFiles(files);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableFiles();
    
    // Refresh files every 5 seconds to catch newly generated files
    const interval = setInterval(loadAvailableFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleImageLoad = () => {
    setDashboardLoaded(true);
  };

  const handleImageError = () => {
    setError("Failed to load dashboard image");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button onClick={loadAvailableFiles} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!availableFiles) {
    return (
      <Alert>
        <AlertDescription>No dashboard data available yet</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Main Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4" />
            <span>Individual Charts</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Data Files</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {availableFiles.dashboard ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Comprehensive Sentiment Analysis Dashboard</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`http://localhost:8000/static/sentiment_analysis_dashboard.png`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Full Size
                  </Button>
                </CardTitle>
                <CardDescription>
                  Complete analysis with 16+ charts and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {!dashboardLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 rounded">
                      <RefreshCw className="w-8 h-8 animate-spin text-electric-blue" />
                    </div>
                  )}
                  <img
                    src={`http://localhost:8000/static/sentiment_analysis_dashboard.png?t=${Date.now()}`}
                    alt="Sentiment Analysis Dashboard"
                    className={`w-full h-auto rounded-lg shadow-lg transition-opacity duration-300 ${
                      dashboardLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>Dashboard is being generated... Please wait.</span>
                <Button onClick={loadAvailableFiles} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {availableFiles.charts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableFiles.charts.map((chartUrl, index) => {
                const chartName = chartUrl.split('/').pop() || `Chart ${index + 1}`;
                return (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{chartName.replace('.png', '').replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={`http://localhost:8000${chartUrl}?t=${Date.now()}`}
                        alt={chartName}
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => window.open(`http://localhost:8000${chartUrl}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Size
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertDescription>Individual charts are being generated...</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {availableFiles.reports.length > 0 ? (
            <div className="space-y-3">
              {availableFiles.reports.map((report, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-electric-blue" />
                      <div>
                        <div className="font-medium">{report}</div>
                        <div className="text-sm text-gray-400">Text report file</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>Report files are being generated...</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          {availableFiles.data_files.length > 0 ? (
            <div className="space-y-3">
              {availableFiles.data_files.map((dataFile, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-electric-blue" />
                      <div>
                        <div className="font-medium">{dataFile}</div>
                        <div className="text-sm text-gray-400">
                          {dataFile.endsWith('.csv') ? 'CSV data file' : 'Data file'}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>Data files are being processed...</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button onClick={loadAvailableFiles} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Files
        </Button>
      </div>
    </div>
  );
};

export default DashboardDisplay;
