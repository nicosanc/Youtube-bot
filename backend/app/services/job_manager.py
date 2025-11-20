
# simple in memory dict to store jobs
jobs = {}

def add_job(job_id: str, status: str):
    jobs[job_id] = {
        "status": status,
        "sheet_url": None,
        "error": None,
    }

def get_job(job_id: str):
    return jobs.get(job_id)

def update_job(job_id: str, status: str, sheet_url: str = None, error: str = None):
    """Update an existing job"""
    if job_id in jobs:
        jobs[job_id]["status"] = status
        jobs[job_id]["sheet_url"] = sheet_url
        jobs[job_id]["error"] = error

