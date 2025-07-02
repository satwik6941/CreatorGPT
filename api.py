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
from typing import Optional, Dict, Any, List
import threading
import queue
import io
import contextlib
import glob
from collections import Counter

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
            await websocket.send_text(message)
        except:
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except:
                self.disconnect(connection)

# Initialize connection manager
manager = ConnectionManager()

# Mount static files directory for serving dashboard images and charts
# Create charts directory if it doesn't exist
os.makedirs("charts", exist_ok=True)
app.mount("/static", StaticFiles(directory="."), name="static")
app.mount("/charts", StaticFiles(directory="charts"), name="charts")

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
        message = json.dumps(analysis_state)
        await manager.broadcast(message)
    except Exception as e:
        print(f"Error broadcasting update: {e}")

def update_analysis_state(updates: dict):
    """Update analysis state and broadcast to WebSocket clients"""
    analysis_state.update(updates)
    # Schedule broadcast in the event loop
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcast_analysis_update())
    except:
        # If no event loop is running, skip broadcasting
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
            cwd=os.getcwd(),
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
        if os.path.exists('all_comments.csv'):
            df = pd.read_csv('all_comments.csv')
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
    
    # Find all analyzed batch files
    batch_files = glob.glob('analyzed_comments_batch_*.txt')
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
        
        if os.path.exists('sentiment_analyzed_comments.csv'):
            df = pd.read_csv('sentiment_analyzed_comments.csv')
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
            process = subprocess.Popen(
                [sys.executable, 'main.py', channel_id.strip()],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.getcwd(),
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
                                if analysis_state["channel_info"] is None:
                                    update_data["channel_info"] = ChannelInfo(
                                        channel_name=progress_data["channel_name"],
                                        subscriber_count=str(progress_data.get("subscriber_count", "Unknown")),
                                        total_comments=progress_data.get("total_comments", 0)
                                    )
                                else:
                                    # Update existing channel info
                                    analysis_state["channel_info"].channel_name = progress_data["channel_name"]
                                    if "subscriber_count" in progress_data:
                                        analysis_state["channel_info"].subscriber_count = str(progress_data["subscriber_count"])
                                    if "total_comments" in progress_data:
                                        analysis_state["channel_info"].total_comments = progress_data["total_comments"]
                            
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
                if os.path.exists('sentiment_analyzed_comments.csv'):
                    try:
                        df = pd.read_csv('sentiment_analyzed_comments.csv')
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

@app.websocket("/ws/analysis")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time analysis updates"""
    await manager.connect(websocket)
    try:
        # Send current state immediately upon connection
        await manager.send_personal_message(json.dumps(analysis_state), websocket)
        
        # Keep connection alive and wait for disconnection
        while True:
            # Wait for any message (ping/pong to keep connection alive)
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)

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
        if os.path.exists('sentiment_analyzed_comments.csv'):
            df = pd.read_csv('sentiment_analyzed_comments.csv')
            
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
        if os.path.exists('detailed_sentiment_results.txt'):
            with open('detailed_sentiment_results.txt', 'r', encoding='utf-8') as f:
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
            if os.path.exists(file):
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
    dashboard_path = "sentiment_analysis_dashboard.png"
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
    chart_path = f"charts/{chart_name}"
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
