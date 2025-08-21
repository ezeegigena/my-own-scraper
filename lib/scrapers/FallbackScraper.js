import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import UserAgent from 'user-agents';

export class FallbackScraper {
  constructor() {
    this.userAgent = new UserAgent();
    this.engines = [
      {
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com/html/',
        buildUrl: (query) => `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        parseResults: this.parseDuckDuckGo.bind(this)
      },
      {
        name: 'Bing',
        url: 'https://www.bing.com/search',
        buildUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        parseResults: this.parseBing.bind(this)
      },
      {
        name: 'Yahoo',
        url: 'https://search.yahoo.com/search',
        buildUrl: (query) => `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
        parseResults: this.parseYahoo.bind(this)
      }
    ];
  }

  async scrape(query, maxResults = 30) {
    console.log(`Starting fallback scrape for: "${query}"`);
    const allResults = [];

    for (const engine of this.engines) {
      try {
        console.log(`Trying ${engine.name}...`);
        const results = await this.scrapeEngine(engine, query);
        allResults.push(...results);
        console.log(`${engine.name}: Found ${results.length} results`);
        
        if (allResults.length >= maxResults) {
          break;
        }
        
        // Delay between engines
        await this.delay(2000);
      } catch (error) {
        console.log(`${engine.name} failed: ${error.message}`);
        continue;
      }
    }

    const uniqueResults = this.removeDuplicates(allResults);
    console.log(`Fallback scraping completed. Found ${uniqueResults.length} unique results`);
    
    return uniqueResults.slice(0, maxResults);
  }

  async scrapeEngine(engine, query) {
    const url = engine.buildUrl(query);
    const headers = {
      'User-Agent': this.userAgent.toString(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    const response = await fetch(url, { headers, timeout: 15000 });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return engine.parseResults(html);
  }

  parseDuckDuckGo(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results = [];

    const resultElements = document.querySelectorAll('.result');
    
    resultElements.forEach(element => {
      try {
        const titleElement = element.querySelector('.result__title a');
        const snippetElement = element.querySelector('.result__snippet');
        
        if (!titleElement) return;

        const title = titleElement.textContent?.trim();
        const url = titleElement.href;
        const description = snippetElement?.textContent?.trim() || '';

        if (title && url && !url.startsWith('javascript:')) {
          results.push({
            title,
            url,
            description,
            source: 'duckduckgo',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log('Error parsing DuckDuckGo result:', error.message);
      }
    });

    return results;
  }

  parseBing(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results = [];

    const resultElements = document.querySelectorAll('.b_algo');
    
    resultElements.forEach(element => {
      try {
        const titleElement = element.querySelector('h2 a');
        const snippetElement = element.querySelector('.b_caption p');
        
        if (!titleElement) return;

        const title = titleElement.textContent?.trim();
        const url = titleElement.href;
        const description = snippetElement?.textContent?.trim() || '';

        if (title && url && !url.startsWith('javascript:')) {
          results.push({
            title,
            url,
            description,
            source: 'bing',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log('Error parsing Bing result:', error.message);
      }
    });

    return results;
  }

  parseYahoo(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results = [];

    const resultElements = document.querySelectorAll('.algo');
    
    resultElements.forEach(element => {
      try {
        const titleElement = element.querySelector('h3 a');
        const snippetElement = element.querySelector('.compText');
        
        if (!titleElement) return;

        const title = titleElement.textContent?.trim();
        const url = titleElement.href;
        const description = snippetElement?.textContent?.trim() || '';

        if (title && url && !url.startsWith('javascript:')) {
          results.push({
            title,
            url,
            description,
            source: 'yahoo',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log('Error parsing Yahoo result:', error.message);
      }
    });

    return results;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  removeDuplicates(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}