import re
import logging
from urllib.parse import urlparse
from datetime import datetime
from itemadapter import ItemAdapter

logger = logging.getLogger(__name__)

class DataCleaningPipeline:
    """Pipeline to clean and normalize data"""
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Clean title
        if adapter.get('title'):
            title = adapter['title']
            # Remove extra whitespace
            title = re.sub(r'\s+', ' ', title.strip())
            # Remove common unwanted patterns
            title = re.sub(r'\s*\|\s*.*$', '', title)  # Remove "| Company Name" patterns
            adapter['title'] = title
        
        # Clean description
        if adapter.get('description'):
            description = adapter['description']
            # Remove extra whitespace and newlines
            description = re.sub(r'\s+', ' ', description.strip())
            # Limit description length
            if len(description) > 500:
                description = description[:497] + '...'
            adapter['description'] = description
        
        # Extract domain from URL
        if adapter.get('url'):
            try:
                parsed_url = urlparse(adapter['url'])
                adapter['domain'] = parsed_url.netloc.lower()
            except:
                adapter['domain'] = 'unknown'
        
        # Add timestamp
        adapter['timestamp'] = datetime.now().isoformat()
        
        return item

class DuplicatesPipeline:
    """Pipeline to filter out duplicate items"""
    
    def __init__(self):
        self.seen_urls = set()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        url = adapter.get('url', '').lower()
        
        if url in self.seen_urls:
            logger.info(f"Duplicate item found: {url}")
            raise DropItem(f"Duplicate item found: {url}")
        else:
            self.seen_urls.add(url)
            return item

class ValidationPipeline:
    """Pipeline to validate item data"""
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Validate required fields
        required_fields = ['title', 'url']
        for field in required_fields:
            if not adapter.get(field):
                raise DropItem(f"Missing required field: {field}")
        
        # Validate URL format
        url = adapter.get('url', '')
        if not url.startswith(('http://', 'https://')):
            raise DropItem(f"Invalid URL format: {url}")
        
        # Filter out unwanted domains
        unwanted_domains = [
            'google.com', 'youtube.com', 'facebook.com', 
            'twitter.com', 'instagram.com', 'linkedin.com'
        ]
        
        domain = adapter.get('domain', '').lower()
        for unwanted in unwanted_domains:
            if unwanted in domain:
                raise DropItem(f"Filtered out unwanted domain: {domain}")
        
        # Validate title length
        title = adapter.get('title', '')
        if len(title) < 10:
            raise DropItem(f"Title too short: {title}")
        
        return item

class DropItem(Exception):
    """Exception to drop items from pipeline"""
    pass