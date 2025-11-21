import datetime


def get_or_create_daily_folder(drive, parent_folder_id: str) -> str:
    """Find or create today's folder (format: mm-dd-yyyy)"""
    today = datetime.datetime.now().strftime("%m-%d-%Y")

    # Search for today's folder
    query = f"name='{today}' and '{parent_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = drive.files().list(q=query, fields="files(id, name)").execute()
    folders = results.get("files", [])

    if folders:
        return folders[0]["id"]

    # Create folder if it doesn't exist
    folder_metadata = {
        "name": today,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_folder_id],
    }
    folder = drive.files().create(body=folder_metadata, fields="id").execute()
    return folder["id"]


def get_next_task_number(drive, folder_id: str) -> int:
    """Count existing files in folder and return next task number"""
    query = f"'{folder_id}' in parents and trashed=false"
    results = drive.files().list(q=query, fields="files(id)").execute()
    files = results.get("files", [])
    return len(files) + 1
