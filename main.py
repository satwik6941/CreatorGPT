import os
import sys
import subprocess
import time
import pandas as pd
from datetime import datetime
import glob
import json

class CreatorGPTAnalyzer:
    def __init__(self):
        self.channel_id = None
        self.channel_name = None
        self.total_comments = 0
        self.start_time = None
        
    def print_banner(self):
        print("\n" + "="*60)
        print("Creator GPT")
        print("="*60)
        print("AI Powered sentiment analysis")
        print("="*60 + "\n")
    
    def log_progress(self, step, message, progress, **kwargs):
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
        
        # Also print human-readable message
        print(f"[{progress}%] {message}")
    
    def get_user_input(self):
        print("STEP 1: Setup")
        print("-" * 20)
        
        # Check if channel ID was provided as command line argument
        if len(sys.argv) > 1:
            self.channel_id = sys.argv[1].strip()
        else:
            self.channel_id = input("Enter YouTube Channel ID: ").strip()
        
        if not self.channel_id:
            print("ERROR: Channel ID cannot be empty!")
            return False
            
        self.log_progress("setup_complete", f"Channel ID set: {self.channel_id}", 5, 
                        channel_id=self.channel_id)
        print("Starting complete analysis pipeline...")
        
        return True
    
    def run_youtube_extraction(self):
        """Run the YouTube comment extraction script"""
        print("\nSTEP 2: Extracting YouTube Comments")
        print("-" * 40)
        
        self.log_progress("youtube_start", "Starting YouTube comment extraction...", 10)
        
        try:
            # Run youtube_improved.py with the channel ID as argument
            process = subprocess.Popen(
                [sys.executable, 'youtube_improved.py', self.channel_id],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                cwd=os.getcwd(),
                bufsize=1,
                universal_newlines=True
            )
            
            # Read output in real-time
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    if line.startswith('PROGRESS:'):
                        # Parse and forward progress from youtube_improved.py
                        try:
                            progress_json = line[9:]  # Remove 'PROGRESS:' prefix
                            progress_data = json.loads(progress_json)
                            print(f"PROGRESS:{progress_json}")
                        except:
                            pass
                    print(line)
            
            # Wait for process to complete
            return_code = process.poll()
            
            if return_code == 0:
                self.log_progress("youtube_complete", "YouTube extraction completed successfully!", 35)
                print("SUCCESS: YouTube extraction completed successfully!")
                print("Generated files:")
                
                # Check what files were created
                if os.path.exists('all_comments.csv'):
                    df = pd.read_csv('all_comments.csv')
                    self.total_comments = len(df)
                    print(f"   * all_comments.csv ({self.total_comments:,} comments)")
                    
                    # Try to get channel name from the extraction process
                    if hasattr(self, 'channel_name') and self.channel_name:
                        print(f"   * Channel: {self.channel_name}")
                
                if os.path.exists('cleaned_all_comments.csv'):
                    print("   * cleaned_all_comments.csv (preprocessed)")
                    
                return True
            else:
                # Get stderr output
                stderr = process.stderr.read()
                self.log_progress("youtube_error", f"YouTube extraction failed: {stderr}", 35, 
                                error=stderr)
                print(f"Error in YouTube extraction: {stderr}")
                return False
                
        except Exception as e:
            error_msg = str(e)
            self.log_progress("youtube_exception", f"Failed to run YouTube extraction: {error_msg}", 35,
                            error=error_msg)
            print(f"Failed to run YouTube extraction: {error_msg}")
            return False
    
    def run_llm_processing(self):
        """Run the LLM processing script"""
        print("\nSTEP 3: LLM Processing of Comments")
        print("-" * 40)
        
        # Check if cleaned_all_comments.csv exists
        if not os.path.exists('cleaned_all_comments.csv'):
            error_msg = "cleaned_all_comments.csv not found!"
            self.log_progress("llm_error", error_msg, 40, error=error_msg)
            print(f"ERROR: {error_msg}")
            print("   Please run YouTube extraction first.")
            return False
        
        self.log_progress("llm_start", "Starting LLM processing of comments...", 40)
        
        try:
            # Run llm.py
            process = subprocess.Popen(
                [sys.executable, 'llm.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                cwd=os.getcwd(),
                bufsize=1,
                universal_newlines=True
            )
            
            # Read output in real-time
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    if line.startswith('PROGRESS:'):
                        # Parse and forward progress from llm.py
                        try:
                            progress_json = line[9:]  # Remove 'PROGRESS:' prefix
                            progress_data = json.loads(progress_json)
                            print(f"PROGRESS:{progress_json}")
                        except:
                            pass
                    print(line)
            
            return_code = process.poll()
            
            if return_code == 0:
                self.log_progress("llm_complete", "LLM processing completed successfully!", 65)
                print("SUCCESS: LLM processing completed successfully!")
                print("Generated files:")
                
                # Check for generated batch files
                comment_batches = glob.glob('comments_batch_*.txt')
                analyzed_batches = glob.glob('analyzed_comments_batch_*.txt')
                
                print(f"   * {len(comment_batches)} comment batch files")
                print(f"   * {len(analyzed_batches)} analyzed batch files")
                
                if len(analyzed_batches) > 0:
                    print("   * LLM analysis completed for all batches")
                
                return True
            else:
                stderr = process.stderr.read()
                self.log_progress("llm_error", f"LLM processing failed: {stderr}", 65,
                                error=stderr)
                print(f"ERROR in LLM processing: {stderr}")
                return False
                
        except Exception as e:
            error_msg = str(e)
            self.log_progress("llm_exception", f"Failed to run LLM processing: {error_msg}", 65,
                            error=error_msg)
            print(f"ERROR: Failed to run LLM processing: {error_msg}")
            return False
    
    def run_sentiment_analysis(self):
        """Run the sentiment analysis script"""
        print("\nSTEP 4: Sentiment Analysis & Dashboard Generation")
        print("-" * 50)
        
        # Check if cleaned_all_comments.csv exists
        if not os.path.exists('cleaned_all_comments.csv'):
            error_msg = "cleaned_all_comments.csv not found!"
            self.log_progress("sentiment_error", error_msg, 70, error=error_msg)
            print(f"ERROR: {error_msg}")
            print("   Please run YouTube extraction first.")
            return False
        
        self.log_progress("dashboard_start", "Starting comprehensive dashboard generation...", 70)
        
        try:
            # Run the enhanced dashboard generator
            process = subprocess.Popen(
                [sys.executable, 'generate_dashboard.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                cwd=os.getcwd(),
                bufsize=1,
                universal_newlines=True
            )
            
            # Read output in real-time
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    if line.startswith('PROGRESS:'):
                        # Parse and forward progress from dashboard generator
                        try:
                            progress_json = line[9:]  # Remove 'PROGRESS:' prefix
                            progress_data = json.loads(progress_json)
                            # Adjust progress to fit in 70-90% range
                            adjusted_progress = 70 + (progress_data.get('progress', 0) * 0.2)
                            progress_data['progress'] = int(adjusted_progress)
                            
                            # Ensure all data is JSON serializable before printing
                            safe_progress_data = {}
                            for key, value in progress_data.items():
                                try:
                                    json.dumps(value)
                                    safe_progress_data[key] = value
                                except (TypeError, ValueError):
                                    safe_progress_data[key] = str(value)
                            
                            print(f"PROGRESS:{json.dumps(safe_progress_data)}")
                        except Exception as e:
                            # If we can't parse the progress, just skip it silently
                            pass
                    print(line)
            
            return_code = process.poll()
            
            if return_code == 0:
                self.log_progress("dashboard_complete", "Comprehensive dashboard generated successfully!", 90)
                print("SUCCESS: Dashboard generation completed successfully!")
                print("Generated files:")
                
                # Check for main dashboard
                if os.path.exists('sentiment_analysis_dashboard.png'):
                    print("   * sentiment_analysis_dashboard.png (16-chart comprehensive dashboard)")
                
                # Check for data files
                if os.path.exists('sentiment_analyzed_comments.csv'):
                    print("   * sentiment_analyzed_comments.csv (comments with sentiment scores)")
                    
                if os.path.exists('detailed_sentiment_results.txt'):
                    print("   * detailed_sentiment_results.txt (detailed analysis)")
                
                # Check for individual charts
                if os.path.exists('charts'):
                    chart_files = glob.glob('charts/*.png')
                    if chart_files:
                        print(f"   * charts/ directory with {len(chart_files)} individual charts")
                
                # Show quick summary
                if os.path.exists('sentiment_analyzed_comments.csv'):
                    try:
                        df = pd.read_csv('sentiment_analyzed_comments.csv')
                        avg_score = df['sentiment_score'].mean()
                        
                        positive_pct = (df['sentiment'] == 'Positive').mean() * 100
                        neutral_pct = (df['sentiment'] == 'Neutral').mean() * 100
                        negative_pct = (df['sentiment'] == 'Negative').mean() * 100
                        
                        print(f"\nQuick Summary:")
                        print(f"   * Average Sentiment Score: {avg_score:.1f}/100")
                        print(f"   * Positive: {positive_pct:.1f}%")
                        print(f"   * Neutral: {neutral_pct:.1f}%")
                        print(f"   * Negative: {negative_pct:.1f}%")
                        
                        self.log_progress("summary_generated", "Analysis summary generated", 92,
                                        avg_sentiment_score=avg_score,
                                        positive_pct=positive_pct,
                                        neutral_pct=neutral_pct,
                                        negative_pct=negative_pct)
                    except Exception as e:
                        print(f"Warning: Could not generate summary: {e}")
                
                return True
            else:
                stderr = process.stderr.read()
                self.log_progress("dashboard_error", f"Dashboard generation failed: {stderr}", 90,
                                error=stderr)
                print(f"ERROR in dashboard generation: {stderr}")
                return False
                
        except Exception as e:
            error_msg = str(e)
            self.log_progress("dashboard_exception", f"Failed to run dashboard generation: {error_msg}", 90,
                            error=error_msg)
            print(f"ERROR: Failed to run dashboard generation: {error_msg}")
            return False
    
    def run_complete_pipeline(self):
        """Run the complete analysis pipeline"""
        success_count = 0
        total_steps = 3
        
        self.log_progress("pipeline_start", "Starting complete analysis pipeline...", 5)
        
        # Step 1: YouTube Extraction
        if self.run_youtube_extraction():
            success_count += 1
            self.log_progress("step_1_complete", "Step 1/3 completed: YouTube extraction", 33)
        else:
            self.log_progress("pipeline_failed", "Pipeline failed at YouTube extraction", 35)
            return False
        
        # Step 2: LLM Processing (optional, continue if fails)
        if self.run_llm_processing():
            success_count += 1
            self.log_progress("step_2_complete", "Step 2/3 completed: LLM processing", 66)
        else:
            self.log_progress("step_2_skipped", "Step 2/3 failed: LLM processing, continuing with sentiment analysis...", 66)
            print("WARNING: LLM processing failed, but continuing with sentiment analysis...")
        
        # Step 3: Sentiment Analysis
        if self.run_sentiment_analysis():
            success_count += 1
            self.log_progress("step_3_complete", "Step 3/3 completed: Sentiment analysis", 95)
        else:
            self.log_progress("pipeline_failed", "Pipeline failed at sentiment analysis", 95)
            return False
        
        pipeline_success = success_count >= 2  # At least extraction and sentiment analysis
        if pipeline_success:
            self.log_progress("pipeline_complete", "Complete analysis pipeline finished successfully!", 100)
        
        return pipeline_success
    
    def print_final_summary(self, success=True):
        """Print final summary of the analysis"""
        end_time = time.time()
        duration = end_time - self.start_time if self.start_time else 0
        
        print("\n" + "="*60)
        if success:
            print("Creator GPT ANALYSIS COMPLETE!")
        else:
            print("Creator GPT ANALYSIS FAILED!")
        print("="*60)
        
        if success:
            print("Status: SUCCESS")
            if self.channel_name:
                print(f"Channel: {self.channel_name}")
            else:
                print(f"Channel ID: {self.channel_id}")
            if self.total_comments > 0:
                print(f"Comments Processed: {self.total_comments:,}")
            print(f"Duration: {duration:.1f} seconds")
            
            print("\nGenerated Files:")
            files_to_check = [
                ('all_comments.csv', 'Raw YouTube comments'),
                ('cleaned_all_comments.csv', 'Preprocessed comments'),
                ('detailed_sentiment_results.txt', 'Detailed sentiment analysis'),
                ('sentiment_analyzed_comments.csv', 'Comments with sentiment scores'),
                ('sentiment_analysis_dashboard.png', 'Analysis dashboard')
            ]
            
            for filename, description in files_to_check:
                if os.path.exists(filename):
                    print(f"   SUCCESS: {filename} - {description}")
                else:
                    print(f"   MISSING: {filename} - {description}")
                    
            self.log_progress("final_summary", "Analysis completed successfully", 100,
                            success=True,
                            duration=duration,
                            total_comments=self.total_comments,
                            channel_id=self.channel_id,
                            files_generated=[f for f, _ in files_to_check if os.path.exists(f)])
        else:
            print("Status: FAILED")
            print("   Please check the error messages above")
            self.log_progress("final_summary", "Analysis failed", 100,
                            success=False,
                            duration=duration,
                            channel_id=self.channel_id)
        
        print("\nReady for insights! Check the generated files.")
        print("="*60 + "\n")

def main():
    """Main function to run the CreatorGPT analyzer"""
    analyzer = CreatorGPTAnalyzer()
    analyzer.start_time = time.time()
    
    # Print banner
    analyzer.print_banner()
    
    # Get user input
    if not analyzer.get_user_input():
        return
    
    print(f"\nStarting complete analysis workflow...")
    
    # Run the complete pipeline automatically
    success = analyzer.run_complete_pipeline()
    
    # Print final summary
    analyzer.print_final_summary(success)

if __name__ == "__main__":
    # Set console encoding to UTF-8 to handle Unicode paths
    import sys
    import io
    
    # Ensure stdout can handle Unicode characters
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    elif hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAnalysis interrupted by user")
        print("Goodbye!")
    except Exception as e:
        try:
            print(f"\nUnexpected error: {str(e)}")
            print("Please check your setup and try again")
        except UnicodeEncodeError:
            print("\nUnexpected error occurred (encoding issue prevented full display)")
            print("Please check your setup and try again")
        
        # Try to print traceback, but handle encoding errors gracefully
        try:
            import traceback
            traceback.print_exc()
        except UnicodeEncodeError:
            print("Stack trace could not be displayed due to encoding issues")
