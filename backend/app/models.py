from pydantic import BaseModel
from typing import List, Literal, Optional

class AnalyzeRequest(BaseModel):
    urls: List[str]

class JobResponse(BaseModel):
    job_id: str

class StatusResponse(BaseModel):
    status: Literal['processing', 'complete', 'failed']
    sheet_url: Optional[str] = None
    error: Optional[str] = None

