"""
Technical Indicators Calculation
RSI, MACD, Bollinger Bands, and other indicators
"""

import pandas as pd
import numpy as np
from typing import Dict, Any

class TechnicalIndicators:
    """Calculate technical indicators for stock data"""
    
    @staticmethod
    def calculate_rsi(data: pd.Series, period: int = 14) -> pd.Series:
        """
        Calculate Relative Strength Index (RSI)
        
        Args:
            data: Price series (typically close prices)
            period: RSI period (default 14)
        
        Returns:
            RSI values (0-100)
        """
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def calculate_macd(data: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, pd.Series]:
        """
        Calculate MACD (Moving Average Convergence Divergence)
        
        Args:
            data: Price series
            fast: Fast EMA period
            slow: Slow EMA period
            signal: Signal line period
        
        Returns:
            Dictionary with 'macd', 'signal', and 'histogram'
        """
        ema_fast = data.ewm(span=fast, adjust=False).mean()
        ema_slow = data.ewm(span=slow, adjust=False).mean()
        
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def calculate_bollinger_bands(data: pd.Series, period: int = 20, std_dev: float = 2.0) -> Dict[str, pd.Series]:
        """
        Calculate Bollinger Bands
        
        Args:
            data: Price series
            period: Moving average period
            std_dev: Number of standard deviations
        
        Returns:
            Dictionary with 'upper', 'middle', and 'lower' bands
        """
        middle = data.rolling(window=period).mean()
        std = data.rolling(window=period).std()
        
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return {
            'upper': upper,
            'middle': middle,
            'lower': lower
        }
    
    @staticmethod
    def calculate_sma(data: pd.Series, period: int) -> pd.Series:
        """Calculate Simple Moving Average"""
        return data.rolling(window=period).mean()
    
    @staticmethod
    def calculate_ema(data: pd.Series, period: int) -> pd.Series:
        """Calculate Exponential Moving Average"""
        return data.ewm(span=period, adjust=False).mean()
    
    @staticmethod
    def calculate_volatility(data: pd.Series, period: int = 20) -> pd.Series:
        """Calculate rolling volatility (standard deviation)"""
        returns = data.pct_change()
        return returns.rolling(window=period).std() * np.sqrt(252)  # Annualized
    
    @staticmethod
    def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate all technical indicators for a dataframe
        
        Args:
            df: DataFrame with OHLCV data (must have 'Close' column)
        
        Returns:
            DataFrame with all indicators added
        """
        result = df.copy()
        
        # RSI
        result['RSI'] = TechnicalIndicators.calculate_rsi(df['Close'])
        
        # MACD
        macd = TechnicalIndicators.calculate_macd(df['Close'])
        result['MACD'] = macd['macd']
        result['MACD_Signal'] = macd['signal']
        result['MACD_Histogram'] = macd['histogram']
        
        # Bollinger Bands
        bb = TechnicalIndicators.calculate_bollinger_bands(df['Close'])
        result['BB_Upper'] = bb['upper']
        result['BB_Middle'] = bb['middle']
        result['BB_Lower'] = bb['lower']
        
        # Moving Averages
        result['SMA_20'] = TechnicalIndicators.calculate_sma(df['Close'], 20)
        result['SMA_50'] = TechnicalIndicators.calculate_sma(df['Close'], 50)
        result['SMA_200'] = TechnicalIndicators.calculate_sma(df['Close'], 200)
        result['EMA_20'] = TechnicalIndicators.calculate_ema(df['Close'], 20)
        result['EMA_50'] = TechnicalIndicators.calculate_ema(df['Close'], 50)
        result['EMA_200'] = TechnicalIndicators.calculate_ema(df['Close'], 200)
        result['EMA_12'] = TechnicalIndicators.calculate_ema(df['Close'], 12)
        result['EMA_26'] = TechnicalIndicators.calculate_ema(df['Close'], 26)
        
        # Volatility
        result['Volatility'] = TechnicalIndicators.calculate_volatility(df['Close'])
        
        return result
