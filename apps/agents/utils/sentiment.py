"""
Sentiment Analysis Utilities
VADER-based sentiment analysis with text preprocessing
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
from typing import Dict, Any

class SentimentAnalyzer:
    """Sentiment analysis using VADER"""
    
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
    
    def preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for sentiment analysis"""
        if not text:
            return ""
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove special characters but keep punctuation for VADER
        text = re.sub(r'[^\w\s\.\!\?]', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of text
        
        Returns:
            {
                'compound': float,  # -1 to 1
                'positive': float,  # 0 to 1
                'negative': float,  # 0 to 1
                'neutral': float,   # 0 to 1
                'label': str,       # 'positive', 'negative', or 'neutral'
                'score': float      # Same as compound
            }
        """
        # Preprocess text
        clean_text = self.preprocess_text(text)
        
        if not clean_text:
            return {
                'compound': 0.0,
                'positive': 0.0,
                'negative': 0.0,
                'neutral': 1.0,
                'label': 'neutral',
                'score': 0.0
            }
        
        # Get VADER scores
        scores = self.analyzer.polarity_scores(clean_text)
        
        # Determine label based on compound score
        compound = scores['compound']
        if compound >= 0.05:
            label = 'positive'
        elif compound <= -0.05:
            label = 'negative'
        else:
            label = 'neutral'
        
        return {
            'compound': compound,
            'positive': scores['pos'],
            'negative': scores['neg'],
            'neutral': scores['neu'],
            'label': label,
            'score': compound  # Alias for compound
        }
    
    def analyze_batch(self, texts: list) -> list:
        """Analyze sentiment for multiple texts"""
        return [self.analyze(text) for text in texts]
    
    def get_aggregated_sentiment(self, texts: list) -> Dict[str, Any]:
        """Get aggregated sentiment from multiple texts"""
        if not texts:
            return {
                'compound': 0.0,
                'positive': 0.0,
                'negative': 0.0,
                'neutral': 1.0,
                'label': 'neutral',
                'score': 0.0,
                'count': 0
            }
        
        results = self.analyze_batch(texts)
        
        # Calculate averages
        avg_compound = sum(r['compound'] for r in results) / len(results)
        avg_positive = sum(r['positive'] for r in results) / len(results)
        avg_negative = sum(r['negative'] for r in results) / len(results)
        avg_neutral = sum(r['neutral'] for r in results) / len(results)
        
        # Determine overall label
        if avg_compound >= 0.05:
            label = 'positive'
        elif avg_compound <= -0.05:
            label = 'negative'
        else:
            label = 'neutral'
        
        return {
            'compound': avg_compound,
            'positive': avg_positive,
            'negative': avg_negative,
            'neutral': avg_neutral,
            'label': label,
            'score': avg_compound,
            'count': len(texts)
        }
