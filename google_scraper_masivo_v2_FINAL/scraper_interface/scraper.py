
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import re
import csv
import os

class GoogleScraper:
    def __init__(self, use_proxy=False, proxy_list=None):
        self.driver = self._init_driver()
        self.use_proxy = use_proxy
        self.proxy_list = proxy_list
        self.current_proxy = None

    def _init_driver(self):
        options = uc.ChromeOptions()
        options.add_argument('--headless') # Run in headless mode for deployment
        options.add_argument('--disable-gpu')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        ]
        options.add_argument(f'user-agent={random.choice(user_agents)}')

        driver = uc.Chrome(options=options)
        return driver

    def _set_proxy(self):
        if self.use_proxy and self.proxy_list:
            self.current_proxy = random.choice(self.proxy_list)
            print(f"Using proxy: {self.current_proxy}")

    def search_google(self, query):
        search_url = f"https://www.google.com/search?q={query}"
        self.driver.get(search_url)
        time.sleep(random.uniform(2, 5)) # Simulate human-like delay

        if "captcha" in self.driver.page_source.lower() or "unusual traffic" in self.driver.page_source.lower():
            print("CAPTCHA or block page detected. Manual intervention or better anti-detection needed.")
            return []

        results = []
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "search"))
            )
            
            search_elements = self.driver.find_elements(By.CSS_SELECTOR, "div.g")
            for element in search_elements:
                try:
                    title = element.find_element(By.CSS_SELECTOR, "h3").text
                    link = element.find_element(By.CSS_SELECTOR, "a").get_attribute("href")
                    snippet = element.find_element(By.CSS_SELECTOR, "div.VwiC3b").text
                    results.append({"title": title, "link": link, "snippet": snippet})
                except Exception as e:
                    continue
        except Exception as e:
            print(f"Error extracting search results: {e}")
        
        return results

    def close(self):
        self.driver.quit()

def extract_phone_number(text):
    phone_regex = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b')
    match = phone_regex.search(text)
    return match.group(0) if match else None

def extract_email(text):
    email_regex = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    match = email_regex.search(text)
    return match.group(0) if match else None

def extract_website(text):
    # This is a basic regex, might need refinement for all cases
    website_regex = re.compile(r'https?://(?:www\.)?[a-zA-Z0-9./-]+(?:\.[a-zA-Z]{2,})+(?:/[^\s]*)?')
    match = website_regex.search(text)
    return match.group(0) if match else None

def extract_name_from_url(url):
    try:
        path = url.split("/")
        if "instagram.com" in url and len(path) > 3:
            return path[3].split('?')[0]
        elif "linkedin.com" in url and "in/" in url and len(path) > 4:
            return path[4].split('?')[0]
        elif "facebook.com" in url and "/pg/" in url and len(path) > 4:
            return path[4].split('?')[0] # Basic for Facebook pages
        elif "facebook.com" in url and len(path) > 3:
            return path[3].split('?')[0] # Basic for Facebook profiles
    except:
        pass
    return None

def save_results_to_csv(results, filename="scraped_data.csv"):
    # Ensure the 'results' directory exists
    output_dir = "results"
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)

    unique_leads = set()
    final_results = []

    for res in results:
        phone = extract_phone_number(res["snippet"] + " " + res["link"])
        email = extract_email(res["snippet"] + " " + res["link"])
        website = extract_website(res["snippet"] + " " + res["link"])
        name = extract_name_from_url(res["link"])

        # Create a unique identifier for deduplication
        # Using a tuple of (phone, email, website) for uniqueness. None values are handled.
        lead_identifier = (phone, email, website)
        if lead_identifier not in unique_leads:
            unique_leads.add(lead_identifier)
            final_results.append({
                "title": res["title"],
                "link": res["link"],
                "snippet": res["snippet"],
                "phone_number": phone,
                "email": email,
                "website": website,
                "name": name
            })

    with open(filepath, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["Title", "Link", "Snippet", "Phone Number", "Email", "Website", "Name"])
        for res in final_results:
            writer.writerow([
                res["title"],
                res["link"],
                res["snippet"],
                res["phone_number"],
                res["email"],
                res["website"],
                res["name"]
            ])
    print(f"Results saved to {filepath}")
    return filepath

# This part will be called by the Flask backend, not directly executed
# The main execution block is moved to a function for better integration

def run_scraper_from_flask(keywords, platforms, location, max_leads):
    scraper = GoogleScraper()
    all_extracted_results = []
    
    # Define common contact search terms
    contact_terms = '"gmail.com" OR "hotmail.com" OR "yahoo.com" OR "outlook.com" OR "contacto" OR "contact" "numero de telefono"'

    queries = []
    for platform in platforms:
        for keyword in keywords:
            base_query = f'"{keyword}" "{location}" {contact_terms}' if location else f'"{keyword}" {contact_terms}'
            if platform == 'instagram':
                queries.append(f'site:instagram.com {base_query}')
            elif platform == 'googlemaps':
                queries.append(f'site:googlemaps.com {base_query}')
            elif platform == 'linkedin':
                queries.append(f'site:linkedin.com {base_query}')
            elif platform == 'facebook':
                queries.append(f'site:facebook.com {base_query}')

    for q in queries:
        print(f"Searching for: {q}")
        results = scraper.search_google(q)
        all_extracted_results.extend(results)
        print(f"Found {len(results)} raw results for '{q}'")
        time.sleep(random.uniform(5, 10)) # Delay between queries

    csv_filepath = save_results_to_csv(all_extracted_results)
    scraper.close()
    return csv_filepath

# Example of how it would be called if run directly (for testing purposes)
if __name__ == "__main__":
    # Example Usage:
    keywords_test = ["restaurantes"]
    platforms_test = ["instagram", "googlemaps", "facebook"]
    location_test = "Madrid"
    max_leads_test = 50

    print("Running scraper in test mode...")
    output_csv = run_scraper_from_flask(keywords_test, platforms_test, location_test, max_leads_test)
    print(f"Test completed. Results saved to: {output_csv}")


