"""
Scrapy settings for google_scraper project

For simplicity, this file contains only settings considered important or
commonly used. You can find more settings consulting the documentation:

    https://docs.scrapy.org/en/latest/topics/settings.html
"""

BOT_NAME = 'google_scraper'

SPIDER_MODULES = ['google_scraper.spiders']
NEWSPIDER_MODULE = 'google_scraper.spiders'

# Obey robots.txt rules - DISABLED for Google scraping
ROBOTSTXT_OBEY = False

# Configure delays for requests
# See https://docs.scrapy.org/en/latest/topics/settings.html#download-delay
DOWNLOAD_DELAY = 3  # 3 seconds delay between requests
RANDOMIZE_DOWNLOAD_DELAY = True  # 0.5 * to 1.5 * DOWNLOAD_DELAY

# The download delay setting will honor only one of:
CONCURRENT_REQUESTS_PER_DOMAIN = 1
CONCURRENT_REQUESTS_PER_IP = 1

# Disable cookies (enabled by default)
COOKIES_ENABLED = True

# Disable Telnet Console (enabled by default)
TELNETCONSOLE_ENABLED = False

# Override the default request headers:
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
}

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
    'google_scraper.middlewares.GoogleScraperSpiderMiddleware': 543,
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    # Rotating Proxies
    'rotating_proxies.middlewares.RotatingProxyMiddleware': 610,
    'rotating_proxies.middlewares.BanDetectionMiddleware': 620,
    
    # Fake User Agent
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
    'scrapy_fake_useragent.middleware.RandomUserAgentMiddleware': 400,
    
    # Custom middlewares
    'google_scraper.middlewares.GoogleScraperDownloaderMiddleware': 543,
    'google_scraper.middlewares.HeadersMiddleware': 544,
}

# Configure item pipelines
ITEM_PIPELINES = {
    'google_scraper.pipelines.DataCleaningPipeline': 300,
    'google_scraper.pipelines.DuplicatesPipeline': 400,
    'google_scraper.pipelines.ValidationPipeline': 500,
}

# AutoThrottle settings
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
AUTOTHROTTLE_DEBUG = True

# Rotating Proxies settings
ROTATING_PROXY_LIST_PATH = 'python_scraper/proxies.txt'
ROTATING_PROXY_BACKOFF_BASE = 300
ROTATING_PROXY_BACKOFF_CAP = 3600

# Fake User Agent settings
FAKEUSERAGENT_PROVIDERS = [
    'scrapy_fake_useragent.providers.FakeUserAgentProvider',
    'scrapy_fake_useragent.providers.FakerProvider',
    'scrapy_fake_useragent.providers.FixedUserAgentProvider',
]

FAKEUSERAGENT_FALLBACK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429, 403]

# Request timeout
DOWNLOAD_TIMEOUT = 30

# Enable and configure HTTP caching
HTTPCACHE_ENABLED = False

# Logging
LOG_LEVEL = 'INFO'
LOG_FILE = 'scrapy.log'

# Custom settings for Google scraping
GOOGLE_DOMAINS = [
    'www.google.com',
    'www.google.co.uk',
    'www.google.ca',
    'www.google.com.au',
    'www.google.de',
    'www.google.fr',
]

# Results per page
RESULTS_PER_PAGE = 10
MAX_PAGES = 10