from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import json
import os
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKENS_DIR = "./tokens"  # Directory to store per-user tokens


def get_authorization_url(redirect_uri: str) -> str:
    """Generate OAuth authorization URL"""
    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_CLIENT_SECRET_JSON, scopes=SCOPES, redirect_uri=redirect_uri
    )
    authorization_url, state = flow.authorization_url(
        access_type="offline", include_granted_scopes="true"
    )
    return authorization_url, state


def exchange_code_for_token(code: str, redirect_uri: str):
    """Exchange authorization code for tokens"""
    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_CLIENT_SECRET_JSON, scopes=SCOPES, redirect_uri=redirect_uri
    )
    flow.fetch_token(code=code)
    credentials = flow.credentials
    user_email = get_user_email(credentials)
    save_credentials(credentials, user_email)
    return credentials, user_email


def get_user_email(credentials):
    """Extract user email from credentials"""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        idinfo = id_token.verify_oauth2_token(
            credentials.token, google_requests.Request(), credentials.client_id
        )
        return idinfo.get("email", "unknown")
    except:
        # If token verification fails, use a hash as identifier
        import hashlib

        return hashlib.md5(credentials.token.encode()).hexdigest()


def save_credentials(credentials, user_email):
    """Save credentials to per-user file"""
    # Create tokens directory if it doesn't exist
    if not os.path.exists(TOKENS_DIR):
        os.makedirs(TOKENS_DIR)

    # Sanitize email for filename
    safe_email = user_email.replace("@", "_at_").replace(".", "_")
    token_file = f"{TOKENS_DIR}/{safe_email}.json"

    token_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
        "email": user_email,
    }
    with open(token_file, "w") as f:
        json.dump(token_data, f)


def load_credentials(user_email):
    """Load credentials for specific user"""
    if not os.path.exists(TOKENS_DIR):
        return None

    # Sanitize email for filename
    safe_email = user_email.replace("@", "_at_").replace(".", "_")
    token_file = f"{TOKENS_DIR}/{safe_email}.json"

    if not os.path.exists(token_file):
        return None

    with open(token_file, "r") as f:
        token_data = json.load(f)

    credentials = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )

    # Refresh if expired
    if credentials.expired:
        credentials.refresh(Request())
        save_credentials(credentials, user_email)

    return credentials
