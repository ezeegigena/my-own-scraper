import scrapy
import random
import urllib.parse
from google_scraper.items import SearchResultItem
from scrapy.http import Request
import logging

logger = logging.getLogger(__name__)

class GoogleSpider(scrapy.Spider):
    name = 'google'
    allowed_domains = ['google.com', 'google.co.uk', 'google.ca', 'google.com.au']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS': 1,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
    }
    
    def __init__(self, query=None, num_results=10, *args, **kwargs):
        super(GoogleSpider, self).__init__(*args, **kwargs)
        self.query = query or 'test query'
        self.num_results = int(num_results)
        self.results_per_page = 10
        self.max_pages = min(10, (self.num_results // self.results_per_page) + 1)
        self.current_page = 0
        self.results_found = 0
        
        logger.info(f"Initialized GoogleSpider with query: '{self.query}', "
                   f"target results: {self.num_results}, max pages: {self.max_pages}")
    
    def start_requests(self):
        """Generate initial requests for different Google domains"""
        domains = [
            'www.google.com',
            'www.google.co.uk', 
            'www.google.ca',
            'www.google.com.au'
        ]
        
        # Try different Google domains
        for domain in domains:
            url = self.build_search_url(domain, self.query, 0)
            yield Request(
                url=url,
                callback=self.parse,
                meta={
                    'domain': domain,
                    'page': 0,
                    'query': self.query
                },
                headers=self.get_headers(),
                dont_filter=True
            )
    
    def build_search_url(self, domain, query, start=0):
        """Build Google search URL with anti-detection parameters"""
        base_url = f"https://{domain}/search"
        
        params = {
            'q': query,
            'start': start,
            'num': self.results_per_page,
            'hl': 'en',
            'gl': 'us',
            'safe': 'off',
            'filter': '0',
            'pws': '0',
        }
        
        # Add random parameters to look more human
        random_params = [
            ('source', 'hp'),
            ('ei', self.generate_random_ei()),
            ('iflsig', self.generate_random_iflsig()),
        ]
        
        for param, value in random.sample(random_params, k=random.randint(1, 2)):
            params[param] = value
        
        url = base_url + '?' + urllib.parse.urlencode(params)
        logger.info(f"Built search URL: {url}")
        return url
    
    def get_headers(self):
        """Get realistic browser headers"""
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        }
        return headers
    
    def generate_random_ei(self):
        """Generate random ei parameter"""
        import string
        return ''.join(random.choices(string.ascii_letters + string.digits + '-_', k=20))
    
    def generate_random_iflsig(self):
        """Generate random iflsig parameter"""
        import string
        return ''.join(random.choices(string.ascii_letters + string.digits + '-_', k=15))
    
    def parse(self, response):
        """Parse Google search results"""
        domain = response.meta.get('domain')
        page = response.meta.get('page', 0)
        
        logger.info(f"Parsing response from {domain}, page {page}, status: {response.status}")
        
        # Check for blocking
        if self.is_blocked(response):
            logger.warning(f"Blocking detected on {domain}, trying next domain/page")
            return
        
        # Extract search results using multiple selectors
        results = self.extract_results(response)
        
        if not results:
            logger.warning(f"No results found on {domain}, page {page}")
            return
        
        logger.info(f"Found {len(results)} results on {domain}, page {page}")
        
        # Yield results
        for result in results:
            if self.results_found >= self.num_results:
                logger.info(f"Reached target of {self.num_results} results")
                return
            
            result['query'] = self.query
            result['source'] = f"Google ({domain})"
            self.results_found += 1
            yield result
        
        # Continue to next page if needed
        if (self.results_found < self.num_results and 
            page < self.max_pages - 1 and 
            len(results) >= 5):  # Only continue if we got decent results
            
            next_page = page + 1
            next_start = next_page * self.results_per_page
            next_url = self.build_search_url(domain, self.query, next_start)
            
            logger.info(f"Requesting next page: {next_page} from {domain}")
            
            yield Request(
                url=next_url,
                callback=self.parse,
                meta={
                    'domain': domain,
                    'page': next_page,
                    'query': self.query
                },
                headers=self.get_headers(),
                dont_filter=True
            )
    
    def is_blocked(self, response):
        """Check if the response indicates blocking"""
        blocking_indicators = [
            'unusual traffic', 'captcha', 'robot', 'blocked',
            'verify you are human', 'automated queries',
            'our systems have detected', 'sorry, something went wrong'
        ]
        
        response_text = response.text.lower()
        
        for indicator in blocking_indicators:
            if indicator in response_text:
                logger.warning(f"Blocking indicator found: '{indicator}'")
                return True
        
        # Check response length (blocked pages are usually very short)
        if len(response.text) < 5000:
            logger.warning(f"Response too short ({len(response.text)} chars), might be blocked")
            return True
        
        return False
    
    def extract_results(self, response):
        """Extract search results using multiple CSS selectors"""
        results = []
        position = (response.meta.get('page', 0) * self.results_per_page) + 1
        
        # Multiple selectors for different Google layouts
        selectors = [
            'div.g',  # Standard results
            '.rc',    # Classic results container
            'div[data-ved]',  # Results with data-ved attribute
            '.MjjYud',  # New Google layout
            '.tF2Cxc',  # Another new layout
        ]
        
        for selector in selectors:
            elements = response.css(selector)
            if elements:
                logger.info(f"Using selector '{selector}' - found {len(elements)} elements")
                break
        else:
            logger.warning("No results found with any selector")
            return results
        
        for element in elements:
            try:
                # Extract title
                title_selectors = [
                    'h3::text',
                    '.LC20lb::text',
                    '.DKV0Md::text',
                    'a h3::text',
                    '.r a h3::text'
                ]
                
                title = None
                for title_sel in title_selectors:
                    title = element.css(title_sel).get()
                    if title:
                        break
                
                # Extract URL
                url_selectors = [
                    'a::attr(href)',
                    '.yuRUbf a::attr(href)',
                    'h3 a::attr(href)',
                    '.r a::attr(href)'
                ]
                
                url = None
                for url_sel in url_selectors:
                    url = element.css(url_sel).get()
                    if url and url.startswith(('http', '/')):
                        break
                
                # Extract description
                desc_selectors = [
                    '.VwiC3b::text',
                    '.s3v9rd::text', 
                    '.st::text',
                    '.IsZvec::text',
                    'span[data-ved]::text'
                ]
                
                description = None
                for desc_sel in desc_selectors:
                    desc_parts = element.css(desc_sel).getall()
                    if desc_parts:
                        description = ' '.join(desc_parts).strip()
                        break
                
                # Clean and validate data
                if title and url:
                    # Clean URL
                    if url.startswith('/url?q='):
                        url = url.replace('/url?q=', '')
                        if '&' in url:
                            url = url.split('&')[0]
                    
                    # Skip Google internal URLs
                    if any(skip in url.lower() for skip in ['google.com', 'youtube.com', 'maps.google']):
                        continue
                    
                    item = SearchResultItem()
                    item['title'] = title.strip()
                    item['url'] = url
                    item['description'] = description or 'No description available'
                    item['position'] = position
                    
                    results.append(item)
                    position += 1
                    
                    if len(results) >= self.results_per_page:
                        break
                        
            except Exception as e:
                logger.error(f"Error extracting result: {e}")
                continue
        
        logger.info(f"Successfully extracted {len(results)} results")
        return results