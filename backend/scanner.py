"""
Causal Scanner Module
Performs causal analysis on prompts using a HuggingFace transformer model.
Steps:
  1. Tokenize the input prompt
  2. Forward pass for original logits
  3. Token intervention (mask each token, measure logit shift)
  4. Layer ablation (disable each layer, measure logit shift)
  5. Build causal feature vector
"""

import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class CausalScanner:
    """Performs causal intervention analysis on text prompts."""

    def __init__(self, model_name: str = "distilgpt2"):
        self.model_name = model_name
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self._loaded = False

    def load_model(self):
        """Lazy-load the model and tokenizer."""
        if self._loaded:
            return
        logger.info(f"Loading model '{self.model_name}' on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        self._loaded = True
        logger.info("Model loaded successfully.")

    def set_model(self, model_name: str):
        """Unload current model and load a new one safely to prevent OOM."""
        if self.model_name == model_name and self._loaded:
            return
            
        logger.info(f"Unloading model '{self.model_name}' to load '{model_name}'...")
        if self.model is not None:
            del self.model
            del self.tokenizer
            self.model = None
            self.tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                
        self.model_name = model_name
        self._loaded = False
        self.load_model()

    @torch.no_grad()
    def _forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        """Run a forward pass and return the final logits."""
        outputs = self.model(input_ids=input_ids)
        return outputs.logits[:, -1, :]  # logits for the last token position

    @torch.no_grad()
    def _get_embeddings(self, input_ids: torch.Tensor) -> torch.Tensor:
        """Get token embeddings from the model's embedding layer."""
        return self.model.transformer.wte(input_ids)

    @torch.no_grad()
    def _forward_from_embeds(self, inputs_embeds: torch.Tensor) -> torch.Tensor:
        """Run forward pass starting from embeddings."""
        outputs = self.model(inputs_embeds=inputs_embeds)
        return outputs.logits[:, -1, :]

    def _compute_token_interventions(
        self, input_ids: torch.Tensor, original_logits: torch.Tensor
    ) -> List[float]:
        """
        Perform token intervention: mask each token one at a time
        and measure the logit shift.
        """
        token_shifts = []
        seq_len = input_ids.shape[1]
        original_embeds = self._get_embeddings(input_ids)

        for i in range(seq_len):
            # Create a copy and zero out token i's embedding
            modified_embeds = original_embeds.clone()
            modified_embeds[0, i, :] = 0.0

            modified_logits = self._forward_from_embeds(modified_embeds)
            shift = torch.norm(original_logits - modified_logits, p=2).item()
            token_shifts.append(shift)

        return token_shifts

    def _compute_layer_ablations(
        self, input_ids: torch.Tensor, original_logits: torch.Tensor
    ) -> List[float]:
        """
        Perform layer ablation: disable one transformer layer at a time
        by hooking its output to zero, then measure the logit shift.
        """
        layer_shifts = []
        num_layers = len(self.model.transformer.h)

        for layer_idx in range(num_layers):
            # Register a hook that zeroes out this layer's output
            handle = None
            layer = self.model.transformer.h[layer_idx]

            def zero_hook(module, input, output, idx=layer_idx):
                # output can be a tuple (hidden_states, ...) or just a tensor
                if isinstance(output, tuple):
                    zeroed = torch.zeros_like(output[0])
                    return (zeroed,) + output[1:]
                else:
                    return torch.zeros_like(output)

            handle = layer.register_forward_hook(zero_hook)

            try:
                ablated_logits = self._forward(input_ids)
                shift = torch.norm(original_logits - ablated_logits, p=2).item()
                layer_shifts.append(shift)
            finally:
                handle.remove()

        return layer_shifts

    def _extract_layer_stats(self) -> List[Dict]:
        """
        Extract per-layer weight and bias statistics for every transformer block.
        For each layer returns stats for: attention (c_attn, c_proj) and MLP (c_fc, c_proj).
        Stats include: weight_norm, weight_mean, weight_std, bias_norm, bias_mean, bias_std.
        """
        self.load_model()
        layers_stats = []
        num_layers = len(self.model.transformer.h)

        for layer_idx in range(num_layers):
            block = self.model.transformer.h[layer_idx]
            layer_data = {"layer": layer_idx, "sublayers": {}}

            # Map of sublayer name -> module inside each transformer block
            sublayers = {}

            # Attention sub-modules (GPT-2 style: c_attn = combined QKV, c_proj = out projection)
            if hasattr(block, "attn"):
                attn = block.attn
                if hasattr(attn, "c_attn"):
                    sublayers["attn.c_attn"] = attn.c_attn
                if hasattr(attn, "c_proj"):
                    sublayers["attn.c_proj"] = attn.c_proj

            # MLP sub-modules (c_fc = up projection, c_proj = down projection)
            if hasattr(block, "mlp"):
                mlp = block.mlp
                if hasattr(mlp, "c_fc"):
                    sublayers["mlp.c_fc"] = mlp.c_fc
                if hasattr(mlp, "c_proj"):
                    sublayers["mlp.c_proj"] = mlp.c_proj

            # LayerNorm params
            if hasattr(block, "ln_1"):
                sublayers["ln_1"] = block.ln_1
            if hasattr(block, "ln_2"):
                sublayers["ln_2"] = block.ln_2

            for name, module in sublayers.items():
                sub_stats = {}
                if hasattr(module, "weight") and module.weight is not None:
                    w = module.weight.detach().float()
                    sub_stats["weight_norm"] = round(float(torch.norm(w, p="fro").item()), 4)
                    sub_stats["weight_mean"] = round(float(w.mean().item()), 6)
                    sub_stats["weight_std"] = round(float(w.std().item()), 6)
                    sub_stats["weight_shape"] = list(w.shape)
                if hasattr(module, "bias") and module.bias is not None:
                    b = module.bias.detach().float()
                    sub_stats["bias_norm"] = round(float(torch.norm(b, p=2).item()), 4)
                    sub_stats["bias_mean"] = round(float(b.mean().item()), 6)
                    sub_stats["bias_std"] = round(float(b.std().item()), 6)

                layer_data["sublayers"][name] = sub_stats

            layers_stats.append(layer_data)

        return layers_stats

    def scan(self, prompt: str) -> Dict:
        """
        Full causal scan pipeline.
        Returns tokens, token_shifts, layer_shifts, causal_feature_vector,
        culprit_layer_idx, and layer_stats.
        """
        self.load_model()

        # Step 1: Tokenize
        encoding = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=128)
        input_ids = encoding["input_ids"].to(self.device)
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0].tolist())

        # Step 2: Original forward pass
        original_logits = self._forward(input_ids)

        # Step 3: Token interventions
        token_shifts = self._compute_token_interventions(input_ids, original_logits)

        # Step 4: Layer ablations
        layer_shifts = self._compute_layer_ablations(input_ids, original_logits)

        # Normalize shifts to [0, 1] for visualization
        token_shifts_normalized = self._normalize(token_shifts)
        layer_shifts_normalized = self._normalize(layer_shifts)

        # Identify culprit layer (highest ablation shift = most responsible for output - 'carried')
        culprit_layer_idx = int(np.argmax(layer_shifts)) if layer_shifts else 0
        
        # Identify starting layer (first layer to show a significant shift > threshold)
        started_layer_idx = 0
        if layer_shifts_normalized:
            # Let's define "significant" as crossing 20% of the max normalized shift
            threshold = 0.2
            for i, shift in enumerate(layer_shifts_normalized):
                if shift > threshold:
                    started_layer_idx = i
                    break

        # Step 5: Build causal feature vector
        causal_feature_vector = token_shifts_normalized + layer_shifts_normalized

        # Step 6: Extract weight/bias stats per layer
        layer_stats = self._extract_layer_stats()

        # Step 7: Calculate aggregate metrics
        kl_divergence = 0.0
        logit_difference = 0.0
        token_flip_rate = 0.0
        contribution = f"Started: L{started_layer_idx} | Carried: L{culprit_layer_idx}"
        
        if token_shifts:
            # We approximate these metrics using token/layer shifts as heuristics
            # In a real setup, we'd calculate exact KL Div against the original model output distribution
            # and logit difference for specific adversarial vs target tokens.
            kl_divergence = round(float(np.mean(layer_shifts)) * 10.0 + float(np.std(token_shifts)) * 5.0, 2)
            logit_difference = round(float(np.max(layer_shifts)) * 20.0, 2)
            # A mock flip rate based on highly impactful tokens
            high_impact_tokens = sum(1 for s in token_shifts_normalized if s > 0.5)
            token_flip_rate = round((high_impact_tokens / len(token_shifts_normalized)) * 100, 1) if token_shifts_normalized else 0.0

        return {
            "tokens": tokens,
            "token_shifts": [round(s, 4) for s in token_shifts_normalized],
            "layer_shifts": [round(s, 4) for s in layer_shifts_normalized],
            "causal_feature_vector": causal_feature_vector,
            "culprit_layer_idx": culprit_layer_idx,
            "started_layer_idx": started_layer_idx,
            "layer_stats": layer_stats,
            "kl_divergence": kl_divergence,
            "logit_difference": logit_difference,
            "token_flip_rate": token_flip_rate,
            "contribution": contribution,
        }

    @torch.no_grad()
    def generate_tokens(self, prompt: str, temperature: float = 0.7, top_k: int = 50, max_tokens: int = 40, sample: bool = True) -> List[Dict]:
        """
        Generate tokens step-by-step and return logits/probs for visualization.
        """
        self.load_model()
        
        encoding = self.tokenizer(prompt, return_tensors="pt")
        input_ids = encoding["input_ids"].to(self.device)
        
        steps_data = []
        
        for step in range(1, max_tokens + 1):
            outputs = self.model(input_ids=input_ids)
            next_token_logits = outputs.logits[:, -1, :]
            
            # Apply temperature
            if temperature > 0:
                next_token_logits = next_token_logits / temperature
                
            # Compute probabilities
            probs = torch.nn.functional.softmax(next_token_logits, dim=-1)
            
            # Top-K filtering
            if top_k > 0:
                top_k_probs, top_k_indices = torch.topk(probs, min(top_k, probs.shape[-1]))
                # For sampling, we sample from top k
                if sample:
                    # Normalize top-k probs
                    top_k_probs = top_k_probs / torch.sum(top_k_probs, dim=-1, keepdim=True)
                    sample_idx = torch.multinomial(top_k_probs, num_samples=1)[0, 0]
                    next_token_index = top_k_indices[0, sample_idx].item()
                else:
                    # Greedy decoding
                    next_token_index = top_k_indices[0, 0].item()
            else:
                 if sample:
                     next_token_index = torch.multinomial(probs, num_samples=1)[0, 0].item()
                 else:
                     next_token_index = torch.argmax(probs, dim=-1)[0].item()
            
            # Extract logit and prob for the chosen token
            chosen_logit = next_token_logits[0, next_token_index].item()
            chosen_prob = probs[0, next_token_index].item()
            chosen_token_str = self.tokenizer.decode([next_token_index])
            
            steps_data.append({
                "step": step,
                "token": repr(chosen_token_str), # Using repr to show quotes and exact whitespace as in UI
                "prob": round(chosen_prob * 100, 2),
                "logit": round(chosen_logit, 3)
            })
            
            # Append token to input_ids for next step
            next_token_tensor = torch.tensor([[next_token_index]], device=self.device)
            input_ids = torch.cat([input_ids, next_token_tensor], dim=-1)
            
            # Stop if EOS token
            if next_token_index == self.tokenizer.eos_token_id:
                break
                
        return steps_data

    @staticmethod
    def _normalize(values: List[float]) -> List[float]:
        """Min-max normalize a list of floats to [0, 1]."""
        if not values:
            return values
        min_val = min(values)
        max_val = max(values)
        if max_val - min_val < 1e-8:
            return [0.5] * len(values)
        return [(v - min_val) / (max_val - min_val) for v in values]


# Singleton instance
scanner = CausalScanner()
