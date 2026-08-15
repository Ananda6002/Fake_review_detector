import os
import re
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Set up self-contained NLTK download directory
import nltk
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
NLTK_DATA_DIR = os.path.join(BACKEND_DIR, "nltk_data")
os.makedirs(NLTK_DATA_DIR, exist_ok=True)
if NLTK_DATA_DIR not in nltk.data.path:
    nltk.data.path.append(NLTK_DATA_DIR)

# Fallback lists in case NLTK data downloads fail
FALLBACK_STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself",
    "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself",
    "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because",
    "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in",
    "out", "on", "off", "over", "under", "again", "further", "then", "once"
}

FALLBACK_POS_WORDS = {
    "amazing", "excellent", "best", "love", "perfect", "high quality", "awesome", "clean",
    "comfortable", "friendly", "cozy", "warm", "sturdy", "tactile", "great", "good", "wonderful",
    "delicious", "fresh", "satisfy", "satisfied", "outstanding", "exceptional"
}

FALLBACK_NEG_WORDS = {
    "worst", "garbage", "waste", "scam", "terrible", "disgusting", "awful", "avoid", "hate",
    "broke", "useless", "criminal", "bad", "dirty", "slow", "loud", "overpriced", "disappointing",
    "subpar", "ruin", "ruined", "refuse", "refused"
}

def ensure_nltk_resources():
    """
    Downloads NLTK resources silently, catching network issues and logging status.
    """
    resources = ["punkt", "stopwords", "vader_lexicon"]
    for resource in resources:
        try:
            nltk.download(resource, download_dir=NLTK_DATA_DIR, quiet=True)
        except Exception as e:
            print(f"NLTK download failed for {resource}: {e}. Local fallback will be used.")

# Initialize NLTK resources
ensure_nltk_resources()

# Setup tokenizer, stopwords, and VADER sentiment analyzer with fallbacks
try:
    from nltk.tokenize import word_tokenize
    # Test tokenizer
    word_tokenize("test sentence")
    HAS_NLTK_TOKENIZER = True
except Exception:
    HAS_NLTK_TOKENIZER = False

try:
    from nltk.corpus import stopwords
    STOPWORDS_SET = set(stopwords.words("english"))
except Exception:
    STOPWORDS_SET = FALLBACK_STOPWORDS

try:
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    VADER_SIA = SentimentIntensityAnalyzer()
    HAS_VADER = True
except Exception:
    HAS_VADER = False
    VADER_SIA = None


class FakeReviewDetector:
    def __init__(self, model_path=None):
        if model_path is None:
            self.model_path = os.path.join(BACKEND_DIR, "model.joblib")
        else:
            self.model_path = model_path
            
        self.vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
        self.classifier = LogisticRegression(max_iter=1000, random_state=42)
        self.is_trained = False

    def tokenize(self, text):
        """
        Tokenizes the input text. Uses NLTK if available, otherwise falls back to a regex word finder.
        """
        if HAS_NLTK_TOKENIZER:
            try:
                return word_tokenize(text)
            except Exception:
                pass
        # Fallback
        return re.findall(r"\b\w+(?:'\w+)?\b", text)

    def preprocess(self, text):
        """
        Processes text to return:
        1. All tokens (with punctuation)
        2. Clean tokens (lowercase, alphanumeric, stopwords removed)
        3. Removed stopwords count
        """
        tokens = self.tokenize(text)
        clean_tokens = []
        stopword_count = 0
        
        for t in tokens:
            t_lower = t.lower()
            if t_lower in STOPWORDS_SET:
                stopword_count += 1
            elif t.isalnum():
                clean_tokens.append(t_lower)
                
        return tokens, clean_tokens, stopword_count

    def calculate_sentiment(self, text):
        """
        Calculates sentiment polarity in [-1.0, 1.0].
        Uses NLTK VADER if available, otherwise falls back to simple lexicon count.
        """
        if HAS_VADER:
            try:
                scores = VADER_SIA.polarity_scores(text)
                return scores["compound"]
            except Exception:
                pass
                
        # Fallback lexicon-based analyzer
        tokens = re.findall(r"\b\w+\b", text.lower())
        pos_count = sum(1 for w in tokens if w in FALLBACK_POS_WORDS)
        neg_count = sum(1 for w in tokens if w in FALLBACK_NEG_WORDS)
        total = pos_count + neg_count
        if total == 0:
            return 0.0
        return (pos_count - neg_count) / total

    def extract_custom_features(self, text):
        """
        Extracts custom heuristics from review text.
        Returns:
            - repetitiveness_index (0.0 to 1.0)
            - shouting_ratio (0.0 to 1.0)
            - exclamation_ratio (0.0 to 1.0)
            - sentiment_polarity (-1.0 to 1.0)
            - sentiment_extremity (0.0 to 1.0)
        """
        tokens = self.tokenize(text)
        alpha_tokens = [t.lower() for t in tokens if t.isalnum()]
        
        # 1. Repetitiveness Index
        if len(alpha_tokens) > 0:
            unique_count = len(set(alpha_tokens))
            repetitiveness = (len(alpha_tokens) - unique_count) / len(alpha_tokens)
        else:
            repetitiveness = 0.0
            
        # 2. Shouting (uppercase ratio of letters)
        letters = re.sub(r"[^a-zA-Z]", "", text)
        if len(letters) > 0:
            shouting = sum(1 for c in letters if c.isupper()) / len(letters)
        else:
            shouting = 0.0
            
        # 3. Exclamation mark ratio
        exclamations = text.count("!")
        if len(tokens) > 0:
            exclamation_ratio = exclamations / len(tokens)
        else:
            exclamation_ratio = 0.0
            
        # 4. Sentiment Polarity and Extremity
        sentiment = self.calculate_sentiment(text)
        sentiment_extremity = abs(sentiment)
        
        return {
            "repetitiveness": repetitiveness,
            "shouting": shouting,
            "exclamation_ratio": exclamation_ratio,
            "sentiment_polarity": sentiment,
            "sentiment_extremity": sentiment_extremity
        }

    def _prepare_feature_matrix(self, X_text, is_training=False):
        """
        Combines TF-IDF sparse matrix with the custom features matrix.
        """
        # TF-IDF Features
        if is_training:
            tfidf_matrix = self.vectorizer.fit_transform(X_text)
        else:
            tfidf_matrix = self.vectorizer.transform(X_text)

        # Custom Features Matrix
        custom_feats_list = []
        for text in X_text:
            feats = self.extract_custom_features(text)
            custom_feats_list.append([
                feats["repetitiveness"],
                feats["shouting"],
                feats["exclamation_ratio"],
                feats["sentiment_polarity"],
                feats["sentiment_extremity"]
            ])
        
        custom_matrix = csr_matrix(custom_feats_list)
        
        # Horizontally stack sparse matrices
        combined = hstack([tfidf_matrix, custom_matrix])
        return combined

    def train(self, X_text, y):
        """
        Trains the TF-IDF vectorizer and LogisticRegression classifier on the reviews.
        """
        print("Training model...")
        X_combined = self._prepare_feature_matrix(X_text, is_training=True)
        self.classifier.fit(X_combined, y)
        self.is_trained = True
        self.save()

    def predict(self, text):
        """
        Predicts label and probability for a single review.
        Returns:
            - label (0 = Genuine, 1 = Fake)
            - confidence (0.0 to 1.0)
            - features (extracted metrics)
        """
        if not self.is_trained:
            raise ValueError("Model is not trained yet. Call train() or load() first.")

        # Preprocess and extract custom features
        tokens, clean_tokens, stopword_count = self.preprocess(text)
        custom_features = self.extract_custom_features(text)
        
        # Prepare combined features
        X_combined = self._prepare_feature_matrix([text], is_training=False)
        
        # Predict
        pred_label = int(self.classifier.predict(X_combined)[0])
        pred_proba = self.classifier.predict_proba(X_combined)[0]
        confidence = float(pred_proba[pred_label])

        # Extract features influencing prediction
        evidence = self._get_prediction_evidence(text, pred_label)
        
        # Determine which words in the token list were flagged as stopwords
        stopwords_found = [t.lower() for t in tokens if t.lower() in STOPWORDS_SET]

        return {
            "label": pred_label,
            "confidence": confidence,
            "text_length": len(text),
            "word_count": len(tokens),
            "clean_word_count": len(clean_tokens),
            "stopwords_count": stopword_count,
            "custom_features": custom_features,
            "evidence": evidence,
            "tokens": tokens,
            "clean_tokens": clean_tokens,
            "stopwords_list": stopwords_found
        }

    def _get_prediction_evidence(self, text, target_label):
        """
        Analyzes which words/features in this review drove the prediction.
        """
        tokens = self.tokenize(text.lower())
        words_found = []
        
        # Vectorizer vocabulary mapping
        vocab = self.vectorizer.vocabulary_
        coefficients = self.classifier.coef_[0]
        
        # Custom features list and coefficients
        # custom order: repetitiveness, shouting, exclamation_ratio, sentiment_polarity, sentiment_extremity
        num_vocab_features = len(vocab)
        custom_coeff_names = ["repetitiveness", "shouting", "exclamation_ratio", "sentiment_polarity", "sentiment_extremity"]
        custom_coefficients = coefficients[num_vocab_features:]

        # Check vocab words in this text
        for word in set(tokens):
            if word in vocab:
                idx = vocab[word]
                weight = float(coefficients[idx])
                # If target is FAKE (1), positive weights support it. If target is GENUINE (0), negative weights support it.
                words_found.append({
                    "word": word,
                    "weight": weight,
                    "influence": "fake" if weight > 0 else "genuine"
                })

        # Check custom features influence
        custom_features = self.extract_custom_features(text)
        custom_influences = []
        for i, name in enumerate(custom_coeff_names):
            weight = float(custom_coefficients[i])
            val = custom_features[name]
            # Contribution is weight * val
            custom_influences.append({
                "feature": name,
                "value": val,
                "weight": weight,
                "influence": "fake" if weight > 0 else "genuine"
            })
            
        # Sort words by absolute weight
        words_found = sorted(words_found, key=lambda x: abs(x["weight"]), reverse=True)
        return {
            "top_words": words_found[:5],
            "custom_features": custom_influences
        }

    def get_model_stats(self):
        """
        Returns model performance details and overall coefficients.
        """
        if not self.is_trained:
            return {"is_trained": False}

        vocab = self.vectorizer.vocabulary_
        coefficients = self.classifier.coef_[0]
        
        # Reverse vocab dict
        idx_to_word = {v: k for k, v in vocab.items()}
        
        # Pair words with coefficients
        word_weights = []
        for idx in range(len(vocab)):
            word = idx_to_word[idx]
            weight = float(coefficients[idx])
            word_weights.append((word, weight))

        # Sort weights
        word_weights = sorted(word_weights, key=lambda x: x[1])
        top_genuine_words = [{"word": w, "weight": coeff} for w, coeff in word_weights[:15]]
        top_fake_words = [{"word": w, "weight": coeff} for w, coeff in word_weights[-15:][::-1]]

        # Custom features coefficients
        num_vocab_features = len(vocab)
        custom_coeff_names = ["repetitiveness", "shouting", "exclamation_ratio", "sentiment_polarity", "sentiment_extremity"]
        custom_weights = {}
        for i, name in enumerate(custom_coeff_names):
            custom_weights[name] = float(coefficients[num_vocab_features + i])

        return {
            "is_trained": True,
            "vocab_size": len(vocab),
            "top_fake_words": top_fake_words,
            "top_genuine_words": top_genuine_words,
            "custom_features_weights": custom_weights
        }

    def save(self):
        """
        Saves the trained vectorizer and classifier to disk.
        """
        data = {
            "vectorizer": self.vectorizer,
            "classifier": self.classifier,
            "is_trained": self.is_trained
        }
        joblib.dump(data, self.model_path)
        print(f"Model saved to {self.model_path}")

    def load(self):
        """
        Loads the trained vectorizer and classifier from disk.
        """
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.vectorizer = data["vectorizer"]
            self.classifier = data["classifier"]
            self.is_trained = data["is_trained"]
            print(f"Model loaded from {self.model_path}")
            return True
        else:
            print(f"Model file not found at {self.model_path}")
            return False


if __name__ == "__main__":
    # Test initialization
    detector = FakeReviewDetector()
    print("Detector initialized successfully.")
