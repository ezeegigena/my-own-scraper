# Node.js Lead Scraper

A professional-grade web scraping application built entirely in Node.js with multi-engine fallback scraping and advanced anti-detection capabilities.

## 🚀 Features

### Primary Scraping Method: Advanced Google Scraping
- **Proxy Rotation**: Automatic IP rotation using configurable proxy lists
- **User-Agent Rotation**: Realistic browser fingerprinting with rotating user agents
- **Smart Rate Limiting**: Intelligent delays and throttling to avoid detection
- **Advanced Headers**: Realistic browser headers with modern attributes
- **Retry Logic**: Exponential backoff with jitter for failed requests
- **Multiple Google Domains**: Rotates between different Google TLDs
- **Blocking Detection**: Identifies and handles CAPTCHA/blocking pages

### Fallback Method: Multi-Engine Scraping
- **Multiple Search Engines**: DuckDuckGo, Bing, Yahoo
- **Automatic Failover**: Seamlessly switches when primary method fails
- **Cross-Engine Deduplication**: Removes duplicate results across sources

### Professional Features
- **Pure Node.js**: No Python dependencies, runs entirely in JavaScript
- **Real-time Processing**: Live monitoring and status updates
- **Export Options**: CSV and Excel export with detailed metadata
- **Search History**: Track and replay previous searches
- **Session Management**: Organize searches with custom session names
- **SQLite Database**: Persistent storage for results and history

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (Node package manager)

## 🛠️ Installation

1. **Clone or download the project**

2. **Install dependencies:**
```bash
npm install
```

## 🚀 Usage

1. **Start the application:**
```bash
npm start
```

2. **Open your browser and go to:**
```
http://localhost:5000
```

## 🔧 Configuration

### Proxy Configuration

Create a `proxies.txt` file in the project root to add your proxy servers:

```
# Free proxies (may not work reliably)
8.210.83.33:80
47.74.152.29:8888

# For production, use paid services like:
# - Bright Data
# - Oxylabs  
# - SmartProxy
# - ProxyMesh
```

### Scraper Settings

You can configure the scraper by modifying the options in `server.js`:

```javascript
const scraper = new HybridScraper({
  delay: 3000,        // Delay between requests (ms)
  maxRetries: 3,      // Maximum retry attempts
  preferGoogle: true  // Prefer Google over fallback engines
});
```

## 📊 How It Works

### 1. Google Scraping System

The Google scraper (`lib/scrapers/GoogleScraper.js`) implements:

- **Multiple Google Domains**: Rotates between google.com, google.co.uk, etc.
- **Realistic Parameters**: Adds proper search parameters to look human
- **Advanced Parsing**: Multiple CSS selectors for different Google layouts
- **Blocking Detection**: Identifies and handles CAPTCHA/blocking pages
- **Smart Pagination**: Continues to next pages based on result quality

### 2. Anti-Detection Techniques

- **Rate Limiting**: 3-5 second delays between requests with randomization
- **Proxy Rotation**: Distribute requests across multiple IPs
- **User-Agent Rotation**: Mimic real browsers (Chrome, Firefox, Safari)
- **Header Simulation**: Include realistic browser headers
- **Request Patterns**: Randomize parameters and timing
- **Error Handling**: Graceful handling of blocks and retries

### 3. Hybrid Architecture

```
Web Interface (HTML/JavaScript)
        ↓ HTTP API
Node.js Express Server
        ↓ Scraper Classes
Google + Other Search Engines
        ↓ Results
Data Processing Pipeline
        ↓ Clean Data
SQLite Database Storage
```

## 🎯 Performance Tips

### For Better Results:

1. **Use Paid Proxies**: Residential proxies work better than free ones
2. **Increase Delays**: Higher delays reduce blocking risk
3. **Monitor Console**: Watch for blocking indicators in server logs
4. **Rotate Regularly**: Change proxy lists frequently
5. **Use Sessions**: Organize searches with meaningful session names

### Scaling Up:

- Deploy on cloud platforms (Heroku, DigitalOcean, AWS)
- Use premium proxy services
- Implement distributed scraping
- Add monitoring and alerting

## 🔍 Troubleshooting

### No Results from Google:
- Check if proxies are working
- Verify internet connection
- Try reducing request rate
- Check console logs for blocking indicators

### Fallback Methods Failing:
- Alternative search engines may also block
- Try different search queries
- Check search engine URLs are still valid

### Database Issues:
- Ensure write permissions in project directory
- Check SQLite database file creation
- Verify Node.js SQLite3 module installation

## 📝 API Endpoints

### Main Application (Port 5000):
- `GET /` - Web interface
- `POST /search` - Hybrid search endpoint
- `GET /history` - Search history
- `GET /results/:query` - Get results for specific query
- `GET /export/csv/:query` - Export CSV
- `GET /export/excel/:query` - Export Excel
- `GET /health` - Health check
- `GET /status` - Scraper status

## 🏗️ Architecture

### Core Components:

1. **HybridScraper** - Main scraping orchestrator
2. **GoogleScraper** - Advanced Google search scraping
3. **FallbackScraper** - Multi-engine fallback system
4. **Database** - SQLite data persistence
5. **ResultExporter** - CSV/Excel export functionality

### File Structure:
```
├── server.js                 # Main Express server
├── lib/
│   ├── database.js           # SQLite database wrapper
│   ├── exporters.js          # CSV/Excel export utilities
│   └── scrapers/
│       ├── HybridScraper.js  # Main scraper orchestrator
│       ├── GoogleScraper.js  # Google-specific scraping
│       └── FallbackScraper.js # Multi-engine fallback
├── templates/
│   └── index.html            # Web interface
└── package.json              # Dependencies and scripts
```

## 🤝 Contributing

This implementation follows web scraping best practices:

1. **Respectful Rate Limiting**: Reasonable delays between requests
2. **Anti-Detection**: Proxy rotation, user-agent spoofing
3. **Error Handling**: Robust retry and fallback logic
4. **Data Quality**: Cleaning and validation pipelines
5. **Modular Design**: Clean, maintainable code structure

## ⚠️ Legal Notice

This tool is for educational and legitimate business purposes only. Always:

- Respect robots.txt files
- Follow website terms of service  
- Use reasonable request rates
- Obtain permission when required
- Comply with applicable laws and regulations

## 📚 Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Puppeteer Documentation](https://pptr.dev/)

## 🔄 Migration from Python

This version replaces the Python/Scrapy implementation with a pure Node.js solution:

- ✅ No Python dependencies
- ✅ Runs in WebContainer environments
- ✅ Same functionality as original
- ✅ Better error handling
- ✅ Cleaner architecture
- ✅ Easier deployment