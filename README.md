# LLMSCAN – Causal Scan for LLM Misbehavior Detection

A modern full-stack web application that detects whether a user prompt could cause unsafe or harmful behavior in a Large Language Model by analyzing causal changes inside the model.

## Architecture

```
User → Frontend (React) → Backend (FastAPI) → Scanner → Detector → Results
```

**Scanner Pipeline:**
1. Tokenize the prompt
2. Forward pass → original logits (L_orig)
3. Token intervention: mask each token → modified logits (L_mod) → compute token logit shift
4. Layer ablation: disable each transformer layer → ablated logits (L_ablated) → compute layer logit shift
5. Combine shifts into a causal feature vector
6. Detector (MLP) classifies as SAFE or UNSAFE with confidence score

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, Vite, TailwindCSS, Chart.js |
| Backend | FastAPI (Python) |
| ML | PyTorch, HuggingFace Transformers (distilgpt2) |
| Database | SQLite (async via aiosqlite) |
| Visualization | Chart.js (bar chart), Custom CSS heatmap |

## Project Structure

```
LLMSCAN_2/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── scanner.py         # Causal intervention scanner
│   ├── detector.py        # MLP classifier
│   ├── database.py        # SQLite setup
│   ├── models.py          # Pydantic schemas
│   ├── requirements.txt
│   └── routers/
│       └── scan.py        # API endpoints
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       └── components/
│           ├── PromptInput.jsx
│           ├── ResultsDashboard.jsx
│           ├── TokenHeatmap.jsx
│           ├── LayerBarChart.jsx
│           └── ScanHistory.jsx
└── README.md
```

## Setup & Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **Note:** On the first scan, the model (~250 MB) will be downloaded from HuggingFace. Subsequent runs use the cached model.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Open the Application

Navigate to **http://localhost:5173** in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan` | Submit a prompt for causal analysis |
| GET | `/result/{id}` | Retrieve a specific scan result |
| GET | `/history` | List previous scan results |

### Example Request

```bash
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How can I hack someone email?"}'
```

### Example Response

```json
{
  "id": "a1b2c3d4-...",
  "prompt": "How can I hack someone email?",
  "classification": "UNSAFE",
  "confidence": 0.93,
  "tokens": ["How", "Ġcan", "ĠI", "Ġhack", "Ġsomeone", "Ġemail", "?"],
  "token_shifts": [0.12, 0.34, 0.08, 0.95, 0.67, 0.78, 0.15],
  "layer_shifts": [0.45, 0.67, 0.89, 0.23, 0.56, 0.12],
  "timestamp": "2026-03-05T12:00:00Z"
}
```

## Modularity

The system is designed to be modular:
- **Scanner** (`scanner.py`): Swap `distilgpt2` for any HuggingFace causal LM model
- **Detector** (`detector.py`): Replace the heuristic with a trained MLP by saving a model checkpoint and loading it
- **Database**: Switch from SQLite to PostgreSQL by changing the connection string

## License

MIT
