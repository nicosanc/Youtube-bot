from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import json
import os
from app.config import settings

SCOPES = ['https://www.googleapis.com/auth/drive.file']
TOKEN_FILE = './tokens.json'

def get_authorization_url(redirect_uri: str) -> str:
    """Generate OAuth authorization URL"""
    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_CLIENT_SECRET_JSON,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    return authorization_url, state

def exchange_code_for_token(code: str, redirect_uri: str):
    """Exchange authorization code for tokens"""
    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_CLIENT_SECRET_JSON,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    flow.fetch_token(code=code)
    credentials = flow.credentials
    save_credentials(credentials)
    return credentials

def save_credentials(credentials):
    """Save credentials to file"""
    token_data = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    with open(TOKEN_FILE, 'w') as f:
        json.dump(token_data, f)

def load_credentials():
    """Load credentials from file"""
    if not os.path.exists(TOKEN_FILE):
        return None
    
    with open(TOKEN_FILE, 'r') as f:
        token_data = json.load(f)
    
    credentials = Credentials(
        token=token_data['token'],
        refresh_token=token_data['refresh_token'],
        token_uri=token_data['token_uri'],
        client_id=token_data['client_id'],
        client_secret=token_data['client_secret'],
        scopes=token_data['scopes']
    )
    
    # Refresh if expired
    if credentials.expired:
        credentials.refresh(Request())
        save_credentials(credentials)
    
    return credentials