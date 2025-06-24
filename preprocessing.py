import pandas as pd
import re 

df = pd.read_csv('all_comments.csv')  

symbols = ['?', '.', ',', ':', ';', '!', '@', '&', '%', '*', '^', '$']

def clean_symbols(comment):
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

df['comment'] = df['comment'].apply(clean_symbols)
    
df = df.dropna(subset=['comment'])

df.to_csv("cleaned_all_comments.csv", index=False, encoding="utf-8")

print(f"Processed dataset - {len(df)} rows remaining after cleaning")
