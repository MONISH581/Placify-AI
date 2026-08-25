from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from app.api import ai_endpoints
from app.api import admin

app = FastAPI(title="Placify AI Engine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheckResponse(BaseModel):
    status: str
    message: str

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return {"status": "ok", "message": "Placify AI Engine is running"}

app.include_router(ai_endpoints.router, prefix="/api/ai", tags=["ai"])
app.include_router(admin.router, prefix="/api/ai/admin", tags=["admin"])

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
