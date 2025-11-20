from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    YOUTUBE_API_KEY: str
    GOOGLE_CLIENT_SECRET_JSON: str = "./client_secret.json"  # Default for local
    GOOGLE_DRIVE_FOLDER_ID: str
    
    class Config:
        env_file = ".env"

settings = Settings()
