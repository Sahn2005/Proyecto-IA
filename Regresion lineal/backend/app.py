import os
import json
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn import metrics

app = Flask(__name__)
# Enable CORS for all routes so our React frontend can access it
CORS(app)

DATASET_PATH = os.path.join(os.path.dirname(__file__), 'dataset.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')

# Load the dataset
def load_data():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at: {DATASET_PATH}")
    return pd.read_csv(DATASET_PATH)

@app.route('/api/dataset', methods=['GET'])
def get_dataset():
    try:
        df = load_data()
        
        # Original shape
        total_rows, total_cols = df.shape
        
        # Check null values
        null_counts = df.isnull().sum().to_dict()
        
        # Check duplicates
        duplicate_count = int(df.duplicated().sum())
        
        # Preprocessing: drop duplicates for statistics and calculations
        df_clean = df.drop_duplicates()
        
        # Target variable stats (order_value_eur)
        target = 'order_value_eur'
        if target in df_clean.columns:
            target_stats = {
                'mean': float(df_clean[target].mean()),
                'median': float(df_clean[target].median()),
                'max': float(df_clean[target].max()),
                'min': float(df_clean[target].min())
            }
            
            # Outlier detection using IQR
            q1 = df_clean[target].quantile(0.25)
            q3 = df_clean[target].quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers_count = int(((df_clean[target] < lower_bound) | (df_clean[target] > upper_bound)).sum())
        else:
            target_stats = {'mean': 0, 'median': 0, 'max': 0, 'min': 0}
            outliers_count = 0

        # General descriptive stats for key variables
        key_cols = [
            'quantity', 'discount_rate', 'avg_order_value_eur', 
            'previous_orders', 'customer_age_days', 'shipping_distance_km', 'order_value_eur'
        ]
        
        # Filter existing columns
        key_cols = [c for c in key_cols if c in df_clean.columns]
        desc_stats = {}
        if key_cols:
            stats_df = df_clean[key_cols].describe()
            # Add median (50%) to stats_df which describe() does under 50%
            for col in key_cols:
                desc_stats[col] = {
                    'count': int(stats_df.loc['count', col]),
                    'mean': float(stats_df.loc['mean', col]),
                    'std': float(stats_df.loc['std', col]),
                    'min': float(stats_df.loc['min', col]),
                    'q1': float(stats_df.loc['25%', col]),
                    'median': float(df_clean[col].median()),
                    'q3': float(stats_df.loc['75%', col]),
                    'max': float(stats_df.loc['max', col])
                }

        # Pagination & Search on the full dataset
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', '')
        sort_order = request.args.get('sort_order', 'asc')
        
        # Apply search filter if query is provided
        # We can search in order_id, country, product_category, traffic_source, etc.
        df_filtered = df.copy()
        if search:
            search_mask = pd.Series(False, index=df_filtered.index)
            text_cols = ['order_id', 'country', 'product_category', 'device_type', 'payment_method', 'traffic_source']
            for col in text_cols:
                if col in df_filtered.columns:
                    search_mask = search_mask | df_filtered[col].astype(str).str.contains(search, case=False, na=False)
            df_filtered = df_filtered[search_mask]
            
        # Apply sorting
        if sort_by and sort_by in df_filtered.columns:
            ascending = sort_order == 'asc'
            df_filtered = df_filtered.sort_values(by=sort_by, ascending=ascending)
            
        filtered_count = len(df_filtered)
        
        # Get slice for current page
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        df_page = df_filtered.iloc[start_idx:end_idx]
        
        # Format records for JSON response
        records = df_page.replace({np.nan: None}).to_dict(orient='records')
        
        return jsonify({
            'success': True,
            'shape': [total_rows, total_cols],
            'null_counts': null_counts,
            'duplicate_count': duplicate_count,
            'target_stats': target_stats,
            'outliers_count': outliers_count,
            'descriptive_stats': desc_stats,
            'pagination': {
                'page': page,
                'limit': limit,
                'total_records': filtered_count,
                'total_pages': int(np.ceil(filtered_count / limit))
            },
            'records': records,
            'columns': list(df.columns)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    try:
        df = load_data()
        
        # Preprocessing: drop duplicates
        df = df.drop_duplicates()
        
        # Drop rows with nulls in key variables (if any)
        features = ['quantity', 'discount_rate', 'avg_order_value_eur', 'previous_orders', 'customer_age_days', 'shipping_distance_km']
        target = 'order_value_eur'
        
        df_model = df[features + [target]].dropna()
        
        X = df_model[features]
        y = df_model[target]
        
        # Train/Test Split (80/20)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        model = LinearRegression()
        model.fit(X_train, y_train)
        
        # Save model
        joblib.dump(model, MODEL_PATH)
        
        # Calculate metrics
        y_pred = model.predict(X_test)
        mae = float(metrics.mean_absolute_error(y_test, y_pred))
        mse = float(metrics.mean_squared_error(y_test, y_pred))
        r2 = float(metrics.r2_score(y_test, y_pred))
        
        # Generate chart data
        # 1. Histogram of order_value_eur (all clean values)
        counts, bins = np.histogram(df[target], bins=20)
        histogram_data = {
            'counts': counts.tolist(),
            'bins': [round(float(b), 2) for b in bins]
        }
        
        # 2. Real vs Predicted (sample of 150 points for better chart readability)
        # Combine test values for scatter plot
        test_results = pd.DataFrame({'Real': y_test, 'Pred': y_pred})
        sample_results = test_results.sample(min(150, len(test_results)), random_state=42)
        real_vs_pred = sample_results.to_dict(orient='records')
        
        # 3. Correlation matrix
        corr_cols = features + [target]
        corr_matrix = df[corr_cols].corr().round(3)
        correlation_data = {
            'columns': corr_cols,
            'matrix': corr_matrix.values.tolist()
        }
        
        # 4. Feature Importance (coefficients)
        coef_dict = {feat: float(coef) for feat, coef in zip(features, model.coef_)}
        
        return jsonify({
            'success': True,
            'metrics': {
                'mae': mae,
                'mse': mse,
                'r2': r2
            },
            'coefficients': coef_dict,
            'intercept': float(model.intercept_),
            'visualizations': {
                'histogram': histogram_data,
                'real_vs_pred': real_vs_pred,
                'correlation': correlation_data,
                'importance': coef_dict
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Load request data
        data = request.get_json() or {}
        
        # Extract features
        features = ['quantity', 'discount_rate', 'avg_order_value_eur', 'previous_orders', 'customer_age_days', 'shipping_distance_km']
        input_data = []
        for feat in features:
            if feat not in data:
                return jsonify({'success': False, 'error': f"Missing parameter: {feat}"}), 400
            try:
                input_data.append(float(data[feat]))
            except ValueError:
                return jsonify({'success': False, 'error': f"Parameter {feat} must be a number"}), 400
                
        # Load trained model
        if not os.path.exists(MODEL_PATH):
            # If model file does not exist, train it on the fly
            df = load_data().drop_duplicates()
            X = df[features].dropna()
            y = df['order_value_eur'].loc[X.index]
            model = LinearRegression()
            model.fit(X, y)
            joblib.dump(model, MODEL_PATH)
        else:
            model = joblib.load(MODEL_PATH)
            
        # Predict
        prediction = model.predict([input_data])[0]
        # Make sure predicted value is not negative (clip at 0 or a reasonable minimum)
        prediction = max(0.0, float(prediction))
        
        return jsonify({
            'success': True,
            'prediction': round(prediction, 2)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/download', methods=['GET'])
def download_dataset():
    try:
        if not os.path.exists(DATASET_PATH):
            return jsonify({'success': False, 'error': "Dataset file not found"}), 404
        return send_file(DATASET_PATH, as_attachment=True, download_name='synthetic_ecommerce_order_risk_dataset.csv', mimetype='text/csv')
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Run the server on host 0.0.0.0 and dynamic port for cloud deployments (like Render)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

