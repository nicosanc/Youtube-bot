from fastapi import FastAPI, BackgroundTasks, Request
from app.config import settings
from app.models import AnalyzeRequest, JobResponse, StatusResponse
import uuid
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.services.job_manager import add_job, get_job, update_job
from urllib.parse import urlparse
from app.services.youtube_service import get_channel_id, get_channel_stats
from app.services.metrics_calculator import calculate_metrics
from app.services.sheets_service import send_excel_to_drive
from app.services.auth_service import get_authorization_url, exchange_code_for_token, load_credentials_for_user, get_user_email
from fastapi.responses import RedirectResponse

app = FastAPI()

# Add session middleware for per-user authentication (must be before CORS)
is_production = "render.com" in settings.BACKEND_URL
app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.SESSION_SECRET,
    same_site="none" if is_production else "lax",  # 'none' for cross-origin in prod
    https_only=is_production    # Only require HTTPS in production
)

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

@app.get('/status/{job_id}')
def get_status(job_id: str):
    job = get_job(job_id)
    if not job:
        return StatusResponse(status="failed", error="Job not found")
    return StatusResponse(**job)


@app.post('/analyze', response_model=JobResponse)
def analyze_urls(http_request: Request, request: AnalyzeRequest, background_tasks: BackgroundTasks):
    user_email = http_request.session.get('user_email')
    if not user_email:
        raise Exception("User not authenticated")
    
    job_id= str(uuid.uuid4())
    add_job(job_id, status="pending")
    background_tasks.add_task(process_analysis, job_id, request.urls, user_email)
    return JobResponse(job_id=job_id)

async def process_analysis(job_id: str, urls: list[str], user_email: str):
    # get stats for each channel 
    analyzed_results = []
    try:
        for url in urls:
            channel = get_channel_id(url)
            channel_stats = get_channel_stats(channel)
            metrics = calculate_metrics(channel_stats)
            analyzed_results.append(metrics)
        print(f"Analyzed results for job {job_id}: {analyzed_results}")
        sheet_url = send_excel_to_drive(analyzed_results, user_email)
        update_job(job_id, status="complete", sheet_url=sheet_url, error=None)
    except Exception as e:
        update_job(job_id, status="failed", error=str(e))
        print(f"Error processing job {job_id}: {e}")
    
    
@app.get('/auth/login')
def login():
    """Initiate OAuth flow"""
    redirect_uri = f"{settings.BACKEND_URL}/auth/callback"
    auth_url, state = get_authorization_url(redirect_uri)
    return {"auth_url": auth_url}

@app.get('/auth/callback')
def callback(request: Request, code: str):
    """Handle OAuth callback"""
    redirect_uri = f"{settings.BACKEND_URL}/auth/callback"
    credentials, user_email = exchange_code_for_token(code, redirect_uri)
    # Store user email in session
    request.session['user_email'] = user_email
    # Redirect to frontend
    frontend_url = "https://youtube-analytics-bot.vercel.app" if "render.com" in settings.BACKEND_URL else "http://localhost:5173"
    return RedirectResponse(url=f"{frontend_url}?auth=success")

@app.get('/auth/status')
def auth_status(request: Request):
    """Check if user is authenticated"""
    user_email = request.session.get('user_email')
    if not user_email:
        return {"authenticated": False}
    credentials = load_credentials_for_user(user_email)
    return {"authenticated": credentials is not None}




