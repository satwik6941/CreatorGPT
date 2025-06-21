from googleapiclient.discovery import build
import dotenv as env
import os
import isodate 

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

playlist_response = youtube.playlistItems().list(
    part='snippet',
    playlistId=uploads_playlist_id,
    maxResults=30
).execute()

video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response['items']]

print("\nLatest 10 Videos (Longer than 5 minute):")
count = 0
video_response = youtube.videos().list(
    part='snippet,contentDetails,statistics',
    id=','.join(video_ids)
).execute()

for video in video_response['items']:
    duration = isodate.parse_duration(video['contentDetails']['duration']).total_seconds()
    if duration > 300 and count < 10: 
        count += 1
        title = video['snippet']['title']
        video_id = video['id']
        comment_count = video['statistics'].get('commentCount', '0')
        print(f"- {title} (ID: {video_id}) (Duration: {duration} seconds, Comments: {comment_count})")

'''Till the above part we have the code to fetch the channel details and the latest 10 videos using the Youtube Channel ID.'''

