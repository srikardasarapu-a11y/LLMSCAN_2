"""
Detector Module
Small MLP classifier that takes a causal feature vector
and predicts SAFE or UNSAFE with a confidence score.

This is a heuristic placeholder that can be replaced with a trained model.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class DetectorMLP(nn.Module):
    """
    Multi-layer perceptron for binary classification of prompts.
    Input: Causal feature vector (token_shifts + layer_shifts).
    Output: Probability of being UNSAFE.
    """

    def __init__(self, input_dim: int = 32, hidden_dim: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class CausalDetector:
    """
    Wraps the detector MLP and provides predict() functionality.
    Uses heuristic-based analysis as a fallback when no trained model is available.
    """

    UNSAFE_KEYWORDS = [
        "hack", "steal", "attack", "exploit", "bypass", "crack",
        "malware", "virus", "phishing", "trojan", "ransomware",
        "bomb", "weapon", "kill", "murder", "poison", "drug",
        "illegal", "fraud", "scam", "launder", "counterfeit",
        "password", "inject", "ddos", "brute", "vulnerability",
        "terroris", "kidnap", "assault", "abuse", "harm",
        "suicide", "self-harm", "torture", "trafficking",
    ]

    def __init__(self):
        self.model = None
        self.trained = False

    def load_model(self, path: str = None):
        """Load a trained model from disk, if available."""
        if path:
            try:
                checkpoint = torch.load(path, map_location="cpu")
                input_dim = checkpoint.get("input_dim", 32)
                self.model = DetectorMLP(input_dim=input_dim)
                self.model.load_state_dict(checkpoint["model_state_dict"])
                self.model.eval()
                self.trained = True
                logger.info("Loaded trained detector model.")
            except Exception as e:
                logger.warning(f"Could not load trained model: {e}. Using heuristic.")
                self.trained = False

    def predict(
        self, prompt: str, causal_feature_vector: list, token_shifts: list, tokens: list
    ) -> Dict:
        """
        Predict whether a prompt is SAFE or UNSAFE.
        
        Uses a combination of:
        1. Heuristic keyword analysis
        2. Causal feature vector statistics
        3. Token shift patterns
        """
        if self.trained and self.model is not None:
            return self._predict_with_model(causal_feature_vector)
        else:
            return self._predict_heuristic(prompt, causal_feature_vector, token_shifts, tokens)

    def _predict_with_model(self, causal_feature_vector: list) -> Dict:
        """Use the trained MLP for prediction."""
        x = torch.tensor(causal_feature_vector, dtype=torch.float32).unsqueeze(0)

        # Pad or truncate to expected input dim
        if x.shape[1] < self.model.net[0].in_features:
            padding = torch.zeros(1, self.model.net[0].in_features - x.shape[1])
            x = torch.cat([x, padding], dim=1)
        elif x.shape[1] > self.model.net[0].in_features:
            x = x[:, : self.model.net[0].in_features]

        with torch.no_grad():
            prob = self.model(x).item()

        classification = "UNSAFE" if prob > 0.5 else "SAFE"
        confidence = prob if classification == "UNSAFE" else 1 - prob

        return {
            "classification": classification,
            "confidence": round(confidence, 4),
        }

    def _predict_heuristic(
        self, prompt: str, causal_feature_vector: list, token_shifts: list, tokens: list
    ) -> Dict:
        """
        Heuristic prediction based on keyword matching, causal patterns,
        and token shift statistics.
        """
        prompt_lower = prompt.lower()

        # Score 1: Keyword match score (0-1)
        keyword_hits = sum(1 for kw in self.UNSAFE_KEYWORDS if kw in prompt_lower)
        keyword_score = min(keyword_hits / 3.0, 1.0)

        # Score 2: High-shift token ratio (tokens with >0.7 normalized shift)
        if token_shifts:
            high_shift_ratio = sum(1 for s in token_shifts if s > 0.7) / len(token_shifts)
        else:
            high_shift_ratio = 0.0

        # Score 3: Feature vector variance (higher variance → more suspicious)
        if causal_feature_vector:
            fv = np.array(causal_feature_vector)
            variance_score = min(float(np.std(fv)) * 2, 1.0)
        else:
            variance_score = 0.0

        # Score 4: Max token influence (very high influence on a single token is suspicious)
        max_influence = max(token_shifts) if token_shifts else 0.0

        # Weighted combination
        combined_score = (
            keyword_score * 0.50
            + high_shift_ratio * 0.15
            + variance_score * 0.15
            + max_influence * 0.20
        )

        # Add some noise for realism
        combined_score = np.clip(combined_score + np.random.uniform(-0.03, 0.03), 0.0, 1.0)

        classification = "UNSAFE" if combined_score > 0.45 else "SAFE"
        confidence = combined_score if classification == "UNSAFE" else 1 - combined_score

        return {
            "classification": classification,
            "confidence": round(float(confidence), 4),
        }


# Singleton instance
detector = CausalDetector()
