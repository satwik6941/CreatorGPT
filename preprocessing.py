import pandas as pd
import re 

symbols = ['?', '.', ',', ':', ';', '!', '@', '&', '%', '*', '^', '$']

def clean_comment_text(comment):
    """Clean individual comment text"""
    if pd.isna(comment):  
        return comment
    
    comment = str(comment).lower().strip()
    
    url_pattern = r'http[s]?://\S+|www\.\S+'
    if re.search(url_pattern, comment, re.IGNORECASE):
        return None
    
    # Updated emoji pattern to catch more emoji ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002700-\U000027BF"  # dingbats
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001F900-\U0001F9FF"  # supplemental symbols (includes 🤣)
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols and pictographs extended-A (includes 🥲)
        "\U00002600-\U000026FF"  # miscellaneous symbols
        "\U00002B00-\U00002BFF"  # miscellaneous symbols and arrows
        "]+", flags=re.UNICODE)
    comment = emoji_pattern.sub(r'', comment)
    
    for symbol in symbols:
        comment = comment.replace(symbol, '')  
        
    while len(comment) > 0 and not (comment[0].isalpha() or comment[0].isdigit()):
        comment = comment[1:]
    return comment

def clean_symbols(csv_file_path):
    """Clean symbols from comments in the specified CSV file"""
    try:
        df = pd.read_csv(csv_file_path)
        print(f"Loading {len(df)} comments from {csv_file_path}")
    except FileNotFoundError:
        print(f"Error: {csv_file_path} not found!")
        return None
    
    # Apply cleaning function to comments
    df['comment'] = df['comment'].apply(clean_comment_text)
    
    # Remove rows where comments became None (had URLs)
    df = df.dropna(subset=['comment'])
    
    # Save cleaned data
    output_file = "cleaned_all_comments.csv"
    df.to_csv(output_file, index=False, encoding="utf-8")
    
    print(f"Processed dataset - {len(df)} rows remaining after cleaning")
    print(f"Cleaned comments saved to {output_file}")
    
    return df