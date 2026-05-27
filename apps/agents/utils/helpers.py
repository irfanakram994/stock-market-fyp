"""
Helper Utilities
Common functions for date handling, JSON serialization, logging, etc.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name: str) -> logging.Logger:
    """Get a configured logger"""
    return logging.getLogger(name)

def serialize_datetime(obj: Any) -> str:
    """JSON serializer for datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def to_json(data: Any) -> str:
    """Convert data to JSON string with datetime handling"""
    return json.dumps(data, default=serialize_datetime, indent=2)

def from_json(json_str: str) -> Any:
    """Parse JSON string to Python object"""
    return json.loads(json_str)

def get_date_range(days: int = 30) -> tuple:
    """
    Get date range from today back N days
    
    Returns:
        (start_date, end_date) as datetime objects
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    return start_date, end_date

def format_date(date: datetime, format_str: str = "%Y-%m-%d") -> str:
    """Format datetime to string"""
    return date.strftime(format_str)

def parse_date(date_str: str, format_str: str = "%Y-%m-%d") -> datetime:
    """Parse string to datetime"""
    return datetime.strptime(date_str, format_str)

def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, return default if denominator is zero"""
    try:
        if denominator == 0:
            return default
        return numerator / denominator
    except (TypeError, ZeroDivisionError):
        return default

def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """Calculate percentage change between two values"""
    if old_value == 0:
        return 0.0
    return ((new_value - old_value) / old_value) * 100

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean dataframe by handling missing values and infinities
    
    Args:
        df: Input dataframe
    
    Returns:
        Cleaned dataframe
    """
    result = df.copy()
    
    # Replace infinities with NaN
    result.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    # Forward fill then backward fill NaN values
    result.ffill(inplace=True)
    result.bfill(inplace=True)
    
    # If still NaN, fill with 0
    result.fillna(0, inplace=True)
    
    return result

def validate_stock_symbol(symbol: str) -> bool:
    """Validate stock symbol format"""
    if not symbol:
        return False
    
    # Basic validation: 1-5 uppercase letters
    return bool(symbol.isalpha() and symbol.isupper() and 1 <= len(symbol) <= 5)

def create_response(success: bool, data: Any = None, error: str = None) -> Dict[str, Any]:
    """
    Create standardized response object
    
    Args:
        success: Whether operation was successful
        data: Response data
        error: Error message if failed
    
    Returns:
        Standardized response dictionary
    """
    response = {
        'success': success,
        'timestamp': datetime.now().isoformat()
    }
    
    if data is not None:
        response['data'] = data
    
    if error:
        response['error'] = error
    
    return response

