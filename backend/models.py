"""Pydantic models for request/response schemas."""

from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class ScanRequest(BaseModel):
    prompt: str


class ScanResponse(BaseModel):
    id: str
    prompt: str
    classification: str
    confidence: float
    tokens: List[str]
    token_shifts: List[float]
    layer_shifts: List[float]
    culprit_layer_idx: int
    started_layer_idx: int
    layer_stats: List[Dict] = []
    # New Model Metrics
    kl_divergence: float
    logit_difference: float
    token_flip_rate: float
    contribution: str
    timestamp: str


class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    top_k: int = 50
    max_tokens: int = 40
    sample: bool = True


class GenerateStep(BaseModel):
    step: int
    token: str
    prob: float
    logit: float


class GenerateResponse(BaseModel):
    steps: List[GenerateStep]


class SetModelRequest(BaseModel):
    model_name: str


class HistoryItem(BaseModel):
    id: str
    prompt: str
    classification: str
    confidence: float
    timestamp: str


class HistoryResponse(BaseModel):
    scans: List[HistoryItem]
