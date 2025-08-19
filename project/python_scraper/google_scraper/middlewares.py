import random
import time
from scrapy import signals
from scrapy.http import HtmlResponse
from scrapy.downloadermiddlewares.retry import RetryMiddleware
from scrapy.utils.response import response_status_message
import logging

logger = logging.getLogger(__name__)

class GoogleScraperSpiderMiddleware:
    """Spider middleware for Google scraper"""
    
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_spider_input(self, response, spider):
        return None

    def process_spider_output(self, response, result, spider):
        for i in result:
            yield i

    def process_spider_exception(self, response, exception, spider):
        pass

    def process_start_requests(self, start_requests, spider):
        for r in start_requests:
            yield r

    def spider_opened(self, spider):
        spider.logger.info('Spider opened: %s' % spider.name)

class GoogleScraperDownloaderMiddleware:
    """Downloader middleware for Google scraper"""
    
    def __init__(self):
        self.blocked_keywords = [
            'captcha', 'robot', 'blocked', 'unusual traffic',
            'automated queries', 'verify you are human'
        ]
    
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_request(self, request, spider):
        # Add random delay
        delay = random.uniform(2, 5)
        time.sleep(delay)
        
        # Log request details
        logger.info(f"Processing request to {request.url} with delay {delay:.2f}s")
        return None

    def process_response(self, request, response, spider):
        # Check for blocking indicators
        response_text = response.text.lower()
        
        for keyword in self.blocked_keywords:
            if keyword in response_text:
                logger.warning(f"Blocking detected: '{keyword}' found in response from {request.url}")
                # Return a retry request
                return request.replace(dont_filter=True)
        
        # Check for successful response
        if response.status == 200 and len(response.text) > 1000:
            logger.info(f"Successful response from {request.url} ({len(response.text)} chars)")
        
        return response

    def process_exception(self, request, exception, spider):
        logger.error(f"Exception processing {request.url}: {exception}")
        return None

    def spider_opened(self, spider):
        spider.logger.info('Spider opened: %s' % spider.name)

class HeadersMiddleware:
    """Middleware to add realistic headers"""
    
    def __init__(self):
        self.additional_headers = [
            {
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            },
            {
                'sec-ch-ua': '"Not_A Brand";v="99", "Microsoft Edge";v="120", "Chromium";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            },
            {
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Safari";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
            }
        ]
    
    def process_request(self, request, spider):
        # Add random additional headers
        headers = random.choice(self.additional_headers)
        for key, value in headers.items():
            request.headers[key] = value
        
        # Add referer for non-first requests
        if hasattr(spider, 'current_page') and spider.current_page > 0:
            request.headers['Referer'] = 'https://www.google.com/'
        
        return None

class SmartRetryMiddleware(RetryMiddleware):
    """Enhanced retry middleware with smart backoff"""
    
    def __init__(self, settings):
        super().__init__(settings)
        self.backoff_base = 2
        self.max_backoff = 60
    
    def retry(self, request, reason, spider):
        retries = request.meta.get('retry_times', 0) + 1
        
        if retries <= self.max_retry_times:
            # Exponential backoff with jitter
            backoff = min(self.backoff_base ** retries, self.max_backoff)
            backoff += random.uniform(0, backoff * 0.1)  # Add jitter
            
            logger.info(f"Retrying {request.url} (attempt {retries}/{self.max_retry_times}) "
                       f"after {backoff:.2f}s delay. Reason: {reason}")
            
            time.sleep(backoff)
            
            retryreq = request.copy()
            retryreq.meta['retry_times'] = retries
            retryreq.dont_filter = True
            
            return retryreq
        else:
            logger.error(f"Gave up retrying {request.url} (failed {retries} times): {reason}")