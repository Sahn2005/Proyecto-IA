import json
import unittest
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(__file__))

from app import app, DATASET_PATH

class TestRegressionAPI(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_dataset_endpoint(self):
        print("\nTesting GET /api/dataset...")
        response = self.app.get('/api/dataset?page=1&limit=5')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('shape', data)
        self.assertIn('records', data)
        self.assertEqual(len(data['records']), 5)
        self.assertIn('descriptive_stats', data)
        self.assertIn('target_stats', data)
        print("GET /api/dataset: SUCCESS")

    def test_train_endpoint(self):
        print("\nTesting POST /api/train...")
        response = self.app.post('/api/train')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('metrics', data)
        self.assertIn('r2', data['metrics'])
        self.assertIn('mae', data['metrics'])
        self.assertIn('coefficients', data)
        self.assertIn('visualizations', data)
        print(f"POST /api/train: SUCCESS. Model R² = {data['metrics']['r2']:.4f}")

    def test_predict_endpoint(self):
        print("\nTesting POST /api/predict...")
        payload = {
            'quantity': 3.0,
            'discount_rate': 0.1,
            'avg_order_value_eur': 45.0,
            'previous_orders': 4.0,
            'customer_age_days': 200.0,
            'shipping_distance_km': 100.0
        }
        response = self.app.post('/api/predict', 
                                 data=json.dumps(payload), 
                                 content_type='application/json')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('prediction', data)
        self.assertGreaterEqual(data['prediction'], 0)
        print(f"POST /api/predict: SUCCESS. Prediction = {data['prediction']} EUR")

if __name__ == '__main__':
    unittest.main()
