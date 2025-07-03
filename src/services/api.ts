import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// API service for communicating with the backend
export const apiService = {
  // Start YouTube channel analysis
  async startAnalysis(channelId: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        channel_id: channelId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to start analysis:', error);
      throw error;
    }
  },

  // Get analysis status
  async getAnalysisStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/analysis/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get analysis status:', error);
      throw error;
    }
  },

  // Get dashboard data
  async getDashboardData() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  },

  // WebSocket connection for real-time updates
  createWebSocket(onMessage: (data: WebSocketMessage) => void, onError?: (error: Event) => void) {
    const ws = new WebSocket(`ws://localhost:8000/ws/analysis`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return ws;
  }
};

// Default export for backward compatibility
export default apiService;

// Types for API responses
export interface WebSocketMessage extends AnalysisProgress {
  type?: string;
}

export interface AnalysisProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  step: string;
  message: string;
  progress: number;
  channel_info?: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  error?: string;
  logs?: string[];
}

export interface AnalysisResponse {
  status: string;
  message: string;
  channel_id: string;
}

export interface AnalysisStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  step: string;
  message: string;
  progress: number;
  channel_info?: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  error?: string;
}

export interface DashboardData {
  channel_info: {
    channel_name: string;
    subscriber_count: string;
    total_comments: number;
  };
  sentiment_summary: {
    positive: number;
    negative: number;
    neutral: number;
  };
  comments_data: Array<{
    comment: string;
    sentiment_score: number;
    sentiment_label: string;
    timestamp: string;
  }>;
}
