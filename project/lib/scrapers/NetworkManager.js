import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Separate Network Manager for Proxy-Based Scraping
 * This isolates proxy operations from Bolt's main networking stack
 */
export class NetworkManager {
  constructor() {
    this.proxyList = [];
    this.currentProxyIndex = 0;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    console.log('🌐 NetworkManager initialized - Separate from Bolt networking');
  }

  /**
   * Load proxies from file without blocking main thread
   */
  async loadProxies() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '..', '..', 'proxies.txt');
      
      const content = fs.readFileSync(filePath, 'utf8');
      this.proxyList = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      console.log(`📡 Loaded ${this.proxyList.length} proxies for scraping`);
      return this.proxyList.length > 0;
    } catch (error) {
      console.log(`⚠️ Could not load proxies: ${error.message}`);
      return false;
    }
  }

  /**
   * Get next proxy in rotation
   */
  getNextProxy() {
    if (this.proxyList.length === 0) return null;
    
    const proxy = this.proxyList[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
    return proxy;
  }

  /**
   * Parse proxy string into components
   */
  parseProxy(proxyString) {
    try {
      // Handle format: username:password@host:port
      const [credentials, hostPort] = proxyString.includes('@') 
        ? proxyString.split('@') 
        : [null, proxyString];
      
      const [host, port] = hostPort.split(':');
      const auth = credentials ? credentials.split(':') : null;
      
      return {
        host: host.trim(),
        port: parseInt(port),
        username: auth ? auth[0] : null,
        password: auth ? auth[1] : null
      };
    } catch (error) {
      console.log(`❌ Invalid proxy format: ${proxyString}`);
      return null;
    }
  }

  /**
   * Create HTTP request options with proxy
   */
  createRequestOptions(targetUrl, proxy = null) {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.1',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    // Add proxy configuration if provided
    if (proxy) {
      const proxyConfig = this.parseProxy(proxy);
      if (proxyConfig) {
        // For HTTP proxy tunneling
        options.hostname = proxyConfig.host;
        options.port = proxyConfig.port;
        options.path = targetUrl; // Full URL for proxy
        
        if (proxyConfig.username && proxyConfig.password) {
          const auth = Buffer.from(`${proxyConfig.username}:${proxyConfig.password}`).toString('base64');
          options.headers['Proxy-Authorization'] = `Basic ${auth}`;
        }
        
        console.log(`🔧 Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
      }
    }

    return { options, isHttps };
  }

  /**
   * Make HTTP request using Node.js native modules (separate from Bolt)
   */
  async makeRequest(url, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const proxy = this.getNextProxy();
        const { options, isHttps } = this.createRequestOptions(url, proxy);
        
        console.log(`🌐 Request attempt ${attempt + 1}/${maxRetries} to: ${url}`);
        
        const response = await this.executeRequest(options, isHttps);
        
        if (response.statusCode === 200) {
          console.log(`✅ Success: ${response.data.length} characters received`);
          return response.data;
        } else {
          throw new Error(`HTTP ${response.statusCode}`);
        }
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt + 1} failed: ${error.message}`);
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`⏳ Retrying in ${Math.round(delay/1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All request attempts failed');
  }

  /**
   * Execute HTTP request using native Node.js modules
   */
  executeRequest(options, isHttps) {
    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * Test proxy connectivity
   */
  async testProxy(proxyString) {
    try {
      const testUrl = 'http://httpbin.org/ip';
      const { options, isHttps } = this.createRequestOptions(testUrl, proxyString);
      
      const response = await this.executeRequest(options, isHttps);
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate all loaded proxies
   */
  async validateProxies() {
    if (this.proxyList.length === 0) {
      console.log('⚠️ No proxies to validate');
      return [];
    }
    
    console.log(`🔍 Validating ${this.proxyList.length} proxies...`);
    const workingProxies = [];
    
    for (const proxy of this.proxyList) {
      const isWorking = await this.testProxy(proxy);
      if (isWorking) {
        workingProxies.push(proxy);
        console.log(`✅ Proxy working: ${proxy.split('@')[1] || proxy}`);
      } else {
        console.log(`❌ Proxy failed: ${proxy.split('@')[1] || proxy}`);
      }
    }
    
    this.proxyList = workingProxies;
    console.log(`📊 Validation complete: ${workingProxies.length} working proxies`);
    return workingProxies;
  }
}