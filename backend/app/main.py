from fastapi import FastAPI, BackgroundTasks
from app.config import settings
from app.models import AnalyzeRequest, JobResponse, StatusResponse
import uuid
from fastapi.middleware.cors import CORSMiddleware
from app.services.job_manager import add_job, get_job, update_job
from urllib.parse import urlparse
from app.services.youtube_service import get_channel_id, get_channel_stats
from app.services.metrics_calculator import calculate_metrics
from app.services.sheets_service import send_excel_to_drive
from app.services.auth_service import get_authorization_url, exchange_code_for_token, load_credentials
from fastapi.responses import RedirectResponse

app = FastAPI()

origins = [
    "http://localhost:5173",  # Vite dev server
    "https://your-vercel-app.vercel.app",  # Add later when deployed
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
def analyze_urls(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    job_id= str(uuid.uuid4())
    add_job(job_id, status="pending")
    background_tasks.add_task(process_analysis, job_id, request.urls)
    return JobResponse(job_id=job_id)

async def process_analysis(job_id: str, urls: list[str]):
    # get stats for each channel 
    analyzed_results = []
    try:
        for url in urls:
            channel = get_channel_id(url)
            channel_stats = get_channel_stats(channel)
            metrics = calculate_metrics(channel_stats)
            analyzed_results.append(metrics)
        print(f"Analyzed results for job {job_id}: {analyzed_results}")
        sheet_url = send_excel_to_drive(analyzed_results)
        update_job(job_id, status="complete", sheet_url=sheet_url, error=None)
    except Exception as e:
        update_job(job_id, status="failed", error=str(e))
        print(f"Error processing job {job_id}: {e}")
    
    
@app.get('/auth/login')
def login():
    """Initiate OAuth flow"""
    redirect_uri = "http://localhost:8000/auth/callback"
    auth_url, state = get_authorization_url(redirect_uri)
    return {"auth_url": auth_url}

@app.get('/auth/callback')
def callback(code: str):
    """Handle OAuth callback"""
    redirect_uri = "http://localhost:8000/auth/callback"
    credentials = exchange_code_for_token(code, redirect_uri)
    # Redirect to frontend
    return RedirectResponse(url="http://localhost:5173?auth=success")

@app.get('/auth/status')
def auth_status():
    """Check if user is authenticated"""
    credentials = load_credentials()
    return {"authenticated": credentials is not None}




