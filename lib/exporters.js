import XLSX from 'xlsx';
import { createObjectCsvStringifier } from 'csv-writer';

export class ResultExporter {
  static async exportToCSV(results, query) {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'title', title: 'Title' },
        { id: 'url', title: 'URL' },
        { id: 'description', title: 'Description' },
        { id: 'source', title: 'Source' },
        { id: 'timestamp', title: 'Timestamp' }
      ]
    });

    const header = csvStringifier.getHeaderString();
    const records = csvStringifier.stringifyRecords(results);
    
    return header + records;
  }

  static async exportToExcel(results, query) {
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths
    const colWidths = [
      { wch: 50 }, // Title
      { wch: 60 }, // URL
      { wch: 80 }, // Description
      { wch: 15 }, // Source
      { wch: 20 }  // Timestamp
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Search Results');
    
    // Add metadata sheet
    const metadata = [
      { Property: 'Search Query', Value: query },
      { Property: 'Export Date', Value: new Date().toISOString() },
      { Property: 'Total Results', Value: results.length },
      { Property: 'Sources', Value: [...new Set(results.map(r => r.source))].join(', ') }
    ];
    
    const metaSheet = XLSX.utils.json_to_sheet(metadata);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}