import os
import sys
import asyncio
from backend.detector import FakeReviewDetector, ensure_nltk_resources
from backend.dataset import generate_dataset

# Add workspace to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_nlp_preprocessing():
    print("Running: test_nlp_preprocessing...")
    detector = FakeReviewDetector()
    
    test_text = "This is a clean, sturdy coffee maker! It makes excellent coffee, but it is pricey."
    tokens, clean_tokens, stopword_count = detector.preprocess(test_text)
    
    # Assertions
    assert len(tokens) > 0, "Tokens should not be empty."
    assert "coffee" in clean_tokens, "Clean tokens should contain key terms."
    assert "this" not in clean_tokens, "Clean tokens should have stopwords removed."
    assert stopword_count > 0, "Should count stopwords."
    print("[PASS] test_nlp_preprocessing passed!")

def test_custom_heuristics():
    print("Running: test_custom_heuristics...")
    detector = FakeReviewDetector()
    
    # 1. Test Shouting
    shouting_text = "BEST COFFEE MAKER EVER BUY NOW"
    feats_shout = detector.extract_custom_features(shouting_text)
    assert feats_shout["shouting"] > 0.8, f"Shouting ratio should be close to 1.0, got {feats_shout['shouting']}"
    
    # 2. Test Repetitiveness
    repetitive_text = "Buy it now! Buy it now! Buy it now!"
    feats_rep = detector.extract_custom_features(repetitive_text)
    assert feats_rep["repetitiveness"] > 0.5, f"Repetitiveness should be high, got {feats_rep['repetitiveness']}"
    
    # 3. Test Exclamations
    excl_text = "Wow!!! Awesome!!!"
    feats_excl = detector.extract_custom_features(excl_text)
    assert feats_excl["exclamation_ratio"] > 0.4, f"Exclamation ratio should be high, got {feats_excl['exclamation_ratio']}"
    
    # 4. Test Sentiment Polarity
    pos_text = "Outstanding service and exceptional quality. Exceeded expectations."
    feats_pos = detector.extract_custom_features(pos_text)
    assert feats_pos["sentiment_polarity"] > 0.3, f"Sentiment should be positive, got {feats_pos['sentiment_polarity']}"
    
    neg_text = "Worst product ever. Absolute garbage and a scam."
    feats_neg = detector.extract_custom_features(neg_text)
    assert feats_neg["sentiment_polarity"] < -0.3, f"Sentiment should be negative, got {feats_neg['sentiment_polarity']}"
    
    print("[PASS] test_custom_heuristics passed!")

def test_model_training_and_prediction():
    print("Running: test_model_training_and_prediction...")
    
    # Generate a tiny training set for tests
    train_df = generate_dataset(num_samples=40)
    
    detector = FakeReviewDetector(model_path="test_model.joblib")
    detector.train(train_df["review_text"], train_df["label"])
    
    # Load and verify
    loaded_detector = FakeReviewDetector(model_path="test_model.joblib")
    assert loaded_detector.load() == True, "Should load trained test model."
    
    # Test Prediction on standard genuine text
    gen_text = "I bought this vacuum last week. It has decent suction for dust, but is slightly loud."
    pred_gen = loaded_detector.predict(gen_text)
    assert pred_gen["label"] == 0, f"Detailed, balanced text should be labeled Genuine (0), got {pred_gen['label']}"
    assert "evidence" in pred_gen, "Prediction results should contain evidence details."
    
    # Test Prediction on obvious fake text
    fake_text = "WOW! AMAZING PRODUCT! BEST VACUUM EVER!!! BUY THIS NOW!!! MUST BUY!!!"
    pred_fake = loaded_detector.predict(fake_text)
    assert pred_fake["label"] == 1, f"Repetitive, shouting text should be labeled Fake (1), got {pred_fake['label']}"
    
    # Cleanup test model
    if os.path.exists("test_model.joblib"):
        os.remove("test_model.joblib")
        
    print("[PASS] test_model_training_and_prediction passed!")

async def test_fastapi_endpoints():
    print("Running: test_fastapi_endpoints...")
    
    # Import main after pip packages are verified
    from backend import main
    from backend.main import ReviewInput
    
    # 1. Test /api/analyze endpoint handler directly
    test_review = ReviewInput(text="This vacuum is okay. It works fine but the cord is a bit short.")
    response_data = await main.analyze_review(test_review)
    
    assert "label" in response_data, "Response should contain label."
    assert "confidence" in response_data, "Response should contain confidence."
    assert "custom_features" in response_data, "Response should contain custom_features."
    
    # 2. Test /api/stats endpoint handler
    stats_data = await main.get_stats()
    assert "model_stats" in stats_data, "Response should contain model_stats."
    assert "dataset_stats" in stats_data, "Response should contain dataset_stats."
    assert stats_data["dataset_stats"]["total_records"] > 0, "Dataset records count should be > 0."
    
    print("[PASS] test_fastapi_endpoints passed!")

def main():
    print("=== STARTING FAKE REVIEW DETECTOR TESTS ===")
    ensure_nltk_resources()
    
    test_nlp_preprocessing()
    test_custom_heuristics()
    test_model_training_and_prediction()
    
    # Run async endpoint tests
    asyncio.run(test_fastapi_endpoints())
    
    print("=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
