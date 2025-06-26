import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from collections import Counter
import warnings

warnings.filterwarnings('ignore')

# Set up plotting style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class SentimentAnalyzer:
    def __init__(self, model_name="cardiffnlp/twitter-roberta-base-sentiment-latest"):
        print(f"Loading model: {model_name}")
        
        # Properly detect CUDA device
        if torch.cuda.is_available():
            device = 0  # Use first GPU device (device 0)
            print(f"CUDA available. Using GPU device: {device}")
        else:
            device = -1  # Use CPU
            print("CUDA not available. Using CPU")
        
        # Initialize the sentiment analysis pipeline
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=model_name,
            tokenizer=model_name,
            device=device
        )
        
        # Load tokenizer for text preprocessing
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        print("Model loaded successfully!")
    
    def preprocess_text(self, text):
        """Clean and preprocess text for better sentiment analysis"""
        if pd.isna(text) or text == "":
            return ""
        
        # Convert to string and clean
        text = str(text).strip()
        
        # Truncate if too long (model limit is usually 512 tokens)
        if len(self.tokenizer.encode(text)) > 510:
            tokens = self.tokenizer.encode(text, truncation=True, max_length=510)
            text = self.tokenizer.decode(tokens, skip_special_tokens=True)
        
        return text
    
    def _convert_to_score(self, sentiment, confidence):
        """Convert sentiment label and confidence to 0-100 score using confidence directly"""
        # Simple scoring: confidence * 100 for all sentiments
        return int(confidence * 100)

    def analyze_sentiment(self, comments_df):
        """
        Analyze sentiment for all comments in the DataFrame with improved distribution
        """
        print("Starting sentiment analysis...")
        
        # Ensure we have a 'comment' column
        if 'comment' not in comments_df.columns:
            raise ValueError("DataFrame must have a 'comment' column")
        
        # Preprocess comments
        comments_df['cleaned_comment'] = comments_df['comment'].apply(self.preprocess_text)
        
        # Filter out empty comments
        valid_comments = comments_df[comments_df['cleaned_comment'] != ''].copy()
        
        print(f"Analyzing {len(valid_comments)} valid comments...")
        
        # Batch process for efficiency
        batch_size = 50
        sentiments = []
        confidence_scores = []
        
        for i in range(0, len(valid_comments), batch_size):
            batch = valid_comments['cleaned_comment'].iloc[i:i+batch_size].tolist()
            
            try:
                results = self.sentiment_pipeline(batch)
                
                for result in results:
                    sentiments.append(result['label'])
                    confidence_scores.append(result['score'])
                    
            except Exception as e:
                print(f"Error processing batch {i//batch_size + 1}: {e}")
                # Fill with neutral for failed batch
                for _ in batch:
                    sentiments.append('NEUTRAL')
                    confidence_scores.append(0.5)
            
            # Progress update
            if i % (batch_size * 10) == 0:
                print(f"Processed {min(i + batch_size, len(valid_comments))}/{len(valid_comments)} comments")
        
        # Add results to DataFrame
        valid_comments['sentiment'] = sentiments
        valid_comments['confidence'] = confidence_scores
        
        # Map labels to standardized format
        label_mapping = {
            'POSITIVE': 'Positive',
            'NEGATIVE': 'Negative', 
            'NEUTRAL': 'Neutral',
            'positive': 'Positive',  # Added lowercase variants
            'negative': 'Negative',
            'neutral': 'Neutral',
            'LABEL_0': 'Negative',  
            'LABEL_1': 'Neutral',
            'LABEL_2': 'Positive'
        }
        
        valid_comments['sentiment'] = valid_comments['sentiment'].map(label_mapping).fillna('Neutral')
        
        # Convert to sentiment scores with confidence-based system
        valid_comments['sentiment_score'] = valid_comments.apply(
            lambda row: self._convert_to_score(row['sentiment'], row['confidence']), axis=1
        )
        
        # Ensure scores are within bounds
        valid_comments['sentiment_score'] = valid_comments['sentiment_score'].clip(0, 100)
        
        # Final adjustment: ensure we have some distribution
        score_distribution = valid_comments['sentiment_score'].describe()
        print(f"Score distribution - Min: {score_distribution['min']:.1f}, Max: {score_distribution['max']:.1f}, Mean: {score_distribution['mean']:.1f}")
        
        # Print distribution summary
        positive_pct = (valid_comments['sentiment'] == 'Positive').mean() * 100
        neutral_pct = (valid_comments['sentiment'] == 'Neutral').mean() * 100
        negative_pct = (valid_comments['sentiment'] == 'Negative').mean() * 100
        print(f"Sentiment distribution - Positive: {positive_pct:.1f}%, Neutral: {neutral_pct:.1f}%, Negative: {negative_pct:.1f}%")
        
        # Debug: Show some examples of raw model output
        print("\nFirst 5 raw model predictions:")
        for i in range(min(5, len(valid_comments))):
            row = valid_comments.iloc[i]
            print(f"Comment: {row['comment'][:50]}...")
            print(f"Raw sentiment: {sentiments[i]} | Confidence: {confidence_scores[i]:.3f}")
            print(f"Mapped sentiment: {row['sentiment']} | Final score: {row['sentiment_score']}")
            print("-" * 40)
        
        print("Sentiment analysis completed!")
        return valid_comments
    
    def save_detailed_results(self, df, filename='detailed_sentiment_results.txt'):
        """Save detailed results to a text file with each comment and its sentiment"""
        print(f"Saving detailed results to {filename}...")
        
        with open(filename, 'w', encoding='utf-8') as f:
            # Header
            f.write("DETAILED SENTIMENT ANALYSIS RESULTS\n")
            f.write("="*60 + "\n\n")
            f.write(f"Total Comments Analyzed: {len(df):,}\n")
            f.write(f"Analysis Date: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("\nSimplified Scoring System:\n")
            f.write("• Score = Confidence × 100 (for all sentiments)\n")
            f.write("• Range: 0-100 based purely on model confidence\n")
            f.write("\n" + "="*60 + "\n\n")
            
            # Individual comments
            for idx, row in df.iterrows():
                f.write(f"COMMENT #{idx + 1}\n")
                f.write("-" * 30 + "\n")
                f.write(f"Text: {row['comment']}\n")
                f.write(f"Sentiment: {row['sentiment']}\n")
                f.write(f"Score: {row['sentiment_score']}/100\n")
                f.write(f"Confidence: {row['confidence']:.3f}\n")
                
                # Add interpretation
                if row['sentiment_score'] >= 65:
                    interpretation = "Positive feedback"
                elif row['sentiment_score'] >= 35:
                    interpretation = "Neutral/Mixed feedback"
                else:
                    interpretation = "Negative feedback"
                f.write(f"Interpretation: {interpretation}\n")
                f.write("\n" + "="*60 + "\n\n")
            
            # Summary statistics at the end
            f.write("SUMMARY STATISTICS\n")
            f.write("="*60 + "\n")
            
            positive_count = len(df[df['sentiment'] == 'Positive'])
            neutral_count = len(df[df['sentiment'] == 'Neutral'])
            negative_count = len(df[df['sentiment'] == 'Negative'])
            
            f.write(f"Positive Comments: {positive_count:,} ({positive_count/len(df)*100:.1f}%)\n")
            f.write(f"Neutral Comments: {neutral_count:,} ({neutral_count/len(df)*100:.1f}%)\n")
            f.write(f"Negative Comments: {negative_count:,} ({negative_count/len(df)*100:.1f}%)\n")
            f.write(f"Average Sentiment Score: {df['sentiment_score'].mean():.1f}/100\n")
            f.write(f"Average Model Confidence: {df['confidence'].mean():.3f}\n")
            
            # Updated score range breakdown
            f.write("\nScore Range Breakdown:\n")
            very_positive = len(df[df['sentiment_score'] >= 80])
            positive = len(df[(df['sentiment_score'] >= 60) & (df['sentiment_score'] < 80)])
            neutral = len(df[(df['sentiment_score'] >= 40) & (df['sentiment_score'] < 60)])
            negative = len(df[(df['sentiment_score'] >= 20) & (df['sentiment_score'] < 40)])
            very_negative = len(df[df['sentiment_score'] < 20])
            
            f.write(f"Very High Confidence (80-100): {very_positive:,} comments\n")
            f.write(f"High Confidence (60-79): {positive:,} comments\n")
            f.write(f"Medium Confidence (40-59): {neutral:,} comments\n")
            f.write(f"Low Confidence (20-39): {negative:,} comments\n")
            f.write(f"Very Low Confidence (0-19): {very_negative:,} comments\n")
        
        print(f"Detailed results saved to {filename}")
    
    def generate_visualizations(self, df, channel_name="YouTube Channel"):
        """Generate comprehensive visualization graphs with updated score ranges"""
        
        print("Generating visualizations...")
        
        # Create a large figure with multiple subplots
        fig = plt.figure(figsize=(20, 16))
        
        # 1. Sentiment Distribution (Pie Chart)
        plt.subplot(3, 3, 1)
        sentiment_counts = df['sentiment'].value_counts()
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']
        plt.pie(sentiment_counts.values, labels=sentiment_counts.index, autopct='%1.1f%%', 
                colors=colors, startangle=90)
        plt.title(f'Sentiment Distribution\n{channel_name}', fontsize=14, fontweight='bold')
        
        # 2. Sentiment Score Distribution (Histogram)
        plt.subplot(3, 3, 2)
        plt.hist(df['sentiment_score'], bins=20, color='skyblue', alpha=0.7, edgecolor='black')
        plt.axvline(df['sentiment_score'].mean(), color='red', linestyle='--', 
                    label=f'Mean: {df["sentiment_score"].mean():.1f}')
        # Add confidence indicators
        plt.axvline(50, color='orange', linestyle=':', alpha=0.7, label='Neutral/50% Confidence')
        plt.xlabel('Sentiment Score (0-100)')
        plt.ylabel('Number of Comments')
        plt.title('Confidence-Based Score Distribution', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 3. Confidence Score Distribution
        plt.subplot(3, 3, 3)
        plt.hist(df['confidence'], bins=20, color='lightgreen', alpha=0.7, edgecolor='black')
        plt.axvline(df['confidence'].mean(), color='red', linestyle='--',
                    label=f'Mean: {df["confidence"].mean():.2f}')
        plt.xlabel('Confidence Score')
        plt.ylabel('Number of Comments')
        plt.title('Model Confidence Distribution', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 4. Sentiment vs Confidence Scatter Plot
        plt.subplot(3, 3, 4)
        sentiment_colors = {'Positive': '#FF6B6B', 'Neutral': '#4ECDC4', 'Negative': '#45B7D1'}
        for sentiment in df['sentiment'].unique():
            subset = df[df['sentiment'] == sentiment]
            plt.scatter(subset['confidence'], subset['sentiment_score'], 
                        c=sentiment_colors[sentiment], label=sentiment, alpha=0.6)
        plt.xlabel('Confidence Score')
        plt.ylabel('Sentiment Score (0-100)')
        plt.title('Sentiment Score vs Model Confidence', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 5. Top Positive Keywords
        plt.subplot(3, 3, 5)
        positive_comments = df[df['sentiment'] == 'Positive']['comment'].astype(str)
        positive_words = ' '.join(positive_comments).lower().split()
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'a', 'an'}
        positive_words = [word for word in positive_words if len(word) > 2 and word not in stop_words]
        top_positive = Counter(positive_words).most_common(10)
        
        if top_positive:
            words, counts = zip(*top_positive)
            plt.barh(range(len(words)), counts, color='lightcoral')
            plt.yticks(range(len(words)), words)
            plt.xlabel('Frequency')
            plt.title('Top Words in Positive Comments', fontsize=14, fontweight='bold')
            plt.gca().invert_yaxis()
        
        # 6. Top Negative Keywords
        plt.subplot(3, 3, 6)
        negative_comments = df[df['sentiment'] == 'Negative']['comment'].astype(str)
        negative_words = ' '.join(negative_comments).lower().split()
        negative_words = [word for word in negative_words if len(word) > 2 and word not in stop_words]
        top_negative = Counter(negative_words).most_common(10)
        
        if top_negative:
            words, counts = zip(*top_negative)
            plt.barh(range(len(words)), counts, color='lightblue')
            plt.yticks(range(len(words)), words)
            plt.xlabel('Frequency')
            plt.title('Top Words in Negative Comments', fontsize=14, fontweight='bold')
            plt.gca().invert_yaxis()
        
        # 7. Updated Sentiment Score Range Analysis
        plt.subplot(3, 3, 7)
        score_ranges = ['Very Low\n(0-19)', 'Low\n(20-39)', 'Medium\n(40-59)', 
                        'High\n(60-79)', 'Very High\n(80-100)']
        range_counts = [
            len(df[df['sentiment_score'] < 20]),
            len(df[(df['sentiment_score'] >= 20) & (df['sentiment_score'] < 40)]),
            len(df[(df['sentiment_score'] >= 40) & (df['sentiment_score'] < 60)]),
            len(df[(df['sentiment_score'] >= 60) & (df['sentiment_score'] < 80)]),
            len(df[df['sentiment_score'] >= 80])
        ]
        
        colors = ['#FF0000', '#FF6666', '#FFCC44', '#88DD88', '#00CC00']
        bars = plt.bar(score_ranges, range_counts, color=colors)
        plt.ylabel('Number of Comments')
        plt.title('Comments by Confidence Level', fontsize=14, fontweight='bold')
        plt.xticks(rotation=45)
        
        # Add value labels on bars
        for bar, count in zip(bars, range_counts):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5, 
                    str(count), ha='center', va='bottom')
        
        # 8. Updated Summary Statistics Box
        plt.subplot(3, 3, 8)
        plt.axis('off')
        
        stats_text = f"""
        SENTIMENT ANALYSIS SUMMARY
        (Confidence-Based Scoring)
        
        Total Comments Analyzed: {len(df):,}
        
        Sentiment Breakdown:
        • Positive: {len(df[df['sentiment'] == 'Positive']):,} ({len(df[df['sentiment'] == 'Positive'])/len(df)*100:.1f}%)
        • Neutral: {len(df[df['sentiment'] == 'Neutral']):,} ({len(df[df['sentiment'] == 'Neutral'])/len(df)*100:.1f}%)
        • Negative: {len(df[df['sentiment'] == 'Negative']):,} ({len(df[df['sentiment'] == 'Negative'])/len(df)*100:.1f}%)
        
        Average Score: {df['sentiment_score'].mean():.1f}/100
        
        Score = Confidence × 100
        (Inverted for Negative sentiment)
        
        Engagement Quality:
        {'🟢 High Confidence' if df['sentiment_score'].mean() > 60 else '🟡 Medium Confidence' if df['sentiment_score'].mean() > 40 else '🔴 Low Confidence'}
        """
        
        plt.text(0.1, 0.9, stats_text, transform=plt.gca().transAxes, fontsize=11,
                verticalalignment='top', bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray"))
        
        # 9. Comment Length vs Sentiment
        plt.subplot(3, 3, 9)
        df['comment_length'] = df['comment'].astype(str).str.len()
        
        for sentiment in df['sentiment'].unique():
            subset = df[df['sentiment'] == sentiment]
            plt.scatter(subset['comment_length'], subset['sentiment_score'], 
                        c=sentiment_colors[sentiment], label=sentiment, alpha=0.6)
        
        plt.xlabel('Comment Length (characters)')
        plt.ylabel('Sentiment Score')
        plt.title('Comment Length vs Sentiment', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('sentiment_analysis_dashboard.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Visualizations saved as 'sentiment_analysis_dashboard.png'")

def main():
    """Main function to run sentiment analysis"""
    
    # Load the cleaned comments data
    try:
        df = pd.read_csv('cleaned_all_comments.csv')
        print(f"Loaded {len(df)} comments from cleaned_all_comments.csv")
    except FileNotFoundError:
        print("Error: cleaned_all_comments.csv not found!")
        print("Please run the YouTube comment extraction script first.")
        return
    
    # Initialize sentiment analyzer
    analyzer = SentimentAnalyzer()
    
    # Perform sentiment analysis
    analyzed_df = analyzer.analyze_sentiment(df)
    
    # Get channel name if available
    channel_name = analyzed_df['channel_name'].iloc[0] if 'channel_name' in analyzed_df.columns else "YouTube Channel"
    
    # Save detailed results to text file
    analyzer.save_detailed_results(analyzed_df)
    
    # Generate visualizations
    analyzer.generate_visualizations(analyzed_df, channel_name)
    
    # Print summary with updated ranges
    print("\n" + "="*60)
    print("SENTIMENT ANALYSIS COMPLETE")
    print("="*60)
    print("Simplified Scoring System:")
    print("• Score = Confidence × 100 (for all sentiments)")
    print("• Higher score = higher model confidence")
    print("-" * 40)
    print(f"Total comments analyzed: {len(analyzed_df):,}")
    print(f"Average sentiment score: {analyzed_df['sentiment_score'].mean():.1f}/100")
    print(f"Positive comments: {len(analyzed_df[analyzed_df['sentiment'] == 'Positive']):,} ({len(analyzed_df[analyzed_df['sentiment'] == 'Positive'])/len(analyzed_df)*100:.1f}%)")
    print(f"Neutral comments: {len(analyzed_df[analyzed_df['sentiment'] == 'Neutral']):,} ({len(analyzed_df[analyzed_df['sentiment'] == 'Neutral'])/len(analyzed_df)*100:.1f}%)")
    print(f"Negative comments: {len(analyzed_df[analyzed_df['sentiment'] == 'Negative']):,} ({len(analyzed_df[analyzed_df['sentiment'] == 'Negative'])/len(analyzed_df)*100:.1f}%)")

if __name__ == "__main__":
    main()