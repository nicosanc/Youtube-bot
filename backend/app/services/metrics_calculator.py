import statistics


def calculate_metrics(channel_stats: dict) -> dict:
    num_videos = channel_stats.get("num_videos", 1)
    total_views = max(
        channel_stats.get("views", 1), 1
    )  # Use 1 as minimum to avoid division by zero
    view_counts = channel_stats.get("view_counts", [])

    # Calculate standard deviation of views (0 if less than 2 videos)
    stddev = statistics.stdev(view_counts) if len(view_counts) >= 2 else 0

    return {
        "Channel Name": channel_stats.get("channel_name", ""),
        "Avg Views": total_views / num_videos,
        "Avg Comments": channel_stats.get("comments", 0) / num_videos,
        "Avg Likes": channel_stats.get("likes", 0) / num_videos,
        "Comment to View Ratio": channel_stats.get("comments", 0)
        / (total_views / 1000),
        "Engagement Rate": channel_stats.get("engagement_score", 0),
        "Like to View Ratio": channel_stats.get("likes", 0) / (total_views / 1000),
        "Standard Deviation": stddev,
        "Number of Videos": num_videos,
        "Price": 0,  # Empty for now, user will fill in
    }
