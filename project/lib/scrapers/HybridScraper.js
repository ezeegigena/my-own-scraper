import { GoogleScraper } from './GoogleScraper.js';
import { FallbackScraper } from './FallbackScraper.js';

export class HybridScraper {
  constructor(options = {}) {
    this.googleScraper = new GoogleScraper(options);
    this.fallbackScraper = new FallbackScraper();
    this.preferGoogle = options.preferGoogle !== false;
  }

  async scrape(query, options = {}) {
    const maxResults = options.maxResults || 30;
    const useGoogle = options.useGoogle !== false && this.preferGoogle;
    
    console.log(`Starting hybrid scrape for: "${query}"`);
    console.log(`Strategy: ${useGoogle ? 'Google first, fallback if needed' : 'Fallback only'}`);

    let results = [];
    let googleFailed = false;

    // Try Google first if enabled
    if (useGoogle) {
      try {
        console.log('Attempting Google scraping...');
        results = await this.googleScraper.scrape(query, Math.ceil(maxResults / 10));
        
        if (results.length > 0) {
          console.log(`Google scraping successful: ${results.length} results`);
          return results.slice(0, maxResults);
        } else {
          console.log('Google returned no results, trying fallback...');
          googleFailed = true;
        }
      } catch (error) {
        console.log(`Google scraping failed: ${error.message}`);
        console.log('Falling back to alternative search engines...');
        googleFailed = true;
      }
    }

    // Use fallback scrapers
    try {
      const fallbackResults = await this.fallbackScraper.scrape(query, maxResults);
      
      if (googleFailed && fallbackResults.length > 0) {
        console.log(`Fallback successful: ${fallbackResults.length} results`);
      }
      
      // Combine results if we have both
      if (results.length > 0 && fallbackResults.length > 0) {
        const combined = [...results, ...fallbackResults];
        const unique = this.removeDuplicates(combined);
        return unique.slice(0, maxResults);
      }
      
      return fallbackResults.slice(0, maxResults);
    } catch (error) {
      console.error('All scraping methods failed:', error.message);
      
      if (results.length > 0) {
        console.log('Returning partial results from Google');
        return results;
      }
      
      throw new Error('All scraping methods failed');
    }
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

  // Load proxies from a list (optional)
  loadProxies(proxyList) {
    this.googleScraper.proxies = proxyList;
    return this;
  }

  // Configure scraping options
  configure(options) {
    if (options.delay) {
      this.googleScraper.delay = options.delay;
    }
    if (options.maxRetries) {
      this.googleScraper.maxRetries = options.maxRetries;
    }
    if (options.preferGoogle !== undefined) {
      this.preferGoogle = options.preferGoogle;
    }
    return this;
  }
}