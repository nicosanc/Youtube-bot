from urllib.parse import urlparse
from googleapiclient.discovery import build
from app.config import settings

youtube = build('youtube', 'v3', developerKey=settings.YOUTUBE_API_KEY)

def get_channel_id(url: str) -> str:
    """
    Get the channel ID from a YouTube URL.
    """
    parsed = urlparse(url)
    path = parsed.path.strip('/')

    if path.startswith('@'):
        handle = path[1:]
        response = youtube.channels().list(part='id', forHandle=handle).execute()
        if response['items']:
            return response['items'][0]['id']
        else:
            raise ValueError(f'Channel not found for handle: {handle}')
    elif path.startswith('channel/'):
        return path.split('/')[-1]
    elif path.startswith('user/'):
        username = path.split('/')[-1]
        response = youtube.channels().list(part='id', forUsername=username).execute()
        if response['items']:
            return response['items'][0]['id']
        else:
            raise ValueError(f'Channel not found for username: {username}')
    else:
        raise ValueError('Invalid YouTube URL')

def get_channel_stats(channel_id: str) -> dict:
    
    # Get channel name
    channel_info = youtube.channels().list(part='snippet', id=channel_id).execute()
    channel_name = channel_info['items'][0]['snippet']['title'] if channel_info['items'] else 'Unknown'
    
    # Get a list of videoIDs from the channel. As of now ordered by date, but we can change to relevance, rating, viewCount
    channel_response = youtube.search().list(part='snippet', type='video', channelId=channel_id, maxResults=20, order='date').execute()
    video_ids = [item['id']['videoId'] for item in channel_response['items']]
    
    video_response = youtube.videos().list(part='snippet,statistics', id=','.join(video_ids)).execute()
    likes = 0
    comments = 0
    views = 0
    for video in video_response['items']:
        video_stats = video['statistics']
        likes += int(video_stats.get('likeCount', 0))
        comments += int(video_stats.get('commentCount', 0))
        views += int(video_stats.get('viewCount', 0))
    engagement_score = ((comments + likes) / views) * 100 if views > 0 else 0
    
    channel_stats = {
        'channel_name': channel_name,
        'num_videos': len(video_ids),
        'views': views,
        'likes': likes,
        'comments': comments,
        'engagement_score': f"({engagement_score:.2f}%)",
    }

    return channel_stats

