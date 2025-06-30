import pandas as pd
from google import genai
from google.genai import types
import os
import dotenv as env
import pathlib
import time

env.load_dotenv()

df = pd.read_csv('cleaned_all_comments.csv')
client = genai.Client(api_key = os.getenv('GEMINI_API_KEY'))

def split_comments_to_txt_files(df, comments_per_file=500, total_files=10):
    # Ensure we have the comment column
    if 'comment' not in df.columns:
        print("Error: 'comment' column not found in DataFrame")
        return 0
    
    # Remove any NaN values
    df_clean = df.dropna(subset=['comment'])
    
    # Check if we have enough comments
    total_comments = len(df_clean)
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
            
        print(f"Created {filename} with {len(file_comments)} comments")
    
    print(f"\nSuccessfully created {total_files} txt files!")
    return total_files

# Split comments into files
total_files_created = split_comments_to_txt_files(df)

# Simplified prompt focused on detailed summary report only
enhanced_prompt = '''
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
'''

# Process each file with enhanced error handling
for file_num in range(1, total_files_created + 1):
    filepath = pathlib.Path(f'comments_batch_{file_num}.txt')
    
    # Check if file exists
    if not filepath.exists():
        print(f"Error: {filepath} not found. Skipping...")
        continue
    
    print(f"Processing {filepath}...")
    
    try:
        # Add retry logic
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
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
                
                # Check if response contains analysis
                if "SENTIMENT ANALYSIS SUMMARY" in response.text and "comments processed:" in response.text:
                    # Save the response
                    analyzed_filename = f'analyzed_comments_batch_{file_num}.txt'
                    with open(analyzed_filename, 'w', encoding='utf-8') as f:
                        f.write(f"ANALYSIS RESULTS FOR: {filepath.name}\n")
                        f.write("="*60 + "\n\n")
                        f.write(response.text)
                    
                    print(f"[SUCCESS] Analysis completed and saved to {analyzed_filename}")
                    break
                else:
                    print(f"[WARNING] Incomplete analysis detected. Retrying... ({retry_count + 1}/{max_retries})")
                    retry_count += 1
                    time.sleep(2)
                    
            except Exception as e:
                retry_count += 1
                print(f"[ERROR] Error on attempt {retry_count}: {e}")
                if retry_count < max_retries:
                    time.sleep(5)
                else:
                    print(f"[ERROR] Failed to process {filepath} after {max_retries} attempts")
                    break
        
    except Exception as e:
        print(f"[ERROR] Critical error processing {filepath}: {e}")

print("\n[COMPLETE] All files processing completed!")

# Verify results
print("\n VERIFICATION SUMMARY:")
for file_num in range(1, total_files_created + 1):
    analyzed_file = f'analyzed_comments_batch_{file_num}.txt'
    if os.path.exists(analyzed_file):
        print(f"[SUCCESS] {analyzed_file} - Created successfully")
    else:
        print(f"[ERROR] {analyzed_file} - Missing or failed")