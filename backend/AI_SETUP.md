# AI Pipeline Setup

The grievance AI pipeline in [`iserve_ai.py`](/c:/Users/Harvey/CAPSTONE/backend/iserve_ai.py) expects local model files and a Python environment with the required ML packages.

## Required local model directories

These directories are intentionally ignored by Git because the model weight files are too large for normal GitHub pushes:

- `backend/models/academic_classifier/`
- `backend/models/urgency_model/`
- `backend/models/sentiment_model/`
- `backend/models/tokenizer/`

Each model directory should contain at least:

- `config.json`
- `model.safetensors`

The tokenizer directory must contain:

- `tokenizer.json`

## Python requirements

Install the Python packages used by the AI worker in the same environment that the backend will use to spawn Python:

```bash
pip install torch transformers tokenizers
```

If `python` is not the correct executable on your machine, set:

```bash
AI_PIPELINE_PYTHON=python
```

to the right interpreter path before starting the Node backend.

## Runtime flow

1. The Node backend starts normally.
2. When a grievance is submitted, Node spawns the Python worker from [`services/aiPipelineClient.js`](/c:/Users/Harvey/CAPSTONE/backend/services/aiPipelineClient.js).
3. The worker loads the local models once and returns:
   - category
   - urgency
   - sentiment

## Verification

You can test the Python pipeline directly with:

```bash
python backend/iserve_ai.py --text "Sample grievance text here"
```
