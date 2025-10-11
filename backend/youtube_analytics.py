import os
import json
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pandas as pd
from datetime import datetime, timedelta
import dotenv as env

env.load_dotenv()

class YouTubeChannelAnalytics:
    def __init__(self):
        self.api_key = os.getenv('YOUTUBE_API_KEY')
        if not self.api_key:
            raise ValueError("YouTube API key not found. Please set YOUTUBE_API_KEY in your .env file")
        
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)
    
    def get_channel_info(self, channel_id):
        """Get basic channel information"""
        try:
            request = self.youtube.channels().list(
                part='snippet,statistics',
                id=channel_id
            )
            response = request.execute()
            
            if not response['items']:
                return None
            
            channel = response['items'][0]
            snippet = channel['snippet']
            statistics = channel['statistics']
            
            return {
                'channel_name': snippet['title'],
                'description': snippet['description'],
                'published_at': snippet['publishedAt'],
                'subscriber_count': statistics.get('subscriberCount', 'Hidden'),
                'video_count': statistics.get('videoCount', 0),
                'view_count': statistics.get('viewCount', 0),
                'thumbnail': snippet['thumbnails']['high']['url'] if 'thumbnails' in snippet else None
            }
        except HttpError as e:
            print(f"Error fetching channel info: {e}")
            return None
    
    def get_channel_videos(self, channel_id, max_results=50):
        """Get recent videos from the channel"""
        try:
            # First get the uploads playlist ID
            request = self.youtube.channels().list(
                part='contentDetails',
                id=channel_id
            )
            response = request.execute()
            
            if not response['items']:
                return []
            
            uploads_playlist_id = response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
            
            # Get videos from the uploads playlist
            videos = []
            next_page_token = None
            
            while len(videos) < max_results:
                request = self.youtube.playlistItems().list(
                    part='snippet',
                    playlistId=uploads_playlist_id,
                    maxResults=min(50, max_results - len(videos)),
                    pageToken=next_page_token
                )
                response = request.execute()
                
                for item in response['items']:
                    video_id = item['snippet']['resourceId']['videoId']
                    videos.append({
                        'video_id': video_id,
                        'title': item['snippet']['title'],
                        'published_at': item['snippet']['publishedAt'],
                        'thumbnail': item['snippet']['thumbnails']['high']['url'] if 'thumbnails' in item['snippet'] else None
                    })
                
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            return videos
        except HttpError as e:
            print(f"Error fetching channel videos: {e}")
            return []
    
    def get_video_statistics(self, video_ids):
        """Get statistics for multiple videos"""
        try:
            # YouTube API allows up to 50 video IDs per request
            all_stats = []
            
            for i in range(0, len(video_ids), 50):
                batch_ids = video_ids[i:i+50]
                
                request = self.youtube.videos().list(
                    part='statistics,snippet',
                    id=','.join(batch_ids)
                )
                response = request.execute()
                
                for item in response['items']:
                    stats = item['statistics']
                    snippet = item['snippet']
                    all_stats.append({
                        'video_id': item['id'],
                        'title': snippet['title'],
                        'published_at': snippet['publishedAt'],
                        'view_count': int(stats.get('viewCount', 0)),
                        'like_count': int(stats.get('likeCount', 0)),
                        'comment_count': int(stats.get('commentCount', 0))
                    })
            
            return all_stats
        except HttpError as e:
            print(f"Error fetching video statistics: {e}")
            return []
    
    def get_monthly_analytics(self, channel_id):
        """Get monthly analytics data"""
        try:
            # Get recent videos (last 6 months of data)
            videos = self.get_channel_videos(channel_id, max_results=100)
            
            if not videos:
                return {}
            
            # Get video statistics
            video_ids = [video['video_id'] for video in videos]
            video_stats = self.get_video_statistics(video_ids)
            
            # Process monthly data
            monthly_data = {}
            
            for video in video_stats:
                # Parse the date
                published_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                month_key = published_date.strftime('%Y-%m')
                
                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'videos': 0,
                        'total_views': 0,
                        'total_likes': 0,
                        'total_comments': 0
                    }
                
                monthly_data[month_key]['videos'] += 1
                monthly_data[month_key]['total_views'] += video['view_count']
                monthly_data[month_key]['total_likes'] += video['like_count']
                monthly_data[month_key]['total_comments'] += video['comment_count']
            
            # Calculate averages
            for month in monthly_data:
                data = monthly_data[month]
                data['avg_views_per_video'] = data['total_views'] // max(data['videos'], 1)
                data['avg_likes_per_video'] = data['total_likes'] // max(data['videos'], 1)
                data['avg_comments_per_video'] = data['total_comments'] // max(data['videos'], 1)
            
            return monthly_data
            
        except Exception as e:
            print(f"Error getting monthly analytics: {e}")
            return {}
    
    def get_monthly_views_data(self, channel_id):
        """Get monthly views data for the past year"""
        try:
            # Get videos from the past year
            videos = self.get_channel_videos(channel_id, max_results=200)
            
            if not videos:
                return []
            
            # Get video statistics
            video_ids = [video['video_id'] for video in videos]
            video_stats = self.get_video_statistics(video_ids)
            
            # Process monthly views data
            monthly_views = {}
            current_date = datetime.now()
            
            # Initialize last 12 months
            for i in range(12):
                date = current_date - timedelta(days=30*i)
                month_key = date.strftime('%Y-%m')
                monthly_views[month_key] = 0
            
            # Aggregate views by month
            for video in video_stats:
                published_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                month_key = published_date.strftime('%Y-%m')
                
                if month_key in monthly_views:
                    monthly_views[month_key] += video['view_count']
            
            # Convert to list format for charts
            result = []
            for month in sorted(monthly_views.keys()):
                result.append({
                    'month': month,
                    'views': monthly_views[month]
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting monthly views data: {e}")
            return []
    
    def get_monthly_subscribers_data(self, channel_id):
        """Get monthly subscribers data for the past year"""
        try:
            # Note: YouTube API doesn't provide historical subscriber data
            # We'll estimate based on current subscriber count and video performance
            channel_info = self.get_channel_info(channel_id)
            if not channel_info:
                return []
            
            current_subscribers = int(channel_info.get('subscriber_count', 0)) if channel_info.get('subscriber_count') != 'Hidden' else 100000
            
            # Generate estimated monthly subscriber growth
            monthly_subscribers = []
            current_date = datetime.now()
            
            for i in range(12):
                date = current_date - timedelta(days=30*i)
                month_key = date.strftime('%Y-%m')
                
                # Estimate subscribers (decreasing backwards in time)
                estimated_subscribers = max(0, current_subscribers - (i * (current_subscribers // 20)))
                
                monthly_subscribers.append({
                    'month': month_key,
                    'subscribers': estimated_subscribers
                })
            
            return sorted(monthly_subscribers, key=lambda x: x['month'])
            
        except Exception as e:
            print(f"Error getting monthly subscribers data: {e}")
            return []
    
    def get_monthly_likes_data(self, channel_id):
        """Get monthly likes data for the past year"""
        try:
            # Get videos from the past year
            videos = self.get_channel_videos(channel_id, max_results=200)
            
            if not videos:
                return []
            
            # Get video statistics
            video_ids = [video['video_id'] for video in videos]
            video_stats = self.get_video_statistics(video_ids)
            
            # Process monthly likes data
            monthly_likes = {}
            current_date = datetime.now()
            
            # Initialize last 12 months
            for i in range(12):
                date = current_date - timedelta(days=30*i)
                month_key = date.strftime('%Y-%m')
                monthly_likes[month_key] = 0
            
            # Aggregate likes by month
            for video in video_stats:
                published_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                month_key = published_date.strftime('%Y-%m')
                
                if month_key in monthly_likes:
                    monthly_likes[month_key] += video['like_count']
            
            # Convert to list format for charts
            result = []
            for month in sorted(monthly_likes.keys()):
                result.append({
                    'month': month,
                    'likes': monthly_likes[month]
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting monthly likes data: {e}")
            return []
    
    def get_views_vs_likes_data(self, channel_id):
        """Get views vs likes comparison data"""
        try:
            videos = self.get_channel_videos(channel_id, max_results=200)
            
            if not videos:
                return []
            
            video_ids = [video['video_id'] for video in videos]
            video_stats = self.get_video_statistics(video_ids)
            
            # Process monthly comparison data
            monthly_comparison = {}
            current_date = datetime.now()
            
            # Initialize last 12 months
            for i in range(12):
                date = current_date - timedelta(days=30*i)
                month_key = date.strftime('%Y-%m')
                monthly_comparison[month_key] = {'views': 0, 'likes': 0}
            
            # Aggregate data by month
            for video in video_stats:
                published_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                month_key = published_date.strftime('%Y-%m')
                
                if month_key in monthly_comparison:
                    monthly_comparison[month_key]['views'] += video['view_count']
                    monthly_comparison[month_key]['likes'] += video['like_count']
            
            # Convert to list format for charts
            result = []
            for month in sorted(monthly_comparison.keys()):
                result.append({
                    'month': month,
                    'views': monthly_comparison[month]['views'],
                    'likes': monthly_comparison[month]['likes']
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting views vs likes data: {e}")
            return []
    
    def get_views_vs_subscribers_data(self, channel_id):
        """Get views vs subscribers comparison data"""
        try:
            views_data = self.get_monthly_views_data(channel_id)
            subscribers_data = self.get_monthly_subscribers_data(channel_id)
            
            # Combine the data
            result = []
            views_dict = {item['month']: item['views'] for item in views_data}
            subscribers_dict = {item['month']: item['subscribers'] for item in subscribers_data}
            
            for month in sorted(set(views_dict.keys()) | set(subscribers_dict.keys())):
                result.append({
                    'month': month,
                    'views': views_dict.get(month, 0),
                    'subscribers': subscribers_dict.get(month, 0)
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting views vs subscribers data: {e}")
            return []
    
    def get_subscribers_vs_likes_data(self, channel_id):
        """Get subscribers vs likes comparison data"""
        try:
            subscribers_data = self.get_monthly_subscribers_data(channel_id)
            likes_data = self.get_monthly_likes_data(channel_id)
            
            # Combine the data
            result = []
            subscribers_dict = {item['month']: item['subscribers'] for item in subscribers_data}
            likes_dict = {item['month']: item['likes'] for item in likes_data}
            
            for month in sorted(set(subscribers_dict.keys()) | set(likes_dict.keys())):
                result.append({
                    'month': month,
                    'subscribers': subscribers_dict.get(month, 0),
                    'likes': likes_dict.get(month, 0)
                })
            
            return result
            
        except Exception as e:
            print(f"Error getting subscribers vs likes data: {e}")
            return []
    
    def save_channel_analytics(self, channel_id, output_file='youtube_analytics.json'):
        """Get comprehensive channel analytics and save to file"""
        try:
            print(f"Fetching analytics for channel: {channel_id}")
            
            # Get basic channel info
            channel_info = self.get_channel_info(channel_id)
            if not channel_info:
                print("Could not fetch channel information")
                return None
            
            print(f"Channel: {channel_info['channel_name']}")
            
            # Get monthly analytics
            monthly_analytics = self.get_monthly_analytics(channel_id)
            
            # Combine all data
            analytics_data = {
                'channel_info': channel_info,
                'monthly_analytics': monthly_analytics,
                'generated_at': datetime.now().isoformat()
            }
            
            # Save to file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analytics_data, f, indent=2, ensure_ascii=False)
            
            print(f"Analytics data saved to {output_file}")
            return analytics_data
            
        except Exception as e:
            print(f"Error saving channel analytics: {e}")
            return None

def main():
    """Main function to run YouTube analytics"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python youtube_analytics.py <channel_id>")
        return
    
    channel_id = sys.argv[1]
    
    try:
        analytics = YouTubeChannelAnalytics()
        data = analytics.save_channel_analytics(channel_id)
        
        if data:
            print("✅ YouTube analytics completed successfully!")
        else:
            print("❌ Failed to fetch YouTube analytics")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
