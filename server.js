import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from './lib/database.js';
import { ProxyRotationScraper } from './lib/scrapers/ProxyRotationScraper.js';
import { ResultExporter } from './lib/exporters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Initialize database and scraper
const db = new Database();
const socialScraper = new ProxyRotationScraper();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'templates'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.post('/search', async (req, res) => {
  try {
    const { query, sessionName, maxResults = 30, platforms = ['all'] } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n=== Starting PROXY ROTATION social media search for: "${query}" ===`);
    console.log(`📱 Platforms: ${platforms.join(', ')}`);
    
    // Save search to database
    const searchId = await db.saveSearch(query.trim(), sessionName);
    
    // Configure scraper
    const options = {
      maxResults: parseInt(maxResults),
      platforms: platforms
    };

    // Perform social media scraping with proxy rotation
    const results = await socialScraper.scrape(query.trim(), options);
    
    // Save results to database
    if (results.length > 0) {
      await db.saveResults(searchId, results);
      await db.updateSearchResults(searchId, results.length);
    }

    console.log(`=== PROXY ROTATION social media search completed: ${results.length} results ===\n`);

    res.json({
      success: true,
      query: query.trim(),
      results: results,
      total: results.length,
      searchId: searchId,
      platforms: [...new Set(results.map(r => r.source))],
      sources: [...new Set(results.map(r => r.source))],
      method: 'Proxy Rotation Anti-Detection'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      query: req.body.query
    });
  }
});

// Proxy management endpoints
app.get('/proxies/status', async (req, res) => {
  try {
    await socialScraper.networkManager.loadProxies();
    const workingProxies = await socialScraper.networkManager.validateProxies();
    res.json({
      success: true,
      total_proxies: socialScraper.networkManager.proxyList.length,
      working_proxies: workingProxies.length,
      proxies: workingProxies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/proxies/add', (req, res) => {
  try {
    const { proxies } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'Proxies must be an array' });
    }
    
    // Add proxies to network manager
    socialScraper.networkManager.proxyList.push(...proxies);
    res.json({
      success: true,
      message: `Added ${proxies.length} proxies`,
      total_proxies: socialScraper.networkManager.proxyList.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/history', async (req, res) => {
  try {
    const history = await db.getSearchHistory(50);
    res.json({ success: true, history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete search history endpoint
app.delete('/history/:searchId', async (req, res) => {
  try {
    const { searchId } = req.params;
    await db.deleteSearch(parseInt(searchId));
    res.json({ success: true, message: 'Search deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all search history endpoint
app.delete('/history', async (req, res) => {
  try {
    await db.clearAllHistory();
    res.json({ success: true, message: 'All search history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Paginated results endpoint
app.get('/results/page/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const { query } = req.query;
    const pageSize = 10;
    const pageNum = parseInt(page) || 1;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }
    
    const results = await db.getSearchResultsPaginated(query, pageNum, pageSize);
    const totalResults = await db.getSearchResultsCount(query);
    const totalPages = Math.ceil(totalResults / pageSize);
    
    res.json({ 
      success: true, 
      results: results.results,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults,
        pageSize,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Paginated results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/results/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const results = await db.getSearchResults(decodeURIComponent(query));
    res.json({ success: true, results });
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/export/csv/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const decodedQuery = decodeURIComponent(query);
    const results = await db.getSearchResults(decodedQuery);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this query' });
    }

    const csv = await ResultExporter.exportToCSV(results, decodedQuery);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="social-media-leads-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/export/excel/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const decodedQuery = decodeURIComponent(query);
    const results = await db.getSearchResults(decodedQuery);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this query' });
    }

    const excel = await ResultExporter.exportToExcel(results, decodedQuery);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="social-media-leads-${Date.now()}.xlsx"`);
    res.send(excel);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    scraper: 'proxy-rotation-social-scraper',
    version: '5.0.0',
    proxies_available: socialScraper.proxyList.length
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    social_media_available: true,
    scraper_type: 'proxy-rotation-social-scraper',
    platforms: ['LinkedIn', 'Instagram', 'Facebook', 'Google Maps'],
    proxies_count: socialScraper.proxyList.length,
    anti_detection: 'Proxy Rotation + User Agent Rotation + Domain Rotation',
    note: 'Uses multiple proxies and domains to avoid IP blocking'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`\n🚀 PROXY ROTATION Social Media Lead Scraper running on port ${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}`);
  console.log(`🔍 Method: Proxy rotation + Anti-detection for social media scraping`);
  console.log(`📱 Platforms: LinkedIn, Instagram, Facebook, Google Maps`);
  console.log(`🌐 Network manager ready for proxy operations`);
  console.log(`💾 Database: SQLite`);
  console.log(`\n=== Ready to bypass Google blocking with proxy rotation! ===\n`);
});