/**
 * @file
 * This script converts HTML URL(s) relative to the root to URL(s) relative to
 * the current page when the root is known. This is applied to [href] and [src]
 * attributes to make a static version (no server needed) of the NetLogo documentation.
 *
 * @license GPL-2.0-or-later
 * @author Omar Ibrahim, Center for Connected Learning, Northwestern University
 * @since 2025
 *
 * Current Issues:
 *  - Scripts cannot be loaded which means interactive functionality is lost.
 *  - Fetch requests in scripts cannot be made, so dynamic loading of content is lost.
 */

const path = require('path');
const urllib = require('url');
const glob = require('glob');

const NO_PAGE_CONSOLE = true; // Keep this true to reduce noise in output logs

/**
 *
 * @typedef {import('puppeteer').Browser} Browser
 * @typedef {import('puppeteer').Page} Page
 * @typedef {import('fs-extra')} FsExtra
 * @typedef {import('./globals')}
 */

async function main() {
  const { args, driver, dependencies, files } = await setup();
  const { buildDir } = args;
  const { fs } = dependencies;

  let fileCount = files.length;
  let filesDone = 0;

  /**
   * @param {string} fileRelPath
   */
  const handler = async (fileRelPath) => {
    const page = await newPage(driver.browser, buildDir, fs);
    try {
      const fileExtension = path.extname(fileRelPath).toLowerCase();
      switch (fileExtension) {
        case '.html':
        case '.htm':
          await handleHtmlFile(page, fileRelPath, buildDir, fs);
          break;
        default:
          console.warn(`Unsupported file type for static processing: ${fileRelPath}`);
      }
    } catch (err) {
      console.error(`Error processing file ${fileRelPath}:`, err);
    } finally {
      filesDone += 1;
      console.info(`💬 Progress: ${filesDone} / ${fileCount} files processed.`);
      await page.close();
    }
  };

  const batchPromise = async (items, batchSize, fn) => {
    let promises = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      batch.forEach((item) => {
        promises.push(fn(item));
      });
      await Promise.all(promises);
      promises = [];
    }
  };

  const BATCH_SIZE = 20;
  await batchPromise(files, BATCH_SIZE, handler);

  await cleanup(driver);
}

async function setup() {
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

  const puppeteer = require('puppeteer');
  const fs = require('fs-extra');

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node index.cjs <build-directory>');
    process.exit(1);
  }

  const buildDir = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(buildDir)) {
    console.error(`Build directory does not exist: ${buildDir}`);
    process.exit(1);
  }

  const patterns = ['**/*.html', '**/*.htm'];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const files = await glob.sync(`{${patterns.join(',')}}`, { cwd: buildDir, nodir: true });

  return {
    args: { buildDir },
    driver: { browser },
    dependencies: { fs, puppeteer },
    files,
  };
}

/**
 * @param {Browser} browser
 * @param {string} buildDir
 * @param {FsExtra} fs
 *
 * @returns {Promise<Page>}
 */
async function newPage(browser, buildDir, fs) {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.exposeFunction('readfile', (filePath) => {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(buildDir, filePath);
    return fs.readFileSync(absPath, 'utf-8');
  });
  page.on('console', (msg) => {
    if (NO_PAGE_CONSOLE) return;
    const type = msg.type();
    if (type === 'error') return;
    console[type](`{@page}    ${msg.text()}`);
  });
  return page;
}

async function cleanup(driver) {
  await driver.browser.close();
}

/**
 * @param {Page} page
 * @param {string} filePath -- [relative] path to the HTML file
 * @param {string} buildDir -- [absolute] path to the build directory
 * @param {FsExtra} fs
 */
async function handleHtmlFile(page, filePath, buildDir, fs) {
  const fullPath = path.join(buildDir, filePath);
  const fileUrl = urllib.pathToFileURL(fullPath).href;
  const relativeFilePrefix = path.relative(path.dirname(fullPath), buildDir) || '.';

  await page.evaluateOnNewDocument((prefix) => {
    window.__relativeFilePrefix = prefix;
    window.__allowScriptElements = process.env.ALLOW_SCRIPT_ELEMENTS === 'true';
  }, relativeFilePrefix);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  await page.evaluate(async () => {
    /**
     * @param {string} property
     * @returns {(element: Element) => void}
     */
    const makeRelative = (property) => (element) => {
      let value = element.getAttribute(property);
      if (value.startsWith('/')) {
        console.info(`⏳ Adjusting ${property} from absolute to relative: ${value}`);
        console.info(`    🔸 Old URL: ${element.getAttribute(property)}`);
        const [uri, rest] = value.split('#');
        const uriParts = uri.split('.');
        if (uriParts.length === 1) {
          if (uriParts[0] === '/') {
            uriParts[0] = 'index';
          }
          uriParts.push('html');
        }
        value = uriParts.join('.') + (rest ? `#${rest}` : '');
        value = value.replace(/^\//, '');
        element.setAttribute(property, value);
        console.info(`    🔹 New URL: ${element.getAttribute(property)}`);
      }
    };

    /**
     * @param {string} href -- via el.getAttribute('href')
     */
    const getFilePathFromHref = (href) => {
      const url = new URL(href, window.location.origin);
      let filePath = window.__relativeFilePrefix + url.pathname;
      if (url.hash) {
        filePath += url.hash;
      }
      return filePath;
    };

    /**
     * @param {string} filePath
     * @returns {string} mime type
     */
    const getFileMimeType = (filePath) => {
      if (filePath.includes('.json')) return 'application/json';
      if (filePath.includes('.jsonld')) return 'application/ld+json';
      if (filePath.includes('.js')) return 'application/javascript';
      if (filePath.includes('.css')) return 'text/css';
      if (filePath.includes('.svg')) return 'image/svg+xml';
      if (filePath.includes('.png')) return 'image/png';
      if (filePath.includes('.jpg') || filePath.includes('.jpeg')) return 'image/jpeg';
      if (filePath.includes('.gif')) return 'image/gif';
      return 'application/octet-stream';
    };

    /**
     *
     * @param {Element} element
     * @returns
     */
    const respectNoScript = (element) => {
      if (!window.__allowScriptElements) {
        element.remove();
        return true;
      }
      return false;
    };

    /**
     *
     * @param {Element} element
     * @param {string} data
     */
    const transformLinkToDataHtml = (element, data) => {
      if (element.tagName.toLowerCase() === 'script' && !respectNoScript(element)) {
        element.setAttribute('src', data);
        console.info(`    ✅ Transformed script[src] to data URL`);
      } else if (element.tagName.toLowerCase() === 'link') {
        const rel = element.getAttribute('rel');
        switch (element.getAttribute('as')) {
          case 'script': {
            if (!respectNoScript(element)) {
              const scriptElement = document.createElement('script');
              scriptElement.setAttribute('src', data);
              if (rel === 'modulepreload' || rel === 'prefetch') {
                scriptElement.setAttribute('type', 'module');
              }
              element.parentNode.replaceChild(scriptElement, element);
              console.info(`    ✅ Transformed link[rel="${rel}"] to script with data URL`);
            }
            break;
          }
          default:
            break;
        }
      }
    };

    /**
     * @param {Element} linkElement
     * @returns
     */
    const inlineStylesheet = async (linkElement) => {
      const href = linkElement.getAttribute('href');
      if (!href) return;
      const filePath = getFilePathFromHref(href);
      console.info(`🔍 Found stylesheet link: ${href} => ${filePath}`);
      try {
        const cssContent = await window.readfile(filePath);
        const styleElement = document.createElement('style');
        styleElement.textContent = cssContent;
        linkElement.parentNode.replaceChild(styleElement, linkElement);
        console.info(`    ✅ Inlined stylesheet: ${href}`);
      } catch (err) {
        console.error(`   ❌ Failed to inline stylesheet: ${href}`, err);
      }
    };

    /**
     *
     * @param {string} filePath
     * @param {string} mimeType
     * @returns {Promise<string>} data URL
     */
    const fileToDataUrl = async (filePath, mimeType) => {
      const content = await window.readfile(filePath);

      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);

      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const base64Content = btoa(binary);

      return `data:${mimeType};base64,${base64Content}`;
    };

    /**
     * @param {Element} element
     * @returns
     */
    const inlineData = async (element) => {
      const href = element.getAttribute('href') || element.getAttribute('src');
      if (!href || href.startsWith('data:')) return;

      const filePath = getFilePathFromHref(href);
      const mimeType = getFileMimeType(filePath);

      console.info(`🔍 Found data link: ${href} => ${filePath}`);

      try {
        const dataUrl = await fileToDataUrl(filePath, mimeType);
        transformLinkToDataHtml(element, dataUrl);
        console.info(`    ✅ Inlined data URL: ${href}`);
      } catch (err) {
        console.error(`   ❌ Failed to inline data URL: ${href}`, err);
      }
    };

    const removeSearchButton = () => {
      const searchButton = document.querySelector('button span.truncate');
      if (searchButton && searchButton.textContent.toLowerCase().includes('search')) {
        searchButton.parentElement.remove();
        console.info(`✅ Removed search button`);
      }
    };

    const removeVersionSelector = () => {
      const versionSelector = document.querySelector('span.iconify.align-middle');
      if (versionSelector) {
        versionSelector.parentElement.remove();
        console.info(`✅ Removed version selector`);
      }
    };

    await Promise.all(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(inlineStylesheet));

    const scriptSelectors = ['script[src]', 'link[rel="modulepreload"]', 'link[rel="prefetch"]'];
    for (const selector of scriptSelectors) {
      document.querySelectorAll(selector).forEach(respectNoScript);
    }

    const dataLinkSelectors = [
      ['preload', 'prefetch', 'dns-prefetch', 'preconnect'].map((as) => `link[rel="${as}"]`),
      window.__allowScriptElements ? ['link[rel="modulepreload"]', 'script[src]'] : [],
    ].flat();
    for (const selector of dataLinkSelectors) {
      for (const linkEl of document.querySelectorAll(selector)) {
        await inlineData(linkEl);
      }
    }

    document.querySelectorAll('a[href]').forEach(makeRelative('href'));
    document.querySelectorAll('img[src]').forEach(makeRelative('src'));

    removeSearchButton();
    removeVersionSelector();
  });

  const modifiedContent = await page.content();
  await fs.writeFile(fullPath, modifiedContent, 'utf-8');

  console.info(`✅ Processed HTML file: ${filePath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  console.info(
    'If this script timed out before it finished handling the first file, try running it again. This commonly happens when puppeteer is unable to launch the browser.',
  );
  process.exit(1);
});
