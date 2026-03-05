"""API routes for scan operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session, ScanResultDB
from models import ScanRequest, ScanResponse, HistoryItem, HistoryResponse, GenerateRequest, GenerateResponse, SetModelRequest
from scanner import scanner
from detector import detector
import uuid
import json
from datetime import datetime, timezone

router = APIRouter()

AVAILABLE_MODELS = [
    {"id": "distilgpt2", "name": "DistilGPT-2 (82M - Very Fast)"},
    {"id": "gpt2", "name": "GPT-2 Base (124M - Fast)"},
    {"id": "gpt2-medium", "name": "GPT-2 Medium (355M - Balanced)"},
    {"id": "gpt2-large", "name": "GPT-2 Large (774M - Higher Quality)"},
]


@router.post("/scan", response_model=ScanResponse)
async def run_scan(request: ScanRequest, session: AsyncSession = Depends(get_session)):
    """Run a causal scan on the provided prompt."""
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    # Step 1-4: Run the causal scanner
    scan_result = scanner.scan(prompt)

    # Step 5-6: Run the detector
    detection = detector.predict(
        prompt=prompt,
        causal_feature_vector=scan_result["causal_feature_vector"],
        token_shifts=scan_result["token_shifts"],
        tokens=scan_result["tokens"],
    )

    # Build response
    scan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Store in database
    db_record = ScanResultDB(
        id=scan_id,
        prompt=prompt,
        classification=detection["classification"],
        confidence=detection["confidence"],
        token_shifts_json=json.dumps(scan_result["token_shifts"]),
        layer_shifts_json=json.dumps(scan_result["layer_shifts"]),
        tokens_json=json.dumps(scan_result["tokens"]),
        culprit_layer_idx=scan_result["culprit_layer_idx"],
        started_layer_idx=scan_result["started_layer_idx"],
        layer_stats_json=json.dumps(scan_result["layer_stats"]),
        kl_divergence=scan_result["kl_divergence"],
        logit_difference=scan_result["logit_difference"],
        token_flip_rate=scan_result["token_flip_rate"],
        contribution=scan_result["contribution"],
        timestamp=now,
    )
    session.add(db_record)
    await session.commit()

    return ScanResponse(
        id=scan_id,
        prompt=prompt,
        classification=detection["classification"],
        confidence=detection["confidence"],
        tokens=scan_result["tokens"],
        token_shifts=scan_result["token_shifts"],
        layer_shifts=scan_result["layer_shifts"],
        culprit_layer_idx=scan_result["culprit_layer_idx"],
        started_layer_idx=scan_result["started_layer_idx"],
        layer_stats=scan_result["layer_stats"],
        kl_divergence=scan_result["kl_divergence"],
        logit_difference=scan_result["logit_difference"],
        token_flip_rate=scan_result["token_flip_rate"],
        contribution=scan_result["contribution"],
        timestamp=now.isoformat(),
    )


@router.get("/result/{scan_id}", response_model=ScanResponse)
async def get_result(scan_id: str, session: AsyncSession = Depends(get_session)):
    """Retrieve a scan result by ID."""
    result = await session.get(ScanResultDB, scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found.")

    return ScanResponse(
        id=result.id,
        prompt=result.prompt,
        classification=result.classification,
        confidence=result.confidence,
        tokens=result.tokens,
        token_shifts=result.token_shifts,
        layer_shifts=result.layer_shifts,
        culprit_layer_idx=result.culprit_layer_idx,
        started_layer_idx=result.started_layer_idx,
        layer_stats=result.layer_stats,
        kl_divergence=result.kl_divergence,
        logit_difference=result.logit_difference,
        token_flip_rate=result.token_flip_rate,
        contribution=result.contribution,
        timestamp=result.timestamp.isoformat() if result.timestamp else "",
    )


@router.get("/history", response_model=HistoryResponse)
async def get_history(session: AsyncSession = Depends(get_session)):
    """Retrieve scan history, newest first."""
    stmt = select(ScanResultDB).order_by(ScanResultDB.timestamp.desc()).limit(50)
    results = await session.execute(stmt)
    scans = results.scalars().all()

    items = [
        HistoryItem(
            id=s.id,
            prompt=s.prompt[:100],
            classification=s.classification,
            confidence=s.confidence,
            timestamp=s.timestamp.isoformat() if s.timestamp else "",
        )
        for s in scans
    ]

    return HistoryResponse(scans=items)


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Run a step-by-step token generation."""
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    steps = scanner.generate_tokens(
        prompt=prompt,
        temperature=request.temperature,
        top_k=request.top_k,
        max_tokens=request.max_tokens,
        sample=request.sample
    )

    return GenerateResponse(steps=steps)

@router.get("/models")
async def get_models():
    """Returns available models and the currently loaded model."""
    return {"models": AVAILABLE_MODELS, "current_model": scanner.model_name}

@router.post("/set_model")
async def set_model(request: SetModelRequest):
    """Switch the loaded model to a new one."""
    valid_ids = [m["id"] for m in AVAILABLE_MODELS]
    if request.model_name not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Invalid model selected. Allowed: {valid_ids}")
    
    scanner.set_model(request.model_name)
    return {"status": "success", "model_name": request.model_name}
