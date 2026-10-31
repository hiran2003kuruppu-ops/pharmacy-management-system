const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_PDF_ROOT = path.join(__dirname, '..', 'EG_2023_5700_Report.pdf');
const OUTPUT_PDF_DOCS = path.join(__dirname, '..', 'docs', 'EG_2023_5700_Report.pdf');

async function exportPdf() {
  console.log('Generating PDF from http://localhost:3000/report.html ...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/report.html', { waitUntil: 'networkidle0' });

  // Hide the floating no-print toolbar
  await page.evaluate(() => {
    const bar = document.querySelector('.no-print-toolbar');
    if (bar) bar.style.display = 'none';
  });

  await page.pdf({
    path: OUTPUT_PDF_ROOT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    preferCSSPageSize: true
  });

  // Also copy to docs
  const fs = require('fs');
  fs.copyFileSync(OUTPUT_PDF_ROOT, OUTPUT_PDF_DOCS);

  console.log(`PDF generated successfully at:\n  -> ${OUTPUT_PDF_ROOT}\n  -> ${OUTPUT_PDF_DOCS}`);
  await browser.close();
}

exportPdf().catch(console.error);
