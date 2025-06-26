# 🎬 CreatorGPT - YouTube Comment Analysis Pipeline

Complete AI-powered YouTube comment analysis system that extracts, processes, and analyzes YouTube comments with sentiment scoring and insights.

## 🚀 Features

- **YouTube Comment Extraction**: Extract up to 5,000 comments from any YouTube channel
- **AI-Powered LLM Processing**: Analyze comments using Google's Gemini AI
- **Advanced Sentiment Analysis**: Score comments using RoBERTa transformer model
- **Comprehensive Visualizations**: Generate detailed charts and graphs
- **Automated Pipeline**: One-click execution of the entire workflow

## 📁 Project Structure

```
CreatorGPT/
├── main.py                           # 🎯 Main orchestrator script
├── youtube.py                        # 📺 YouTube comment extraction
├── llm.py                           # 🤖 LLM processing with Gemini AI
├── sentiment_score.py               # 📊 Sentiment analysis with RoBERTa
├── preprocessing.py                 # 🧹 Data cleaning utilities
├── run_analysis.bat                 # 🖱️ Windows batch file for easy execution
├── .env                            # 🔑 API keys (create this file)
└── README.md                       # 📖 This file
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
pip install pandas numpy matplotlib seaborn
pip install google-api-python-client python-dotenv
pip install transformers torch
pip install google-genai
```

### 2. Get API Keys

Create a `.env` file in the project root with your API keys:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Create credentials (API Key)

**Get Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Generate API key

## 🎯 How to Use

### Option 1: Complete Pipeline (Recommended)

Run the main orchestrator script:

```bash
python main.py
```

Or on Windows, double-click:
```
run_analysis.bat
```

## ⚠️ Disclaimer

- Respect YouTube's Terms of Service
- Use API keys responsibly
- Comments data belongs to original creators
- This tool is for research and analysis purposes

---

**Happy Analyzing! 🚀📊**