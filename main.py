import os
import sys
import subprocess
import time
import pandas as pd
from datetime import datetime
import glob

class CreatorGPTAnalyzer:
    def __init__(self):
        self.channel_id = None
        self.channel_name = None
        self.total_comments = 0
        self.start_time = None
        
    def print_banner(self):
        print("\n" + "="*60)
        print("🎬 Creator GPT")
        print("="*60)
        print("AI Powered sentiment analysis")
        print("="*60 + "\n")
    
    def get_user_input(self):
        print("STEP 1: Setup")
        print("-" * 20)
        
        self.channel_id = input("Enter YouTube Channel ID: ").strip()
        
        if not self.channel_id:
            print(" Error: Channel ID cannot be empty!")
            return False
            
        print(f"Channel ID set: {self.channel_id}")
        print("Starting complete analysis pipeline...")
        
        return True
    
    def run_youtube_extraction(self):
        """Run the YouTube comment extraction script"""
        print("\n STEP 2: Extracting YouTube Comments")
        print("-" * 40)
        
        try:
            # Run youtube.py with the channel ID as input
            process = subprocess.Popen(
                [sys.executable, 'youtube.py'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.getcwd()
            )
            
            # Send channel ID as input
            stdout, stderr = process.communicate(input=self.channel_id + '\n')
            
            if process.returncode == 0:
                print("YouTube extraction completed successfully!")
                print("Generated files:")
                
                # Check what files were created
                if os.path.exists('all_comments.csv'):
                    df = pd.read_csv('all_comments.csv')
                    self.total_comments = len(df)
                    print(f"   • all_comments.csv ({self.total_comments:,} comments)")
                    
                    if 'channel_name' in df.columns:
                        self.channel_name = df['channel_name'].iloc[0]
                        print(f"   • Channel: {self.channel_name}")
                
                if os.path.exists('cleaned_all_comments.csv'):
                    print("   • cleaned_all_comments.csv (preprocessed)")
                    
                return True
            else:
                print(f"Error in YouTube extraction: {stderr}")
                return False
                
        except Exception as e:
            print(f"Failed to run YouTube extraction: {str(e)}")
            return False
    
    def run_llm_processing(self):
        """Run the LLM processing script"""
        print("\n STEP 3: LLM Processing of Comments")
        print("-" * 40)
        
        # Check if cleaned_all_comments.csv exists
        if not os.path.exists('cleaned_all_comments.csv'):
            print("Error: cleaned_all_comments.csv not found!")
            print("   Please run YouTube extraction first.")
            return False
        
        try:
            # Run llm.py
            process = subprocess.run(
                [sys.executable, 'llm.py'],
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )
            
            if process.returncode == 0:
                print("LLM processing completed successfully!")
                print("Generated files:")
                
                # Check for generated batch files
                comment_batches = glob.glob('comments_batch_*.txt')
                analyzed_batches = glob.glob('analyzed_comments_batch_*.txt')
                
                print(f"   • {len(comment_batches)} comment batch files")
                print(f"   • {len(analyzed_batches)} analyzed batch files")
                
                if len(analyzed_batches) > 0:
                    print("   • LLM analysis completed for all batches")
                
                return True
            else:
                print(f" Error in LLM processing: {process.stderr}")
                return False
                
        except Exception as e:
            print(f" Failed to run LLM processing: {str(e)}")
            return False
    
    def run_sentiment_analysis(self):
        """Run the sentiment analysis script"""
        print("\n STEP 4: Sentiment Analysis")
        print("-" * 30)
        
        # Check if cleaned_all_comments.csv exists
        if not os.path.exists('cleaned_all_comments.csv'):
            print(" Error: cleaned_all_comments.csv not found!")
            print("   Please run YouTube extraction first.")
            return False
        
        try:
            # Run sentiment_score.py
            process = subprocess.run(
                [sys.executable, 'sentiment_score.py'],
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )
            
            if process.returncode == 0:
                print(" Sentiment analysis completed successfully!")
                print("Generated files:")
                
                if os.path.exists('detailed_sentiment_results.txt'):
                    print("   • detailed_sentiment_results.txt")
                
                if os.path.exists('sentiment_analyzed_comments.csv'):
                    print("   • sentiment_analyzed_comments.csv")
                    
                if os.path.exists('sentiment_analysis_dashboard.png'):
                    print("   • sentiment_analysis_dashboard.png")
                
                # Show quick summary
                if os.path.exists('sentiment_analyzed_comments.csv'):
                    df = pd.read_csv('sentiment_analyzed_comments.csv')
                    avg_score = df['sentiment_score'].mean()
                    
                    positive_pct = (df['sentiment'] == 'Positive').mean() * 100
                    neutral_pct = (df['sentiment'] == 'Neutral').mean() * 100
                    negative_pct = (df['sentiment'] == 'Negative').mean() * 100
                    
                    print(f"\n Quick Summary:")
                    print(f"   • Average Sentiment Score: {avg_score:.1f}/100")
                    print(f"   • Positive: {positive_pct:.1f}%")
                    print(f"   • Neutral: {neutral_pct:.1f}%")
                    print(f"   • Negative: {negative_pct:.1f}%")
                
                return True
            else:
                print(f" Error in sentiment analysis: {process.stderr}")
                return False
                
        except Exception as e:
            print(f" Failed to run sentiment analysis: {str(e)}")
            return False
    
    def cleanup_temp_files(self):
        """Optional cleanup of temporary batch files"""
        print("\nCleanup")
        print("-" * 10)
        
        choice = input("Do you want to delete temporary batch files? (y/n): ").strip().lower()
        
        if choice == 'y':
            # Delete batch files
            batch_files = glob.glob('comments_batch_*.txt') + glob.glob('analyzed_comments_batch_*.txt')
            
            deleted_count = 0
            for file in batch_files:
                try:
                    os.remove(file)
                    deleted_count += 1
                except:
                    pass
            
            if deleted_count > 0:
                print(f"Deleted {deleted_count} temporary batch files")
            else:
                print("ℹNo temporary files to delete")
        else:
            print("ℹTemporary files kept")
    
    def run_complete_pipeline(self):
        """Run the complete analysis pipeline"""
        success_count = 0
        
        # Step 1: YouTube Extraction
        if self.run_youtube_extraction():
            success_count += 1
        else:
            return False
        
        # Step 2: LLM Processing
        if self.run_llm_processing():
            success_count += 1
        else:
            print(" LLM processing failed, but continuing with sentiment analysis...")
        
        # Step 3: Sentiment Analysis
        if self.run_sentiment_analysis():
            success_count += 1
        else:
            return False
            
        return success_count >= 2  # At least extraction and sentiment analysis
    
    def print_final_summary(self, success=True):
        """Print final summary of the analysis"""
        end_time = time.time()
        duration = end_time - self.start_time if self.start_time else 0
        
        print("\n" + "="*60)
        print("🎉 CREATORBOT ANALYSIS COMPLETE!")
        print("="*60)
        
        if success:
            print(" Status: SUCCESS")
            if self.channel_name:
                print(f"📺 Channel: {self.channel_name}")
            if self.total_comments > 0:
                print(f"💬 Comments Processed: {self.total_comments:,}")
            print(f"⏱️  Duration: {duration:.1f} seconds")
            
            print("\n📁 Generated Files:")
            files_to_check = [
                ('all_comments.csv', 'Raw YouTube comments'),
                ('cleaned_all_comments.csv', 'Preprocessed comments'),
                ('detailed_sentiment_results.txt', 'Detailed sentiment analysis'),
                ('sentiment_analyzed_comments.csv', 'Comments with sentiment scores'),
                ('sentiment_analysis_dashboard.png', 'Analysis dashboard')
            ]
            
            for filename, description in files_to_check:
                if os.path.exists(filename):
                    print(f"    {filename} - {description}")
                else:
                    print(f"    {filename} - {description}")
        else:
            print(" Status: FAILED")
            print("   Please check the error messages above")
        
        print("\n Ready for insights! Check the generated files.")
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
    
    print(f"\n Starting complete analysis workflow...")
    
    # Run the complete pipeline automatically
    success = analyzer.run_complete_pipeline()
    
    # Optional cleanup
    if success:
        analyzer.cleanup_temp_files()
    
    # Print final summary
    analyzer.print_final_summary(success)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n Analysis interrupted by user")
        print(" Goodbye!")
    except Exception as e:
        print(f"\n Unexpected error: {str(e)}")
        print("🔧 Please check your setup and try again")
