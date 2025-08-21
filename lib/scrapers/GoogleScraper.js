import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import UserAgent from 'user-agents';
import pkg from 'https-proxy-agent';
const { HttpsProxyAgent } = pkg;

export class GoogleScraper {
  constructor(options = {}) {
    this.userAgent = new UserAgent();
    this.proxies = options.proxies || [];
    this.currentProxyIndex = 0;
    this.delay = options.delay || 3000;
    this.maxRetries = options.maxRetries || 3;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRandomDelay() {
    return this.delay + Math.random() * 2000; // Add 0-2 seconds random delay
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  getHeaders() {
    const userAgent = this.userAgent.toString();
    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.1', // Spanish preference but not too strict
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };
  }

  buildGoogleUrl(query, start = 0) {
    // Use google.com with Argentina settings for better results
    const domain = 'google.com';
    
    const params = new URLSearchParams({
      q: query,
      start: start.toString(),
      num: '10',
      hl: 'es', // Spanish language
      gl: 'ar', // Argentina country
      cr: 'countryAR', // Country restriction to Argentina
      ie: 'UTF-8',
      oe: 'UTF-8',
      safe: 'off',
      filter: '0',
      pws: '0' // Disable personalization
    });

    return `https://www.${domain}/search?${params.toString()}`;
  }

  async makeRequest(url, retries = 0) {
    try {
      const proxy = this.getNextProxy();
      const options = {
        headers: this.getHeaders(),
        timeout: 30000
      };

      if (proxy) {
        options.agent = new HttpsProxyAgent(`http://${proxy}`);
      }

      console.log(`Making request to: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Check for blocking indicators
      if (this.isBlocked(html)) {
        throw new Error('Request blocked by Google');
      }

      console.log(`✅ Successfully fetched ${html.length} characters from Google`);
      return html;
    } catch (error) {
      console.log(`❌ Request failed (attempt ${retries + 1}): ${error.message}`);
      
      if (retries < this.maxRetries) {
        const delayMs = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.log(`⏳ Retrying in ${Math.round(delayMs/1000)}s...`);
        await this.delay(delayMs);
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
      'verify you are human'
    ];
    
    const lowerHtml = html.toLowerCase();
    const isBlocked = blockingIndicators.some(indicator => lowerHtml.includes(indicator));
    
    if (isBlocked) {
      console.log('🚫 Blocking detected in response');
    }
    
    return isBlocked;
  }

  parseResults(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const results = [];

    console.log('🔍 Parsing Google search results...');

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
        console.log(`📋 Using selector "${selector}" - found ${elements.length} elements`);
        break;
      }
    }

    if (elements.length === 0) {
      console.log('⚠️ No result elements found with any selector');
      return results;
    }

    elements.forEach((element, index) => {
      try {
        const titleElement = element;
        const linkElement = element.closest('a') || element.querySelector('a');
        const parentDiv = element.closest('.g, .rc, [data-ved], .tF2Cxc, .MjjYud');
        
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

        // Find description - look for snippet text
        let description = '';
        if (parentDiv) {
          // Try multiple description selectors
          const descSelectors = [
            '.VwiC3b', '.s3v9rd', '.st', '.IsZvec', 
            'span[data-ved]', '.yXK7lf', '.hgKElc'
          ];
          
          for (const descSelector of descSelectors) {
            const descElement = parentDiv.querySelector(descSelector);
            if (descElement) {
              description = descElement.textContent?.trim() || '';
              if (description.length > 20) break;
            }
          }
          
          // Fallback: look for any span/div with substantial text
          if (!description) {
            const textElements = parentDiv.querySelectorAll('span, div');
            for (const textEl of textElements) {
              const text = textEl.textContent?.trim();
              if (text && text.length > 50 && text.length < 500 && !text.includes('http')) {
                description = text;
                break;
              }
            }
          }
        }

        // BALANCED filtering - prefer Spanish but don't be too strict
        if (!this.isRelevantForArgentina(title, description, url)) {
          console.log(`🚫 Filtered out irrelevant content: ${title.substring(0, 50)}...`);
          return;
        }

        // Extract additional business information from the snippet
        const businessInfo = this.extractBusinessInfo(title, description, url);

        results.push({
          position: results.length + 1,
          title,
          url,
          description: description || 'No description available',
          source: 'google',
          timestamp: new Date().toISOString(),
          ...businessInfo // Include extracted business information
        });

        console.log(`📄 Result ${results.length}: ${title.substring(0, 50)}...`);
      } catch (error) {
        console.log(`❌ Error parsing result ${index + 1}:`, error.message);
      }
    });

    console.log(`✅ Successfully parsed ${results.length} results from Google`);
    return results;
  }

  // BALANCED filtering - prefer Argentina/Spanish but not too strict
  isRelevantForArgentina(title, description, url) {
    const text = `${title} ${description}`.toLowerCase();
    const urlLower = url.toLowerCase();
    
    // HARD BLOCK: Definitely not relevant
    const hardBlockList = [
      // Other countries that are clearly not Argentina
      'brazil', 'brasil', 'chile', 'uruguay', 'colombia', 'venezuela', 
      'peru', 'bolivia', 'ecuador', 'mexico', 'spain', 'españa', 
      'portugal', 'usa', 'united states', 'canada', 'france',
      
      // Other country domains
      '.com.br', '.cl', '.com.uy', '.com.co', '.com.ve', 
      '.com.pe', '.com.bo', '.com.ec', '.com.mx', '.es', '.pt',
      
      // Other currencies (clear indicators of other countries)
      'reais', 'real brasileiro', 'dollar', 'euro', 'pound', 
      'r$', '$us', '€', '£', 'usd', 'eur', 'gbp',
      
      // Clear social media profiles (not business websites)
      'facebook.com/profile', 'instagram.com/p/', 'twitter.com/',
      'linkedin.com/in/', 'youtube.com/watch', 'tiktok.com/@'
    ];

    // Check for hard blocked content
    const hasHardBlockedContent = hardBlockList.some(blocked => 
      text.includes(blocked) || urlLower.includes(blocked)
    );

    if (hasHardBlockedContent) {
      return false;
    }

    // Argentina location indicators (including neighborhoods)
    const argentinaLocations = [
      // Major cities
      'argentina', 'buenos aires', 'córdoba', 'rosario', 'mendoza', 'tucumán',
      'la plata', 'mar del plata', 'salta', 'santa fe', 'corrientes',
      'neuquén', 'formosa', 'chaco', 'misiones', 'entre ríos',
      'san juan', 'san luis', 'catamarca', 'la rioja', 'jujuy',
      'chubut', 'río negro', 'santa cruz', 'tierra del fuego',
      
      // Buenos Aires areas and neighborhoods
      'caba', 'capital federal', 'ciudad autónoma', 'amba', 'gba', 
      'zona norte', 'zona sur', 'zona oeste', 'conurbano',
      'palermo', 'recoleta', 'belgrano', 'san telmo', 'la boca',
      'puerto madero', 'barracas', 'san nicolás', 'retiro',
      'villa crespo', 'caballito', 'flores', 'almagro', 'balvanera',
      'once', 'abasto', 'constitución', 'monserrat', 'microcentro',
      
      // GBA neighborhoods and areas
      'vicente lópez', 'san isidro', 'tigre', 'san fernando',
      'olivos', 'martínez', 'acassuso', 'beccar', 'florida',
      'quilmes', 'avellaneda', 'lanús', 'lomas de zamora',
      'banfield', 'temperley', 'adrogué', 'burzaco',
      'san martín', 'villa ballester', 'villa adelina',
      'ramos mejía', 'haedo', 'morón', 'castelar', 'ituzaingó',
      'hurlingham', 'villa lynch', 'munro', 'florida oeste',
      
      // Other major areas
      'la pampa', 'santiago del estero', 'río cuarto', 'villa maría',
      'san rafael', 'godoy cruz', 'las heras', 'luján de cuyo',
      'yerba buena', 'tafí viejo', 'banda del río salí',
      'paraná', 'concordia', 'gualeguaychú', 'concepción del uruguay',
      
      // Generic location terms
      'barrio', 'localidad', 'partido', 'municipio', 'provincia de'
    ];

    // Argentina domain extensions
    const argentinaDomains = ['.com.ar', '.ar', '.gob.ar', '.org.ar', '.edu.ar'];

    // Spanish business indicators (more flexible)
    const spanishIndicators = [
      // Business terms
      'empresa', 'negocio', 'comercio', 'servicio', 'local', 'tienda',
      'consultorio', 'estudio', 'oficina', 'centro', 'taller',
      'inmobiliaria', 'restaurante', 'panadería', 'farmacia',
      'veterinaria', 'peluquería', 'abogado', 'contador', 'médico',
      
      // Common Spanish words
      'de', 'la', 'el', 'en', 'con', 'para', 'por', 'del', 'las', 'los',
      'más', 'muy', 'todo', 'bien', 'mejor', 'nuevo', 'gran', 'bueno',
      'excelente', 'calidad', 'atención', 'profesional', 'especialista',
      
      // Action words
      'venta', 'compra', 'alquiler', 'reparación', 'mantenimiento',
      'construcción', 'diseño', 'instalación', 'delivery', 'envío'
    ];

    // Check for Argentina indicators
    const hasArgentinaLocation = argentinaLocations.some(location => 
      text.includes(location) || urlLower.includes(location)
    );

    const hasArgentinaDomain = argentinaDomains.some(domain => 
      urlLower.includes(domain)
    );

    const hasSpanishIndicators = spanishIndicators.filter(indicator => 
      text.includes(indicator)
    ).length >= 1; // At least 1 Spanish indicator

    // BALANCED APPROACH:
    // 1. If it has Argentina domain (.com.ar) -> ACCEPT (very strong indicator)
    // 2. If it has Argentina location + any Spanish -> ACCEPT
    // 3. If it has multiple Spanish indicators -> ACCEPT (might be Argentina business)
    // 4. Otherwise -> REJECT

    if (hasArgentinaDomain) {
      return true; // .com.ar domains are very likely Argentina
    }

    if (hasArgentinaLocation && hasSpanishIndicators) {
      return true; // Clear Argentina location + Spanish content
    }

    if (spanishIndicators.filter(indicator => text.includes(indicator)).length >= 3) {
      return true; // Multiple Spanish indicators suggest Argentina business
    }

    return false;
  }

  // Extract business information from title and description
  extractBusinessInfo(title, description, url) {
    const info = {};
    const text = `${title} ${description}`.toLowerCase();
    
    // Extract Argentina phone numbers
    const phoneRegex = /(\+54|54)?\s*(\d{2,4})\s*(\d{3,4})\s*(\d{4})/g;
    const phones = text.match(phoneRegex);
    if (phones) {
      info.phone = phones[0];
    }
    
    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails) {
      info.email = emails[0];
    }
    
    // Extract address indicators for Argentina
    const addressKeywords = [
      'buenos aires', 'córdoba', 'rosario', 'mendoza', 'tucumán', 
      'la plata', 'mar del plata', 'salta', 'santa fe', 'corrientes',
      'palermo', 'recoleta', 'belgrano', 'caballito', 'flores'
    ];
    const foundLocation = addressKeywords.find(keyword => text.includes(keyword));
    if (foundLocation) {
      info.location = foundLocation;
    }
    
    // Extract business hours
    const hoursRegex = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/gi;
    const hours = description.match(hoursRegex);
    if (hours) {
      info.hours = hours[0];
    }
    
    return info;
  }

  async scrape(query, maxPages = 5) {
    console.log(`\n🚀 Starting Argentina-focused scrape for: "${query}"`);
    console.log(`🎯 Target pages: ${maxPages}`);
    console.log(`🇦🇷 Region: Argentina with neighborhood support`);
    
    const allResults = [];
    
    try {
      for (let page = 0; page < maxPages; page++) {
        const start = page * 10;
        const url = this.buildGoogleUrl(query, start);
        
        console.log(`\n📄 Scraping page ${page + 1} (results ${start + 1}-${start + 10})...`);
        
        const html = await this.makeRequest(url);
        const results = this.parseResults(html);
        
        if (results.length === 0) {
          console.log('⚠️ No more relevant results found, stopping pagination');
          break;
        }
        
        allResults.push(...results);
        console.log(`✅ Page ${page + 1}: Found ${results.length} results (Total: ${allResults.length})`);
        
        // Random delay between pages
        if (page < maxPages - 1) {
          const delayMs = this.getRandomDelay();
          console.log(`⏳ Waiting ${Math.round(delayMs/1000)}s before next page...`);
          await this.delay(delayMs);
        }
      }
      
      // Remove duplicates and add position numbers
      const uniqueResults = this.removeDuplicates(allResults);
      
      // Re-number positions after deduplication
      uniqueResults.forEach((result, index) => {
        result.position = index + 1;
      });
      
      console.log(`\n🎉 Argentina scraping completed!`);
      console.log(`📊 Total unique results: ${uniqueResults.length}`);
      console.log(`🔍 Search query: "${query}"`);
      console.log(`🇦🇷 Region: Argentina (including neighborhoods)`);
      
      return uniqueResults;
    } catch (error) {
      console.error('❌ Argentina scraping failed:', error.message);
      throw error;
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
}