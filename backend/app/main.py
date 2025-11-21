from fastapi import FastAPI, BackgroundTasks, Header
from app.config import settings
from app.models import AnalyzeRequest, JobResponse, StatusResponse
import uuid
from fastapi.middleware.cors import CORSMiddleware
from app.services.job_manager import add_job, get_job, update_task
from urllib.parse import urlparse
from app.services.youtube_service import get_channel_id, get_channel_stats
from app.services.metrics_calculator import calculate_metrics
from app.services.sheets_service import send_excel_to_drive
from app.services.auth_service import (
    get_authorization_url,
    exchange_code_for_token,
    load_credentials,
)
from fastapi.responses import RedirectResponse, HTMLResponse
import secrets
from app.services.drive_services import get_or_create_daily_folder, get_next_task_number
from googleapiclient.discovery import build

app = FastAPI()

# Store auth tokens in memory (token -> user_email mapping)
auth_tokens = {}

origins = [
    "http://localhost:5173",  # Vite dev server
    "https://youtube-analytics-bot.vercel.app",  # Your Vercel frontend
    "https://youtube-bot-m3ga.onrender.com",  # Backend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    job = get_job(job_id)
    if not job:
        return StatusResponse(overall_status="failed", tasks=[])
    return StatusResponse(overall_status=job["overall_status"], tasks=job["tasks"])


@app.post("/analyze", response_model=JobResponse)
def analyze_urls(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None),
):
    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise Exception("User not authenticated")

    token = authorization.replace("Bearer ", "")
    user_email = auth_tokens.get(token)
    if not user_email:
        raise Exception("Invalid or expired token")

    credentials = load_credentials(user_email)
    drive = build("drive", "v3", credentials=credentials)

    daily_folder_id = get_or_create_daily_folder(drive, settings.GOOGLE_DRIVE_FOLDER_ID)
    task_number = get_next_task_number(drive, daily_folder_id)

    job_id = str(uuid.uuid4())
    num_tasks = 1
    add_job(job_id, task_number=task_number)
    background_tasks.add_task(process_analysis, job_id, request.urls, user_email)
    return JobResponse(job_id=job_id, task_number=task_number)


async def process_analysis(job_id: str, urls: list[str], user_email: str):
    # Mark the one task as working
    update_task(job_id, status="working")

    all_metrics = []

    try:
        # Process all URLs
        for url in urls:
            channel = get_channel_id(url)
            channel_stats = get_channel_stats(channel)
            metrics = calculate_metrics(channel_stats)
            all_metrics.append(metrics)

        # Send all metrics to Drive
        job = get_job(job_id)
        sheet_url = send_excel_to_drive(all_metrics, user_email, job["task_number"])

        # Mark the one task as done
        update_task(job_id, status="done", sheet_url=sheet_url)
        print(f"Job {job_id} complete: {len(all_metrics)} channels saved")

    except Exception as e:
        # Mark the one task as failed
        update_task(job_id, status="failed", error=str(e))
        print(f"Job {job_id} failed: {e}")


@app.get("/auth/login")
def login():
    """Initiate OAuth flow - returns URL to open in popup"""
    redirect_uri = f"{settings.BACKEND_URL}/auth/callback"
    auth_url, state = get_authorization_url(redirect_uri)
    return {"auth_url": auth_url}


@app.get("/auth/callback")
def callback(code: str):
    """Handle OAuth callback"""
    redirect_uri = f"{settings.BACKEND_URL}/auth/callback"
    credentials, user_email = exchange_code_for_token(code, redirect_uri)

    # Generate auth token
    auth_token = secrets.token_urlsafe(32)
    auth_tokens[auth_token] = user_email

    # Return HTML that passes token to frontend via postMessage
    frontend_url = (
        "https://youtube-analytics-bot.vercel.app"
        if "render.com" in settings.BACKEND_URL
        else "http://localhost:5173"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><title>Authentication Successful</title></head>
    <body>
        <script>
            window.opener.postMessage({{
                type: 'auth_success',
                token: '{auth_token}'
            }}, '{frontend_url}');
            window.close();
        </script>
        <p>Authentication successful! This window will close automatically...</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/auth/status")
def auth_status(authorization: str = Header(None)):
    """Check if user is authenticated"""
    if not authorization or not authorization.startswith("Bearer "):
        return {"authenticated": False}

    token = authorization.replace("Bearer ", "")
    user_email = auth_tokens.get(token)
    if not user_email:
        return {"authenticated": False}

    credentials = load_credentials(user_email)
    return {"authenticated": credentials is not None, "user_email": user_email}
