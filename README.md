# Fake Review Detector – AI-Based NLP Classification System

This project is an AI-powered system designed to classify product reviews as **genuine** or **fake/suspicious** by combining machine learning text classification with custom natural language processing (NLP) heuristics. It features a premium, responsive glassmorphism web dashboard displaying classification confidence, preprocessing states, and highlighted predictive indicators.

---

## 🛠️ Technologies
- **Backend & AI**: Python, FastAPI, Scikit-learn, NLTK, Pandas, NumPy, Joblib
- **Frontend**: HTML5, Vanilla CSS3 (Custom Dark Theme & Backdrop Filters), Vanilla ES6 JavaScript
- **Testing**: Python Asyncio, Pytest-style assertions

---

## 🌟 Key Features
- **AI-Powered Review Classification**: Uses a Logistic Regression model trained on structured TF-IDF vectors to classify reviews.
- **NLP Text Preprocessing**: Cleans input reviews using tokenization, stop-word removal, and text normalization.
- **Custom Heuristic Signals**:
  - **Repetitiveness Index**: Highlights duplicate vocabulary/repetitive phrases.
  - **Shouting Factor**: Identifies capitalization ratios commonly associated with spam.
  - **Exclamation Density**: Flags excessive punctuation typical of inflated reviews.
  - **Sentiment Extremity**: Integrates polarity scores to identify overly hyperbolic positive/negative review behaviors.
- **Feature Contribution Highlighter**: Color-codes individual words in the review based on their mathematical influence on the classification decision (Red for Fake, Green for Genuine).
- **Collapsible Developer Console**: Allows developers to lazy-load top model coefficients, inspect dataset size, and retrain the model with fresh augmented data.

---

## 📂 Project Structure
```
Fake_review/
│
├── backend/
│   ├── nltk_data/           # Cached NLTK models (punkt, vader, stopwords)
│   ├── dataset.py           # Programmatic review dataset generator
│   ├── detector.py          # Preprocessor and Scikit-learn classifier pipeline
│   ├── main.py              # FastAPI server and static file router
│   ├── requirements.txt     # Python package requirements
│   └── reviews_dataset.csv  # Generated training dataset (400 records)
│
├── frontend/
│   ├── index.html           # Dashboard structure
│   ├── styles.css           # Custom dark theme styles (glassmorphism)
│   └── app.js               # Client controller (fetch APIs, event handlers)
│
├── run_tests.py             # Preprocessing & API endpoint unit tests
└── README.md                # Project documentation (this file)
```

---

## 🚀 How to Run the Project

### 1. Install Dependencies
Make sure you have Python 3.8+ installed, then run:
```powershell
pip install -r backend/requirements.txt
```

### 2. Run the Web Server
Launch the FastAPI development server:
```powershell
python -m uvicorn backend.main:app --port 8000
```
Once started, open your web browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### 3. Run Verification Tests
Verify the installation by running the test suite:
```powershell
python run_tests.py
```
