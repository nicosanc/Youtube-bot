from pydantic import BaseModel
from typing import List, Literal, Optional

class AnalyzeRequest(BaseModel):
    urls: List[str]

class JobResponse(BaseModel):
    job_id: str

class TaskStatus(BaseModel):
    task_number: int
    status: Literal['queue', 'working', 'done', 'failed']
    sheet_url: Optional[str] = None
    error: Optional[str] = None

class StatusResponse(BaseModel):
    overall_status: Literal['processing', 'complete', 'failed']
    tasks: List[TaskStatus]

