import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = join(__dirname, '..', 'scraper_results.db');
    this.db = new sqlite3.Database(dbPath);
    
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          session_name TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_results INTEGER DEFAULT 0,
          status TEXT DEFAULT 'completed'
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          search_id INTEGER,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          source TEXT,
          platform TEXT,
          phone TEXT,
          email TEXT,
          location TEXT,
          hours TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (search_id) REFERENCES searches (id)
        )
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_search_query ON searches(query);
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_result_search_id ON results(search_id);
      `);
    });
  }

  async saveSearch(query, sessionName = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO searches (query, session_name) 
        VALUES (?, ?)
      `);
      
      stmt.run([query, sessionName], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
      
      stmt.finalize();
    });
  }

  async saveResults(searchId, results) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO results (search_id, title, url, description, source, platform, phone, email, location, hours) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let completed = 0;
      let hasError = false;

      if (results.length === 0) {
        resolve();
        return;
      }

      results.forEach(result => {
        stmt.run([
          searchId,
          result.title,
          result.url,
          result.description || '',
          result.source || 'unknown',
          result.platform || 'unknown',
          result.phone || null,
          result.email || null,
          result.location || null,
          result.hours || null
        ], (err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
            return;
          }
          
          completed++;
          if (completed === results.length && !hasError) {
            resolve();
          }
        });
      });

      stmt.finalize();
    });
  }

  async updateSearchResults(searchId, totalResults) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE searches SET total_results = ? WHERE id = ?',
        [totalResults, searchId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getSearchHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          s.*,
          COUNT(r.id) as actual_results
        FROM searches s
        LEFT JOIN results r ON s.id = r.search_id
        GROUP BY s.id
        ORDER BY s.timestamp DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // NEW: Delete specific search and its results
  async deleteSearch(searchId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM results WHERE search_id = ?', [searchId]);
        this.db.run('DELETE FROM searches WHERE id = ?', [searchId], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  // NEW: Clear all search history
  async clearAllHistory() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM results');
        this.db.run('DELETE FROM searches', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  // NEW: Get paginated results
  async getSearchResultsPaginated(query, page = 1, pageSize = 10) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * pageSize;
      
      this.db.all(`
        SELECT r.* 
        FROM results r
        JOIN searches s ON r.search_id = s.id
        WHERE s.query = ?
        ORDER BY r.timestamp DESC
        LIMIT ? OFFSET ?
      `, [query, pageSize, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ results: rows, page, pageSize });
        }
      });
    });
  }

  // NEW: Get total count of results for a query
  async getSearchResultsCount(query) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT COUNT(r.id) as total
        FROM results r
        JOIN searches s ON r.search_id = s.id
        WHERE s.query = ?
      `, [query], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  async getSearchResults(query) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT r.* 
        FROM results r
        JOIN searches s ON r.search_id = s.id
        WHERE s.query = ?
        ORDER BY r.timestamp DESC
      `, [query], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getSearchById(searchId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM searches WHERE id = ?',
        [searchId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default Database;