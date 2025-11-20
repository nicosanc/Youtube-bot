def calculate_metrics(channel_stats: dict) -> dict:
    num_videos = channel_stats.get('num_videos', 1)
    total_views = max(channel_stats.get('views', 1), 1)  # Use 1 as minimum to avoid division by zero
    
    return {
        'Channel Name': channel_stats.get('channel_name', ''),
        'Number of Videos': num_videos,
        'Total Views': total_views,
        'Avg Views': total_views / num_videos,
        'Avg Likes': channel_stats.get('likes', 0) / num_videos,
        'Avg Comments': channel_stats.get('comments', 0) / num_videos,
        'Comment to View Ratio': channel_stats.get('comments', 0) / total_views,
        'Like to View Ratio': channel_stats.get('likes', 0) / total_views,
        'Engagement Score': channel_stats.get('engagement_score', 0),
        'Price': 0,  # Empty for now, user will fill in
    }