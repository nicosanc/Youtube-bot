# simple in memory dict to store jobs with multiple tasks
jobs = {}


def add_job(job_id: str, task_number: int):
    """Create a job with given task"""

    task = {
        "status": "queue",  # queue, working, done, failed
        "sheet_url": None,
        "error": None,
    }
    jobs[job_id] = {
        "task_number": task_number,
        "tasks": [task],
        "overall_status": "processing",  # processing, complete, failed
    }


def get_job(job_id: str):
    return jobs.get(job_id)


def update_task(job_id: str, status: str, sheet_url: str = None, error: str = None):
    """Update a task within a job"""
    if job_id in jobs:
        task = jobs[job_id]["tasks"][0]
        task["status"] = status
        task["sheet_url"] = sheet_url
        task["error"] = error

        if status in ["done", "failed"]:
            jobs[job_id]["overall_status"] = (
                "failed" if status == "failed" else "complete"
            )
