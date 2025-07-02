import axios from 'axios';

// Use relative URLs in production, absolute in development
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for analysis
});

export interface ChannelInfo {
  channel_name: string;
  subscriber_count: string;
  total_comments: number;
}

export interface AnalysisStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  step: string;
  message: string;
  progress: number;
  channel_info?: ChannelInfo;
  error?: string;
}

export interface AnalysisResults {
  average_sentiment?: number;
  total_comments?: number;
  sentiment_breakdown?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  detailed_results?: string;
  generated_files?: string[];
  analyzed_content?: AnalyzedContent[];
}

export interface AnalyzedContent {
  batch_number: number;
  total_comments_processed: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  positive_themes: string[];
  negative_themes: string[];
  viewer_suggestions: string[];
  viewer_appreciation: string[];
  content_recommendations: string[];
  top_positive_comments: string[];
  top_negative_comments: string[];
}

export interface WordFrequency {
  word: string;
  count: number;
  type: 'positive' | 'negative';
}

export interface ChartData {
  sentiment_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  sentiment_trends: Array<{
    batch: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  theme_analysis: Array<{
    theme: string;
    count: number;
    type: 'positive' | 'negative';
  }>;
  score_ranges: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  total_comments: number;
  average_sentiment: number;
  word_frequency_positive: WordFrequency[];
  word_frequency_negative: WordFrequency[];
  confidence_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export const apiService = {
  // Start analysis
  async startAnalysis(channelId: string): Promise<AnalysisStatus> {
    try {
      const response = await api.post('/api/analyze', { channel_id: channelId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to start analysis');
    }
  },

  // Get analysis status
  async getStatus(): Promise<AnalysisStatus> {
    try {
      const response = await api.get('/api/status');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get status');
    }
  },

  // Get analysis logs
  async getLogs(): Promise<{ logs: string[] }> {
    try {
      const response = await api.get('/api/logs');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get logs');
    }
  },

  // Get analysis results
  async getResults(): Promise<AnalysisResults> {
    try {
      const response = await api.get('/api/results');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get results');
    }
  },

  // Get analyzed content from batch files
  async getAnalyzedContent(): Promise<AnalyzedContent[]> {
    try {
      const response = await api.get('/api/analyzed-content');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get analyzed content');
    }
  },

  // Get chart data for dashboard
  async getChartData(): Promise<ChartData> {
    try {
      const response = await api.get('/api/chart-data');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get chart data');
    }
  },

  // Reset analysis state
  async resetAnalysis(): Promise<{ message: string }> {
    try {
      const response = await api.post('/api/reset');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to reset analysis');
    }
  },

  // Get dashboard image URL
  getDashboardImageUrl(): string {
    return `${API_BASE_URL}/static/sentiment_analysis_dashboard.png?t=${Date.now()}`;
  },

  // Get chart image URL
  getChartImageUrl(chartName: string): string {
    return `${API_BASE_URL}/api/chart/${chartName}?t=${Date.now()}`;
  },

  // Get available files
  async getAvailableFiles(): Promise<{
    dashboard: string | null;
    charts: string[];
    reports: string[];
    data_files: string[];
  }> {
    try {
      const response = await api.get('/api/available-files');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get available files');
    }
  },

  // Check if dashboard exists
  async checkDashboardExists(): Promise<boolean> {
    try {
      const files = await this.getAvailableFiles();
      return files.dashboard !== null;
    } catch (error) {
      return false;
    }
  },

  // Health check
  async healthCheck(): Promise<{ message: string; status: string }> {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error: any) {
      throw new Error('API server is not running');
    }
  }
};

export default apiService;
