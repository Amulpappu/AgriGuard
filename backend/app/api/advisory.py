from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.schemas import AdvisoryOut
from app.services.advisory import get_advisory
from app.api.deps import get_current_user

router = APIRouter(prefix="/advisory", tags=["advisory"])


@router.get("/{disease_id}", response_model=AdvisoryOut)
async def advisory(
    disease_id: str,
    lang: str = Query("en"),
    _user=Depends(get_current_user),
):
    data = get_advisory(disease_id, lang)
    if not data:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return AdvisoryOut(
        disease_id=disease_id,
        name=data.get("name", disease_id),
        summary=data.get("summary", ""),
        category=data.get("category", "Pathological Disease"),
        emergency_action=data.get("emergency_action"),
        organic_solution=data.get("organic_solution"),
        soil_and_water=data.get("soil_and_water"),
        symptoms=data.get("symptoms", []),
        prevention=data.get("prevention", []),
        management=data.get("management", []),
        seek_help_when=data.get("seek_help_when", []),
        severity_notes=data.get("severity_notes", {}),
        sources=data.get("sources", []),
        reviewed_by=data.get("reviewed_by"),
        disclaimer=data.get("disclaimer", "Consult your local agriculture officer or Krishi Vigyan Kendra (KVK) for guidance."),
    )
