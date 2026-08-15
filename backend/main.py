import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from backend.detector import FakeReviewDetector
from backend.dataset import generate_dataset

# Initialize FastAPI app
app = FastAPI(
    title="Fake Review Detector API",
    description="API for detecting genuine vs fake reviews using Scikit-learn and NLP techniques."
)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths configuration
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BACKEND_DIR, "reviews_dataset.csv")
FRONTEND_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "frontend")

# Initialize our detector
detector = FakeReviewDetector()

class ReviewInput(BaseModel):
    text: str = Field(..., min_length=5, description="The text of the product review to analyze")

def ensure_model_trained():
    """
    Ensures that a trained model is loaded. If no model file exists,
    generates a training dataset and fits a new model.
    """
    if detector.load():
        print("Existing ML model loaded successfully.")
        return

    print("No trained model found. Preparing dataset to train a new model...")
    # Generate dataset if not present
    if not os.path.exists(DATASET_PATH):
        print(f"Generating synthetic dataset at {DATASET_PATH}...")
        generate_dataset(num_samples=2000, output_path=DATASET_PATH)

    # Train model
    try:
        df = pd.read_csv(DATASET_PATH)
        detector.train(df["review_text"].astype(str), df["label"].astype(int))
        print("ML model trained and saved successfully.")
    except Exception as e:
        print(f"Failed to train model on startup: {e}")

@app.on_event("startup")
async def startup_event():
    ensure_model_trained()

@app.post("/api/analyze")
async def analyze_review(input_data: ReviewInput):
    """
    Analyzes a product review and returns fake/genuine classification, confidence,
    extracted text features (preprocessed tokens, stopwords, exclamations, sentiment details),
    and feature influences.
    """
    if not detector.is_trained:
        # Try to train inline if model wasn't loaded/trained on startup
        ensure_model_trained()
        if not detector.is_trained:
            raise HTTPException(status_code=503, detail="Detector model is not trained or loaded.")
            
    try:
        result = detector.predict(input_data.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    """
    Returns model training statistics, dataset metrics, and top predictive features.
    """
    if not detector.is_trained:
        ensure_model_trained()
        
    model_stats = detector.get_model_stats()
    
    # Dataset statistics
    dataset_stats = {
        "total_records": 0,
        "fake_records": 0,
        "genuine_records": 0,
        "loaded_from_disk": False
    }
    
    if os.path.exists(DATASET_PATH):
        try:
            df = pd.read_csv(DATASET_PATH)
            dataset_stats["total_records"] = len(df)
            dataset_stats["fake_records"] = int(df["label"].sum())
            dataset_stats["genuine_records"] = len(df) - dataset_stats["fake_records"]
            dataset_stats["loaded_from_disk"] = True
        except Exception:
            pass

    return {
        "model_stats": model_stats,
        "dataset_stats": dataset_stats
    }

@app.post("/api/train")
async def retrain_model():
    """
    Forces retraining of the model by regenerating the synthetic dataset
    and rebuilding the vectorizer and classifier.
    """
    try:
        print("Regenerating training dataset...")
        generate_dataset(num_samples=2000, output_path=DATASET_PATH)
        
        df = pd.read_csv(DATASET_PATH)
        detector.train(df["review_text"].astype(str), df["label"].astype(int))
        
        model_stats = detector.get_model_stats()
        return {
            "status": "success",
            "message": "Model retrained successfully with a new augmented dataset.",
            "stats": model_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

# Mount static frontend files
# This must be mounted at the end so it doesn't intercept API routes
if not os.path.exists(FRONTEND_DIR):
    os.makedirs(FRONTEND_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
