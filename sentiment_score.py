import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from collections import Counter
import warnings
import json

warnings.filterwarnings('ignore')

def log_progress(step, message, progress, **kwargs):
    """Log progress in a format that the API can parse"""
    from datetime import datetime
    
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

# Set up plotting style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class SentimentAnalyzer:
    def __init__(self, model_name="cardiffnlp/twitter-roberta-base-sentiment-latest"):
        log_progress("sentiment_init", "Initializing sentiment analysis model...", 72)
        print(f"Loading model: {model_name}")
        
        # Properly detect CUDA device
        if torch.cuda.is_available():
            device = 0  # Use first GPU device (device 0)
            print(f"CUDA available. Using GPU device: {device}")
        else:
            device = -1  # Use CPU
            print("CUDA not available. Using CPU")
        
        log_progress("sentiment_loading", "Loading transformer model and tokenizer...", 74)
        
        # Initialize the sentiment analysis pipeline
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=model_name,
            tokenizer=model_name,
            device=device
        )
        
        # Load tokenizer for text preprocessing
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        log_progress("sentiment_model_ready", "Sentiment analysis model loaded successfully!", 76)
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
        log_progress("sentiment_starting", "Starting sentiment analysis on comments...", 78)
        print("Starting sentiment analysis...")
        
        # Ensure we have a 'comment' column
        if 'comment' not in comments_df.columns:
            raise ValueError("DataFrame must have a 'comment' column")
        
        log_progress("sentiment_preprocessing", "Preprocessing comments for analysis...", 80)
        
        # Preprocess comments
        comments_df['cleaned_comment'] = comments_df['comment'].apply(self.preprocess_text)
        
        # Filter out empty comments
        valid_comments = comments_df[comments_df['cleaned_comment'] != ''].copy()
        
        log_progress("sentiment_batch_prep", f"Analyzing {len(valid_comments)} valid comments...", 82,
                    total_comments=len(valid_comments))
        print(f"Analyzing {len(valid_comments)} valid comments...")
        
        # Batch process for efficiency
        batch_size = 50
        sentiments = []
        confidence_scores = []
        total_batches = (len(valid_comments) + batch_size - 1) // batch_size
        
        for i in range(0, len(valid_comments), batch_size):
            batch_num = i // batch_size + 1
            batch = valid_comments['cleaned_comment'].iloc[i:i+batch_size].tolist()
            
            # Progress: 82-90% for batch processing
            batch_progress = 82 + (batch_num / total_batches) * 8
            log_progress("sentiment_processing_batch", f"Processing sentiment batch {batch_num}/{total_batches}...", 
                        int(batch_progress), batch_number=batch_num, total_batches=total_batches)
            
            try:
                results = self.sentiment_pipeline(batch)
                
                for result in results:
                    sentiments.append(result['label'])
                    confidence_scores.append(result['score'])
                    
            except Exception as e:
                print(f"Error processing batch {batch_num}: {e}")
                # Fill with neutral for failed batch
                for _ in batch:
                    sentiments.append('NEUTRAL')
                    confidence_scores.append(0.5)
            
            # Progress update for larger batches
            if batch_num % 10 == 0 or batch_num == total_batches:
                processed = min(i + batch_size, len(valid_comments))
                log_progress("sentiment_batch_update", f"Processed {processed}/{len(valid_comments)} comments", 
                           int(batch_progress), processed=processed, total=len(valid_comments))
                print(f"Processed {processed}/{len(valid_comments)} comments")
        
        log_progress("sentiment_post_processing", "Post-processing sentiment results...", 90)
        
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
        
        log_progress("sentiment_calculating_stats", "Calculating sentiment distribution statistics...", 92)
        
        # Final adjustment: ensure we have some distribution
        score_distribution = valid_comments['sentiment_score'].describe()
        print(f"Score distribution - Min: {score_distribution['min']:.1f}, Max: {score_distribution['max']:.1f}, Mean: {score_distribution['mean']:.1f}")
        
        # Print distribution summary
        positive_pct = (valid_comments['sentiment'] == 'Positive').mean() * 100
        neutral_pct = (valid_comments['sentiment'] == 'Neutral').mean() * 100
        negative_pct = (valid_comments['sentiment'] == 'Negative').mean() * 100
        
        log_progress("sentiment_analysis_complete", 
                    f"Sentiment analysis complete: {positive_pct:.1f}% positive, {neutral_pct:.1f}% neutral, {negative_pct:.1f}% negative", 
                    94, positive_pct=positive_pct, neutral_pct=neutral_pct, negative_pct=negative_pct)
        
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
        log_progress("sentiment_saving", f"Saving detailed results to {filename}...", 95)
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
        
        log_progress("sentiment_visualization", "Generating sentiment analysis visualizations...", 96)
        print("Generating visualizations...")
        
        # Create a large figure with multiple subplots
        fig = plt.figure(figsize=(24, 20))
        
        # 1. Sentiment Distribution (Pie Chart)
        plt.subplot(4, 4, 1)
        sentiment_counts = df['sentiment'].value_counts()
        colors = ['#2E8B57', '#FF6B6B', '#4ECDC4']  # Green for positive, red for negative, teal for neutral
        explode = (0.1, 0, 0)  # Explode positive slice slightly
        plt.pie(sentiment_counts.values, labels=sentiment_counts.index, autopct='%1.1f%%', 
                colors=colors, startangle=90, explode=explode, shadow=True)
        plt.title(f'Overall Sentiment Distribution\n{channel_name}', fontsize=14, fontweight='bold')
        
        # 2. Sentiment Score Distribution (Histogram)
        plt.subplot(4, 4, 2)
        plt.hist(df['sentiment_score'], bins=25, color='skyblue', alpha=0.7, edgecolor='black')
        plt.axvline(df['sentiment_score'].mean(), color='red', linestyle='--', linewidth=2,
                    label=f'Mean: {df["sentiment_score"].mean():.1f}')
        plt.axvline(50, color='orange', linestyle=':', alpha=0.7, label='Neutral/50% Confidence')
        plt.xlabel('Sentiment Score (0-100)')
        plt.ylabel('Number of Comments')
        plt.title('Confidence-Based Score Distribution', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 3. Confidence Score Distribution
        plt.subplot(4, 4, 3)
        plt.hist(df['confidence'], bins=25, color='lightgreen', alpha=0.7, edgecolor='black')
        plt.axvline(df['confidence'].mean(), color='red', linestyle='--', linewidth=2,
                    label=f'Mean: {df["confidence"].mean():.2f}')
        plt.xlabel('Model Confidence Score')
        plt.ylabel('Number of Comments')
        plt.title('AI Model Confidence Distribution', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 4. Sentiment vs Confidence Scatter Plot
        plt.subplot(4, 4, 4)
        sentiment_colors = {'Positive': '#2E8B57', 'Negative': '#FF6B6B', 'Neutral': '#4ECDC4'}
        for sentiment in df['sentiment'].unique():
            subset = df[df['sentiment'] == sentiment]
            plt.scatter(subset['confidence'], subset['sentiment_score'], 
                        c=sentiment_colors[sentiment], label=sentiment, alpha=0.6, s=30)
        plt.xlabel('Model Confidence Score')
        plt.ylabel('Sentiment Score (0-100)')
        plt.title('Sentiment Score vs Model Confidence', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 5. Top Positive Keywords (Enhanced)
        plt.subplot(4, 4, 5)
        positive_comments = df[df['sentiment'] == 'Positive']['comment'].astype(str)
        positive_words = ' '.join(positive_comments).lower().split()
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'a', 'an', 'you', 'your', 'it', 'its', 'i', 'my', 'me', 'we', 'us', 'they', 'them', 'he', 'she', 'him', 'her'}
        positive_words = [word for word in positive_words if len(word) > 2 and word not in stop_words]
        top_positive = Counter(positive_words).most_common(12)
        
        if top_positive:
            words, counts = zip(*top_positive)
            bars = plt.barh(range(len(words)), counts, color='lightcoral')
            plt.yticks(range(len(words)), words)
            plt.xlabel('Frequency')
            plt.title('Top Words in Positive Comments', fontsize=14, fontweight='bold')
            plt.gca().invert_yaxis()
            # Add value labels
            for i, bar in enumerate(bars):
                plt.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, 
                        str(counts[i]), va='center', ha='left', fontsize=9)
        
        # 6. Top Negative Keywords (Enhanced)
        plt.subplot(4, 4, 6)
        negative_comments = df[df['sentiment'] == 'Negative']['comment'].astype(str)
        negative_words = ' '.join(negative_comments).lower().split()
        negative_words = [word for word in negative_words if len(word) > 2 and word not in stop_words]
        top_negative = Counter(negative_words).most_common(12)
        
        if top_negative:
            words, counts = zip(*top_negative)
            bars = plt.barh(range(len(words)), counts, color='lightblue')
            plt.yticks(range(len(words)), words)
            plt.xlabel('Frequency')
            plt.title('Top Words in Negative Comments', fontsize=14, fontweight='bold')
            plt.gca().invert_yaxis()
            # Add value labels
            for i, bar in enumerate(bars):
                plt.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, 
                        str(counts[i]), va='center', ha='left', fontsize=9)
        
        # 7. Sentiment Score Range Analysis (Enhanced)
        plt.subplot(4, 4, 7)
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
                    str(count), ha='center', va='bottom', fontweight='bold')
        
        # 8. Enhanced Summary Statistics Box
        plt.subplot(4, 4, 8)
        plt.axis('off')
        
        avg_score = df['sentiment_score'].mean()
        confidence_level = "🟢 High Engagement" if avg_score > 60 else "🟡 Medium Engagement" if avg_score > 40 else "🔴 Low Engagement"
        
        stats_text = f"""
        📊 SENTIMENT ANALYSIS SUMMARY
        
        📝 Total Comments: {len(df):,}
        📊 Average Score: {avg_score:.1f}/100
        
        🔍 Sentiment Breakdown:
        ✅ Positive: {len(df[df['sentiment'] == 'Positive']):,} ({len(df[df['sentiment'] == 'Positive'])/len(df)*100:.1f}%)
        ⚪ Neutral: {len(df[df['sentiment'] == 'Neutral']):,} ({len(df[df['sentiment'] == 'Neutral'])/len(df)*100:.1f}%)
        ❌ Negative: {len(df[df['sentiment'] == 'Negative']):,} ({len(df[df['sentiment'] == 'Negative'])/len(df)*100:.1f}%)
        
        🎯 Engagement Quality:
        {confidence_level}
        
        📈 Model Performance:
        Avg Confidence: {df['confidence'].mean():.2f}
        """
        
        plt.text(0.05, 0.95, stats_text, transform=plt.gca().transAxes, fontsize=11,
                verticalalignment='top', bbox=dict(boxstyle="round,pad=0.5", facecolor="lightgray", alpha=0.8))
        
        # 9. Comment Length vs Sentiment (Enhanced)
        plt.subplot(4, 4, 9)
        df['comment_length'] = df['comment'].astype(str).str.len()
        
        for sentiment in df['sentiment'].unique():
            subset = df[df['sentiment'] == sentiment]
            plt.scatter(subset['comment_length'], subset['sentiment_score'], 
                        c=sentiment_colors[sentiment], label=sentiment, alpha=0.6, s=30)
        
        plt.xlabel('Comment Length (characters)')
        plt.ylabel('Sentiment Score')
        plt.title('Comment Length vs Sentiment', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 10. NEW: Sentiment Trend (by comment order)
        plt.subplot(4, 4, 10)
        # Create a rolling average of sentiment scores
        window_size = max(1, len(df) // 20)  # Dynamic window size
        df_sorted = df.reset_index(drop=True)
        rolling_sentiment = df_sorted['sentiment_score'].rolling(window=window_size).mean()
        
        plt.plot(range(len(df)), rolling_sentiment, color='purple', linewidth=2, alpha=0.8)
        plt.axhline(y=50, color='gray', linestyle='--', alpha=0.5, label='Neutral Line')
        plt.axhline(y=df['sentiment_score'].mean(), color='red', linestyle='-', alpha=0.7, 
                   label=f'Overall Avg: {df["sentiment_score"].mean():.1f}')
        plt.xlabel('Comment Index')
        plt.ylabel('Sentiment Score (Rolling Avg)')
        plt.title(f'Sentiment Trend (Window: {window_size})', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 11. NEW: Engagement Quality Matrix
        plt.subplot(4, 4, 11)
        
        # Create bins for comment length and sentiment
        length_bins = pd.cut(df['comment_length'], bins=5, labels=['Very Short', 'Short', 'Medium', 'Long', 'Very Long'])
        sentiment_mapping = {'Positive': 2, 'Neutral': 1, 'Negative': 0}
        df['sentiment_numeric'] = df['sentiment'].map(sentiment_mapping)
        
        # Create a heatmap-style matrix
        matrix_data = df.groupby([length_bins, 'sentiment'])['sentiment_score'].mean().unstack(fill_value=0)
        
        if not matrix_data.empty:
            im = plt.imshow(matrix_data.values, cmap='RdYlGn', aspect='auto')
            plt.colorbar(im, label='Avg Sentiment Score')
            plt.xticks(range(len(matrix_data.columns)), matrix_data.columns)
            plt.yticks(range(len(matrix_data.index)), matrix_data.index)
            plt.xlabel('Sentiment Category')
            plt.ylabel('Comment Length Category')
            plt.title('Engagement Quality Matrix', fontsize=14, fontweight='bold')
            
            # Add text annotations
            for i in range(len(matrix_data.index)):
                for j in range(len(matrix_data.columns)):
                    plt.text(j, i, f'{matrix_data.iloc[i, j]:.1f}', 
                            ha='center', va='center', color='black', fontweight='bold')
        
        # 12. NEW: Sentiment Distribution by Score Ranges
        plt.subplot(4, 4, 12)
        
        # Define score ranges
        ranges = [(0, 20, 'Very Low'), (20, 40, 'Low'), (40, 60, 'Medium'), 
                 (60, 80, 'High'), (80, 100, 'Very High')]
        
        data_for_stacked = []
        for start, end, label in ranges:
            range_data = df[(df['sentiment_score'] >= start) & (df['sentiment_score'] < end)]
            pos_count = len(range_data[range_data['sentiment'] == 'Positive'])
            neu_count = len(range_data[range_data['sentiment'] == 'Neutral'])
            neg_count = len(range_data[range_data['sentiment'] == 'Negative'])
            data_for_stacked.append([neg_count, neu_count, pos_count])
        
        data_array = np.array(data_for_stacked)
        labels = [r[2] for r in ranges]
        
        bottom1 = data_array[:, 0]
        bottom2 = bottom1 + data_array[:, 1]
        
        plt.bar(labels, data_array[:, 0], color='#FF6B6B', label='Negative')
        plt.bar(labels, data_array[:, 1], bottom=bottom1, color='#4ECDC4', label='Neutral')
        plt.bar(labels, data_array[:, 2], bottom=bottom2, color='#2E8B57', label='Positive')
        
        plt.xlabel('Confidence Ranges')
        plt.ylabel('Number of Comments')
        plt.title('Sentiment Distribution by Confidence Ranges', fontsize=14, fontweight='bold')
        plt.legend()
        plt.xticks(rotation=45)
        
        # 13. NEW: Top Commenters Analysis (if data available)
        plt.subplot(4, 4, 13)
        
        # Simulate comment frequency (in real implementation, this would come from user data)
        # For now, create a simple analysis of comment characteristics
        
        # Create sentiment score distribution
        score_bins = [0, 20, 40, 60, 80, 100]
        score_labels = ['0-20', '20-40', '40-60', '60-80', '80-100']
        score_counts = pd.cut(df['sentiment_score'], bins=score_bins, labels=score_labels).value_counts()
        
        plt.pie(score_counts.values, labels=score_counts.index, autopct='%1.1f%%', 
                startangle=90, colors=['#FF4444', '#FF8888', '#FFCC44', '#88DD88', '#44AA44'])
        plt.title('Score Distribution Breakdown', fontsize=14, fontweight='bold')
        
        # 14. NEW: Most Common Words Overall
        plt.subplot(4, 4, 14)
        
        all_comments = df['comment'].astype(str)
        all_words = ' '.join(all_comments).lower().split()
        # Enhanced stop words list
        stop_words.update(['phone', 'video', 'good', 'great', 'nice', 'best', 'thanks', 'thank', 'please', 'can', 'will', 'would', 'could', 'should', 'also', 'just', 'really', 'very', 'much', 'more', 'like', 'get', 'make', 'go', 'see', 'know', 'think', 'want', 'need', 'have', 'has', 'had'])
        filtered_words = [word for word in all_words if len(word) > 2 and word not in stop_words and word.isalpha()]
        top_overall = Counter(filtered_words).most_common(15)
        
        if top_overall:
            words, counts = zip(*top_overall)
            bars = plt.barh(range(len(words)), counts, color='mediumpurple')
            plt.yticks(range(len(words)), words)
            plt.xlabel('Frequency')
            plt.title('Most Frequent Words Overall', fontsize=14, fontweight='bold')
            plt.gca().invert_yaxis()
        
        # 15. NEW: Confidence vs Sentiment Correlation
        plt.subplot(4, 4, 15)
        
        # Box plot of confidence by sentiment
        sentiment_data = [df[df['sentiment'] == sent]['confidence'].values 
                         for sent in ['Negative', 'Neutral', 'Positive']]
        sentiment_labels = ['Negative', 'Neutral', 'Positive']
        colors_box = ['#FF6B6B', '#4ECDC4', '#2E8B57']
        
        box_plot = plt.boxplot(sentiment_data, labels=sentiment_labels, patch_artist=True)
        for patch, color in zip(box_plot['boxes'], colors_box):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        
        plt.ylabel('Model Confidence')
        plt.title('Confidence Distribution by Sentiment', fontsize=14, fontweight='bold')
        plt.grid(True, alpha=0.3)
        
        # 16. NEW: Performance Summary
        plt.subplot(4, 4, 16)
        plt.axis('off')
        
        # Calculate performance metrics
        high_confidence = len(df[df['confidence'] > 0.8])
        low_confidence = len(df[df['confidence'] < 0.3])
        
        performance_text = f"""
        🚀 ANALYSIS PERFORMANCE
        
        🎯 Model Confidence Metrics:
        • High Confidence (>80%): {high_confidence:,} comments
        • Medium Confidence (30-80%): {len(df) - high_confidence - low_confidence:,} comments
        • Low Confidence (<30%): {low_confidence:,} comments
        
        📊 Data Quality:
        • Avg Comment Length: {df['comment_length'].mean():.0f} chars
        • Longest Comment: {df['comment_length'].max():,} chars
        • Shortest Comment: {df['comment_length'].min():,} chars
        
        ⭐ Key Insights:
        • Most Common Sentiment: {df['sentiment'].mode().iloc[0]}
        • Score Range: {df['sentiment_score'].min():.1f} - {df['sentiment_score'].max():.1f}
        • Standard Deviation: {df['sentiment_score'].std():.1f}
        """
        
        plt.text(0.05, 0.95, performance_text, transform=plt.gca().transAxes, fontsize=10,
                verticalalignment='top', bbox=dict(boxstyle="round,pad=0.5", facecolor="lightblue", alpha=0.8))
        
        plt.suptitle(f'Complete Sentiment Analysis Dashboard - {channel_name}', 
                    fontsize=18, fontweight='bold', y=0.98)
        plt.tight_layout()
        plt.subplots_adjust(top=0.95)
        
        # Save with higher resolution
        plt.savefig('sentiment_analysis_dashboard.png', dpi=300, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        
        # Also save individual charts for easier viewing
        self._save_individual_charts(df, channel_name)
        
        plt.show()
        
        log_progress("sentiment_charts_saved", "Complete dashboard saved as 'sentiment_analysis_dashboard.png'", 98)
        print("✅ Complete dashboard saved as 'sentiment_analysis_dashboard.png'")
        print("✅ Individual charts saved in 'charts/' directory")
    
    def _save_individual_charts(self, df, channel_name):
        """Save individual charts for easier viewing"""
        import os
        
        # Create charts directory
        if not os.path.exists('charts'):
            os.makedirs('charts')
        
        # 1. Simple Sentiment Pie Chart
        plt.figure(figsize=(8, 6))
        sentiment_counts = df['sentiment'].value_counts()
        colors = ['#2E8B57', '#FF6B6B', '#4ECDC4']
        plt.pie(sentiment_counts.values, labels=sentiment_counts.index, autopct='%1.1f%%', 
                colors=colors, startangle=90, shadow=True)
        plt.title(f'Sentiment Distribution - {channel_name}', fontsize=14, fontweight='bold')
        plt.savefig('charts/sentiment_pie_chart.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # 2. Score Distribution
        plt.figure(figsize=(10, 6))
        plt.hist(df['sentiment_score'], bins=25, color='skyblue', alpha=0.7, edgecolor='black')
        plt.axvline(df['sentiment_score'].mean(), color='red', linestyle='--', linewidth=2,
                    label=f'Mean: {df["sentiment_score"].mean():.1f}')
        plt.xlabel('Sentiment Score (0-100)')
        plt.ylabel('Number of Comments')
        plt.title('Sentiment Score Distribution', fontsize=14, fontweight='bold')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig('charts/score_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        print("📁 Individual charts saved in 'charts/' directory")

def main():
    """Main function to run sentiment analysis"""
    
    log_progress("sentiment_main_start", "Starting sentiment analysis pipeline...", 72)
    
    # Load the cleaned comments data
    try:
        df = pd.read_csv('cleaned_all_comments.csv')
        log_progress("sentiment_data_loaded", f"Loaded {len(df)} comments from cleaned_all_comments.csv", 73,
                    total_comments=len(df))
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
    log_progress("sentiment_final_summary", "Generating final sentiment analysis summary...", 99)
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
    
    log_progress("sentiment_complete", "Sentiment analysis pipeline completed successfully!", 100)

if __name__ == "__main__":
    main()