from flask import Blueprint, request, jsonify, send_file
import sys
import os
import threading
import time

# Add parent directory to path to import scraper
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from scraper import run_scraper_from_flask

scraper_bp = Blueprint('scraper', __name__)

# Global variable to track scraping status
scraping_status = {
    'is_running': False,
    'progress': 0,
    'message': 'Ready',
    'csv_file': None
}

def run_scraper_async(keywords, platforms, location, max_leads):
    """Run scraper in a separate thread"""
    global scraping_status
    try:
        scraping_status['is_running'] = True
        scraping_status['progress'] = 10
        scraping_status['message'] = 'Iniciando scraper...'
        
        time.sleep(1)  # Small delay for UI feedback
        
        scraping_status['progress'] = 30
        scraping_status['message'] = 'Ejecutando búsquedas...'
        
        # Run the actual scraper
        csv_filepath = run_scraper_from_flask(keywords, platforms, location, max_leads)
        
        scraping_status['progress'] = 90
        scraping_status['message'] = 'Procesando resultados...'
        
        time.sleep(1)
        
        scraping_status['progress'] = 100
        scraping_status['message'] = f'Completado. Archivo CSV guardado en: {csv_filepath}'
        scraping_status['csv_file'] = csv_filepath
        scraping_status['is_running'] = False
        
    except Exception as e:
        scraping_status['is_running'] = False
        scraping_status['message'] = f'Error: {str(e)}'
        scraping_status['progress'] = 0

@scraper_bp.route('/scrape', methods=['POST'])
def run_scraper():
    global scraping_status
    
    if scraping_status['is_running']:
        return jsonify({'error': 'Scraper is already running'}), 400
    
    try:
        data = request.get_json()
        
        # Extract parameters from the request
        keywords = data.get('keywords', [])
        platforms = data.get('platforms', [])
        location = data.get('location', '')
        max_leads = data.get('max_leads', 10)
        
        # Validate input
        if not keywords or not platforms:
            return jsonify({'error': 'Keywords and platforms are required'}), 400
        
        # Reset status
        scraping_status = {
            'is_running': True,
            'progress': 0,
            'message': 'Iniciando...',
            'csv_file': None
        }
        
        # Start scraper in background thread
        thread = threading.Thread(target=run_scraper_async, args=(keywords, platforms, location, max_leads))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'status': 'started',
            'message': 'Scraping iniciado en segundo plano'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scraper_bp.route('/status', methods=['GET'])
def get_status():
    global scraping_status
    return jsonify(scraping_status)

@scraper_bp.route('/download/<filename>', methods=['GET'])
def download_csv(filename):
    """Download the generated CSV file"""
    try:
        # Security check: only allow downloading from results directory
        if not filename.endswith('.csv'):
            return jsonify({'error': 'Invalid file type'}), 400
        
        file_path = os.path.join('results', filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

