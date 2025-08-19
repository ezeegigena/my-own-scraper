"""
Simplified Flask API for WebContainer compatibility
"""

import os
import sys
import json
import logging
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Simple scraper without complex dependencies
class SimpleGoogleScraper:
    def __init__(self):
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ]
    
    def scrape(self, query, num_results=10):
        """Simple scraping method using requests"""
        import requests
        import random
        import urllib.parse
        
        results = []
        
        try:
            # Build Google search URL
            search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&num={num_results}"
            
            # Random headers
            headers = {
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            logger.info(f"Making request to: {search_url}")
            
            # Make request with timeout
            response = requests.get(search_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Simple HTML parsing without complex dependencies
                html = response.text
                
                # Basic result extraction (simplified)
                results = self.parse_simple_results(html, query)
                
                logger.info(f"Successfully extracted {len(results)} results")
                return results
            else:
                logger.error(f"HTTP error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Scraping error: {e}")
            return []
    
    def parse_simple_results(self, html, query):
        """Simple HTML parsing without external dependencies"""
        results = []
        
        try:
            # Very basic parsing - look for common Google result patterns
            import re
            
            # Find title and URL patterns (simplified regex)
            title_pattern = r'<h3[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?</h3>'
            matches = re.findall(title_pattern, html, re.DOTALL | re.IGNORECASE)
            
            position = 1
            for url, title in matches[:10]:  # Limit to 10 results
                # Clean URL
                if url.startswith('/url?q='):
                    url = url.replace('/url?q=', '')
                    if '&' in url:
                        url = url.split('&')[0]
                
                # Clean title
                title = re.sub(r'<[^>]+>', '', title).strip()
                
                if url and title and not url.startswith('http://google.com'):
                    results.append({
                        'position': position,
                        'title': title,
                        'url': url,
                        'description': f'Result for {query}',
                        'source': 'Google (Simple Scraper)',
                        'method': 'Simple Python Scraper'
                    })
                    position += 1
            
        except Exception as e:
            logger.error(f"Parsing error: {e}")
        
        return results

# Initialize scraper
scraper = SimpleGoogleScraper()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Simple Python Scraper',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/scrape', methods=['POST'])
def scrape_endpoint():
    """Main scraping endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        query = data.get('query', '').strip()
        num_results = data.get('num_results', 10)
        
        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        logger.info(f"Starting scrape for query: '{query}', num_results: {num_results}")
        
        # Perform scraping
        results = scraper.scrape(query, num_results)
        
        if results:
            logger.info(f"Scraping completed: {len(results)} results found")
            
            return jsonify({
                'success': True,
                'query': query,
                'results': results,
                'total_found': len(results),
                'method': 'Simple Python Scraper',
                'timestamp': datetime.now().isoformat()
            })
        else:
            logger.warning("No results found")
            return jsonify({
                'success': False,
                'error': 'No results found',
                'query': query
            }), 404
            
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint"""
    try:
        # Test with a simple query
        test_results = scraper.scrape('test search', 5)
        
        return jsonify({
            'status': 'success',
            'message': 'Test completed',
            'results_count': len(test_results),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Test failed: {str(e)}'
        })

if __name__ == '__main__':
    logger.info("🐍 Starting Simple Python Scraper API...")
    logger.info("📡 Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  POST /scrape - Main scraping endpoint")
    logger.info("  GET  /test - Test endpoint")
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5001, debug=False)