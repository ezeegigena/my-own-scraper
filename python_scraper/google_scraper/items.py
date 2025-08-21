import scrapy
from itemloaders.processors import TakeFirst, MapCompose, Join
from w3lib.html import remove_tags
import re

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    # Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text.strip())
    # Remove special characters that might cause issues
    text = re.sub(r'[^\w\s\-\.\,\:\;\!\?\(\)\[\]\/\@\#\$\%\&\*\+\=]', '', text)
    return text

def clean_url(url):
    """Clean and validate URL"""
    if not url:
        return ""
    # Remove Google redirect URLs
    if url.startswith('/url?q='):
        url = url.replace('/url?q=', '')
        if '&' in url:
            url = url.split('&')[0]
    # Ensure URL has protocol
    if url.startswith('//'):
        url = 'https:' + url
    elif not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

class SearchResultItem(scrapy.Item):
    """Item for storing search results"""
    query = scrapy.Field(
        input_processor=MapCompose(clean_text),
        output_processor=TakeFirst()
    )
    title = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_text),
        output_processor=TakeFirst()
    )
    url = scrapy.Field(
        input_processor=MapCompose(clean_url),
        output_processor=TakeFirst()
    )
    description = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_text),
        output_processor=TakeFirst()
    )
    position = scrapy.Field(
        input_processor=MapCompose(int),
        output_processor=TakeFirst()
    )
    source = scrapy.Field(
        input_processor=MapCompose(str),
        output_processor=TakeFirst()
    )
    domain = scrapy.Field(
        input_processor=MapCompose(clean_text),
        output_processor=TakeFirst()
    )
    timestamp = scrapy.Field(
        output_processor=TakeFirst()
    )