#!/usr/bin/env python3
"""
Development server for CreatorGPT FastAPI backend
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add current directory to Python path
    sys.path.insert(0, os.path.dirname(__file__))
    
    print("Starting CreatorGPT FastAPI server...")
    print("API will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Auto-reload enabled for development")
    print("-" * 50)
    
    uvicorn.run(
        "api:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
