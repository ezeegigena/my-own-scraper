import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import UserAgent from 'user-agents';
import { NetworkManager } from './NetworkManager.js';

export class ProxyRotationScraper {
  constructor() {
    // Separate network manager for proxy operations
    this.networkManager = new NetworkManager();
    this.delay = 5000; // 5 second delay to avoid blocking
    this.maxRetries = 3;
    
    // Argentina-focused Google domains ONLY
    this.googleDomains = [
      'www.google.com.ar',  // Argentina primary
      'www.google.com'      // Fallback only
    ];
    
    this.platforms = {
      linkedin: {
        name: 'LinkedIn',
        siteQuery: 'site:linkedin.com/company OR site:linkedin.com/in'
      },
      instagram: {
        name: 'Instagram', 
        siteQuery: 'site:instagram.com'
      },
      facebook: {
        name: 'Facebook',
        siteQuery: 'site:facebook.com'
      },
      googlemaps: {
        name: 'Google Maps',
        siteQuery: 'site:maps.google.com OR site:goo.gl/maps'
      }
    };
    
    console.log(`🚀 REAL-ONLY Proxy Rotation Scraper initialized`);
    console.log(`📡 Network manager ready for proxy operations`);
    console.log(`🇦🇷 Argentina-focused domains: ${this.googleDomains.join(', ')}`);
    console.log(`❌ NO MOCK DATA - REAL SCRAPING ONLY`);
    console.log(`⚠️ If no real results found, will return EMPTY array`);
  }

  async initializeProxies() {
    try {
      this.proxyList = await this.loadAndTestProxies();
      console.log(`✅ ${this.proxyList.length} working proxies ready`);
    } catch (error) {
      console.error(`❌ Proxy init failed: ${error.message}`);
      this.proxyList = [];
    } finally {
      // Proxies are now loaded (successfully or not)
    }
  }

  getRandomDelay() {
    return this.delay + Math.random() * 3000; // Add 0-3 seconds random delay
  }

  getHeaders() {
    const userAgent = this.userAgent.toString();
    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.1',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"'
    };
  }

  buildSearchUrl(domain, query, start = 0) {
    // Ensure domain is valid and not empty
    if (!domain || domain.trim() === '') {
      throw new Error('Domain cannot be empty');
    }
    
    // Ensure query is valid and not empty
    if (!query || query.trim() === '') {
      throw new Error('Query cannot be empty');
    }
    
    const params = new URLSearchParams({
      q: query.trim(),
      start: start.toString(),
      num: '20',
      hl: 'es',
      gl: 'ar',
      cr: 'countryAR',
      ie: 'UTF-8',
      oe: 'UTF-8',
      safe: 'off',
      filter: '0',
      pws: '0'
    });

    const baseUrl = `https://${domain.trim()}/search`;
    
    const finalUrl = `${baseUrl}?${params.toString()}`;
    return finalUrl;
  }

  async makeRequest(url, retries = 0) {
    try {
      console.log(`🌐 Making request via NetworkManager: ${url}`);
      const html = await this.networkManager.makeRequest(url, this.maxRetries);
      
      // Check for blocking indicators
      if (this.isBlocked(html)) {
        throw new Error('Request blocked by Google - need better proxies');
      }

      console.log(`✅ REAL response received: ${html.length} characters`);
      return html;
    } catch (error) {
      console.log(`❌ REAL request failed (attempt ${retries + 1}): ${error.message}`);
      
      if (retries < this.maxRetries) {
        const delayMs = Math.pow(2, retries) * 2000 + Math.random() * 2000;
        console.log(`⏳ Retrying REAL request in ${Math.round(delayMs/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.makeRequest(url, retries + 1);
      }
      
      throw error;
    }
  }

  isBlocked(html) {
    const blockingIndicators = [
      'Our systems have detected unusual traffic',
      'Please complete the security check',
      'captcha',
      'blocked',
      'unusual traffic from your computer network',
      'verify you are human',
      'automated queries',
      'sorry, something went wrong'
    ];
    
    const lowerHtml = html.toLowerCase();
    const isBlocked = blockingIndicators.some(indicator => lowerHtml.includes(indicator));
    
    if (isBlocked) {
      console.log('🚫 BLOCKING DETECTED - Google is blocking our requests');
      console.log('💡 Try adding more/better proxies to proxies.txt');
    }
    
    return isBlocked;
  }

  parseResults(html, platform) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results = [];

    console.log(`🔍 Parsing REAL ${platform} results from HTML...`);

    // Multiple selectors for different Google layouts
    const selectors = [
      'div[data-ved] h3',
      '.g h3',
      '.rc h3', 
      'h3.LC20lb',
      'h3[class*="LC20lb"]',
      '.tF2Cxc h3',
      '.MjjYud h3'
    ];

    let elements = [];
    for (const selector of selectors) {
      elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`📋 Using selector "${selector}" - found ${elements.length} REAL elements`);
        break;
      }
    }

    if (elements.length === 0) {
      console.log('❌ NO REAL RESULTS FOUND - Google may be blocking or no results exist');
      console.log('💡 This means either:');
      console.log('   1. Google is blocking our requests (add better proxies)');
      console.log('   2. No real results exist for this search');
      console.log('   3. Google changed their HTML structure');
      return results; // Return empty array - NO MOCK DATA
    }

    elements.forEach((element, index) => {
      try {
        const titleElement = element;
        const linkElement = element.closest('a') || element.querySelector('a');
        
        if (!titleElement || !linkElement) return;

        const title = titleElement.textContent?.trim();
        let url = linkElement.href;
        
        // Clean Google redirect URLs
        if (url && url.includes('/url?q=')) {
          const urlMatch = url.match(/\/url\?q=([^&]+)/);
          if (urlMatch) {
            url = decodeURIComponent(urlMatch[1]);
          }
        }
        
        if (!title || !url || url.startsWith('javascript:') || url.startsWith('#')) return;

        // Filter for the specific platform
        const platformDomain = this.getPlatformDomain(platform);
        if (!url.toLowerCase().includes(platformDomain)) {
          console.log(`🚫 Filtered out non-${platform} URL: ${url}`);
          return;
        }

        // ONLY extract URL and title - REAL data only
        const result = {
          title: title,
          url: url,
          source: this.platforms[platform].name,
          platform: platform,
          description: `Found on ${this.platforms[platform].name}` // Minimal description
        };

        results.push(result);
        console.log(`📄 REAL ${platform} result found: ${title.substring(0, 50)}...`);
        console.log(`🔗 URL: ${url}`);
      } catch (error) {
        console.log(`❌ Error parsing REAL result ${index + 1}:`, error.message);
      }
    });

    console.log(`✅ Extracted ${results.length} REAL ${platform} results`);
    return results;
  }

  getPlatformDomain(platform) {
    switch (platform) {
      case 'linkedin': return 'linkedin.com';
      case 'instagram': return 'instagram.com';
      case 'facebook': return 'facebook.com';
      case 'googlemaps': return 'maps.google.com';
      default: return '';
    }
  }

  async scrapePlatform(platform, query) {
    const platformInfo = this.platforms[platform];
    const searchQuery = `${platformInfo.siteQuery} "${query}"`;
    
    console.log(`\n📱 Searching ${platformInfo.name} for REAL results...`);
    console.log(`🔍 REAL Query: ${searchQuery}`);
    
    const allResults = [];
    
    for (const domain of this.googleDomains) {
      try {
        const url = this.buildSearchUrl(domain, searchQuery);
        console.log(`🌐 REAL URL: ${url}`);
        
        const html = await this.makeRequest(url);
        const results = this.parseResults(html, platform);
        
        if (results.length > 0) {
          allResults.push(...results);
          console.log(`✅ ${platformInfo.name}: Found ${results.length} REAL results from ${domain}`);
          break; // Success, no need to try other domains
        } else {
          console.log(`⚠️ No REAL results from ${domain} for ${platform}`);
        }
        
        // Delay between domain attempts
        const delayMs = this.getRandomDelay();
        console.log(`⏳ Waiting ${Math.round(delayMs/1000)}s before next domain...`);
        await this.delay(delayMs);
        
      } catch (error) {
        console.log(`❌ Failed to scrape ${domain} for ${platform}: ${error.message}`);
        continue;
      }
    }
    
    if (allResults.length === 0) {
      console.log(`❌ Failed to scrape ${platformInfo.name}: NO REAL RESULTS FOUND`);
      console.log(`💡 This could mean:`);
      console.log(`   - Google is blocking our requests (need better proxies)`);
      console.log(`   - No businesses exist on ${platformInfo.name} for this search`);
      console.log(`   - Search terms are too specific`);
    }
    
    return allResults; // Return empty array if no real results - NO MOCK DATA
  }

  async scrape(query, options = {}) {
    // Initialize network manager with proxies when scraping starts
    console.log('🔄 Initializing network manager for scraping...');
    const proxiesLoaded = await this.networkManager.loadProxies();
    
    if (proxiesLoaded) {
      console.log('🔍 Validating proxies...');
      await this.networkManager.validateProxies();
    } else {
      console.log('⚠️ No proxies available - using direct connections');
    }
    
    const { platforms = ['linkedin', 'instagram', 'facebook', 'googlemaps'], maxResults = 30 } = options;
    
    console.log(`\n🚀 Starting REAL-ONLY social media scraping for: "${query}"`);
    console.log(`📱 Platforms: ${platforms.map(p => this.platforms[p].name).join(', ')}`);
    console.log(`🔄 Proxy rotation: ${this.proxyList.length} proxies available`);
    console.log(`🇦🇷 Argentina-focused search`);
    
    const allResults = [];
    
    for (const platform of platforms) {
      try {
        console.log(`\n📱 Searching ${this.platforms[platform].name} for REAL results...`);
        const platformResults = await this.scrapePlatform(platform, query);
        
        if (platformResults.length > 0) {
          allResults.push(...platformResults);
          console.log(`✅ ${this.platforms[platform].name}: Added ${platformResults.length} REAL results`);
        } else {
          console.log(`❌ ${this.platforms[platform].name}: NO REAL RESULTS FOUND`);
        }
        
        // Delay between platforms
        if (platforms.indexOf(platform) < platforms.length - 1) {
          const delayMs = this.getRandomDelay();
          console.log(`⏳ Waiting ${Math.round(delayMs/1000)}s before next platform...`);
          await this.delay(delayMs);
        }
        
      } catch (error) {
        console.error(`❌ Error scraping ${platform}: ${error.message}`);
        continue;
      }
    }
    
    // Remove duplicates and limit results
    const uniqueResults = this.removeDuplicates(allResults);
    const finalResults = uniqueResults.slice(0, maxResults);
    
    // Add position numbers and timestamps ONLY if we have real results
    if (finalResults.length > 0) {
      finalResults.forEach((result, index) => {
        result.position = index + 1;
        result.timestamp = new Date().toISOString();
        result.query = query;
      });
    }
    
    console.log(`\n🎉 REAL-ONLY social media scraping completed!`);
    console.log(`📊 Total REAL results found: ${finalResults.length}`);
    console.log(`🔍 Search query: "${query}"`);
    console.log(`📱 Platforms searched: ${platforms.length}`);
    
    if (finalResults.length === 0) {
      console.log(`\n❌ NO REAL RESULTS FOUND!`);
      console.log(`💡 Possible reasons:`);
      console.log(`   1. Google is blocking all our requests (HTTP 429)`);
      console.log(`   2. No businesses exist for this search term`);
      console.log(`   3. Need better/more proxies in proxies.txt`);
      console.log(`   4. Search terms are too specific`);
      console.log(`\n🔧 Solutions:`);
      console.log(`   - Add working proxies to proxies.txt`);
      console.log(`   - Try broader search terms`);
      console.log(`   - Wait and try again later`);
      console.log(`   - Use paid proxy services`);
      console.log(`\n⚠️ RETURNING EMPTY ARRAY - NO FAKE DATA`);
    }
    
    return finalResults; // Return empty array if no real results - NO MOCK DATA EVER
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

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}