// This file is kept for fallback compatibility but not used in the main scraper
export class WebContainerSocialScraper {
  constructor() {
    console.log('⚠️ WebContainerSocialScraper: This is a fallback scraper only');
  }

  async scrape(query, options = {}) {
    console.log('⚠️ WebContainerSocialScraper: Fallback scraper called');
    console.log('🔄 Redirecting to ProxyRotationScraper...');
    
    // Return empty results - the main scraper should handle this
    return [];
  }
}