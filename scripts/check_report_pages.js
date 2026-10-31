const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.goto('http://localhost:3000/report.html', { waitUntil: 'networkidle0' });
  const pages = await page.$$('.page');
  console.log('Total .page elements found:', pages.length);

  for (let i = 0; i < pages.length; i++) {
    const box = await pages[i].boundingBox();
    const scrollHeight = await page.evaluate(el => el.scrollHeight, pages[i]);
    const clientHeight = await page.evaluate(el => el.clientHeight, pages[i]);
    const overflow = scrollHeight > clientHeight ? `OVERFLOW by ${scrollHeight - clientHeight}px` : 'OK';
    console.log(`Page ${i + 1}: clientHeight=${clientHeight}px, scrollHeight=${scrollHeight}px [${overflow}]`);
  }
  await browser.close();
}

run().catch(console.error);
