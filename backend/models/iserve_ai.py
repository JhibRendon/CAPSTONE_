import argparse
import inspect
import json
import os
import re
import sys

import torch
from transformers import AutoModelForSequenceClassification
from transformers import AutoModelForSeq2SeqLM
from transformers import AutoTokenizer


BASE_DIR = os.path.dirname(__file__)
DEVICE = torch.device("cpu")


MODEL_DIRS = {
    "summarizer": os.path.join(BASE_DIR, "summarizer"),
    "classifier": os.path.join(BASE_DIR, "classifier"),
    "urgency": os.path.join(BASE_DIR, "urgency"),
    "sentiment": os.path.join(BASE_DIR, "sentiment"),
}


FALLBACK_LABELS = {
    "category": {
        "LABEL_0": "Academic Issues",
        "LABEL_1": "Administrative Concerns",
        "LABEL_2": "Facility Problems",
        "LABEL_3": "Financial Matters",
    },
    "urgency": {
        "LABEL_0": "low",
        "LABEL_1": "medium",
        "LABEL_2": "high",
        "LABEL_3": "critical",
    },
    "sentiment": {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive",
    },
}


def load_seq2seq_model(model_dir):
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_dir)
    model.to(DEVICE)
    model.eval()
    return tokenizer, model


def load_classifier_model(model_dir):
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.to(DEVICE)
    model.eval()
    return tokenizer, model


sum_tokenizer, sum_model = load_seq2seq_model(MODEL_DIRS["summarizer"])
cls_tokenizer, cls_model = load_classifier_model(MODEL_DIRS["classifier"])
urg_tokenizer, urg_model = load_classifier_model(MODEL_DIRS["urgency"])
sent_tokenizer, sent_model = load_classifier_model(MODEL_DIRS["sentiment"])


def normalize_label(raw_label, group):
    label = str(raw_label or "").strip()
    if not label:
        return "--"
    return FALLBACK_LABELS.get(group, {}).get(label, label.replace("_", " ").title())


def prepare_inputs(tokenizer, model, text, max_length):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=max_length,
    )
    allowed_keys = set(inspect.signature(model.forward).parameters.keys())
    filtered = {key: value for key, value in inputs.items() if key in allowed_keys}
    return {key: value.to(DEVICE) for key, value in filtered.items()}


def get_description_text(text):
    parts = [part.strip() for part in str(text or "").splitlines() if part.strip()]
    if not parts:
        return ""
    if len(parts) >= 2:
        return parts[1]
    return max(parts, key=len)


def build_fallback_summary(text, max_sentences=2, max_chars=280):
    source = get_description_text(text) or str(text or "").strip()
    if not source:
        return ""

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", source)
        if sentence.strip()
    ]

    if not sentences:
        return source[:max_chars].strip()

    summary_parts = []
    total_length = 0
    for sentence in sentences[:max_sentences]:
        next_length = total_length + len(sentence) + (1 if summary_parts else 0)
        if next_length > max_chars and summary_parts:
            break
        summary_parts.append(sentence)
        total_length = next_length

    summary = " ".join(summary_parts).strip()
    if summary:
        return summary

    return source[:max_chars].strip()


def summarize(text):
    source_text = get_description_text(text) or text
    inputs = prepare_inputs(sum_tokenizer, sum_model, source_text, 1024)
    with torch.inference_mode():
        outputs = sum_model.generate(
            **inputs,
            max_length=142,
            min_length=16,
            num_beams=4,
            no_repeat_ngram_size=3,
            early_stopping=True,
        )
    summary = sum_tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
    return summary or build_fallback_summary(source_text)


def classify_with_confidence(text, tokenizer, model, group):
    inputs = prepare_inputs(tokenizer, model, text, 512)

    with torch.inference_mode():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)[0]

    index = int(torch.argmax(probabilities).item())
    confidence = float(probabilities[index].item())
    raw_label = model.config.id2label.get(index) or model.config.id2label.get(str(index)) or f"LABEL_{index}"

    return {
        "index": index,
        "label": normalize_label(raw_label, group),
        "rawLabel": raw_label,
        "confidence": round(confidence, 4),
    }


def analyze(text):
    clean_text = str(text or "").strip()
    if not clean_text:
        raise ValueError("Text is required for AI analysis")

    summary = summarize(clean_text) or clean_text

    return {
        "summary": summary,
        "category": classify_with_confidence(summary, cls_tokenizer, cls_model, "category"),
        "urgency": classify_with_confidence(summary, urg_tokenizer, urg_model, "urgency"),
        "sentiment": classify_with_confidence(summary, sent_tokenizer, sent_model, "sentiment"),
    }


def print_json(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def run_worker():
    print_json({"type": "ready"})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        request_id = None
        try:
            payload = json.loads(line)
            request_id = payload.get("id")
            text = payload.get("text", "")
            result = analyze(text)
            print_json({"id": request_id, "result": result})
        except Exception as error:
            print_json({"id": request_id, "error": str(error)})


def main():
    parser = argparse.ArgumentParser(description="Local AI pipeline for grievance analysis")
    parser.add_argument("--worker", action="store_true", help="Run as a JSON line worker for the Node backend")
    parser.add_argument("--text", type=str, help="Analyze a single piece of text and print JSON output")
    args = parser.parse_args()

    if args.worker:
        run_worker()
        return

    if args.text:
        print_json(analyze(args.text))
        return

    parser.print_help()


if __name__ == "__main__":
    main()
