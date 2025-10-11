#!/usr/bin/env python3
"""
Enhanced Batch Processor for CreatorGPT
Ensures all comment batches are processed without interruption
Includes resume functionality and comprehensive error handling
"""

import pandas as pd
from google import genai
from google.genai import types
import os
import dotenv as env
import pathlib
import time
import json
import glob
from datetime import datetime

env.load_dotenv()

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

class BatchProcessor:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
        self.enhanced_prompt = """
CRITICAL TASK: ANALYZE ALL COMMENTS IN THIS FILE

YOU ARE A SENTIMENT ANALYSIS EXPERT. FOLLOW THESE INSTRUCTIONS EXACTLY:

STEP 1: COUNT ALL COMMENTS
- First, count how many comments are in this file
- Look for "COMMENT 1:", "COMMENT 2:", etc.
- Verify you can see all numbered comments

STEP 2: CREATE DETAILED SUMMARY REPORT
After analyzing ALL comments, add this section:

=== SENTIMENT ANALYSIS SUMMARY ===

PROCESSING VERIFICATION:
- Total comments processed: [number]
- Comments analyzed: [should match total]

SENTIMENT BREAKDOWN:
- Positive comments: ([percentage]%)
- Neutral comments: ([percentage]%)  
- Negative comments: ([percentage]%)  

DETAILED INSIGHTS:
**Common Positive Themes:**
[List 3-5 themes with specific examples from comments]

**Common Negative Themes:**
[List 3-5 themes with specific examples from comments]

**Viewer Suggestions:**
[Specific requests/improvements mentioned by viewers]

**What Viewers Appreciate:**
[What viewers like about content/creator with examples]

**Content Recommendations:**
[Specific suggestions for improving content based on feedback]

**Top Positive Comments:**
[List 3-5 positive comments with sentiment]

**Top Negative Comments:**
[List 3-5 negative comments with sentiment]

QUALITY CHECK:
✓ All comments processed: [Yes/No]
✓ Sentiment assigned to all: [Yes/No]
✓ Summary report complete: [Yes/No]

IMPORTANT: 
1. If you cannot see all comments or if any step fails, respond with "ERROR: Cannot complete analysis - please check file format"
2. After you complete the analysis of one text file, give a break of 10 seconds before processing the next text file.

BEGIN ANALYSIS NOW - PROCESS EVERY SINGLE COMMENT IN THIS FILE.
"""
    
    def create_comment_batches(self, df, comments_per_file=500, total_files=10):
        """Create comment batch files from DataFrame"""
        log_progress("batch_creation", "Creating comment batch files...", 5)
        
        if 'comment' not in df.columns:
            raise ValueError("DataFrame must have a 'comment' column")
        
        # Clean DataFrame
        df_clean = df.dropna(subset=['comment'])
        total_comments = len(df_clean)
        
        log_progress("batch_prep", f"Preparing {total_comments} comments for batch processing", 10,
                    total_comments=total_comments)
        
        # Adjust batch parameters if needed
        if total_comments < comments_per_file * total_files:
            total_files = min(total_files, max(1, total_comments // comments_per_file))
            print(f"Adjusted to {total_files} files based on available comments")
        
        # Create batch files
        created_files = []
        for file_num in range(total_files):
            start_idx = file_num * comments_per_file
            end_idx = min(start_idx + comments_per_file, total_comments)
            
            if start_idx >= total_comments:
                break
                
            file_comments = df_clean['comment'].iloc[start_idx:end_idx]
            filename = f'comments_batch_{file_num + 1}.txt'
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"BATCH INFORMATION\n")
                f.write(f"="*50 + "\n")
                f.write(f"Batch Number: {file_num + 1}\n")
                f.write(f"Total Comments in File: {len(file_comments)}\n")
                f.write(f"Comment Range: {start_idx + 1} to {end_idx}\n")
                f.write(f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"="*50 + "\n\n")
                
                for i, comment in enumerate(file_comments, 1):
                    f.write(f"COMMENT {i}:\n")
                    f.write(str(comment).strip())
                    f.write('\n' + '-'*40 + '\n')
            
            created_files.append(filename)
            progress = 10 + ((file_num + 1) / total_files) * 10
            log_progress("batch_file_created", f"Created {filename}", int(progress),
                        batch_number=file_num + 1, total_batches=total_files)
        
        log_progress("batch_creation_complete", f"Created {len(created_files)} batch files", 20)
        return created_files
    
    def get_batch_status(self):
        """Get current status of batch processing"""
        batch_files = glob.glob('comments_batch_*.txt')
        analyzed_files = glob.glob('analyzed_comments_batch_*.txt')
        
        batch_numbers = set()
        analyzed_numbers = set()
        
        for batch_file in batch_files:
            try:
                num = int(batch_file.split('_')[-1].split('.')[0])
                batch_numbers.add(num)
            except:
                continue
        
        for analyzed_file in analyzed_files:
            try:
                num = int(analyzed_file.split('_')[-1].split('.')[0])
                analyzed_numbers.add(num)
            except:
                continue
        
        pending_batches = sorted(batch_numbers - analyzed_numbers)
        completed_batches = sorted(analyzed_numbers)
        
        return {
            'total_batches': len(batch_numbers),
            'completed_batches': completed_batches,
            'pending_batches': pending_batches,
            'completion_rate': len(completed_batches) / len(batch_numbers) * 100 if batch_numbers else 0
        }
    
    def process_single_batch(self, batch_number, max_retries=3):
        """Process a single batch with enhanced error handling"""
        batch_file = f'comments_batch_{batch_number}.txt'
        output_file = f'analyzed_comments_batch_{batch_number}.txt'
        
        if not os.path.exists(batch_file):
            print(f"❌ Batch file {batch_file} not found")
            return False
        
        if os.path.exists(output_file):
            print(f"✅ Batch {batch_number} already processed (output exists)")
            return True
        
        print(f"🔄 Processing batch {batch_number}...")
        
        for attempt in range(max_retries):
            try:
                print(f"   Attempt {attempt + 1}/{max_retries}")
                
                # Read and validate input file
                filepath = pathlib.Path(batch_file)
                file_content = filepath.read_text(encoding='utf-8')
                
                if len(file_content.strip()) == 0:
                    print(f"   ❌ Empty batch file detected")
                    return False
                
                # Make API call
                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[
                        types.Part.from_bytes(
                            data=filepath.read_bytes(),
                            mime_type='text/plain'
                        ),
                        self.enhanced_prompt
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=8192,
                    )
                )
                
                # Validate response
                if not response or not response.text:
                    print(f"   ⚠️  Empty response received")
                    time.sleep(5)
                    continue
                
                # Check for required content
                required_sections = [
                    "SENTIMENT ANALYSIS SUMMARY",
                    "comments processed:",
                    "SENTIMENT BREAKDOWN"
                ]
                
                missing_sections = [sec for sec in required_sections if sec not in response.text]
                if missing_sections:
                    print(f"   ⚠️  Response missing sections: {missing_sections}")
                    print(f"   Response preview: {response.text[:200]}...")
                    time.sleep(3)
                    continue
                
                # Save successful response
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(f"ANALYSIS RESULTS FOR BATCH {batch_number}\n")
                    f.write("="*60 + "\n")
                    f.write(f"Source File: {batch_file}\n")
                    f.write(f"Processing Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"Attempt: {attempt + 1}\n")
                    f.write("="*60 + "\n\n")
                    f.write(response.text)
                
                # Verify saved file
                if os.path.exists(output_file) and os.path.getsize(output_file) > 200:
                    print(f"   ✅ Batch {batch_number} completed successfully")
                    time.sleep(2)  # Rate limiting
                    return True
                else:
                    print(f"   ❌ Failed to save output properly")
                    
            except Exception as e:
                print(f"   ❌ API call failed: {e}")
                wait_time = (attempt + 1) * 5  # Exponential backoff
                if attempt < max_retries - 1:
                    print(f"   ⏳ Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
        
        print(f"❌ Failed to process batch {batch_number} after {max_retries} attempts")
        return False
    
    def process_all_batches(self, resume_mode=True):
        """Process all batches with resume capability"""
        log_progress("batch_processing_start", "Starting batch processing...", 25)
        
        status = self.get_batch_status()
        
        if resume_mode and status['completed_batches']:
            print(f"📄 Resume mode: Found {len(status['completed_batches'])} completed batches")
            print(f"✅ Completed: {status['completed_batches']}")
        
        if not status['pending_batches']:
            print("🎉 All batches already completed!")
            log_progress("batch_processing_complete", "All batches already processed", 90)
            return True
        
        print(f"🔄 Processing {len(status['pending_batches'])} pending batches...")
        print(f"📋 Pending: {status['pending_batches']}")
        
        successful_batches = []
        failed_batches = []
        
        total_pending = len(status['pending_batches'])
        
        for i, batch_num in enumerate(status['pending_batches']):
            progress = 25 + (i / total_pending) * 65  # 25% to 90%
            log_progress("processing_batch", f"Processing batch {batch_num}", int(progress),
                        batch_number=batch_num, current_batch=i+1, total_pending=total_pending)
            
            if self.process_single_batch(batch_num):
                successful_batches.append(batch_num)
            else:
                failed_batches.append(batch_num)
        
        # Final summary
        total_completed = len(status['completed_batches']) + len(successful_batches)
        final_success_rate = (total_completed / status['total_batches']) * 100
        
        log_progress("batch_processing_complete", 
                    f"Batch processing complete: {total_completed}/{status['total_batches']} batches", 
                    90, successful_new=len(successful_batches), failed_new=len(failed_batches),
                    total_completed=total_completed, success_rate=final_success_rate)
        
        print(f"\n{'='*60}")
        print("BATCH PROCESSING SUMMARY")
        print(f"{'='*60}")
        print(f"Total batches: {status['total_batches']}")
        print(f"Previously completed: {len(status['completed_batches'])}")
        print(f"Newly completed: {len(successful_batches)}")
        print(f"Failed: {len(failed_batches)}")
        print(f"Overall completion rate: {final_success_rate:.1f}%")
        
        if successful_batches:
            print(f"\n✅ Successfully processed: {successful_batches}")
        
        if failed_batches:
            print(f"\n❌ Failed batches: {failed_batches}")
            print("   You can retry these by running the script again")
        
        # Save processing status
        self.save_processing_status(status['completed_batches'] + successful_batches, failed_batches)
        
        return len(failed_batches) == 0
    
    def save_processing_status(self, completed_batches, failed_batches):
        """Save processing status to file"""
        status_data = {
            "last_updated": datetime.now().isoformat(),
            "completed_batches": sorted(completed_batches),
            "failed_batches": sorted(failed_batches),
            "total_batches": len(completed_batches) + len(failed_batches),
            "success_rate": len(completed_batches) / (len(completed_batches) + len(failed_batches)) * 100
        }
        
        try:
            with open('batch_processing_status.json', 'w', encoding='utf-8') as f:
                json.dump(status_data, f, indent=2, ensure_ascii=False)
            print(f"📊 Status saved to batch_processing_status.json")
        except Exception as e:
            print(f"⚠️  Could not save status: {e}")

def main():
    """Main function for batch processing"""
    print("🚀 CreatorGPT Enhanced Batch Processor")
    print("="*50)
    
    processor = BatchProcessor()
    
    # Check if we need to create batches or just process existing ones
    existing_batches = glob.glob('comments_batch_*.txt')
    
    if not existing_batches:
        print("📂 No existing batch files found. Creating new batches...")
        
        # Load comments data
        try:
            df = pd.read_csv('cleaned_all_comments.csv')
            log_progress("data_loaded", f"Loaded {len(df)} comments", 5, total_comments=len(df))
            
            # Create batch files
            processor.create_comment_batches(df)
            
        except FileNotFoundError:
            print("❌ Error: cleaned_all_comments.csv not found!")
            print("Please run the YouTube extraction script first.")
            return False
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return False
    else:
        print(f"📂 Found {len(existing_batches)} existing batch files")
        log_progress("existing_batches_found", f"Found {len(existing_batches)} batch files", 20)
    
    # Process all batches
    success = processor.process_all_batches(resume_mode=True)
    
    if success:
        log_progress("all_complete", "All batches processed successfully!", 100)
        print("\n🎉 ALL BATCHES COMPLETED SUCCESSFULLY!")
        print("✅ Ready to proceed with sentiment analysis")
    else:
        log_progress("partial_complete", "Batch processing completed with some failures", 95)
        print("\n⚠️  Some batches failed. You can retry by running this script again.")
    
    return success

if __name__ == "__main__":
    main()
