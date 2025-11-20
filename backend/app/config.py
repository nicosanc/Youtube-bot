from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    YOUTUBE_API_KEY: str
    GOOGLE_SERVICE_ACCOUNT_JSON: str
    GOOGLE_DRIVE_FOLDER_ID: str
    
    class Config:
        env_file = ".env"

settings = Settings()
