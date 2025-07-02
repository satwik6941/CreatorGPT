#!/usr/bin/env python3
"""
Enhanced Dashboard Generator for CreatorGPT
Creates comprehensive sentiment analysis dashboard with all visualizations
Ensures all batch files are processed before generating dashboard
"""

import os
import sys
import subprocess
import json
import glob
from datetime import datetime
import pandas as pd

def log_progress(step, message, progress, **kwargs):
    """Log progress in a format that the API can parse"""
    progress_data = {
        "step": step,
        "message": message,
        "progress": progress,
        "timestamp": datetime.now().isoformat()
    }
    
    # Safely add kwargs, converting non-serializable objects to strings
    for key, value in kwargs.items():
        try:
            # Test if the value is JSON serializable
            json.dumps(value)
            progress_data[key] = value
        except (TypeError, ValueError):
            # Convert non-serializable objects to string representation
            progress_data[key] = str(value)
    
    try:
        print(f"PROGRESS:{json.dumps(progress_data)}")
    except (TypeError, ValueError) as e:
        # Fallback: create a minimal progress message
        minimal_data = {
            "step": step,
            "message": message,
            "progress": progress,
            "timestamp": datetime.now().isoformat()
        }
        print(f"PROGRESS:{json.dumps(minimal_data)}")
        print(f"Warning: Could not serialize full progress data: {e}")
    
    print(f"[{progress}%] {message}")

class DashboardGenerator:
    def __init__(self):
        self.total_comments = 0
        self.batch_files_created = 0
        self.analyzed_files_created = 0
        
    def check_data_availability(self):
        """Check if required data files are available"""
        log_progress("data_check", "Checking data availability...", 5)
        
        # Check for cleaned comments
        if not os.path.exists('cleaned_all_comments.csv'):
            print("❌ cleaned_all_comments.csv not found!")
            print("Please run the YouTube extraction script first.")
            return False
        
        # Load and check data
        try:
            df = pd.read_csv('cleaned_all_comments.csv')
            self.total_comments = len(df)
            log_progress("data_verified", f"Found {self.total_comments} comments to analyze", 10,
                        total_comments=self.total_comments)
            print(f"✅ Found {self.total_comments:,} comments for analysis")
            return True
        except Exception as e:
            print(f"❌ Error reading comments data: {e}")
            return False
    
    def check_batch_processing_status(self):
        """Check status of batch processing"""
        log_progress("batch_check", "Checking batch processing status...", 15)
        
        # Find batch files
        batch_files = glob.glob('comments_batch_*.txt')
        analyzed_files = glob.glob('analyzed_comments_batch_*.txt')
        
        self.batch_files_created = len(batch_files)
        self.analyzed_files_created = len(analyzed_files)
        
        print(f"📁 Batch files created: {self.batch_files_created}")
        print(f"🔍 Analyzed files: {self.analyzed_files_created}")
        
        if self.batch_files_created == 0:
            log_progress("batch_needed", "No batch files found - will create them", 20)
            return "create_batches"
        elif self.analyzed_files_created < self.batch_files_created:
            log_progress("batch_incomplete", f"Incomplete batch processing: {self.analyzed_files_created}/{self.batch_files_created}", 20)
            return "process_batches"
        else:
            log_progress("batch_complete", "All batches processed", 25)
            return "ready_for_dashboard"
    
    def run_batch_processing(self):
        """Run or resume batch processing"""
        log_progress("batch_processing", "Starting batch processing...", 30)
        
        try:
            # Run the enhanced batch processor
            result = subprocess.run([
                sys.executable, 'batch_processor.py'
            ], capture_output=True, text=True, cwd=os.getcwd())
            
            if result.returncode == 0:
                log_progress("batch_success", "Batch processing completed successfully", 70)
                print("✅ Batch processing completed successfully!")
                return True
            else:
                print(f"❌ Batch processing failed:")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}")
                log_progress("batch_failed", "Batch processing failed", 70, error=result.stderr)
                return False
                
        except Exception as e:
            print(f"❌ Error running batch processor: {e}")
            log_progress("batch_error", f"Batch processing error: {e}", 70)
            return False
    
    def run_llm_processing_fallback(self):
        """Fallback: run original LLM processing if batch processor fails"""
        log_progress("llm_fallback", "Running fallback LLM processing...", 35)
        
        try:
            result = subprocess.run([
                sys.executable, 'llm.py'
            ], capture_output=True, text=True, cwd=os.getcwd())
            
            if result.returncode == 0:
                log_progress("llm_success", "LLM processing completed", 65)
                print("✅ LLM processing completed!")
                return True
            else:
                print(f"❌ LLM processing failed:")
                print(f"STDERR: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error running LLM processing: {e}")
            return False
    
    def generate_sentiment_dashboard(self):
        """Generate the comprehensive sentiment analysis dashboard"""
        log_progress("dashboard_generation", "Generating sentiment analysis dashboard...", 75)
        
        try:
            # Run sentiment analysis with enhanced dashboard
            result = subprocess.run([
                sys.executable, 'sentiment_score.py'
            ], capture_output=True, text=True, cwd=os.getcwd())
            
            if result.returncode == 0:
                log_progress("dashboard_success", "Dashboard generated successfully!", 95)
                print("✅ Sentiment analysis dashboard generated!")
                
                # Check for generated files
                dashboard_files = [
                    'sentiment_analysis_dashboard.png',
                    'detailed_sentiment_results.txt',
                    'sentiment_analyzed_comments.csv'
                ]
                
                generated_files = []
                for file in dashboard_files:
                    if os.path.exists(file):
                        generated_files.append(file)
                        print(f"   📊 {file}")
                
                # Check for charts directory
                if os.path.exists('charts'):
                    chart_files = glob.glob('charts/*.png')
                    print(f"   📁 charts/ directory with {len(chart_files)} individual charts")
                
                log_progress("dashboard_complete", "Dashboard generation complete", 100,
                            generated_files=generated_files)
                return True
            else:
                print(f"❌ Dashboard generation failed:")
                print(f"STDERR: {result.stderr}")
                log_progress("dashboard_failed", "Dashboard generation failed", 95, error=result.stderr)
                return False
                
        except Exception as e:
            print(f"❌ Error generating dashboard: {e}")
            log_progress("dashboard_error", f"Dashboard generation error: {e}", 95)
            return False
    
    def print_final_summary(self):
        """Print final summary of generated files"""
        print(f"\n{'='*70}")
        print("🎉 CREATOR GPT DASHBOARD GENERATION COMPLETE!")
        print(f"{'='*70}")
        
        # Main dashboard
        if os.path.exists('sentiment_analysis_dashboard.png'):
            print("📊 MAIN DASHBOARD:")
            print("   ✅ sentiment_analysis_dashboard.png - Complete 16-chart dashboard")
        
        # Individual charts
        if os.path.exists('charts'):
            chart_files = glob.glob('charts/*.png')
            if chart_files:
                print(f"\n📁 INDIVIDUAL CHARTS ({len(chart_files)} files):")
                for chart in sorted(chart_files):
                    chart_name = os.path.basename(chart)
                    print(f"   ✅ {chart_name}")
        
        # Data files
        print(f"\n📋 DATA FILES:")
        data_files = [
            ('sentiment_analyzed_comments.csv', 'Comments with sentiment scores'),
            ('detailed_sentiment_results.txt', 'Detailed text analysis'),
            ('batch_processing_status.json', 'Processing status log')
        ]
        
        for filename, description in data_files:
            if os.path.exists(filename):
                print(f"   ✅ {filename} - {description}")
            else:
                print(f"   ❌ {filename} - {description} (missing)")
        
        # Analysis summary
        if os.path.exists('sentiment_analyzed_comments.csv'):
            try:
                df = pd.read_csv('sentiment_analyzed_comments.csv')
                avg_score = df['sentiment_score'].mean()
                positive_pct = (df['sentiment'] == 'Positive').mean() * 100
                neutral_pct = (df['sentiment'] == 'Neutral').mean() * 100
                negative_pct = (df['sentiment'] == 'Negative').mean() * 100
                
                print(f"\n📈 ANALYSIS SUMMARY:")
                print(f"   📝 Total Comments: {len(df):,}")
                print(f"   📊 Average Score: {avg_score:.1f}/100")
                print(f"   ✅ Positive: {positive_pct:.1f}%")
                print(f"   ⚪ Neutral: {neutral_pct:.1f}%") 
                print(f"   ❌ Negative: {negative_pct:.1f}%")
                
            except Exception as e:
                print(f"   ⚠️  Could not load summary: {e}")
        
        print(f"\n🎯 NEXT STEPS:")
        print("   1. Open 'sentiment_analysis_dashboard.png' to view the complete analysis")
        print("   2. Review 'detailed_sentiment_results.txt' for insights")
        print("   3. Use 'sentiment_analyzed_comments.csv' for further analysis")
        print("   4. Check 'charts/' folder for individual chart files")
        
        print(f"\n{'='*70}")

def main():
    """Main function to generate comprehensive dashboard"""
    print("🚀 CreatorGPT Enhanced Dashboard Generator")
    print("="*60)
    print("🎯 Goal: Generate comprehensive sentiment analysis dashboard")
    print("📊 Features: 16+ charts, detailed analysis, individual chart files")
    print("="*60)
    
    generator = DashboardGenerator()
    
    # Step 1: Check data availability
    if not generator.check_data_availability():
        return False
    
    # Step 2: Check batch processing status
    batch_status = generator.check_batch_processing_status()
    
    # Step 3: Handle batch processing as needed
    if batch_status in ["create_batches", "process_batches"]:
        print(f"\n🔄 Batch processing required...")
        
        # Try enhanced batch processor first
        if generator.run_batch_processing():
            print("✅ Enhanced batch processing successful!")
        else:
            print("⚠️  Enhanced batch processor failed, trying fallback...")
            if not generator.run_llm_processing_fallback():
                print("❌ Both batch processing methods failed!")
                print("Please check your API configuration and try again.")
                return False
    
    # Step 4: Generate sentiment dashboard
    print(f"\n📊 Generating comprehensive sentiment dashboard...")
    if not generator.generate_sentiment_dashboard():
        print("❌ Dashboard generation failed!")
        return False
    
    # Step 5: Print final summary
    generator.print_final_summary()
    
    log_progress("complete", "Dashboard generation pipeline completed successfully!", 100)
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Dashboard generation interrupted by user")
        print("You can restart anytime to resume from where it left off.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
