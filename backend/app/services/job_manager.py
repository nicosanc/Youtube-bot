
# simple in memory dict to store jobs with multiple tasks
jobs = {}

def add_job(job_id: str, num_tasks: int):
    """Create a job with multiple tasks"""
    tasks = []
    for i in range(1, num_tasks + 1):
        tasks.append({
            "task_number": i,
            "status": "queue",  # queue, working, done, failed
            "sheet_url": None,
            "error": None,
        })
    jobs[job_id] = {
        "tasks": tasks,
        "overall_status": "processing"  # processing, complete, failed
    }

def get_job(job_id: str):
    return jobs.get(job_id)

def update_task(job_id: str, task_number: int, status: str, sheet_url: str = None, error: str = None):
    """Update a specific task within a job"""
    if job_id in jobs:
        for task in jobs[job_id]["tasks"]:
            if task["task_number"] == task_number:
                task["status"] = status
                task["sheet_url"] = sheet_url
                task["error"] = error
                break
        
        # Update overall job status
        all_done = all(t["status"] in ["done", "failed"] for t in jobs[job_id]["tasks"])
        if all_done:
            any_failed = any(t["status"] == "failed" for t in jobs[job_id]["tasks"])
            jobs[job_id]["overall_status"] = "failed" if any_failed else "complete"

