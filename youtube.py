from googleapiclient.discovery import build
import dotenv as env
import os
import isodate
import pandas as pd

env.load_dotenv()
API_KEY = os.getenv('YOUTUBE_API_KEY')
youtube = build('youtube', 'v3', developerKey=API_KEY)

channelID = input("Enter YouTube Channel ID: ")

channel_response = youtube.channels().list(
    part='snippet,statistics,contentDetails',
    id=channelID
).execute()

channel = channel_response['items'][0]
channel_title = channel['snippet']['title']
channel_published = channel['snippet']['publishedAt']
subscriber_count = channel['statistics'].get('subscriberCount', 'Hidden')
uploads_playlist_id = channel['contentDetails']['relatedPlaylists']['uploads']

print(f"Channel Name: {channel_title}")
print(f"Published On: {channel_published}")
print(f"Subscribers: {subscriber_count}")

def get_comments(video_id, channel_name=channel_title):
    comments = []
    next_page_token = None
    
    # Check current CSV file size if it exists
    current_comments_count = 0
    if os.path.exists('all_comments.csv'):
        existing_df = pd.read_csv('all_comments.csv')
        current_comments_count = len(existing_df)
    
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
            df.insert(1, 'channel_name', channel_name)
            
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

def collect_comments_until_5000():
    # Check if CSV exists and has less than 5000 comments
    videos_to_skip = 0
    if os.path.exists('all_comments.csv'):
        df = pd.read_csv('all_comments.csv')
        if len(df) >= 5000:
            print("Already have 5000+ comments in CSV file.")
            return
        print(f"Found {len(df)} existing comments. Need {5000 - len(df)} more.")
        videos_to_skip = 10  # Skip first 10 videos as they're already processed
    
    # Get more videos if needed (increase maxResults)
    playlist_response = youtube.playlistItems().list(
        part='snippet',
        playlistId=uploads_playlist_id,
        maxResults=50  # Get more videos to ensure we have enough
    ).execute()
    
    video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response['items']]
    
    # Get video details
    video_response = youtube.videos().list(
        part='snippet,contentDetails,statistics',
        id=','.join(video_ids)
    ).execute()
    
    print(f"\nProcessing videos (skipping first {videos_to_skip} videos > 5 min):")
    count = 0
    videos_processed = 0
    
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
            
            print(f"{videos_processed}. {title} (ID: {video_id}) (Duration: {int(duration)} seconds, Comments: {comment_count})")
            
            # Get comments for this video
            reached_limit = get_comments(video_id)
            
            if reached_limit:
                print("Reached 5000 comments! Stopping collection.")
                break

# Run the main process
collect_comments_until_5000()

print("\nFinal CSV summary:")
if os.path.exists('all_comments.csv'):
    final_df = pd.read_csv('all_comments.csv')
    print(f"Total comments in CSV: {len(final_df)}")
else:
    print("No CSV file found.")

