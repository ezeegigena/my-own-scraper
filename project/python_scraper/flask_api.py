"""
Flask API server to interface between JavaScript frontend and Scrapy backend
"""

import os
import sys
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from multiprocessing import Process, Queue
import time
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from google_scraper.spiders.google_spider import GoogleSpider

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScrapyRunner:
    """Class to run Scrapy spiders in a separate process"""
    
    def __init__(self):
        self.results = []
    
    def run_spider(self, spider_class, queue, **kwargs):
        """Run spider in a separate process"""
        try:
            # Get Scrapy settings
            settings = get_project_settings()
            
            # Override settings for API usage
            settings.update({
                'LOG_LEVEL': 'WARNING',  # Reduce log noise
                'ITEM_PIPELINES': {
                    'google_scraper.pipelines.DataCleaningPipeline': 300,
                    'google_scraper.pipelines.DuplicatesPipeline': 400,
                    'google_scraper.pipelines.ValidationPipeline': 500,
                },
                'FEEDS': {
                    'temp_results.json': {
                        'format': 'json',
                        'overwrite': True,
                    },
                },
            })
            
            # Create and configure crawler
            process = CrawlerProcess(settings)
            
            # Add spider to process
            process.crawl(spider_class, **kwargs)
            
            # Start crawling
            process.start()
            
            # Read results from file
            try:
                with open('temp_results.json', 'r', encoding='utf-8') as f:
                    results = json.load(f)
                queue.put({'success': True, 'results': results})
                
                # Clean up temp file
                os.remove('temp_results.json')
                
            except FileNotFoundError:
                queue.put({'success': True, 'results': []})
            except Exception as e:
                queue.put({'success': False, 'error': f'Error reading results: {str(e)}'})
                
        except Exception as e:
            logger.error(f"Error running spider: {e}")
            queue.put({'success': False, 'error': str(e)})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Scrapy API',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/scrape', methods=['POST'])
def scrape_google():
    """Main scraping endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        query = data.get('query', '').strip()
        num_results = data.get('num_results', 10)
        
        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        logger.info(f"Starting Scrapy scrape for query: '{query}', num_results: {num_results}")
        
        # Create queue for inter-process communication
        queue = Queue()
        
        # Create and start spider process
        runner = ScrapyRunner()
        spider_process = Process(
            target=runner.run_spider,
            args=(GoogleSpider, queue),
            kwargs={
                'query': query,
                'num_results': num_results
            }
        )
        
        spider_process.start()
        
        # Wait for results with timeout
        timeout = 300  # 5 minutes timeout
        start_time = time.time()
        
        while spider_process.is_alive():
            if time.time() - start_time > timeout:
                spider_process.terminate()
                spider_process.join()
                return jsonify({
                    'error': 'Scraping timeout after 5 minutes'
                }), 408
            
            time.sleep(1)
        
        spider_process.join()
        
        # Get results from queue
        try:
            result = queue.get_nowait()
            
            if result['success']:
                results = result['results']
                
                logger.info(f"Scrapy scraping completed: {len(results)} results found")
                
                return jsonify({
                    'success': True,
                    'query': query,
                    'results': results,
                    'total_found': len(results),
                    'method': 'Scrapy with Anti-Detection',
                    'timestamp': datetime.now().isoformat()
                })
            else:
                logger.error(f"Scrapy scraping failed: {result['error']}")
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500
                
        except:
            return jsonify({
                'success': False,
                'error': 'No results returned from spider'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/test-spider', methods=['GET'])
def test_spider():
    """Test endpoint to verify spider functionality"""
    try:
        # Test with a simple query
        queue = Queue()
        runner = ScrapyRunner()
        
        spider_process = Process(
            target=runner.run_spider,
            args=(GoogleSpider, queue),
            kwargs={
                'query': 'test search',
                'num_results': 5
            }
        )
        
        spider_process.start()
        spider_process.join(timeout=60)  # 1 minute timeout for test
        
        if spider_process.is_alive():
            spider_process.terminate()
            spider_process.join()
            return jsonify({
                'status': 'timeout',
                'message': 'Test spider timed out'
            })
        
        try:
            result = queue.get_nowait()
            return jsonify({
                'status': 'success' if result['success'] else 'error',
                'message': 'Test spider completed',
                'results_count': len(result.get('results', [])),
                'error': result.get('error')
            })
        except:
            return jsonify({
                'status': 'no_results',
                'message': 'Test spider completed but no results returned'
            })
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Test spider failed: {str(e)}'
        })

if __name__ == '__main__':
    logger.info("Starting Scrapy Flask API server...")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  POST /scrape - Main scraping endpoint")
    logger.info("  GET  /test-spider - Test spider functionality")
    
    app.run(host='0.0.0.0', port=5001, debug=False)