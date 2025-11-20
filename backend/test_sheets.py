from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

credentials = Credentials.from_service_account_file('./credentials.json', scopes=SCOPES)
from google.auth.transport.requests import Request
credentials.refresh(Request())

print(f"Service account: {credentials.service_account_email}")
print(f"Token: {credentials.token[:20]}..." if credentials.token else "No token")

sheets = build('sheets', 'v4', credentials=credentials)

try:
    spreadsheet = sheets.spreadsheets().create(body={
        'properties': {'title': 'Test Sheet'}
    }).execute()
    print(f"SUCCESS! Created: {spreadsheet['spreadsheetId']}")
except Exception as e:
    print(f"FAILED: {e}")

