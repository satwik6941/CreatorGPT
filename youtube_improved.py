from googleapiclient.discovery import build
import dotenv as env
import os
import sys
import isodate
import pandas as pd
import preprocessing
from typing import List, Dict, Any

# Load environment variables
env.load_dotenv()
API_KEY = os.getenv('YOUTUBE_API_KEY')

def log_progress(step, message, progress, **kwargs):
    """Log progress in a format that the API can parse"""
    import json
    from datetime import datetime
    
    progress_data = {
        "step": step,
        "message": message,
        "progress": progress,
        "timestamp": datetime.now().isoformat()
    }
    
    # Safely add kwargs, converting non-serializable objects to strings
    for key, value in kwargs.items():
        try:
            # Test if the value is JSON serializable
            json.dumps(value)
            progress_data[key] = value
        except (TypeError, ValueError):
            # Convert non-serializable objects to string representation
            progress_data[key] = str(value)
    
    try:
        print(f"PROGRESS:{json.dumps(progress_data)}")
    except (TypeError, ValueError) as e:
        # Fallback: create a minimal progress message
        minimal_data = {
            "step": step,
            "message": message,
            "progress": progress,
            "timestamp": datetime.now().isoformat()
        }
        print(f"PROGRESS:{json.dumps(minimal_data)}")
        print(f"Warning: Could not serialize full progress data: {e}")
    
    # Also print human-readable message
    print(message)

def validate_environment():
    """Validate required environment variables and dependencies"""
    if not API_KEY:
        print("ERROR: YOUTUBE_API_KEY environment variable not set")
        return False
    return True

def get_comments(youtube, video_id, channel_name):
    """Extract comments from a video"""
    comments = []
    next_page_token = None
    
    # Check current CSV file size if it exists
    current_comments_count = 0
    if os.path.exists('all_comments.csv'):
        try:
            existing_df = pd.read_csv('all_comments.csv')
            current_comments_count = len(existing_df)
        except Exception as e:
            print(f"Warning: Could not read existing CSV file: {e}")
            current_comments_count = 0
    
    # Stop if we already have 5000 comments
    if current_comments_count >= 5000:
        return True  # Return True to indicate we've reached the limit
    
    max_comments_needed = 5000 - current_comments_count
    # Limit to maximum 1000 comments per video
    max_comments_per_video = min(1000, max_comments_needed)
    
    try:
        while len(comments) < max_comments_per_video:
            response = youtube.commentThreads().list(
                part='snippet',
                videoId=video_id,
                maxResults=100,
                pageToken=next_page_token,
                textFormat='plainText'
            ).execute()
            
            for item in response['items']:
                snippet = item['snippet']['topLevelComment']['snippet']
                comments.append({
                    'comment': snippet['textDisplay']
                })
                
                # Stop if we've collected enough comments for this video
                if len(comments) >= max_comments_per_video:
                    break
            
            next_page_token = response.get('nextPageToken')
            if not next_page_token:
                break
        
        # Create DataFrame for new comments
        if comments:
            df = pd.DataFrame(comments)
            df.insert(0, 's.no', range(current_comments_count + 1, current_comments_count + len(df) + 1))
            
            # Append to existing CSV or create new one
            if os.path.exists('all_comments.csv'):
                df.to_csv('all_comments.csv', mode='a', header=False, index=False, encoding='utf-8-sig')
            else:
                df.to_csv('all_comments.csv', index=False, encoding='utf-8-sig')
            
            print(f"Added {len(comments)} comments from video {video_id}. Total: {current_comments_count + len(comments)}")
            
            # Return True if we've reached 5000 comments
            return (current_comments_count + len(comments)) >= 5000
    
    except Exception as e:
        print(f"Error fetching comments for video {video_id}: {e}")
        return False
    
    return False

def collect_comments_until_5000(youtube, uploads_playlist_id, channel_name):
    """Collect comments until we reach 5000"""
    # Check if CSV exists and has less than 5000 comments
    videos_to_skip = 0
    if os.path.exists('all_comments.csv'):
        try:
            df = pd.read_csv('all_comments.csv')
            if len(df) >= 5000:
                log_progress("already_complete", "Already have 5000+ comments in CSV file", 100, 
                           existing_comments=len(df))
                print("Already have 5000+ comments in CSV file.")
                return
            log_progress("resuming", f"Found {len(df)} existing comments. Need {5000 - len(df)} more", 35,
                        existing_comments=len(df), needed=5000-len(df))
            print(f"Found {len(df)} existing comments. Need {5000 - len(df)} more.")
            videos_to_skip = 10  # Skip first 10 videos as they're already processed
        except Exception as e:
            print(f"Warning: Could not read existing CSV: {e}")
            videos_to_skip = 0
    
    log_progress("fetching_videos", "Fetching video list from channel...", 40)
    
    # Get more videos if needed (increase maxResults)
    playlist_response = youtube.playlistItems().list(
        part='snippet',
        playlistId=uploads_playlist_id,
        maxResults=50  # Get more videos to ensure we have enough
    ).execute()
    
    video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response['items']]
    
    log_progress("analyzing_videos", f"Analyzing {len(video_ids)} videos for duration...", 45)
    
    # Get video details
    video_response = youtube.videos().list(
        part='snippet,contentDetails,statistics',
        id=','.join(video_ids)
    ).execute()
    
    print(f"\nProcessing videos (skipping first {videos_to_skip} videos > 5 min):")
    count = 0
    videos_processed = 0
    total_eligible_videos = sum(1 for v in video_response['items'] 
                               if isodate.parse_duration(v['contentDetails']['duration']).total_seconds() > 300)
    
    for video in video_response['items']:
        duration = isodate.parse_duration(video['contentDetails']['duration']).total_seconds()
        
        if duration > 300:  # Videos longer than 5 minutes
            count += 1
            
            # Skip the first 10 videos if CSV already exists
            if count <= videos_to_skip:
                continue
            
            videos_processed += 1
            title = video['snippet']['title']
            video_id = video['id']
            comment_count = video['statistics'].get('commentCount', '0')
            
            # Calculate progress based on videos processed
            video_progress = 50 + (videos_processed / max(total_eligible_videos - videos_to_skip, 1)) * 15
            log_progress("processing_video", f"Processing video {videos_processed}: {title[:50]}...", 
                        min(int(video_progress), 65),
                        video_number=videos_processed, video_title=title, video_id=video_id)
            
            print(f"{videos_processed}. {title} (ID: {video_id}) (Duration: {int(duration)} seconds, Comments: {comment_count})")
            
            # Get comments for this video
            reached_limit = get_comments(youtube, video_id, channel_name)
            
            if reached_limit:
                log_progress("limit_reached", "Reached 5000 comments! Stopping collection", 70)
                print("Reached 5000 comments! Stopping collection.")
                break

def validate_environment():
    """Validate required environment variables and dependencies"""
    if not API_KEY:
        print("ERROR: YOUTUBE_API_KEY environment variable not set")
        return False
    return True

def main():
    """Main function"""
    try:
        # Initialize progress
        log_progress("initializing", "Starting YouTube comment extraction...", 5)
        
        # Get channel ID from input
        if len(sys.argv) > 1:
            channel_id = sys.argv[1].strip()
        else:
            channel_id = input("Enter YouTube Channel ID: ").strip()
        
        if not channel_id:
            print("ERROR: No channel ID provided")
            sys.exit(1)
        
        log_progress("validating", f"Processing channel: {channel_id}", 10)
        
        # Validate environment
        if not validate_environment():
            sys.exit(1)
        
        log_progress("api_init", "Initializing YouTube API...", 15)
        
        # Initialize YouTube API
        youtube = build('youtube', 'v3', developerKey=API_KEY)
        
        log_progress("channel_info", "Fetching channel information...", 20)
        
        # Get channel information
        channel_response = youtube.channels().list(
            part='snippet,statistics,contentDetails',
            id=channel_id
        ).execute()
        
        if not channel_response['items']:
            print("ERROR: Channel not found")
            sys.exit(1)
        
        channel = channel_response['items'][0]
        channel_title = channel['snippet']['title']
        channel_published = channel['snippet']['publishedAt']
        subscriber_count = channel['statistics'].get('subscriberCount', 'Hidden')
        uploads_playlist_id = channel['contentDetails']['relatedPlaylists']['uploads']
        
        log_progress("channel_found", f"Found channel: {channel_title}", 25, 
                    channel_name=channel_title, 
                    subscriber_count=subscriber_count)
        
        print(f"Channel Name: {channel_title}")
        print(f"Published On: {channel_published}")
        print(f"Subscribers: {subscriber_count}")
        
        log_progress("extracting_comments", "Starting comment extraction...", 30)
        
        # Collect comments
        collect_comments_until_5000(youtube, uploads_playlist_id, channel_title)
        
        log_progress("extraction_complete", "Comment extraction completed", 70)
        
        # Final summary
        print("\nFinal CSV summary:")
        if os.path.exists('all_comments.csv'):
            final_df = pd.read_csv('all_comments.csv')
            total_comments = len(final_df)
            log_progress("csv_created", f"Created CSV with {total_comments} comments", 80, 
                        total_comments=total_comments)
            print(f"Total comments in CSV: {total_comments}")
        else:
            print("No CSV file found.")
            sys.exit(1)
        
        log_progress("preprocessing", "Cleaning and preprocessing comments...", 90)
        
        # Clean the comments in the CSV file
        print("Processing extracted comments...")
        cleaned_df = preprocessing.clean_symbols('all_comments.csv')
        if cleaned_df is not None:
            log_progress("completed", "YouTube comment extraction completed successfully!", 100)
            print("Cleaned comments saved to 'cleaned_all_comments.csv'")
            print("Comment processing completed successfully!")
        else:
            print("Error: No cleaned data returned from preprocessing function")
            
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
