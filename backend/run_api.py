#!/usr/bin/env python3
"""
Development server for CreatorGPT FastAPI backend
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add backend directory to Python path
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_dir)
    
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
