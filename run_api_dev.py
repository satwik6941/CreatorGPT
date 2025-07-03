#!/usr/bin/env python3

import uvicorn
import os
import sys

if __name__ == "__main__":
    # Set environment for development
    os.environ['ENVIRONMENT'] = 'development'
    
    print("🚀 Starting CreatorGPT API Server...")
    print("📡 API will be available at: http://localhost:8000")
    print("📊 WebSocket endpoint: ws://localhost:8000/ws/analysis")
    print("🔧 Environment: Development")
    print("="*50)
    
    try:
        uvicorn.run(
            "api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
