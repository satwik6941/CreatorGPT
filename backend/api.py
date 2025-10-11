from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import subprocess
import sys
import os
import pandas as pd
import time
import json
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
import threading
import queue
import io
import contextlib
import glob
from collections import Counter

# Get project root directory (parent of backend folder)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

def get_project_path(filename: str) -> str:
    """Get the full path to a file in the project root directory"""
    return os.path.join(PROJECT_ROOT, filename)

def safe_print(message: str):
    """
    Safely print messages that may contain Unicode characters.
    Handles console encoding issues by replacing problematic characters.
    """
    try:
        # Try to print normally first
        print(message)
    except UnicodeEncodeError:
        try:
            # Replace problematic Unicode characters for console output
            safe_message = str(message).encode('ascii', 'replace').decode('ascii')
            print(safe_message)
        except Exception:
            # Last resort: print a simplified message
            print("[MESSAGE CONTAINS UNICODE CHARACTERS - CONTENT SUPPRESSED]")

app = FastAPI(title="CreatorGPT API", version="1.0.0")

# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            if websocket.client_state.name == "CONNECTED":
                await websocket.send_text(message)
            else:
                print(f"[WARNING] WebSocket not connected, removing from active connections")
                self.disconnect(websocket)
        except Exception as e:
            print(f"[WARNING] Error sending WebSocket message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
        
        # Create a copy of the list to avoid modification during iteration
        connections_to_check = self.active_connections.copy()
        
        for connection in connections_to_check:
            try:
                if connection.client_state.name == "CONNECTED":
                    await connection.send_text(message)
                else:
                    self.disconnect(connection)
            except Exception as e:
                print(f"[WARNING] Error broadcasting to WebSocket: {e}")
                self.disconnect(connection)

# Initialize connection manager
manager = ConnectionManager()

# Mount static files directory for serving dashboard images and charts
# Create charts directory if it doesn't exist (in parent directory)
charts_dir = get_project_path("charts")
os.makedirs(charts_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=PROJECT_ROOT), name="static")
app.mount("/charts", StaticFiles(directory=charts_dir), name="charts")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add middleware to handle OPTIONS requests globally
@app.middleware("http")
async def add_cors_header(request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(content={"message": "OK"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"message": "CreatorGPT API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

# Request/Response models
class ChannelAnalysisRequest(BaseModel):
    channel_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "channel_id": "UCdp6GUwjKscp5ST4M4WgIpw"
            }
        }

class ChannelInfo(BaseModel):
    channel_name: str
    subscriber_count: str
    total_comments: int

class AnalysisStatus(BaseModel):
    status: str
    step: str
    message: str
    progress: int
    channel_info: Optional[ChannelInfo] = None
    error: Optional[str] = None

class AnalyzedContent(BaseModel):
    batch_number: int
    total_comments_processed: int
    sentiment_breakdown: Dict[str, float]
    positive_themes: List[str]
    negative_themes: List[str]
    viewer_suggestions: List[str]
    viewer_appreciation: List[str]
    content_recommendations: List[str]
    top_positive_comments: List[str]
    top_negative_comments: List[str]

class ChartDataPoint(BaseModel):
    name: str
    value: float
    color: str

class SentimentTrend(BaseModel):
    batch: str
    positive: float
    neutral: float
    negative: float

class ThemeAnalysis(BaseModel):
    theme: str
    count: int
    type: str

class ChartData(BaseModel):
    sentiment_distribution: List[ChartDataPoint]
    sentiment_trends: List[SentimentTrend]
    theme_analysis: List[ThemeAnalysis]
    score_ranges: List[ChartDataPoint]
    total_comments: int
    average_sentiment: float

class WordFrequency(BaseModel):
    word: str
    count: int
    type: str

class EnhancedChartData(BaseModel):
    sentiment_distribution: List[ChartDataPoint]
    sentiment_trends: List[SentimentTrend]
    theme_analysis: List[ThemeAnalysis]
    score_ranges: List[ChartDataPoint]
    total_comments: int
    average_sentiment: float
    word_frequency_positive: List[WordFrequency]
    word_frequency_negative: List[WordFrequency]
    confidence_distribution: List[ChartDataPoint]

# Global variables to store analysis state
analysis_state = {
    "status": "idle",
    "step": "",
    "message": "",
    "progress": 0,
    "channel_info": None,
    "error": None,
    "logs": []
}

async def broadcast_analysis_update():
    """Broadcast current analysis state to all connected WebSocket clients"""
    try:
        # Check if there are any active connections
        if not manager.active_connections:
            return
        
        # Ensure the analysis_state is JSON serializable
        serializable_state = dict(analysis_state)
        
        # Convert channel_info to dict if it's an object
        if serializable_state.get("channel_info") and hasattr(serializable_state["channel_info"], "__dict__"):
            serializable_state["channel_info"] = serializable_state["channel_info"].__dict__
        
        message = json.dumps(serializable_state)
        
        # Safe print for Unicode characters - avoid console encoding issues
        debug_message = serializable_state.get('message', 'No message')
        safe_print(f"[DEBUG] Broadcasting to {len(manager.active_connections)} clients: {debug_message}")
        
        await manager.broadcast(message)
    except Exception as e:
        safe_print(f"[ERROR] Error broadcasting update: {e}")
        import traceback
        traceback.print_exc()

# WebSocket endpoint for real-time analysis updates
@app.websocket("/ws/analysis")
async def websocket_analysis(websocket: WebSocket):
    """WebSocket endpoint for real-time analysis updates"""
    try:
        await manager.connect(websocket)
        safe_print(f"[DEBUG] New WebSocket connection established. Total connections: {len(manager.active_connections)}")
        
        # Send current state immediately on connect
        await manager.send_personal_message(json.dumps(analysis_state), websocket)
        
        # Keep connection alive and handle any client messages
        while True:
            try:
                # Wait for any message with a timeout to keep connection alive
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Echo back or handle client messages if needed
                safe_print(f"[DEBUG] Received WebSocket message: {data}")
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await manager.send_personal_message(json.dumps({"type": "ping", "timestamp": time.time()}), websocket)
            except WebSocketDisconnect:
                safe_print("[DEBUG] WebSocket disconnected by client")
                break
            
    except WebSocketDisconnect:
        safe_print("[DEBUG] WebSocket disconnected")
    except Exception as e:
        safe_print(f"[ERROR] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect(websocket)
        safe_print(f"[DEBUG] WebSocket connection closed. Remaining connections: {len(manager.active_connections)}")

def update_analysis_state(updates: dict):
    """Update analysis state and broadcast to WebSocket clients"""
    global analysis_state
    analysis_state.update(updates)
    
    # Print debug info
    safe_print(f"[DEBUG] Analysis state updated: {updates}")
    
    # Use a thread-safe approach to broadcast updates
    try:
        import asyncio
        import threading
        
        # Check if there's a running event loop
        try:
            loop = asyncio.get_running_loop()
            # Create task to broadcast in the background
            asyncio.create_task(broadcast_analysis_update())
        except RuntimeError:
            # No running loop, try to handle it safely
            try:
                # Only try to run if we have active connections
                if manager.active_connections:
                    def run_broadcast():
                        try:
                            asyncio.run(broadcast_analysis_update())
                        except Exception as e:
                            print(f"[WARNING] Broadcast failed: {e}")
                    
                    # Run in a separate thread to avoid blocking
                    thread = threading.Thread(target=run_broadcast)
                    thread.daemon = True
                    thread.start()
                else:
                    # No active connections, skip broadcasting
                    pass
            except Exception as e:
                print(f"[WARNING] Could not schedule broadcast: {e}")
    except Exception as e:
        print(f"[WARNING] Could not broadcast update: {e}")
        # Continue without broadcasting
        pass

class OutputCapture:
    def __init__(self):
        self.output = []
        
    def write(self, text):
        if text.strip():
            self.output.append(text.strip())
            analysis_state["logs"].append(text.strip())
        
    def flush(self):
        pass

def run_command_with_output(command, input_text=None):
    """Run a command and capture its output in real-time with progress parsing"""
    try:
        analysis_state["logs"].append(f"Running command: {' '.join(command)}")
        if input_text:
            analysis_state["logs"].append(f"With input: {input_text.strip()}")
            
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE if input_text else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=PROJECT_ROOT,  # Use project root as working directory
            bufsize=1,
            universal_newlines=True
        )
        
        output_lines = []
        error_lines = []
        
        if input_text:
            try:
                stdout, stderr = process.communicate(input=input_text, timeout=300)  # 5 minute timeout
                output_lines = stdout.split('\n') if stdout else []
                error_lines = stderr.split('\n') if stderr else []
                
                # Log all output and parse progress
                for line in output_lines:
                    if line.strip():
                        if line.strip().startswith('PROGRESS:'):
                            try:
                                progress_json = line.strip()[9:]  # Remove 'PROGRESS:' prefix
                                progress_data = json.loads(progress_json)
                                
                                # Update analysis state with progress data
                                analysis_state.update({
                                    "step": progress_data.get("step", analysis_state["step"]),
                                    "message": progress_data.get("message", analysis_state["message"]),
                                    "progress": progress_data.get("progress", analysis_state["progress"])
                                })
                                
                                # Update channel info if provided
                                if "channel_name" in progress_data and "subscriber_count" in progress_data:
                                    analysis_state["channel_info"] = ChannelInfo(
                                        channel_name=progress_data["channel_name"],
                                        subscriber_count=str(progress_data["subscriber_count"]),
                                        total_comments=progress_data.get("total_comments", 0)
                                    )
                                elif "channel_name" in progress_data and analysis_state["channel_info"] is None:
                                    analysis_state["channel_info"] = ChannelInfo(
                                        channel_name=progress_data["channel_name"],
                                        subscriber_count="Unknown",
                                        total_comments=progress_data.get("total_comments", 0)
                                    )
                                
                                analysis_state["logs"].append(f"PROGRESS: {progress_data['message']}")
                            except json.JSONDecodeError:
                                analysis_state["logs"].append(line.strip())
                        else:
                            analysis_state["logs"].append(line.strip())
                        
                for line in error_lines:
                    if line.strip():
                        analysis_state["logs"].append(f"ERROR: {line.strip()}")
                        
            except subprocess.TimeoutExpired:
                process.kill()
                analysis_state["logs"].append("ERROR: Command timed out after 5 minutes")
                return -1, [], ["Command timed out"]
        else:
            # Read output line by line in real-time
            while True:
                output = process.stdout.readline()
                error = process.stderr.readline()
                
                if output == '' and error == '' and process.poll() is not None:
                    break
                    
                if output:
                    output_line = output.strip()
                    output_lines.append(output_line)
                    
                    # Parse progress messages
                    if output_line.startswith('PROGRESS:'):
                        try:
                            progress_json = output_line[9:]  # Remove 'PROGRESS:' prefix
                            progress_data = json.loads(progress_json)
                            
                            # Update analysis state with progress data
                            analysis_state.update({
                                "step": progress_data.get("step", analysis_state["step"]),
                                "message": progress_data.get("message", analysis_state["message"]),
                                "progress": progress_data.get("progress", analysis_state["progress"])
                            })
                            
                            # Update channel info if provided
                            if "channel_name" in progress_data and "subscriber_count" in progress_data:
                                analysis_state["channel_info"] = ChannelInfo(
                                    channel_name=progress_data["channel_name"],
                                    subscriber_count=str(progress_data["subscriber_count"]),
                                    total_comments=progress_data.get("total_comments", 0)
                                )
                            elif "channel_name" in progress_data and analysis_state["channel_info"] is None:
                                analysis_state["channel_info"] = ChannelInfo(
                                    channel_name=progress_data["channel_name"],
                                    subscriber_count="Unknown",
                                    total_comments=progress_data.get("total_comments", 0)
                                )
                            
                            analysis_state["logs"].append(f"PROGRESS: {progress_data['message']}")
                        except json.JSONDecodeError:
                            analysis_state["logs"].append(output_line)
                    else:
                        analysis_state["logs"].append(output_line)
                    
                if error:
                    error_line = error.strip()
                    error_lines.append(error_line)
                    analysis_state["logs"].append(f"ERROR: {error_line}")

        analysis_state["logs"].append(f"Command completed with return code: {process.returncode}")
        return process.returncode, output_lines, error_lines
        
    except Exception as e:
        error_msg = f"Exception running command: {str(e)}"
        analysis_state["logs"].append(error_msg)
        return -1, [], [str(e)]

def extract_channel_info():
    """Extract channel info from the generated CSV files"""
    try:
        all_comments_path = get_project_path('all_comments.csv')
        if os.path.exists(all_comments_path):
            df = pd.read_csv(all_comments_path)
            if len(df) > 0:
                channel_name = df['channel_name'].iloc[0] if 'channel_name' in df.columns else "Unknown"
                total_comments = len(df)
                
                # Try to get subscriber count from video info if available
                subscriber_count = "Unknown"
                if 'subscriber_count' in df.columns:
                    subscriber_count = df['subscriber_count'].iloc[0]
                elif 'channel_subscribers' in df.columns:
                    subscriber_count = df['channel_subscribers'].iloc[0]
                
                return ChannelInfo(
                    channel_name=channel_name,
                    subscriber_count=str(subscriber_count),
                    total_comments=total_comments
                )
    except Exception as e:
        print(f"Error extracting channel info: {e}")
    
    return None

def parse_analyzed_content() -> List[AnalyzedContent]:
    """Parse analyzed content from batch files"""
    analyzed_content = []
    
    # Find all analyzed batch files in project root
    batch_files = glob.glob(get_project_path('analyzed_comments_batch_*.txt'))
    batch_files.sort(key=lambda x: int(re.search(r'batch_(\d+)', x).group(1)))
    
    for file_path in batch_files:
        try:
            batch_number = int(re.search(r'batch_(\d+)', file_path).group(1))
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Initialize default values
            batch_data = {
                'batch_number': batch_number,
                'total_comments_processed': 0,
                'sentiment_breakdown': {'positive': 0, 'neutral': 0, 'negative': 0},
                'positive_themes': [],
                'negative_themes': [],
                'viewer_suggestions': [],
                'viewer_appreciation': [],
                'content_recommendations': [],
                'top_positive_comments': [],
                'top_negative_comments': []
            }
            
            # Parse content using regex patterns
            # Extract total comments processed
            comments_match = re.search(r'Total comments processed:\s*(\d+)', content)
            if comments_match:
                batch_data['total_comments_processed'] = int(comments_match.group(1))
            
            # Extract sentiment breakdown
            positive_match = re.search(r'Positive comments:\s*\d+\s*\((\d+(?:\.\d+)?)%\)', content)
            neutral_match = re.search(r'Neutral comments:\s*\d+\s*\((\d+(?:\.\d+)?)%\)', content)
            negative_match = re.search(r'Negative comments:\s*\d+\s*\((\d+(?:\.\d+)?)%\)', content)
            
            if positive_match:
                batch_data['sentiment_breakdown']['positive'] = float(positive_match.group(1))
            if neutral_match:
                batch_data['sentiment_breakdown']['neutral'] = float(neutral_match.group(1))
            if negative_match:
                batch_data['sentiment_breakdown']['negative'] = float(negative_match.group(1))
            
            # Extract themes and comments sections
            sections = {
                'Common Positive Themes:': 'positive_themes',
                'Common Negative Themes:': 'negative_themes',
                'Viewer Suggestions:': 'viewer_suggestions',
                'What Viewers Appreciate:': 'viewer_appreciation',
                'Content Recommendations:': 'content_recommendations',
                'Top Positive Comments:': 'top_positive_comments',
                'Top Negative Comments:': 'top_negative_comments'
            }
            
            for section_header, key in sections.items():
                pattern = rf'\*\*{re.escape(section_header)}\*\*(.*?)(?=\*\*|\n\nQUALITY CHECK|$)'
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    section_text = match.group(1).strip()
                    # Split by lines and clean up
                    items = [line.strip().lstrip('- ').lstrip('• ').strip() 
                            for line in section_text.split('\n') 
                            if line.strip() and not line.strip().startswith('[')]
                    batch_data[key] = [item for item in items if len(item) > 10]  # Filter out very short items
            
            analyzed_content.append(AnalyzedContent(**batch_data))
            
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            continue
    
    return analyzed_content

def extract_word_frequency(comments_list, sentiment_type='positive'):
    """Extract word frequency from comments"""
    try:
        if not comments_list:
            return []
            
        # Combine all comments
        text = ' '.join(str(comment) for comment in comments_list).lower()
        
        # Basic text cleaning
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        
        # Filter stop words and short words
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'this', 'that', 'is', 'are', 'was', 'were', 'a', 'an', 'it', 'be',
            'have', 'has', 'had', 'will', 'would', 'could', 'should', 'my', 'your',
            'his', 'her', 'their', 'our', 'you', 'i', 'he', 'she', 'we', 'they'
        }
        
        words = [word for word in words if len(word) > 2 and word not in stop_words]
        
        # Get top words
        word_counts = Counter(words).most_common(10)
        
        return [{'word': word, 'count': count, 'type': sentiment_type} for word, count in word_counts]
        
    except Exception as e:
        print(f"Error extracting word frequency: {e}")
        return []

def generate_chart_data() -> EnhancedChartData:
    """Generate enhanced chart data from sentiment analysis results"""
    try:
        # Get sentiment data from CSV if available
        sentiment_data = {'total_comments': 0, 'average_sentiment': 50}
        sentiment_distribution = []
        score_ranges = []
        confidence_distribution = []
        word_frequency_positive = []
        word_frequency_negative = []
        
        sentiment_csv_path = get_project_path('sentiment_analyzed_comments.csv')
        if os.path.exists(sentiment_csv_path):
            df = pd.read_csv(sentiment_csv_path)
            sentiment_data['total_comments'] = len(df)
            
            if 'sentiment_score' in df.columns:
                sentiment_data['average_sentiment'] = float(df['sentiment_score'].mean())
            
            # Sentiment distribution
            if 'sentiment' in df.columns:
                sentiment_counts = df['sentiment'].value_counts()
                total = len(df)
                
                sentiment_distribution = [
                    ChartDataPoint(name='Positive', value=float(sentiment_counts.get('Positive', 0) / total * 100), color='#10B981'),
                    ChartDataPoint(name='Neutral', value=float(sentiment_counts.get('Neutral', 0) / total * 100), color='#6B7280'),
                    ChartDataPoint(name='Negative', value=float(sentiment_counts.get('Negative', 0) / total * 100), color='#EF4444')
                ]
                
                # Score ranges
                if 'sentiment_score' in df.columns:
                    very_low = len(df[df['sentiment_score'] < 20])
                    low = len(df[(df['sentiment_score'] >= 20) & (df['sentiment_score'] < 40)])
                    medium = len(df[(df['sentiment_score'] >= 40) & (df['sentiment_score'] < 60)])
                    high = len(df[(df['sentiment_score'] >= 60) & (df['sentiment_score'] < 80)])
                    very_high = len(df[df['sentiment_score'] >= 80])
                    
                    score_ranges = [
                        ChartDataPoint(name='Very Low (0-19)', value=very_low, color='#DC2626'),
                        ChartDataPoint(name='Low (20-39)', value=low, color='#F59E0B'),
                        ChartDataPoint(name='Medium (40-59)', value=medium, color='#6B7280'),
                        ChartDataPoint(name='High (60-79)', value=high, color='#10B981'),
                        ChartDataPoint(name='Very High (80-100)', value=very_high, color='#059669')
                    ]
                
                # Confidence distribution
                if 'confidence' in df.columns:
                    conf_ranges = {
                        'Very Low (0-0.2)': len(df[df['confidence'] < 0.2]),
                        'Low (0.2-0.4)': len(df[(df['confidence'] >= 0.2) & (df['confidence'] < 0.4)]),
                        'Medium (0.4-0.6)': len(df[(df['confidence'] >= 0.4) & (df['confidence'] < 0.6)]),
                        'High (0.6-0.8)': len(df[(df['confidence'] >= 0.6) & (df['confidence'] < 0.8)]),
                        'Very High (0.8-1.0)': len(df[df['confidence'] >= 0.8])
                    }
                    
                    confidence_distribution = [
                        ChartDataPoint(name=name, value=count, color='#3B82F6') 
                        for name, count in conf_ranges.items()
                    ]
                
                # Word frequency analysis
                if 'comment' in df.columns:
                    positive_comments = df[df['sentiment'] == 'Positive']['comment'].dropna().tolist()
                    negative_comments = df[df['sentiment'] == 'Negative']['comment'].dropna().tolist()
                    
                    word_freq_pos = extract_word_frequency(positive_comments, 'positive')
                    word_freq_neg = extract_word_frequency(negative_comments, 'negative')
                    
                    word_frequency_positive = [WordFrequency(**item) for item in word_freq_pos]
                    word_frequency_negative = [WordFrequency(**item) for item in word_freq_neg]
        
        # Get analyzed content for trends
        analyzed_content = parse_analyzed_content()
        sentiment_trends = []
        theme_analysis = []
        
        for content in analyzed_content:
            sentiment_trends.append(SentimentTrend(
                batch=f"Batch {content.batch_number}",
                positive=content.sentiment_breakdown.get('positive', 0),
                neutral=content.sentiment_breakdown.get('neutral', 0),
                negative=content.sentiment_breakdown.get('negative', 0)
            ))
            
            # Add themes to analysis
            for theme in content.positive_themes[:5]:  # Top 5 themes
                theme_analysis.append(ThemeAnalysis(
                    theme=theme[:50] + '...' if len(theme) > 50 else theme,
                    count=1,  # Could be enhanced to count occurrences
                    type='positive'
                ))
            
            for theme in content.negative_themes[:5]:  # Top 5 themes
                theme_analysis.append(ThemeAnalysis(
                    theme=theme[:50] + '...' if len(theme) > 50 else theme,
                    count=1,
                    type='negative'
                ))
        
        return EnhancedChartData(
            sentiment_distribution=sentiment_distribution,
            sentiment_trends=sentiment_trends,
            theme_analysis=theme_analysis,
            score_ranges=score_ranges,
            total_comments=sentiment_data['total_comments'],
            average_sentiment=sentiment_data['average_sentiment'],
            word_frequency_positive=word_frequency_positive,
            word_frequency_negative=word_frequency_negative,
            confidence_distribution=confidence_distribution
        )
        
    except Exception as e:
        print(f"Error generating chart data: {e}")
        # Return empty chart data
        return EnhancedChartData(
            sentiment_distribution=[],
            sentiment_trends=[],
            theme_analysis=[],
            score_ranges=[],
            total_comments=0,
            average_sentiment=50,
            word_frequency_positive=[],
            word_frequency_negative=[],
            confidence_distribution=[]
        )

async def run_analysis_pipeline(channel_id: str):
    """Run the complete analysis pipeline using main.py"""
    try:
        # Reset state
        update_analysis_state({
            "status": "running",
            "step": "starting",
            "message": "Initializing analysis...",
            "progress": 0,
            "channel_info": None,
            "error": None,
            "logs": []
        })
        
        # Run the main.py script which orchestrates the complete pipeline
        update_analysis_state({
            "step": "pipeline_start",
            "message": "Starting complete analysis pipeline...",
            "progress": 5
        })
        
        try:
            # Run main.py with the channel ID as argument
            main_script_path = os.path.join(SCRIPT_DIR, 'main.py')
            process = subprocess.Popen(
                [sys.executable, main_script_path, channel_id.strip()],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=PROJECT_ROOT,  # Use project root as working directory
                bufsize=1,
                universal_newlines=True
            )
            
            # Read output in real-time and parse progress updates
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    
                    # Parse progress updates from main.py
                    if line.startswith('PROGRESS:'):
                        try:
                            progress_json = line[9:]  # Remove 'PROGRESS:' prefix
                            progress_data = json.loads(progress_json)
                            
                            # Prepare update data
                            update_data = {
                                "step": progress_data.get("step", analysis_state["step"]),
                                "message": progress_data.get("message", analysis_state["message"]),
                                "progress": progress_data.get("progress", analysis_state["progress"])
                            }
                            
                            # Update channel info if provided
                            if "channel_name" in progress_data:
                                channel_info_dict = {
                                    "channel_name": progress_data["channel_name"],
                                    "subscriber_count": str(progress_data.get("subscriber_count", "Unknown")),
                                    "total_comments": progress_data.get("total_comments", 0)
                                }
                                update_data["channel_info"] = channel_info_dict
                            
                            # Handle error states
                            if "error" in progress_data:
                                update_data["error"] = progress_data["error"]
                            
                            # Handle completion
                            if progress_data.get("step") == "final_summary" and progress_data.get("success"):
                                update_data["status"] = "completed"
                                
                            # Handle failure
                            if progress_data.get("step") in ["pipeline_failed", "final_summary"] and not progress_data.get("success", True):
                                update_data["status"] = "error"
                                if "error" not in progress_data:
                                    update_data["error"] = "Pipeline execution failed"
                            
                            # Add log entry
                            new_logs = analysis_state["logs"] + [f"PROGRESS: {progress_data['message']}"]
                            update_data["logs"] = new_logs
                            
                            # Update state and broadcast
                            update_analysis_state(update_data)
                            
                        except json.JSONDecodeError:
                            # If not valid JSON, just log the line
                            new_logs = analysis_state["logs"] + [line]
                            update_analysis_state({"logs": new_logs})
                    else:
                        # Regular output line
                        new_logs = analysis_state["logs"] + [line]
                        update_analysis_state({"logs": new_logs})
            
            # Wait for process to complete
            returncode = process.poll()
            
            # Read any remaining stderr
            stderr_output = process.stderr.read()
            if stderr_output:
                error_logs = []
                for error_line in stderr_output.split('\n'):
                    if error_line.strip():
                        error_logs.append(f"ERROR: {error_line.strip()}")
                if error_logs:
                    new_logs = analysis_state["logs"] + error_logs
                    update_analysis_state({"logs": new_logs})
            
            if returncode == 0:
                # Process completed successfully
                if analysis_state["status"] != "completed":
                    update_analysis_state({
                        "status": "completed",
                        "step": "completed",
                        "message": "Analysis completed successfully!",
                        "progress": 100
                    })
                
                # Extract final results and channel info
                channel_info = extract_channel_info()
                if channel_info and analysis_state["channel_info"] is None:
                    update_analysis_state({"channel_info": channel_info})
                
                # Add completion summary from sentiment analysis if available
                sentiment_csv_path = get_project_path('sentiment_analyzed_comments.csv')
                if os.path.exists(sentiment_csv_path):
                    try:
                        df = pd.read_csv(sentiment_csv_path)
                        if 'sentiment_score' in df.columns and 'sentiment' in df.columns:
                            avg_score = df['sentiment_score'].mean()
                            positive_pct = (df['sentiment'] == 'Positive').mean() * 100
                            neutral_pct = (df['sentiment'] == 'Neutral').mean() * 100
                            negative_pct = (df['sentiment'] == 'Negative').mean() * 100
                            
                            completion_message = f"Analysis complete! Average sentiment: {avg_score:.1f}/100 | Positive: {positive_pct:.1f}% | Neutral: {neutral_pct:.1f}% | Negative: {negative_pct:.1f}%"
                            update_analysis_state({"message": completion_message})
                    except Exception as e:
                        print(f"Warning: Could not extract final summary: {e}")
                
            else:
                # Process failed
                error_logs = analysis_state["logs"] + [f"Process exited with code: {returncode}"]
                update_analysis_state({
                    "status": "error",
                    "error": f"Pipeline execution failed with return code: {returncode}",
                    "logs": error_logs
                })
                
        except Exception as e:
            update_analysis_state({
                "status": "error",
                "error": f"Failed to execute pipeline: {str(e)}"
            })
            return
        
    except Exception as e:
        update_analysis_state({
            "status": "error",
            "error": f"Unexpected error in pipeline: {str(e)}"
        })

@app.get("/api/analyzed-content")
async def get_analyzed_content():
    """Get analyzed content from batch files"""
    try:
        analyzed_content = parse_analyzed_content()
        return analyzed_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading analyzed content: {str(e)}")

@app.get("/api/chart-data")
async def get_chart_data():
    """Get chart data for dashboard"""
    try:
        chart_data = generate_chart_data()
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chart data: {str(e)}")

@app.post("/api/analyze")
async def start_analysis(request: ChannelAnalysisRequest, background_tasks: BackgroundTasks):
    """Start the analysis process for a given channel ID"""
    
    try:
        # Log the incoming request
        print(f"Received analysis request for channel: {request.channel_id}")
        
        # Validate channel ID
        if not request.channel_id:
            return JSONResponse(
                status_code=400,
                content={"detail": "Channel ID is required"}
            )
            
        channel_id = request.channel_id.strip()
        if not channel_id:
            return JSONResponse(
                status_code=400,
                content={"detail": "Channel ID cannot be empty"}
            )
        
        # Check if analysis is already running
        if analysis_state["status"] == "running":
            return JSONResponse(
                status_code=409,
                content={"detail": "Analysis is already running"}
            )
        
        # Reset analysis state
        update_analysis_state({
            "status": "starting",
            "step": "initializing",
            "message": "Preparing to start analysis...",
            "progress": 0,
            "channel_info": None,
            "error": None,
            "logs": [f"Starting analysis for channel: {channel_id}"]
        })
        
        # Start the analysis in the background
        background_tasks.add_task(run_analysis_pipeline, channel_id)
        
        return JSONResponse(
            status_code=200,
            content=analysis_state
        )
        
    except Exception as e:
        print(f"Error in start_analysis: {e}")
        import traceback
        traceback.print_exc()
        
        error_message = f"Failed to start analysis: {str(e)}"
        update_analysis_state({
            "status": "error",
            "error": error_message
        })
        
        return JSONResponse(
            status_code=500,
            content={"detail": error_message}
        )

@app.options("/api/analyze")
async def analyze_options():
    """Handle CORS preflight for analyze endpoint"""
    return {"message": "OK"}

@app.post("/api/test-analyze")
async def test_analyze(request: ChannelAnalysisRequest):
    """Test endpoint to validate request format"""
    return {
        "message": "Request received successfully",
        "channel_id": request.channel_id,
        "channel_id_length": len(request.channel_id.strip()) if request.channel_id else 0,
        "is_valid": bool(request.channel_id and request.channel_id.strip())
    }

@app.get("/api/status", response_model=AnalysisStatus)
async def get_analysis_status():
    """Get the current status of the analysis"""
    return AnalysisStatus(**analysis_state)

@app.get("/api/logs")
async def get_analysis_logs():
    """Get the analysis logs"""
    return {
        "logs": analysis_state["logs"],
        "status": analysis_state["status"],
        "step": analysis_state["step"],
        "message": analysis_state["message"],
        "error": analysis_state.get("error")
    }



@app.post("/api/reset")
async def reset_analysis():
    """Reset the analysis state"""
    analysis_state.update({
        "status": "idle",
        "step": "",
        "message": "",
        "progress": 0,
        "channel_info": None,
        "error": None,
        "logs": []
    })
    return {"message": "Analysis state reset"}

@app.get("/api/debug/test-youtube/{channel_id}")
async def test_youtube_extraction(channel_id: str):
    """Debug endpoint to test YouTube extraction"""
    try:
        returncode, output, errors = run_command_with_output(
            [sys.executable, 'test_youtube.py']
        )
        
        return {
            "returncode": returncode,
            "output": output,
            "errors": errors,
            "logs": analysis_state["logs"][-10:]  # Last 10 log entries
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/check-dependencies")
async def check_dependencies():
    """Check if all required dependencies are available"""
    dependencies = {
        "googleapiclient": False,
        "transformers": False,
        "torch": False,
        "pandas": False,
        "matplotlib": False,
        "seaborn": False,
        "dotenv": False,
        "preprocessing": False
    }
    
    errors = []
    
    for dep in dependencies.keys():
        try:
            if dep == "googleapiclient":
                from googleapiclient.discovery import build
            elif dep == "preprocessing":
                import preprocessing
            else:
                __import__(dep)
            dependencies[dep] = True
        except ImportError as e:
            errors.append(f"{dep}: {str(e)}")
    
    # Check environment variables
    env_vars = {
        "YOUTUBE_API_KEY": bool(os.getenv('YOUTUBE_API_KEY')),
        "GOOGLE_API_KEY": bool(os.getenv('GOOGLE_API_KEY'))
    }
    
    return {
        "dependencies": dependencies,
        "environment_variables": env_vars,
        "errors": errors,
        "all_dependencies_available": all(dependencies.values()),
        "all_env_vars_set": all(env_vars.values())
    }

@app.get("/api/results")
async def get_results():
    """Get the analysis results"""
    try:
        results = {}
        
        # Check for sentiment analysis results
        sentiment_csv_path = get_project_path('sentiment_analyzed_comments.csv')
        if os.path.exists(sentiment_csv_path):
            df = pd.read_csv(sentiment_csv_path)
            
            # Calculate summary statistics
            if 'sentiment_score' in df.columns:
                results['average_sentiment'] = float(df['sentiment_score'].mean())
                results['total_comments'] = len(df)
                
            if 'sentiment' in df.columns:
                sentiment_counts = df['sentiment'].value_counts()
                total = len(df)
                results['sentiment_breakdown'] = {
                    'positive': float(sentiment_counts.get('Positive', 0) / total * 100),
                    'neutral': float(sentiment_counts.get('Neutral', 0) / total * 100),
                    'negative': float(sentiment_counts.get('Negative', 0) / total * 100)
                }
        
        # Check for detailed sentiment results
        results_txt_path = get_project_path('detailed_sentiment_results.txt')
        if os.path.exists(results_txt_path):
            with open(results_txt_path, 'r', encoding='utf-8') as f:
                results['detailed_results'] = f.read()
        
        # Check for generated files
        generated_files = []
        files_to_check = [
            'all_comments.csv',
            'cleaned_all_comments.csv',
            'sentiment_analyzed_comments.csv',
            'detailed_sentiment_results.txt',
            'sentiment_analysis_dashboard.png'
        ]
        
        for file in files_to_check:
            file_path = get_project_path(file)
            if os.path.exists(file_path):
                generated_files.append(file)
        
        results['generated_files'] = generated_files
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")

# Mount static files directory for serving dashboard images and charts
# Create charts directory if it doesn't exist
os.makedirs("charts", exist_ok=True)
app.mount("/static", StaticFiles(directory="."), name="static")
app.mount("/charts", StaticFiles(directory="charts"), name="charts")

@app.get("/api/dashboard-image")
async def get_dashboard_image():
    """Serve the main dashboard image"""
    dashboard_path = get_project_path("sentiment_analysis_dashboard.png")
    if os.path.exists(dashboard_path):
        return FileResponse(dashboard_path, media_type="image/png", headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        })
    else:
        raise HTTPException(status_code=404, detail="Dashboard image not found")

@app.get("/api/chart/{chart_name}")
async def get_chart_image(chart_name: str):
    """Serve individual chart images"""
    chart_path = get_project_path(f"charts/{chart_name}")
    if os.path.exists(chart_path) and chart_name.endswith('.png'):
        return FileResponse(chart_path, media_type="image/png", headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        })
    else:
        raise HTTPException(status_code=404, detail=f"Chart image {chart_name} not found")

@app.get("/api/available-files")
async def get_available_files():
    """Get list of available generated files including images"""
    files = {
        "dashboard": None,
        "charts": [],
        "reports": [],
        "data_files": []
    }
    
    # Check for main dashboard
    if os.path.exists("sentiment_analysis_dashboard.png"):
        files["dashboard"] = "/api/dashboard-image"
    
    # Check for individual charts
    if os.path.exists("charts"):
        chart_files = [f for f in os.listdir("charts") if f.endswith('.png')]
        files["charts"] = [f"/api/chart/{chart}" for chart in chart_files]
    
    # Check for text reports
    report_files = ["sentiment_analysis_summary.txt", "detailed_sentiment_results.txt"]
    for report in report_files:
        if os.path.exists(report):
            files["reports"].append(report)
    
    # Check for data files
    data_files = ["sentiment_results.csv", "cleaned_all_comments.csv", "all_comments.csv"]
    for data_file in data_files:
        if os.path.exists(data_file):
            files["data_files"].append(data_file)
    
    return files

@app.get("/api/test-websocket")
async def test_websocket():
    """Test endpoint to verify WebSocket broadcasting"""
    test_message = {
        "status": "test",
        "step": "Testing WebSocket",
        "message": "This is a test message for WebSocket functionality",
        "progress": 50,
        "timestamp": time.time()
    }
    
    # Update the analysis state which should trigger WebSocket broadcast
    update_analysis_state(test_message)
    
    return {
        "message": "Test WebSocket message sent",
        "active_connections": len(manager.active_connections),
        "test_data": test_message
    }

@app.get("/api/websocket-status")
async def websocket_status():
    """Get current WebSocket connection status"""
    return {
        "active_connections": len(manager.active_connections),
        "analysis_state": analysis_state
    }

@app.get("/api/dashboard-data")
async def get_dashboard_data():
    """Get comprehensive dashboard data including sentiment analysis results"""
    try:
        # Check if we have any analysis results
        sentiment_file = None
        for file in glob.glob("*_sentiment_analysis.csv"):
            sentiment_file = file
            break
        
        if not sentiment_file:
            # Return mock data if no analysis results
            return {
                "channel_name": "CreatorGPT Analytics Hub",
                "subscriber_count": "2.4M",
                "total_videos": 342,
                "total_comments": 156789,
                "total_views": 47582341,
                "total_likes": 3245782,
                "channel_created": "2020-03-15",
                "avg_sentiment_score": 0.78,
                "engagement_rate": 4.8,
                "views_per_video": 139182,
                "comments_per_video": 458,
                "likes_per_video": 9491,
                "monthly_growth_rate": 12.5,
                "sentiment_distribution": [
                    {"sentiment": "Positive", "count": 98456, "percentage": 62.8, "color": "#30FF30"},
                    {"sentiment": "Neutral", "count": 41234, "percentage": 26.3, "color": "#00D4FF"},
                    {"sentiment": "Negative", "count": 17099, "percentage": 10.9, "color": "#FF3B30"}
                ],
                "engagement_over_time": [
                    {"date": "2024-01", "likes": 245600, "comments": 12420, "views": 3856000, "sentiment_score": 0.72},
                    {"date": "2024-02", "likes": 282400, "comments": 14510, "views": 4224800, "sentiment_score": 0.75},
                    {"date": "2024-03", "likes": 321400, "comments": 16625, "views": 4672200, "sentiment_score": 0.78},
                    {"date": "2024-04", "likes": 364800, "comments": 18742, "views": 5234400, "sentiment_score": 0.81},
                    {"date": "2024-05", "likes": 412300, "comments": 20856, "views": 5865800, "sentiment_score": 0.79},
                    {"date": "2024-06", "likes": 456100, "comments": 22945, "views": 6425600, "sentiment_score": 0.82}
                ],
                "top_keywords": [
                    {"keyword": "amazing", "count": 4342, "sentiment": "positive"},
                    {"keyword": "helpful", "count": 3287, "sentiment": "positive"},
                    {"keyword": "great", "count": 2965, "sentiment": "positive"},
                    {"keyword": "awesome", "count": 2634, "sentiment": "positive"},
                    {"keyword": "love", "count": 2398, "sentiment": "positive"},
                    {"keyword": "confusing", "count": 1876, "sentiment": "negative"},
                    {"keyword": "boring", "count": 1654, "sentiment": "negative"},
                    {"keyword": "okay", "count": 1432, "sentiment": "neutral"}
                ],
                "sentiment_confidence_distribution": [
                    {"range": "Very Low (0-19)", "count": 3245, "percentage": 2.1, "color": "#FF0000"},
                    {"range": "Low (20-39)", "count": 8234, "percentage": 5.2, "color": "#FF6666"},
                    {"range": "Medium (40-59)", "count": 31245, "percentage": 19.9, "color": "#FFD60A"},
                    {"range": "High (60-79)", "count": 67834, "percentage": 43.3, "color": "#88DD88"},
                    {"range": "Very High (80-100)", "count": 46231, "percentage": 29.5, "color": "#30FF30"}
                ],
                "keyword_sentiment_analysis": [
                    {"keyword": "amazing", "positive_count": 4342, "negative_count": 23, "neutral_count": 145, "total_mentions": 4510, "overall_sentiment": "positive"},
                    {"keyword": "helpful", "positive_count": 3287, "negative_count": 45, "neutral_count": 234, "total_mentions": 3566, "overall_sentiment": "positive"},
                    {"keyword": "great", "positive_count": 2965, "negative_count": 34, "neutral_count": 189, "total_mentions": 3188, "overall_sentiment": "positive"},
                    {"keyword": "confusing", "positive_count": 234, "negative_count": 1876, "neutral_count": 345, "total_mentions": 2455, "overall_sentiment": "negative"},
                    {"keyword": "boring", "positive_count": 123, "negative_count": 1654, "neutral_count": 234, "total_mentions": 2011, "overall_sentiment": "negative"}
                ],
                "video_performance_metrics": [
                    {"video_title": "AI Revolution in Content Creation", "views": 245600, "likes": 18420, "comments": 1685, "sentiment_score": 82.4, "engagement_rate": 7.5, "published_date": "2024-06-15"},
                    {"video_title": "Future of YouTube Analytics", "views": 189300, "likes": 14200, "comments": 1380, "sentiment_score": 78.9, "engagement_rate": 8.2, "published_date": "2024-06-10"},
                    {"video_title": "Creator Economy Deep Dive", "views": 321800, "likes": 24560, "comments": 2050, "sentiment_score": 85.1, "engagement_rate": 8.3, "published_date": "2024-06-05"},
                    {"video_title": "Social Media Trends 2024", "views": 167200, "likes": 12340, "comments": 1350, "sentiment_score": 74.6, "engagement_rate": 8.1, "published_date": "2024-05-28"},
                    {"video_title": "Building Your Brand Online", "views": 203400, "likes": 15670, "comments": 1595, "sentiment_score": 80.2, "engagement_rate": 8.4, "published_date": "2024-05-20"}
                ]
            }
        
        # Load real analysis data
        df = pd.read_csv(sentiment_file)
        
        # Calculate comprehensive metrics from real data
        total_comments = len(df)
        sentiment_counts = df['sentiment'].value_counts()
        avg_sentiment_score = df['sentiment_score'].mean() / 100  # Convert to 0-1 scale
        
        # Sentiment distribution
        sentiment_distribution = []
        colors = {"Positive": "#30FF30", "Neutral": "#00D4FF", "Negative": "#FF3B30"}
        for sentiment, count in sentiment_counts.items():
            sentiment_distribution.append({
                "sentiment": sentiment,
                "count": int(count),
                "percentage": round((count / total_comments) * 100, 1),
                "color": colors.get(sentiment, "#808080")
            })
        
        # Confidence distribution
        confidence_ranges = [
            (0, 20, "Very Low (0-19)", "#FF0000"),
            (20, 40, "Low (20-39)", "#FF6666"),
            (40, 60, "Medium (40-59)", "#FFD60A"),
            (60, 80, "High (60-79)", "#88DD88"),
            (80, 100, "Very High (80-100)", "#30FF30")
        ]
        
        confidence_distribution = []
        for min_val, max_val, label, color in confidence_ranges:
            count = len(df[(df['sentiment_score'] >= min_val) & (df['sentiment_score'] < max_val)])
            confidence_distribution.append({
                "range": label,
                "count": count,
                "percentage": round((count / total_comments) * 100, 1),
                "color": color
            })
        
        # Extract top keywords from comments
        from collections import Counter
        import re
        
        def extract_keywords(comments, sentiment_filter=None):
            if sentiment_filter:
                comments = df[df['sentiment'] == sentiment_filter]['comment']
            
            text = ' '.join(comments.astype(str).str.lower())
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
            
            # Filter stop words
            stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'a', 'an', 'you', 'your', 'it', 'its', 'i', 'my', 'me', 'we', 'us', 'they', 'them', 'he', 'she', 'him', 'her', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'not', 'no', 'yes', 'like', 'just', 'get', 'now', 'see', 'know', 'think', 'say', 'said', 'good', 'bad', 'very', 'really', 'well', 'much', 'more', 'most', 'many', 'some', 'all', 'any', 'each', 'every', 'other', 'another', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'also', 'both', 'either', 'neither', 'one', 'two', 'first', 'last', 'next', 'new', 'old', 'right', 'left', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'whose', 'whom', 'whose'}
            
            filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
            return Counter(filtered_words).most_common(10)
        
        # Get top keywords overall
        top_keywords = []
        all_keywords = extract_keywords(df['comment'])
        
        for word, count in all_keywords[:8]:
            # Determine sentiment for this keyword
            word_comments = df[df['comment'].str.contains(word, case=False, na=False)]
            if len(word_comments) > 0:
                avg_sentiment = word_comments['sentiment_score'].mean()
                if avg_sentiment > 66:
                    sentiment = "positive"
                elif avg_sentiment < 33:
                    sentiment = "negative"
                else:
                    sentiment = "neutral"
            else:
                sentiment = "neutral"
            
            top_keywords.append({
                "keyword": word,
                "count": count,
                "sentiment": sentiment
            })
        
        # Calculate keyword sentiment analysis
        keyword_sentiment_analysis = []
        for word, count in all_keywords[:5]:
            word_comments = df[df['comment'].str.contains(word, case=False, na=False)]
            if len(word_comments) > 0:
                pos_count = len(word_comments[word_comments['sentiment'] == 'Positive'])
                neg_count = len(word_comments[word_comments['sentiment'] == 'Negative'])
                neu_count = len(word_comments[word_comments['sentiment'] == 'Neutral'])
                
                if pos_count > neg_count and pos_count > neu_count:
                    overall = "positive"
                elif neg_count > pos_count and neg_count > neu_count:
                    overall = "negative"
                else:
                    overall = "neutral"
                
                keyword_sentiment_analysis.append({
                    "keyword": word,
                    "positive_count": pos_count,
                    "negative_count": neg_count,
                    "neutral_count": neu_count,
                    "total_mentions": len(word_comments),
                    "overall_sentiment": overall
                })
        
        # Generate dashboard data with real analysis
        dashboard_data = {
            "channel_name": "Analyzed Channel",
            "subscriber_count": "N/A",
            "total_videos": 1,  # We only analyze one video at a time
            "total_comments": total_comments,
            "total_views": 0,  # Not available from comments
            "total_likes": 0,  # Not available from comments
            "channel_created": "N/A",
            "avg_sentiment_score": avg_sentiment_score,
            "engagement_rate": 5.0,  # Default
            "views_per_video": 0,
            "comments_per_video": total_comments,
            "likes_per_video": 0,
            "monthly_growth_rate": 0.0,
            "sentiment_distribution": sentiment_distribution,
            "top_keywords": top_keywords,
            "sentiment_confidence_distribution": confidence_distribution,
            "keyword_sentiment_analysis": keyword_sentiment_analysis,
            
            # Mock time-based data (would need timestamps in real scenario)
            "engagement_over_time": [
                {"date": "2024-01", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score},
                {"date": "2024-02", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score},
                {"date": "2024-03", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score},
                {"date": "2024-04", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score},
                {"date": "2024-05", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score},
                {"date": "2024-06", "likes": 0, "comments": total_comments//6, "views": 0, "sentiment_score": avg_sentiment_score}
            ],
            
            # Mock additional data
            "comment_trends": [{"hour": i, "count": total_comments//24, "avg_sentiment": avg_sentiment_score} for i in range(24)],
            "monthly_growth": [
                {"month": "Jan 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0},
                {"month": "Feb 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0},
                {"month": "Mar 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0},
                {"month": "Apr 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0},
                {"month": "May 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0},
                {"month": "Jun 2024", "subscribers": 0, "views": 0, "engagement_rate": 5.0}
            ],
            "sentiment_by_video": [
                {
                    "video_title": "Analyzed Video",
                    "positive": sentiment_counts.get('Positive', 0),
                    "neutral": sentiment_counts.get('Neutral', 0),
                    "negative": sentiment_counts.get('Negative', 0),
                    "total_comments": total_comments
                }
            ],
            "audience_activity": [
                {"day": "Monday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Tuesday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Wednesday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Thursday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Friday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Saturday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28},
                {"day": "Sunday", "morning": total_comments//28, "afternoon": total_comments//28, "evening": total_comments//28, "night": total_comments//28}
            ],
            "engagement_quality_matrix": [
                {"comment_length_category": "Short", "sentiment": "Positive", "avg_score": 75.0, "count": sentiment_counts.get('Positive', 0)//2},
                {"comment_length_category": "Medium", "sentiment": "Positive", "avg_score": 80.0, "count": sentiment_counts.get('Positive', 0)//2},
                {"comment_length_category": "Short", "sentiment": "Neutral", "avg_score": 50.0, "count": sentiment_counts.get('Neutral', 0)//2},
                {"comment_length_category": "Medium", "sentiment": "Neutral", "avg_score": 50.0, "count": sentiment_counts.get('Neutral', 0)//2}
            ],
            "sentiment_trend_over_time": [
                {"index": i, "rolling_sentiment": avg_sentiment_score * 100 + (i % 10 - 5), "raw_sentiment": avg_sentiment_score * 100}
                for i in range(50)
            ],
            "video_performance_metrics": [
                {
                    "video_title": "Analyzed Video",
                    "views": 0,
                    "likes": 0,
                    "comments": total_comments,
                    "sentiment_score": avg_sentiment_score * 100,
                    "engagement_rate": 5.0,
                    "published_date": datetime.now().strftime("%Y-%m-%d")
                }
            ]
        }
        
        return dashboard_data
        
    except Exception as e:
        print(f"Error generating dashboard data: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating dashboard data: {str(e)}")

@app.post("/api/cleanup-files")
async def cleanup_files():
    """
    Cleanup generated files when user leaves the page
    """
    try:
        deleted_files = []
        
        # Define patterns for files to delete - comprehensive cleanup
        file_patterns = [
            # CSV files
            'all_comments.csv',
            'cleaned_all_comments.csv', 
            'comments_*.csv',
            '*.csv',  # All CSV files
            # Text files
            'comments_batch_*.txt',
            'analyzed_comments_batch_*.txt',
            '*.txt',  # All text files
            # Image files
            'charts/*.png',
            'charts/*.jpg', 
            'charts/*.jpeg',
            'charts/*.gif',
            'charts/*.bmp',
            'charts/*.webp',
            'score_distribution.*',
            'sentiment_pie_chart.*',
            '*.png',  # All PNG files
            '*.jpg',  # All JPG files
            '*.jpeg', # All JPEG files
            '*.gif',  # All GIF files
            '*.bmp',  # All BMP files
            '*.webp', # All WebP files
            # JSON files
            'batch_processing_status.json',
            'llm_processing_status.json',
            'analysis_*.json',
            'results_*.json',
            '*.json',  # All JSON files (except package.json and config files)
            # Temporary files
            '*.tmp',
            '*.temp',
            '*.log',
            # Other generated files
            '*.pkl',
            '*.pickle',
            '*.cache'
        ]
        
        # Files to exclude from deletion (important system files)
        exclude_files = [
            'package.json',
            'package-lock.json',
            'tsconfig.json',
            'tsconfig.app.json', 
            'tsconfig.node.json',
            'vite.config.ts',
            'tailwind.config.ts',
            'postcss.config.js',
            'eslint.config.js',
            'components.json',
            'requirements.txt',
            'api.py',
            'main.py',
            'run_api.py',
            'run_api_dev.py'
        ]
        
        # Delete files matching patterns
        for pattern in file_patterns:
            for file_path in glob.glob(pattern):
                try:
                    # Skip if it's an excluded file
                    if os.path.basename(file_path) in exclude_files:
                        continue
                    
                    # Skip if it's in node_modules, .git, or src directories
                    if any(excluded_dir in file_path for excluded_dir in ['node_modules', '.git', 'src', '.vscode', '__pycache__']):
                        continue
                        
                    if os.path.exists(file_path) and os.path.isfile(file_path):
                        os.remove(file_path)
                        deleted_files.append(file_path)
                        safe_print(f"Deleted: {file_path}")
                except Exception as e:
                    safe_print(f"Error deleting {file_path}: {e}")
        
        # Clean up charts directory
        charts_dir = 'charts'
        if os.path.exists(charts_dir):
            try:
                for file in os.listdir(charts_dir):
                    file_path = os.path.join(charts_dir, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        deleted_files.append(file_path)
                        safe_print(f"Deleted chart file: {file_path}")
            except Exception as e:
                safe_print(f"Error cleaning charts directory: {e}")
        
        # Clean up any output or temp directories
        temp_dirs = ['output', 'temp', 'tmp', 'cache']
        for temp_dir in temp_dirs:
            if os.path.exists(temp_dir):
                try:
                    for file in os.listdir(temp_dir):
                        file_path = os.path.join(temp_dir, file)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            deleted_files.append(file_path)
                            safe_print(f"Deleted temp file: {file_path}")
                except Exception as e:
                    safe_print(f"Error cleaning {temp_dir} directory: {e}")
        
        safe_print(f"Cleanup completed. Deleted {len(deleted_files)} files.")
        
        return JSONResponse(content={
            'success': True,
            'message': f'Successfully deleted {len(deleted_files)} files',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        safe_print(f"Error during file cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Error during cleanup: {str(e)}")

@app.get("/api/batch-analysis")
async def get_batch_analysis():
    """
    Read and parse all analyzed_comments_batch_*.txt files to provide real analytics data
    """
    try:
        batch_files = glob.glob("analyzed_comments_batch_*.txt")
        batch_files.sort()  # Sort to ensure proper order
        
        if not batch_files:
            raise HTTPException(status_code=404, detail="No batch analysis files found")
        
        analyses = []
        channel_name = "Unknown Channel"
        total_comments = 0
        overall_positive = 0
        overall_neutral = 0
        overall_negative = 0
        
        for batch_file in batch_files:
            try:
                with open(batch_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract batch number from filename
                batch_num = int(batch_file.split('_')[-1].replace('.txt', ''))
                
                # Parse the content to extract structured data
                analysis = parse_batch_analysis(content, batch_num)
                if analysis:
                    analyses.append(analysis)
                    total_comments += analysis.get('totalComments', 0)
                    overall_positive += analysis.get('positivePercentage', 0)
                    overall_neutral += analysis.get('neutralPercentage', 0)
                    overall_negative += analysis.get('negativePercentage', 0)
                    
                    # Try to extract channel name from analysis
                    if 'TechWiser' in content or 'techwiser' in content.lower():
                        channel_name = "TechWiser"
                        
            except Exception as e:
                safe_print(f"Error reading {batch_file}: {e}")
                continue
        
        if not analyses:
            raise HTTPException(status_code=404, detail="No valid batch analysis data found")
        
        # Calculate averages
        num_batches = len(analyses)
        avg_positive = overall_positive / num_batches if num_batches > 0 else 0
        avg_neutral = overall_neutral / num_batches if num_batches > 0 else 0
        avg_negative = overall_negative / num_batches if num_batches > 0 else 0
        
        # Read processing status if available
        processing_date = "Unknown"
        try:
            with open("llm_processing_status.json", 'r') as f:
                status_data = json.load(f)
                processing_date = status_data.get("processing_date", "Unknown")
        except:
            pass
        
        return JSONResponse(content={
            'success': True,
            'channelData': {
                'channelName': channel_name,
                'totalComments': total_comments,
                'totalBatches': num_batches,
                'overallPositive': round(avg_positive, 1),
                'overallNeutral': round(avg_neutral, 1),
                'overallNegative': round(avg_negative, 1),
                'processingDate': processing_date
            },
            'batchAnalyses': analyses
        })
        
    except Exception as e:
        safe_print(f"Error getting batch analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading batch analysis: {str(e)}")

def parse_batch_analysis(content: str, batch_number: int) -> dict:
    """
    Parse the content of a batch analysis file to extract structured data
    """
    try:
        # Extract processing date
        processing_date = ""
        date_match = re.search(r'Processing Date: ([\d\-\s:]+)', content)
        if date_match:
            processing_date = date_match.group(1).strip()
        
        # Extract sentiment breakdown - updated regex patterns to match actual file format
        positive_match = re.search(r'Positive comments?: .*?\((\d+\.?\d*)%\)', content)
        neutral_match = re.search(r'Neutral comments?: .*?\((\d+\.?\d*)%\)', content)
        negative_match = re.search(r'Negative comments?: .*?\((\d+\.?\d*)%\)', content)
        
        positive_pct = float(positive_match.group(1)) if positive_match else 0
        neutral_pct = float(neutral_match.group(1)) if neutral_match else 0
        negative_pct = float(negative_match.group(1)) if negative_match else 0
        
        # Extract total comments - try multiple patterns
        comments_match = re.search(r'Total comments? (?:processed|analyzed): (\d+)', content)
        if not comments_match:
            comments_match = re.search(r'Comments? (?:processed|analyzed): (\d+)', content)
        total_comments = int(comments_match.group(1)) if comments_match else 500  # Default assumption
        
        # Extract positive themes - simpler extraction
        positive_themes = []
        positive_section = re.search(r'\*\*Common Positive Themes:\*\*(.*?)(?=\*\*Common Negative Themes:|\*\*Viewer Suggestions:)', content, re.DOTALL)
        if positive_section:
            lines = positive_section.group(1).strip().split('\n')
            for line in lines:
                if line.strip().startswith('*') and '**' in line:
                    # Extract theme title
                    theme_match = re.search(r'\*\*([^*]+)\*\*', line)
                    if theme_match:
                        positive_themes.append(theme_match.group(1).strip())
        
        # Extract negative themes
        negative_themes = []
        negative_section = re.search(r'\*\*Common Negative Themes:\*\*(.*?)(?=\*\*Viewer Suggestions:|\*\*What Viewers Appreciate:)', content, re.DOTALL)
        if negative_section:
            lines = negative_section.group(1).strip().split('\n')
            for line in lines:
                if line.strip().startswith('*') and '**' in line:
                    # Extract theme title
                    theme_match = re.search(r'\*\*([^*]+)\*\*', line)
                    if theme_match:
                        negative_themes.append(theme_match.group(1).strip())
        
        # Extract viewer suggestions
        suggestions = []
        suggestions_section = re.search(r'\*\*Viewer Suggestions:\*\*(.*?)(?=\*\*What Viewers Appreciate:|\*\*Content Recommendations:)', content, re.DOTALL)
        if suggestions_section:
            lines = suggestions_section.group(1).strip().split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('*') and not line.startswith('**'):
                    # Clean up the suggestion text
                    suggestion = re.sub(r'^\*\s*', '', line).strip()
                    if suggestion:
                        suggestions.append(suggestion)
        
        # Extract what viewers appreciate
        appreciation = []
        appreciation_section = re.search(r'\*\*What Viewers Appreciate:\*\*(.*?)(?=\*\*Content Recommendations:|\*\*Top Positive Comments:)', content, re.DOTALL)
        if appreciation_section:
            lines = appreciation_section.group(1).strip().split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('*') and not line.startswith('**'):
                    # Clean up the appreciation text
                    appreci = re.sub(r'^\*\s*', '', line).strip()
                    if appreci:
                        appreciation.append(appreci)
        
        # Extract content recommendations
        recommendations = []
        recommendations_section = re.search(r'\*\*Content Recommendations:\*\*(.*?)(?=\*\*Top Positive Comments:|\*\*Top Negative Comments:)', content, re.DOTALL)
        if recommendations_section:
            lines = recommendations_section.group(1).strip().split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('*') and not line.startswith('**'):
                    # Clean up the recommendation text
                    rec = re.sub(r'^\*\s*', '', line).strip()
                    if rec:
                        recommendations.append(rec)
        
        # Extract top positive comments
        top_positive = []
        positive_comments_section = re.search(r'\*\*Top Positive Comments:\*\*(.*?)(?=\*\*Top Negative Comments:|\*\*QUALITY CHECK)', content, re.DOTALL)
        if positive_comments_section:
            lines = positive_comments_section.group(1).strip().split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('*') and '"' in line:
                    # Extract comment text between quotes
                    comment_match = re.search(r'"([^"]+)"', line)
                    if comment_match:
                        top_positive.append(comment_match.group(1))
        
        # Extract top negative comments
        top_negative = []
        negative_comments_section = re.search(r'\*\*Top Negative Comments:\*\*(.*?)(?=\*\*QUALITY CHECK|\Z)', content, re.DOTALL)
        if negative_comments_section:
            lines = negative_comments_section.group(1).strip().split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('*') and '"' in line:
                    # Extract comment text between quotes
                    comment_match = re.search(r'"([^"]+)"', line)
                    if comment_match:
                        top_negative.append(comment_match.group(1))

        # Limit the number of items in each category to avoid excessive data
        max_items = 10
        return {
            'batchNumber': batch_number,
            'totalComments': total_comments,
            'positivePercentage': positive_pct,
            'neutralPercentage': neutral_pct,
            'negativePercentage': negative_pct,
            'positiveThemes': positive_themes[:max_items],  # Limit to max_items
            'negativeThemes': negative_themes[:max_items],
            'suggestions': suggestions[:max_items],  # Limit to max_items
            'appreciation': appreciation[:max_items],
            'recommendations': recommendations[:max_items],
            'topPositiveComments': top_positive[:max_items],  # Limit to top max_items
            'topNegativeComments': top_negative[:max_items],
            'processingDate': processing_date
        }
        
    except Exception as e:
        safe_print(f"Error parsing batch analysis: {e}")
        return None

@app.get("/api/comprehensive-analysis")
async def get_comprehensive_analysis():
    """
    Get comprehensive analysis including YouTube analytics and batch analysis data
    """
    try:
        # Get batch analysis data - ONLY use insights from batch files
        batch_files = glob.glob("analyzed_comments_batch_*.txt")
        batch_files.sort()
        
        # Initialize default values
        batch_analyses = []
        channel_name = "YouTube Channel Analysis"
        total_comments = 0
        overall_positive = 0
        overall_neutral = 0
        overall_negative = 0
        
        # Collect data from batch files (if any) - ALL insights come from here
        all_suggestions = []
        all_recommendations = []
        all_positive_comments = []
        all_negative_comments = []
        all_positive_themes = []
        all_negative_themes = []
        all_appreciation = []
        
        if batch_files:
            # Process existing batch files
            for batch_file in batch_files:
                try:
                    with open(batch_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    batch_num = int(batch_file.split('_')[-1].replace('.txt', ''))
                    analysis = parse_batch_analysis(content, batch_num)
                    if analysis:
                        batch_analyses.append(analysis)
                        total_comments += analysis.get('totalComments', 0)
                        overall_positive += analysis.get('positivePercentage', 0)
                        overall_neutral += analysis.get('neutralPercentage', 0)
                        overall_negative += analysis.get('negativePercentage', 0)
                        
                        # Collect ALL insights from batch files ONLY
                        all_suggestions.extend(analysis.get('suggestions', []))
                        all_recommendations.extend(analysis.get('recommendations', []))
                        all_positive_themes.extend(analysis.get('positiveThemes', []))
                        all_negative_themes.extend(analysis.get('negativeThemes', []))
                        all_appreciation.extend(analysis.get('appreciation', []))
                        
                        # Extract actual comment text from batch files
                        top_positive = analysis.get('topPositiveComments', [])
                        top_negative = analysis.get('topNegativeComments', [])
                        
                        # Format comments for dashboard display
                        for comment in top_positive:
                            all_positive_comments.append({
                                "text": comment,
                                "sentiment": "positive",
                                "score": 85,  # Default high score for positive comments
                                "source": f"batch_{batch_num}"
                            })
                        
                        for comment in top_negative:
                            all_negative_comments.append({
                                "text": comment,
                                "sentiment": "negative", 
                                "score": 25,  # Default low score for negative comments
                                "source": f"batch_{batch_num}"
                            })
                        
                except Exception as e:
                    safe_print(f"Error reading {batch_file}: {e}")
                    continue
        
        # If no batch files exist, return empty insights (don't use other sources)
        if not batch_files:
            safe_print("No batch analysis files found - dashboard insights will be empty")
            # Keep empty arrays for insights
            all_positive_comments = []
            all_negative_comments = []
            total_comments = 0
            overall_positive = 0
            overall_neutral = 0
            overall_negative = 0
        
        # Calculate averages
        num_batches = len(batch_analyses)
        avg_positive = overall_positive / num_batches if num_batches > 0 else 0
        avg_neutral = overall_neutral / num_batches if num_batches > 0 else 0
        avg_negative = overall_negative / num_batches if num_batches > 0 else 0
        
        # Load or create YouTube analytics data
        youtube_data = {}
        channel_id = None
        
        # Try to load existing YouTube data
        try:
            if os.path.exists("youtube_analytics.json"):
                with open("youtube_analytics.json", 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        youtube_data = json.loads(content)
                        channel_id = youtube_data.get('channel_info', {}).get('channel_id', '')
        except Exception as e:
            safe_print(f"Could not load YouTube analytics: {e}")
        
        # If no valid channel data, create default structure
        if not youtube_data.get('channel_info'):
            # Try to get channel name from batch analysis or use default
            actual_channel_name = "YouTube Channel"
            actual_subscriber_count = "N/A"
            
            # If we have batch analysis data and the channel name is not "test channel", use it
            if batch_analyses and len(batch_analyses) > 0:
                # Try to find a real channel name from comments or analysis
                for batch in batch_analyses:
                    if 'channelName' in batch and batch['channelName'] and batch['channelName'].lower() != 'test channel':
                        actual_channel_name = batch['channelName']
                        break
            
            youtube_data = {
                'channel_info': {
                    'channel_name': actual_channel_name,
                    'subscriber_count': actual_subscriber_count,
                    'video_count': 'N/A',
                    'view_count': 'N/A',
                    'description': 'Channel analysis data',
                    'published_at': datetime.now().isoformat(),
                    'thumbnail': None
                },
                'generated_at': datetime.now().isoformat()
            }
        
        # Get new graph data from YouTube analytics (only if we have a valid channel ID)
        monthly_views = []
        monthly_subscribers = []
        monthly_likes = []
        views_vs_likes = []
        views_vs_subscribers = []
        subscribers_vs_likes = []
        
        # Try to get YouTube data if we have a valid setup
        if (channel_id and 
            channel_id != "REAL_CHANNEL_ID_WILL_BE_POPULATED_HERE" and 
            len(channel_id) > 10 and
            os.getenv('YOUTUBE_API_KEY')):
            try:
                from youtube_analytics import YouTubeChannelAnalytics
                yt_analytics = YouTubeChannelAnalytics()
                
                monthly_views = yt_analytics.get_monthly_views_data(channel_id)
                monthly_subscribers = yt_analytics.get_monthly_subscribers_data(channel_id)
                monthly_likes = yt_analytics.get_monthly_likes_data(channel_id)
                views_vs_likes = yt_analytics.get_views_vs_likes_data(channel_id)
                views_vs_subscribers = yt_analytics.get_views_vs_subscribers_data(channel_id)
                subscribers_vs_likes = yt_analytics.get_subscribers_vs_likes_data(channel_id)
                
                safe_print(f"Successfully retrieved YouTube analytics for channel: {channel_id}")
                
            except Exception as e:
                safe_print(f"Error getting YouTube analytics: {e}")
                # Continue with empty data rather than failing
        else:
            safe_print("YouTube API not available - generating mock graph data from sentiment analysis")
        
        # If we don't have real YouTube analytics data, generate mock data based on batch analysis
        if not monthly_views and batch_analyses:
            # Generate mock monthly data based on sentiment analysis batches
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            current_month_index = datetime.now().month - 1
            
            # Create 12 months of data ending with current month
            for i in range(12):
                month_index = (current_month_index - 11 + i) % 12
                month_name = months[month_index]
                
                # Use batch data if available, otherwise generate based on sentiment patterns
                if i < len(batch_analyses):
                    batch = batch_analyses[i]
                    base_views = max(1000, batch.get('totalComments', 100) * 50)  # Estimate views from comments
                    base_subscribers = max(100, int(base_views * 0.02))  # 2% subscriber rate
                    base_likes = max(50, int(base_views * 0.03))  # 3% like rate
                else:
                    # Use average from existing batches
                    avg_comments = sum(b.get('totalComments', 0) for b in batch_analyses) / len(batch_analyses) if batch_analyses else 500
                    base_views = max(1000, int(avg_comments * 50))
                    base_subscribers = max(100, int(base_views * 0.02))
                    base_likes = max(50, int(base_views * 0.03))
                
                # Add some variation based on sentiment
                sentiment_multiplier = 1.0
                if i < len(batch_analyses):
                    batch = batch_analyses[i]
                    positive_ratio = batch.get('positivePercentage', 50) / 100
                    sentiment_multiplier = 0.7 + (positive_ratio * 0.6)  # Range: 0.7 to 1.3
                
                views = int(base_views * sentiment_multiplier)
                subscribers = int(base_subscribers * sentiment_multiplier)
                likes = int(base_likes * sentiment_multiplier)
                
                monthly_views.append({"month": month_name, "views": views})
                monthly_subscribers.append({"month": month_name, "subscribers": subscribers})
                monthly_likes.append({"month": month_name, "likes": likes})
                views_vs_likes.append({"month": month_name, "views": views, "likes": likes})
                views_vs_subscribers.append({"month": month_name, "views": views, "subscribers": subscribers})
                subscribers_vs_likes.append({"month": month_name, "subscribers": subscribers, "likes": likes})
        
        # Read processing status
        processing_date = "Unknown"
        try:
            with open("llm_processing_status.json", 'r') as f:
                status_data = json.load(f)
                processing_date = status_data.get("processing_date", "Unknown")
        except:
            pass
        
        return JSONResponse(content={
            'success': True,
            'data': {
                'channel_overview': {
                    'channel_name': youtube_data.get('channel_info', {}).get('channel_name', 'YouTube Channel'),
                    'subscriber_count': youtube_data.get('channel_info', {}).get('subscriber_count', 'N/A'),
                    'establishment_date': youtube_data.get('channel_info', {}).get('published_at', 'Unknown'),
                    'total_videos': youtube_data.get('channel_info', {}).get('video_count', 0),
                    'total_views': youtube_data.get('channel_info', {}).get('view_count', 0)
                },
                'sentiment_scores': {
                    'positive_percentage': round(avg_positive, 1),
                    'neutral_percentage': round(avg_neutral, 1),
                    'negative_percentage': round(avg_negative, 1)
                },
                'monthly_data': {
                    'subscribers': youtube_data.get('monthly_analytics', {}).get('monthly_subscriber_data', []),
                    'views': youtube_data.get('monthly_analytics', {}).get('monthly_view_data', [])
                },
                'new_graphs': {
                    'monthly_views': monthly_views,
                    'monthly_subscribers': monthly_subscribers,
                    'monthly_likes': monthly_likes,
                    'views_vs_likes': views_vs_likes,
                    'views_vs_subscribers': views_vs_subscribers,
                    'subscribers_vs_likes': subscribers_vs_likes
                },
                'all_positive_comments': all_positive_comments,  # Only from batch files
                'all_negative_comments': all_negative_comments,  # Only from batch files  
                'positive_themes': list(set(all_positive_themes))[:8],  # Only from batch files
                'negative_themes': list(set(all_negative_themes))[:8],  # Only from batch files
                'viewer_suggestions': list(set(all_suggestions))[:10],  # Only from batch files
                'content_recommendations': list(set(all_recommendations))[:10],  # Only from batch files
                'viewer_appreciation': list(set(all_appreciation))[:8],  # Only from batch files
                'total_comments': total_comments,
                'processing_date': processing_date
            }
        })
        
    except Exception as e:
        safe_print(f"Error getting comprehensive analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading comprehensive analysis: {str(e)}")

def extract_comments_from_detailed_results():
    """Extract positive and negative comments from detailed_sentiment_results.txt"""
    positive_comments = []
    negative_comments = []
    
    try:
        if os.path.exists("detailed_sentiment_results.txt"):
            with open("detailed_sentiment_results.txt", 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split by comment sections
            comment_sections = content.split("COMMENT #")
            
            for section in comment_sections[1:]:  # Skip the header
                try:
                    lines = section.strip().split('\n')
                    
                    # Extract text and sentiment
                    text_line = None
                    sentiment_line = None
                    score_line = None
                    
                    for line in lines:
                        if line.startswith("Text: "):
                            text_line = line[6:].strip()  # Remove "Text: "
                        elif line.startswith("Sentiment: "):
                            sentiment_line = line[11:].strip()  # Remove "Sentiment: "
                        elif line.startswith("Score: "):
                            score_line = line[7:].strip()  # Remove "Score: "
                    
                    if text_line and sentiment_line and score_line:
                        try:
                            score = int(score_line.split('/')[0])
                            
                            comment_data = {
                                "text": text_line,
                                "sentiment": sentiment_line,
                                "score": score
                            }
                            
                            # Categorize based on sentiment and score
                            if sentiment_line.lower() == "positive" or (sentiment_line.lower() == "neutral" and score >= 70):
                                positive_comments.append(comment_data)
                            elif sentiment_line.lower() == "negative" or (sentiment_line.lower() == "neutral" and score <= 40):
                                negative_comments.append(comment_data)
                                
                        except (ValueError, IndexError):
                            continue
                            
                except Exception as e:
                    safe_print(f"Error processing comment section: {e}")
                    continue
                    
        # Sort by score (highest first for positive, lowest first for negative)
        positive_comments.sort(key=lambda x: x["score"], reverse=True)
        negative_comments.sort(key=lambda x: x["score"])
        
        safe_print(f"Extracted {len(positive_comments)} positive and {len(negative_comments)} negative comments")
        
    except Exception as e:
        safe_print(f"Error extracting comments from detailed results: {e}")
    
    return positive_comments, negative_comments