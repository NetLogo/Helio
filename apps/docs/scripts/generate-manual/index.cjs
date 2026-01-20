/**
 * @file
 * This script generates a PDF manual from multiple HTML files.
 * It combines the content of the HTML files, generates a table of contents,
 * and adds headers and footers to the PDF.
 * It uses Puppeteer to render the HTML and generate the PDF.
 * This file is part of the NetLogo project.
 *
 * @license GPL-2.0-or-later
 * @author Omar Ibrahim, Center for Connected Learning, Northwestern University
 * @since 2025
 *
 * All files that should be of interest to you are defined in project/Docs.scala
 * and are located in:
 *   * Mustache files: autogen/docs
 *   * HTML output files: netlogo-gui/docs
 *   * SBT scripts invoking this script: project/Docs.scala and project/NetLogoDocs.scala
 */

require('./log.cjs');

const path = require('path');
const PRINT_TOC_FOR_DEBUGGING = false; // Set to true to print the table of contents for debugging purposes
const EXPORT_DEBUG_HTML = false; // Set to true to export the combined HTML for debugging purposes

async function main() {
  // Check if required dependencies are installed
  const missingDependencies = [];
  for (const dep of ['puppeteer', 'fs-extra']) {
    try {
      require.resolve(dep);
    } catch {
      missingDependencies.push(dep);
    }
  }

  if (missingDependencies.length > 0) {
    console.error(`Missing dependencies: ${missingDependencies.join(', ')}.`);
    console.error(`Please install them using: npm install ${missingDependencies.join(' ')}`);
    process.exit(1);
  }

  // Import the required modules
  const puppeteer = require('puppeteer');
  const fs = require('fs-extra');
  const environments = require('./env-options.cjs');

  // Check the environment
  const environmentOptions = environments.find((env) => env.test());
  console.info('Using Options:', JSON.stringify(environmentOptions, null, 2));

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error(
      'Usage: node generate-manual.js <server-host> <server-port> <url-prefix> file1.html file2.html ... <pdf-output-file>.pdf',
    );
    process.exit(1);
  }

  const outputPdf = args.pop(); // last arg is the output file
  const [serverHost, serverPort] = args.slice(0, 2); // first two args are server host and port
  const urlPrefix = args[2] === 'null' ? '' : args[2]; // third arg is the URL prefix
  let htmlFiles = args.slice(3); // middle args are the HTML files

  // Run puppeteer in headless mode
  await environmentOptions.beforeAll();
  const browser = await puppeteer.launch(environmentOptions.launch);
  const page = await browser.newPage();

  // Increase timeout
  page.setDefaultTimeout(environmentOptions.timeout);

  /**
   * @typedef {Object} TocEntry
   * @property {string} id        - The unique identifier for the heading.
   * @property {number} level     - The heading level (1 for h1, 2 for h2, etc.).
   * @property {string} text      - The text content of the heading.
   * @property {string} tag       - The tag name of the heading (h1, h2, h3).
   * @typedef {Object} TocEntryCollection
   * @property {string} file      - The name of the file from which the entry was extracted.
   * @property {TocEntry[]} entries - An array of TocEntry objects representing the
   */

  /**
   * @type {TocEntryCollection}
   */
  let tocEntries = Array(htmlFiles.length); // Array of objects with file and entries

  // We have to combine all HTML files into a single PDF
  // because pdflib cannot copy annotations if we decide
  // to merge individual PDFs later.
  // This is a workaround for the limitation of pdflib.
  /**
   * @type {string}
   * builder string for the combined HTML content from
   * all HTML files.
   */
  let combinedHtml = Array(htmlFiles.length).fill(undefined);
  /**
   * @type {string|undefined}
   * placeholder variable for the title HTML.
   */
  let titleHTML = undefined;

  /*
   * Turns out rendering markdown into HTML then generating a table of
   * contents with anchor annotations for the headings is a little complicated.
   *
   * We need to ensure that all h1, h2, and h3 tags have unique ids attached to them
   * by rewriting the HTML files. We then need to collect a list of all headings
   * and their ids to generate a table of contents. Finally, we have to generate
   * the PDF document from a single HTML file that contains the combined content
   * of all the HTML files, the table of contents, and the header and footer.
   *
   * Why does it have to be a single HTML file?
   *   * Because pdflib and pdfkit cannot combine multiple PDF files while
   *     preserving the annotations (links) in the PDF.
   *
   * Why do we need to rewrite the HTML files?
   *  * Because we need to ensure that all headings have unique ids that we can
   *    reference in the table of contents.
   *
   * Why can't we use { outline: true } in the PDF generation?
   *   * We can, but it only works if we have a single HTML file with all the content.
   *
   * Why do we need to prefix the ids with the filename?
   *   * Because we are combining multiple HTML files into a single PDF,
   *     and we need to ensure that the ids are unique across all files.
   *     If we don't do this, we might end up with duplicate ids in the PDF
   *     which would cause issues with the table of contents and navigation.
   *     This is especially important if the same heading appears in multiple files.
   *     For example, if both files have a heading "Introduction", we need to
   *     ensure that they have different ids like "file1-introduction" and "file2-introduction".
   *     This way, the table of contents can link to the correct heading
   *     in the correct file.
   *     We also use a random suffix to ensure that even if the same heading appears
   *     in the same file, it will have a unique id.
   *
   * Other Edge Cases:
   *  |--------------------------------------|-------------------------------|------------------------------------------|
   *  | Scenario                             | Original HTML                 | Rewritten HTML                           |
   *  |--------------------------------------|-------------------------------|------------------------------------------|
   *  | Heading with existing id             | <h2 id="existing-id" ...      | <h2 id="<fileIdPrefix>-existing-id" ...  |
   *  | Heading without id                   | <h2 ...                       | <h2 id="<fileIdPrefix>-h2-<random>" ...  |
   *  |                                      | <h3 ...                       | <h3 id="<fileIdPrefix>-h3-<random>" ...  |
   *  | div/span/a with existing id          | <div id="existing-id" ...     | <div id="<fileIdPrefix>-existing-id" ... |
   *  | Anchor (hash link to same file)      | <a href="#existing-id" ...    | <a href="#<fileIdPrefix>-existing-id" ...|
   *  | Anchor (relative link to another     | <a href="otherfile#id"        | <a href="#<otherFileIdPrefixid>__netlogo |
   *  |   file)                              |   ...                         |  "...                                    |
   *  | Anchor (absolute link to another     | <a href="https://example.com" | <a href="https://example.com" ...        |
   *  |   file)                              |   ...                         |                                          |
   *  |--------------------------------------|-------------------------------|------------------------------------------|
   *
   * Special Cases in Extracting Headings for TOC:
   *  * If a heading is nested under a .dict_entry class, we make sure to ignore the <span class="since"> child
   *    when extracting the text content for the table of contents.
   *      * If a heading has multiple <a> tags inside it, we join their text content with commas.
   *        This is to ensure that the table of contents entry is readable and does not contain
   *        multiple links that would clutter the TOC.
   *  * Because of styling, the anchor targets are actually way below the headings,
   *    so we need to add _fake_ targets before each heading.
   * */
  const getFileIdPrefix = (filename) => encodeURIComponent(path.basename(filename, '.html').replace(/^\//, ''));
  await Promise.all(
    htmlFiles.map(async (file, index) => {
      const myPage = await browser.newPage();
      const filePath = path.resolve(__dirname, file);
      let fileContent = fs.readFileSync(filePath, 'utf8');

      if (fileContent) {
        const fileIdPrefix = getFileIdPrefix(file);
        // Get all H1, H2, H3 and if they don't have an id, add one
        fileContent = fileContent.replace(/<h([123])([^>]*)>/g, (match, level, attrs) => {
          const idMatch = attrs.match(/id="([^"]+)"/);
          if (idMatch) {
            // If it already has an id, just return the original match
            return match;
          } else {
            // Otherwise, generate a new id based on the file name and heading level
            const newId = `h${level}-${Math.random().toString(36).substring(2, 15)}`;
            return `<h${level} id="${newId}"${attrs}>`;
          }
        });
        // Remove <nav></nav> and <footer></footer> tags
        fileContent = fileContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/g, '');
        fileContent = fileContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/g, '');
        // <h1 id="some-id" ...>        ->
        // <div class="anchor-target" id="fileIdPrefix-some-id"></div><h1 id="fileIdPrefix-some-id" ...>
        fileContent = fileContent.replace(/<h([123])([^>]*?) id="([^"]+)"/g, (match, level, attrs, id) => {
          return `<h${level} ${attrs} id="${fileIdPrefix}-${id}"`;
        });
        // <div|span|a id="some-id" ...> ->
        // <div|span|a id="fileIdPrefix-some-id" ...>
        fileContent = fileContent.replace(/<(div|a|span)([^>]*?) id="([^"]+)"/g, (match, tag, attrs, id) => {
          return `<${tag}${attrs} id="${fileIdPrefix}-${id}"`;
        });
        // <a href="#some-id"...>        ->
        // <a href="#fileIdPrefix-some-id" ...>
        fileContent = fileContent.replace(/<a([^>]*?) href="#([^"]+)"/g, (match, attrs, id) => {
          return `<a${attrs} href="#${fileIdPrefix}-${id}"`;
        });
        // <a href="otherfile.html#some-id"...> <a href="otherfile#some-id" ...>      ->
        // <a href="#otherfileIdPrefix-some-id" ...>
        fileContent = fileContent.replace(/<a([^>]*?) href="([^#"]+)(#([^"]+))?"?/g, (match, attrs, link, _, hash) => {
          // Make sure the link does not start with http, https
          if (!link.startsWith('http') && !link.startsWith('https')) {
            // If it's a relative link, we can safely prefix it with the fileIdPrefix
            // First, determine the fileIdPrefix for the link
            const relativeFileIdPrefix = getFileIdPrefix(link);
            // Then, return the modified link
            if (!hash) {
              return `<a${attrs} href="#${relativeFileIdPrefix}-__netlogo"`;
            } else {
              return `<a${attrs} href="#${relativeFileIdPrefix}-${hash}"`;
            }
          }
          // If it's an absolute link, we leave it as is
          return match;
        });
        // Remove the "Looking for the primitive reference..." paragraph
        // It links to pages not in the manual.
        fileContent = fileContent.replace(
          /<p><!--\[-->Looking for the primitive reference for the [^\s]+ extension\? You can find <a href="#dictionary" class=""><!--\[-->the full reference here<!--\]--><\/a>\.<!--\]--><\/p>/g,
          '',
        );
        if (index === 0) {
          titleHTML = fileContent + `<div style="page-break-before: always;"></div>`;
        } else {
          combinedHtml[index] = fileContent + '<div style="page-break-before: always;"></div>';
        }
      } else {
        console.warn(`No body found in ${file}. Skipping.`);
      }

      fs.ensureDirSync(path.dirname(filePath));
      fs.writeFileSync(filePath, fileContent);

      const fileBaseName = path.basename(file);
      const fileUrl = 'http://' + serverHost + ':' + serverPort + '/' + urlPrefix + fileBaseName;
      console.log(`Handling: ${fileBaseName} (=> ${fileUrl})`);
      await myPage.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

      /**
       * Extract the table of contents entries from the page.
       * This function collects all headings (h1, h2, h3) with their
       * unique ids and text content, and returns them as an array of objects.
       * Each object contains the id, level, and text of the heading.
       * @type {TocEntry[]}
       * @returns {Promise<TocEntry[]>} - An array of objects representing the table of contents entries.
       */
      const fileTocEntries = await myPage.evaluate(() => {
        /**
         * Get the level of a heading element.
         * @param {HTMLElement} heading - The heading element.
         * @returns {number} - The level of the heading (1, 2, or 3).
         */
        const getHeadingLevel = (heading) => {
          let lowercaseTag = heading.tagName.toLowerCase();
          if (lowercaseTag === 'a') {
            lowercaseTag = heading.closest('h1, h2, h3').tagName.toLowerCase();
          }
          switch (lowercaseTag) {
            case 'h1':
              return 1;
            case 'h2':
              return 2;
            case 'h3':
              return 3;
            default:
              console.warn(`Unexpected heading tag: ${lowercaseTag}. Defaulting to level 0.`);
              return 0;
          }
        };

        /**
         * Get the text content of a heading element.
         * @param {HTMLElement} element - The heading element.
         * @returns {string} - The text content of the heading.
         */
        const getTextContent = (element) => {
          // Edge case: the dictionary <a> tags have a child
          // <span class="since"> that we want to ignore
          // If that's the case, the <a> has a <h3> parent who
          // .dict_entry parent
          const $spans = element.querySelectorAll('span.since');
          if ($spans.length > 0) {
            $spans.forEach(($span) => {
              $span.textContent = '';
              $span.remove();
            });
          }

          if (element.tagName.toLowerCase() === 'a') {
            return element.parentNode.textContent.trim();
          }

          if (element.parentNode.classList.contains('dict_entry')) {
            // If a heading is nested under .dict_entry,
            // we may also have multiple <a> inside <h3>
            // so we need to return the comma-separated text
            const links = Array.from(element.querySelectorAll('a'));
            if (links.length > 0) {
              return links.map((link) => link.textContent.trim()).join(', ');
            }
            return element.textContent.trim();
          }

          // Normal tag
          return element.textContent.trim();
        };

        const headings = document.querySelectorAll('h1[id], h2[id], h3[id]');
        return Array.from(headings).map((heading) => ({
          id: heading.id,
          level: getHeadingLevel(heading),
          text: getTextContent(heading),
          tag: heading.tagName.toLowerCase(),
        }));
      });

      if (PRINT_TOC_FOR_DEBUGGING) {
        console.log(`TOC Entries for ${file}:`);
        for (const entry of fileTocEntries) {
          console.log(`  - ${entry.text} (ID: ${entry.id}, Level: ${entry.level}, Tag: ${entry.tag})`);
        }
      }
      tocEntries[index] = { file: file, entries: fileTocEntries };

      await myPage.close();
    }),
  );

  const styleFromEntry = (entry) =>
    [
      `margin-left: ${entry.level * 20}px!important`,
      `font-size: ${1.6 - entry.level * 0.2}em!important`,
      `width: calc(100% - ${entry.level * 20}px!important)`,
    ].join('; ');

  /**
   *
   * @typedef {Object} TocHeadingNumberManager
   * @property {function(number): string} getHeadingNumberString - A function that takes a heading level
   * @returns {string} - The heading number as a string.
   *
   * JS Object constructor to manage the numbering of headings in
   * the table of contents.
   * It keeps track of the chapter, section, and subsection numbers
   * and returns a string representation of the current heading number.
   * @returns {TocHeadingNumberManager}
   */
  const createTocHeadingNumberManager = ({ chapterStart }) => {
    let chapterNum = chapterStart,
      sectionNum = 0,
      subsectionNum = 0;
    return {
      /**
       * Returns a string representation of the current heading number
       * based on the provided level.
       * @param {number} level - The heading level (1 for h1, 2 for h2, 3 for h3).
       * @returns {string} - The heading number as a string.
       * */
      getHeadingNumberString: (level) => {
        switch (level) {
          case 1:
            chapterNum++;
            sectionNum = 0;
            subsectionNum = 0;
            return `${chapterNum}.`;
          case 2:
            sectionNum++;
            subsectionNum = 0;
            return `${chapterNum}.${sectionNum}`;
          case 3:
            subsectionNum++;
            return `${chapterNum}.${sectionNum}.${subsectionNum}`;
          default:
            console.warn(`Unexpected heading level: ${level}. Defaulting to chapter number.`);
            return `${chapterNum}.`;
        }
      },
    };
  };

  const tocHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table of Contents</title>
  <style>
    ul { width: 100%;}
    .pdf-toc li {
      border-bottom: 1px dotted var(--color-primary);
    }
    body {
      background: white!important;
    }
  </style>
</head>
<body>
  <h1 style="width: 100%">Table of Contents</h1>
  <ul class="pdf-toc" style="list-style-type: none;">
    ${tocEntries.reduce((acc, { entries }, index) => {
      let headings = createTocHeadingNumberManager({ chapterStart: index });
      const entryList = entries
        .map(
          (entry) => `
        <li style="${styleFromEntry(entry)}">
          <a href="#${entry.id}" style="font-weight: ${entry.level === 1 ? 'bold' : 'normal'};">
            ${headings.getHeadingNumberString(entry.level)} ${entry.text}
          </a>
        </li>
      `,
        )
        .join('');
      return acc + entryList;
    }, '')}
  </ul>
</body>
</html>
`;

  const fullHtmlContent = `
${titleHTML}
${tocHTML}
${combinedHtml.filter(Boolean).join('')}
`;

  // Write the HTML as well for debugging purposes
  if (EXPORT_DEBUG_HTML) {
    const debugHtmlPath = path.join(__dirname, 'tmp', 'combined.html');
    fs.ensureDirSync(path.dirname(debugHtmlPath));
    fs.writeFileSync(debugHtmlPath, fullHtmlContent);
    console.info(`Debug HTML exported to: ${debugHtmlPath}`);
  }

  const dirname = path.dirname(htmlFiles[0]);
  const tempHtmlPath = path.join(dirname, 'tmp.html');
  fs.ensureDirSync(path.dirname(tempHtmlPath));
  fs.writeFileSync(tempHtmlPath, fullHtmlContent);
  const tempHtmlUrl = 'http://' + serverHost + ':' + serverPort + '/' + urlPrefix + 'tmp.html';

  console.info('Generating PDF... This may take a few minutes.');
  await page.setJavaScriptEnabled(false);
  await page.emulateMediaType('print');
  await page.goto(tempHtmlUrl, { waitUntil: 'domcontentloaded', timeout: environmentOptions.timeout });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '60px',
      bottom: '60px',
      left: '40px',
      right: '40px',
    },
    scale: 0.7,
    outline: true,
  });

  fs.removeSync(tempHtmlPath);

  // Output the PDF
  fs.writeFileSync(outputPdf, pdfBuffer);
  console.log(`PDF generated successfully: ${outputPdf}`);

  // exit
  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  // For reference, it takes about 85 seconds to generate the manual on a MacBook Air with M1 chip.
  console.info(
    'If this script timed out before it finished handling the first file, try running it again. This commonly happens when puppeteer is unable to launch the browser.\n' +
      'If the script failed while processing dictionary.html or infotab.html, it is likely that the timeout was too short for the page to load completely.',
  );
  process.exit(1);
});
