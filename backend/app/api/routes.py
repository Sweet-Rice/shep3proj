from fastapi import APIRouter, HTTPException, status

from app.models.analysis import AnalysisRequest, AnalysisResponse
from app.parsers import RecordNormalizationError
from app.services.analyzer import SampleNotFoundError, analyze_request

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    try:
        return analyze_request(payload)
    except SampleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RecordNormalizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
