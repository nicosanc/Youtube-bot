from googleapiclient.discovery import build
import datetime
import pandas as pd
from googleapiclient.http import MediaFileUpload
import os
from app.services.auth_service import load_credentials
from app.config import settings
from openpyxl import load_workbook

def send_excel_to_drive(data: dict) -> str:
    # Load user's OAuth credentials
    credentials = load_credentials()
    if not credentials:
        raise Exception("User not authenticated. Please login first.")
    
    # Build Drive service with user's credentials
    drive = build('drive', 'v3', credentials=credentials)
    
    # Create DataFrame and Excel file
    df = pd.DataFrame(data)
    filename = f"youtube_analytics_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M')}.xlsx"
    filepath = f"/tmp/{filename}"
    df.to_excel(filepath, index=False)
    
    # Add CPM formula column using openpyxl
    wb = load_workbook(filepath)
    ws = wb.active
    
    # Add CPM header in the next column
    last_col = ws.max_column + 1
    ws.cell(row=1, column=last_col, value='CPM')
    
    # Add CPM formula for each data row (formula: Price / (Total Views / 1000))
    # Price is in column J (10th column), Total Views is in column C (3rd column)
    for row in range(2, ws.max_row + 1):
        price_col = chr(64 + 10)  # J
        views_col = chr(64 + 3)   # C
        formula = f'=IF({price_col}{row}=0, "", {price_col}{row}/({views_col}{row}/1000))'
        ws.cell(row=row, column=last_col, value=formula)
    
    wb.save(filepath)
    
    # Upload to shared folder
    file_metadata = {
        'name': filename,
        'parents': [settings.GOOGLE_DRIVE_FOLDER_ID]
    }
    
    media = MediaFileUpload(filepath, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    file = drive.files().create(body=file_metadata, media_body=media, fields='id').execute()
    os.remove(filepath)
    
    print(f"File uploaded to user's Drive: {file.get('id')}")
    
    return f"https://drive.google.com/file/d/{file.get('id')}/view"