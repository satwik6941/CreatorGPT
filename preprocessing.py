import pandas as pd
import re 
import unicodedata

symbols = ['?', '.', ',', ':', ';', '!', '@', '&', '%', '*', '^', '$']

def remove_emojis(text):
    """
    Remove all types of emojis and emoji-related characters from text.
    This function uses the most comprehensive emoji detection patterns available.
    Uses multiple methods to ensure maximum emoji removal coverage.
    """
    if pd.isna(text) or not text:
        return text
    
    # Convert to string if not already
    text = str(text)
    
    # Method 1: Ultra-comprehensive emoji pattern based on Unicode 15.0 ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002700-\U000027BF"  # dingbats
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols and pictographs extended-A
        "\U00002600-\U000026FF"  # miscellaneous symbols
        "\U00002B00-\U00002BFF"  # miscellaneous symbols and arrows
        "\U0001F780-\U0001F7FF"  # geometric shapes extended
        "\U0001F800-\U0001F8FF"  # supplemental arrows-C
        "\U00002190-\U000021FF"  # arrows
        "\U000025A0-\U000025FF"  # geometric shapes
        "\U0000FE00-\U0000FE0F"  # variation selectors
        "\U0000200D"             # zero width joiner
        "\U000020E3"             # combining enclosing keycap
        "\U0001F004"             # mahjong tile red dragon
        "\U0001F0CF"             # playing card black joker
        "\U0001F170-\U0001F171"  # A/B button
        "\U0001F17E-\U0001F17F"  # O button
        "\U0001F18E"             # AB button
        "\U0001F191-\U0001F19A"  # CL-VS buttons
        "\U0001F201-\U0001F202"  # squared Katakana Koko
        "\U0001F21A"             # squared CJK unified ideograph-7981
        "\U0001F22F"             # squared CJK unified ideograph-6307
        "\U0001F232-\U0001F23A"  # squared CJK unified ideographs
        "\U0001F250-\U0001F251"  # circled ideographs
        "\U0001F100-\U0001F1FF"  # enclosed alphanumeric supplement
        "\U00003030"             # wavy dash
        "\U0000303D"             # part alternation mark
        "\U00003297"             # circled ideograph congratulation
        "\U00003299"             # circled ideograph secret
        "\U000000A9"             # copyright
        "\U000000AE"             # registered
        "\U000000B0"             # degree sign
        "\U00002122"             # trade mark sign
        "\U00002139"             # information source
        "\U00002194-\U00002199"  # arrow symbols
        "\U000021A9-\U000021AA"  # leftwards/rightwards arrow with hook
        "\U0000231A-\U0000231B"  # watch, hourglass
        "\U00002328"             # keyboard
        "\U000023CF"             # eject symbol
        "\U000023E9-\U000023F3"  # fast forward to alarm clock
        "\U000023F8-\U000023FA"  # pause to record
        "\U00002934-\U00002935"  # arrow pointing rightwards then curving
        "\U00002B05-\U00002B07"  # leftwards/upwards/downwards black arrow
        "\U00002B1B-\U00002B1C"  # black/white large square
        "\U00002B50"             # white medium star
        "\U00002B55"             # heavy large circle
        "]+", flags=re.UNICODE)
    
    # Remove emojis using pattern
    text = emoji_pattern.sub('', text)
    
    # Method 2: Remove characters by Unicode category
    # This catches emojis that might not be in the explicit ranges above
    text = ''.join(char for char in text if unicodedata.category(char) not in ['So', 'Sm'])
    
    # Method 3: Additional comprehensive cleanup for emoji modifiers and zero-width characters
    text = re.sub(r'[\u200d\ufe0f\u200c\u2060\ufeff\u061c\u200e\u200f]', '', text)  # zero-width chars
    text = re.sub(r'[\U0001F3FB-\U0001F3FF]', '', text)  # skin tone modifiers
    text = re.sub(r'[\u20e0-\u20ff]', '', text)  # combining diacritical marks for symbols
    
    # Method 4: Remove any remaining high Unicode characters that might be emoji-related
    # This is more aggressive and removes all supplementary plane characters
    text = re.sub(r'[\U00010000-\U0010FFFF]', '', text)  # remove all high plane Unicode
    
    # Clean up extra spaces that might be left after emoji removal
    text = ' '.join(text.split())
    
    return text

def clean_comment_text(comment):
    """Clean individual comment text by removing URLs, emojis, and unwanted symbols"""
    if pd.isna(comment):  
        return comment
    
    comment = str(comment).lower().strip()
    
    # Check for URLs and skip if found
    url_pattern = r'http[s]?://\S+|www\.\S+'
    if re.search(url_pattern, comment, re.IGNORECASE):
        return None
    
    # Remove all emojis using the comprehensive dedicated function
    comment = remove_emojis(comment)
    
    # Remove specified symbols
    for symbol in symbols:
        comment = comment.replace(symbol, '')  
        
    # Remove leading non-alphanumeric characters
    while len(comment) > 0 and not (comment[0].isalpha() or comment[0].isdigit()):
        comment = comment[1:]
        
    # Final cleanup - remove extra whitespace
    comment = ' '.join(comment.split())
        
    return comment

def clean_symbols(csv_file_path):
    """Clean symbols from comments in the specified CSV file"""
    try:
        df = pd.read_csv(csv_file_path, encoding='utf-8')
        print(f"Loading {len(df)} comments from {csv_file_path}")
    except FileNotFoundError:
        print(f"Error: {csv_file_path} not found!")
        return None
    except UnicodeDecodeError:
        try:
            # Try with different encoding if utf-8 fails
            df = pd.read_csv(csv_file_path, encoding='latin-1')
            print(f"Loading {len(df)} comments from {csv_file_path} (using latin-1 encoding)")
        except:
            print(f"Error: Could not read {csv_file_path} with any encoding!")
            return None
    
    # Apply cleaning function to comments
    df['comment'] = df['comment'].apply(clean_comment_text)
    
    # Remove rows where comments became None (had URLs) or empty after cleaning
    df = df.dropna(subset=['comment'])
    df = df[df['comment'].str.strip() != '']
    
    # Save cleaned data with explicit UTF-8 encoding
    output_file = "cleaned_all_comments.csv"
    df.to_csv(output_file, index=False, encoding="utf-8")
    
    print(f"Processed dataset - {len(df)} rows remaining after cleaning")
    print(f"Cleaned comments saved to {output_file}")
    
    return df

def test_emoji_removal():
    """Test function to verify emoji removal works properly"""
    test_strings = [
        "Hello 😀 world! 🌍",
        "This is awesome! 🔥💯✨",
        "Love this ❤️💙💚💛",
        "Testing 🤣🤡🎉 emojis",
        "Some text with 🚀🛿🇺🇸 flags and transport",
        "Mixed content: abc 😊 123 🎈 xyz",
        "No emojis here just text",
        "🎵🎶🎸🥁 music symbols",
        "👨‍👩‍👧‍👦 family emoji with joiners"
    ]
    
    print("Testing emoji removal function:")
    print("-" * 50)
    
    for test_str in test_strings:
        cleaned = remove_emojis(test_str)
        print(f"Original: {test_str}")
        print(f"Cleaned:  '{cleaned}'")
        print()

if __name__ == "__main__":
    # Run test to verify emoji removal
    test_emoji_removal()
    
    # Example usage
    # df = clean_symbols("all_comments.csv")
