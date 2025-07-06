import pandas as pd
from google import genai
from google.genai import types
import os
import dotenv as env
import pathlib
import time
import json
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
    
    # Also print human-readable message
    print(message)

# Initialize
log_progress("llm_init", "Loading LLM processing module...", 42)

df = pd.read_csv('cleaned_all_comments.csv')
client = genai.Client(api_key = os.getenv('GEMINI_API_KEY'))

def split_comments_to_txt_files(df, comments_per_file=500, total_files=10):
    log_progress("llm_splitting", "Splitting comments into batch files...", 44)
    
    # Ensure we have the comment column
    if 'comment' not in df.columns:
        print("Error: 'comment' column not found in DataFrame")
        return 0
    
    # Remove any NaN values
    df_clean = df.dropna(subset=['comment'])
    
    # Check if we have enough comments
    total_comments = len(df_clean)
    log_progress("llm_batch_prep", f"Preparing {total_comments} comments for LLM analysis", 46,
                total_comments=total_comments)
    print(f"Total comments available: {total_comments}")
    
    if total_comments < comments_per_file * total_files:
        print(f"Warning: Only {total_comments} comments available, but {comments_per_file * total_files} needed")
        # Adjust the number of files or comments per file
        total_files = min(total_files, total_comments // comments_per_file)
        print(f"Creating {total_files} files instead")
    
    # Create txt files
    for file_num in range(total_files):
        start_idx = file_num * comments_per_file
        end_idx = start_idx + comments_per_file
        
        # Get comments for this file
        file_comments = df_clean['comment'].iloc[start_idx:end_idx]
        
        # Create filename
        filename = f'comments_batch_{file_num + 1}.txt'
        
        # Write to txt file with clear separators
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"TOTAL COMMENTS IN THIS FILE: {len(file_comments)}\n")
            f.write("="*50 + "\n\n")
            
            for i, comment in enumerate(file_comments, 1):
                # Write comment with clear numbering
                f.write(f"COMMENT {i}:\n")
                f.write(str(comment).strip())
                f.write('\n' + '-'*30 + '\n')
            
        progress = 46 + ((file_num + 1) / total_files) * 4  # 46-50% for splitting
        log_progress("llm_batch_created", f"Created batch file {file_num + 1}/{total_files}", int(progress),
                    batch_number=file_num + 1, total_batches=total_files)
        print(f"Created {filename} with {len(file_comments)} comments")
    
    log_progress("llm_splitting_complete", f"Split into {total_files} batch files for AI analysis", 50)
    print(f"\nSuccessfully created {total_files} txt files!")
    return total_files

# Split comments into files
log_progress("llm_starting", "Starting LLM-based comment analysis...", 42)
total_files_created = split_comments_to_txt_files(df)

# Enhanced prompt for analysis
enhanced_prompt = """
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
[List 3-5 themes with specific examples from comments about of the content/creator/channel]

**Common Negative Themes:**
[List 3-5 themes with specific examples from comments about of the content/creator/channel]

**Viewer Suggestions:**
[Specific requests/improvements mentioned by viewers about of the content/creator/channel]

**What Viewers Appreciate:**
[What viewers like about content/creator with examples about of the content/creator/channel]

**Content Recommendations:**
[Specific suggestions for improving content based on feedback about of the content/creator/channel]

**Top Positive Comments:**
[List 3-5 positive comments with sentiment about of the content/creator/channel]

**Top Negative Comments:**
[List 3-5 negative comments with sentiment about of the content/creator/channel]

QUALITY CHECK:
✓ All comments processed: [Yes/No]
✓ Sentiment assigned to all: [Yes/No]
✓ Summary report complete: [Yes/No]

IMPORTANT: 
1. If you cannot see all comments or if any step fails, respond with "ERROR: Cannot complete analysis - please check file format"
2. After you complete the analysis of one text file, give a break of 10 seconds before processing the next text file.

BEGIN ANALYSIS NOW - PROCESS EVERY SINGLE COMMENT IN THIS FILE.
"""
log_progress("llm_prompt_ready", "AI analysis prompt prepared", 51)

# Process each file with enhanced error handling and robust completion
failed_batches = []
completed_batches = []

for file_num in range(1, total_files_created + 1):
    filepath = pathlib.Path(f'comments_batch_{file_num}.txt')
    
    # Check if file exists
    if not filepath.exists():
        print(f"Error: {filepath} not found. Skipping...")
        failed_batches.append(file_num)
        continue
    
    # Check if already processed
    analyzed_filename = f'analyzed_comments_batch_{file_num}.txt'
    if os.path.exists(analyzed_filename):
        print(f"[SKIP] {analyzed_filename} already exists. Skipping batch {file_num}...")
        completed_batches.append(file_num)
        continue
    
    # Calculate progress (51-69% for LLM processing)
    batch_progress = 51 + ((file_num - 1) / total_files_created) * 18
    log_progress("llm_processing_batch", f"AI analyzing batch {file_num}/{total_files_created}...", 
                int(batch_progress), batch_number=file_num, total_batches=total_files_created)
    
    print(f"Processing {filepath}...")
    
    # Enhanced retry logic with backoff
    max_retries = 3
    retry_count = 0
    batch_success = False
    
    while retry_count < max_retries and not batch_success:
        try:
            print(f"   Attempt {retry_count + 1}/{max_retries}...")
            
            # Read file content first to verify it's valid
            try:
                file_content = filepath.read_text(encoding='utf-8')
                if len(file_content.strip()) == 0:
                    print(f"   [WARNING] Empty file detected: {filepath}")
                    failed_batches.append(file_num)
                    break
            except Exception as e:
                print(f"   [ERROR] Cannot read file {filepath}: {e}")
                failed_batches.append(file_num)
                break
            
            # Make API call with timeout protection
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(
                        data=filepath.read_bytes(),
                        mime_type='text/plain', 
                    ),
                    enhanced_prompt
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=8192,
                )
            )
            
            # Validate response quality
            if not response or not response.text:
                print(f"   [WARNING] Empty response received. Retrying...")
                retry_count += 1
                time.sleep(3)
                continue
            
            # Check if response contains proper analysis
            required_keywords = ["SENTIMENT ANALYSIS SUMMARY", "comments processed:", "SENTIMENT BREAKDOWN"]
            if not all(keyword in response.text for keyword in required_keywords):
                print(f"   [WARNING] Incomplete analysis detected. Response missing required sections.")
                print(f"   Response preview: {response.text[:200]}...")
                retry_count += 1
                time.sleep(3)
                continue
            
            # Save the response
            try:
                with open(analyzed_filename, 'w', encoding='utf-8') as f:
                    f.write(f"ANALYSIS RESULTS FOR: {filepath.name}\n")
                    f.write("="*60 + "\n")
                    f.write(f"Processing Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"Batch Number: {file_num}/{total_files_created}\n")
                    f.write("="*60 + "\n\n")
                    f.write(response.text)
                
                # Verify file was saved correctly
                if os.path.exists(analyzed_filename) and os.path.getsize(analyzed_filename) > 100:
                    batch_complete_progress = 51 + (file_num / total_files_created) * 18
                    log_progress("llm_batch_complete", f"Completed AI analysis for batch {file_num}", 
                                int(batch_complete_progress), batch_number=file_num)
                    
                    print(f"   [SUCCESS] Analysis completed and saved to {analyzed_filename}")
                    completed_batches.append(file_num)
                    batch_success = True
                    
                    # Brief pause between successful batches to avoid rate limiting
                    time.sleep(2)
                else:
                    print(f"   [ERROR] Failed to save analysis results properly")
                    retry_count += 1
                    
            except Exception as save_error:
                print(f"   [ERROR] Failed to save analysis: {save_error}")
                retry_count += 1
                
        except Exception as e:
            retry_count += 1
            print(f"   [ERROR] API call failed on attempt {retry_count}: {e}")
            if retry_count < max_retries:
                # Exponential backoff: 5, 10, 15 seconds
                wait_time = 5 * retry_count
                print(f"   Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            else:
                print(f"   [FAILED] Giving up on batch {file_num} after {max_retries} attempts")
                failed_batches.append(file_num)
    
    # If batch failed after all retries
    if not batch_success and file_num not in failed_batches:
        failed_batches.append(file_num)

# Final processing summary
total_attempted = total_files_created
total_completed = len(completed_batches) 
total_failed = len(failed_batches)

log_progress("llm_complete", f"LLM analysis completed: {total_completed}/{total_attempted} batches successful", 69,
            completed_batches=total_completed, failed_batches=total_failed, total_batches=total_attempted)

print(f"\n{'='*60}")
print("BATCH PROCESSING SUMMARY")
print(f"{'='*60}")
print(f"Total batches created: {total_attempted}")
print(f"Successfully completed: {total_completed}")
print(f"Failed batches: {total_failed}")

if completed_batches:
    print(f"\n✅ Successfully processed batches: {', '.join(map(str, sorted(completed_batches)))}")

if failed_batches:
    print(f"\n❌ Failed batches: {', '.join(map(str, sorted(failed_batches)))}")
    print("\nYou can retry failed batches by running this script again.")
    print("Already completed batches will be skipped automatically.")

print(f"\n{'='*60}")

# Create a processing status file for reference
status_file = "llm_processing_status.json"
status_data = {
    "processing_date": time.strftime('%Y-%m-%d %H:%M:%S'),
    "total_batches": total_attempted,
    "completed_batches": completed_batches,
    "failed_batches": failed_batches,
    "success_rate": (total_completed / total_attempted * 100) if total_attempted > 0 else 0
}

try:
    with open(status_file, 'w', encoding='utf-8') as f:
        json.dump(status_data, f, indent=2)
    print(f"📊 Processing status saved to {status_file}")
except Exception as e:
    print(f"Warning: Could not save status file: {e}")

# Verify results section enhanced
log_progress("llm_verification", "Verifying LLM analysis results...", 70)
print(f"\n📋 DETAILED VERIFICATION:")
successful_batches = 0
for file_num in range(1, total_files_created + 1):
    analyzed_file = f'analyzed_comments_batch_{file_num}.txt'
    if os.path.exists(analyzed_file):
        file_size = os.path.getsize(analyzed_file)
        successful_batches += 1
        print(f"✅ {analyzed_file} - {file_size:,} bytes")
    else:
        print(f"❌ {analyzed_file} - Missing or failed")

final_success_rate = (successful_batches / total_files_created * 100) if total_files_created > 0 else 0
log_progress("llm_verified", f"LLM analysis verification complete: {successful_batches}/{total_files_created} batches ({final_success_rate:.1f}% success rate)", 71,
            successful_batches=successful_batches, total_batches=total_files_created, success_rate=final_success_rate)

print(f"\n🎯 Overall Success Rate: {final_success_rate:.1f}%")

if successful_batches == total_files_created:
    print("🎉 ALL BATCHES COMPLETED SUCCESSFULLY!")
elif successful_batches > 0:
    print(f"⚠️  Partial completion: {successful_batches}/{total_files_created} batches completed")
    print("   You can re-run this script to retry failed batches")
else:
    print("❌ No batches were completed successfully")
    print("   Please check your API key and internet connection")