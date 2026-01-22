#!/usr/bin/env node

require('./log.cjs');

const NULL = 'null';

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const mupdf = await import('mupdf');

  const stats = new Statistics();

  /** @typedef {Object} TaskEntry
   *  @property {string} primitiveName
   *  @property {string} htmlFile
   */

  /** @typedef {Object} ProcessedEntry
   *  @property {string} primitiveName
   *  @property {string} htmlFile
   *  @property {number|string} pageNumber
   *  @property {string} destinationName
   *  @property {string} pdfUrl
   *  @property {string} docsUrl
   */

  /* CSV Utilities */
  const csvFile = new CSVFile(['primitiveName', 'htmlFile', 'pageNumber', 'destinationName', 'pdfUrl', 'docsUrl']);

  /**
   * @param {PDFFile} doc
   * @param {object} task
   * @param {string} task.prefix
   * @param {string} task.file
   * @param {object} [task.rewrites]
   * @param {string} [task.docsUrlPrefix]
   * @returns {Array<ProcessedEntry>}
   */
  function processTask(doc, task) {
    const { prefix, file, rewrites = {}, docsUrlPrefix = prefix } = task;
    const entries = new TaskFile(fs.readFileSync(file, 'utf8')).getEntries();
    const results = [];

    console.log(`Processing task: prefix="${prefix}", file="${path.basename(file)}"`);

    entries.forEach(({ primitiveName, htmlFile }) => {
      let filename = htmlFile;
      if (filename.endsWith('.html')) {
        filename = filename.substring(0, filename.length - 5);
      }

      filename = rewrites[filename] ?? filename;

      const [dest, destName] = [`${prefix}-${filename}`, `${prefix}-${prefix}${filename}`]
        .map((name) => (doc.getDestination(name) ? [doc.getDestination(name), name] : null))
        .filter(Boolean)[0] || [null, `${prefix}-${filename}`];

      const pageNum = doc.getPageNumberFromDestination(dest);
      const docsUrl = `/${docsUrlPrefix}/${filename}`;
      const commonFields = {
        primitiveName,
        htmlFile,
        pageNumber: 'N/A',
        destinationName: destName,
        pdfUrl: 'N/A',
        docsUrl,
      };

      stats.incrementEntries();

      if (pageNum !== undefined) {
        const pdfUrl = `#page=${pageNum}&nameddest=${destName}`;
        results.push({
          ...commonFields,
          pageNumber: pageNum,
          pdfUrl,
        });
      } else {
        console.warn(`Destination "${destName}" not found`);
        stats.incrementMissing();
        results.push(commonFields);
      }
    });

    return results;
  }

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node script.js <pdf-file> [--output output.csv]');
    console.error('\nTasks should be defined in the script or passed as JSON');
    process.exit(1);
  }

  const pdfFile = args[0];
  const doc = new PDFFile(mupdf.Document.openDocument(fs.readFileSync(pdfFile), 'application/pdf'));

  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

  if (!fs.existsSync(pdfFile)) {
    console.error(`Error: PDF file "${pdfFile}" not found`);
    process.exit(1);
  }

  const indexPath = path.join(__dirname, '..', '..', 'public', '_index');
  const tasks = [
    {
      prefix: 'dictionary',
      file: path.join(indexPath, 'dict.txt'),
      docsUrlPrefix: 'dict',
      rewrites: {
        mathconstants: 'mathematical-constants',
        colorconstants: 'color-constants',
        boolconstants: 'boolean-constants',
      },
    },
    { prefix: '3d', file: path.join(indexPath, 'dict3d.txt'), docsUrlPrefix: 'dict' },
    ...fs
      .readdirSync(path.join(indexPath, 'extensions'), { withFileTypes: true })
      .filter((f) => f.name.endsWith('.txt') && f.isFile())
      .map((f) => ({
        prefix: f.name.replace('.txt', ''),
        file: path.join(f.parentPath, f.name),
        docsUrlPrefix: f.name.replace('.txt', ''),
      })),
  ];
  let allResults = [];

  tasks.forEach((task) => {
    if (!fs.existsSync(task.file)) {
      console.warn(`Task file "${task.file}" not found, skipping`);
      return;
    }

    const results = processTask(doc, task);
    allResults = allResults.concat(results);
  });

  console.info(`Processing complete.`);
  stats.log();

  allResults.forEach((entry) => {
    csvFile.addRow(entry);
  });

  if (outputFile) {
    fs.writeFileSync(outputFile, csvFile.toString(), 'utf8');
    console.log(`\nResults written to ${outputFile}`);
  } else {
    console.log(csvFile.toString());
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

class CSVFile {
  constructor(headerFields, separator = ',', quoteChar = '"', newline = '\n') {
    this.headerFields = headerFields;
    this.separator = separator;
    this.quoteChar = quoteChar;
    this.newline = newline;
    this.rows = [];
  }

  /**
   * @param {any} value
   * @returns {string}
   */
  escape(value) {
    return value.replace(new RegExp(this.quote, 'g'), `\\${this.quote}`);
  }

  /**
   *
   * @param {any} value
   * @returns {string}
   */
  quote(value) {
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `${this.quoteChar}${this.escape(stringValue)}${this.quoteChar}`;
    }
    return stringValue;
  }

  /**
   *
   * @param {Array<any>} values
   * @returns {string}
   */
  formatRow(values) {
    return values.map((value) => this.quote(value)).join(this.separator);
  }

  /**
   * @param {Object} values
   */
  addRow(values) {
    const row = this.headerFields.map((field) => values[field]);
    this.rows.push(this.formatRow(row));
  }

  toString() {
    return [this.formatRow(this.headerFields), ...this.rows].join(this.newline);
  }
}

class PDFFile {
  /**
   * @param {mupdf.PDFDocument} doc
   */
  constructor(doc) {
    this.doc = doc;
    this.destinations = doc.getTrailer().get('Root').get('Dests');
  }

  getDestination(name) {
    const result = this.destinations.get(name);
    if (result.toString() === NULL) {
      return undefined;
    }
    return result;
  }

  getPageNumberFromDestination(dest) {
    if (dest.toString() === NULL) return undefined;

    const pageRef = dest.get(0);

    for (let i = 0; i < this.doc.countPages(); i++) {
      let page = this.doc.findPage(i);
      if (page.toString() === pageRef.toString()) {
        return i + 1;
      }
    }
    return undefined;
  }
}

class TaskFile {
  /**
   * @param {string} fileString
   */
  constructor(fileString) {
    this.entries = [];
    const lines = fileString.split('\n').filter((line) => line.trim());
    lines.forEach((line) => {
      const lastSpaceIdx = line.lastIndexOf(' ');
      if (lastSpaceIdx === -1) return;

      const primitiveName = line.substring(0, lastSpaceIdx).trim();
      const htmlFile = line.substring(lastSpaceIdx + 1).trim();

      this.entries.push({ primitiveName, htmlFile });
    });
  }

  getEntries() {
    return this.entries;
  }
}

class Statistics {
  constructor() {
    this.missing = 0;
    this.entries = 0;
  }

  incrementMissing() {
    this.missing += 1;
  }

  incrementEntries() {
    this.entries += 1;
  }

  log() {
    console.log(`Entries processed: ${this.entries}, Missing destinations: ${this.missing}`);
  }
}
