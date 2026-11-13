const { chromium } = require('playwright-core');
const fs = require('fs');

const root = 'C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';
const queries = process.argv.slice(2);

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    viewport: {width: 1440, height: 1200},
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
  });
  const page = await context.newPage();
  const resources = [];
  page.on('response', async r => {
    if (/\/resource\/|BaseSearchResource|SearchResource/i.test(r.url())) {
      try { resources.push({url:r.url(),status:r.status(),body:await r.text()}); } catch {}
    }
  });
  const all = [];
  for (const q of queries) {
    const url = 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q);
    await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000});
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    console.log('PAGE', q, page.url(), await page.title(), (await page.locator('body').innerText()).slice(0,500));
    console.log('RESOURCES', resources.map(x=>({status:x.status,url:x.url,bytes:x.body.length,sample:x.body.slice(0,200)})));
    await page.screenshot({path:`${root}/search-${all.length}.png`, fullPage:false});
    for (let i=0;i<5;i++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(1200); }
    console.log('IMGS', await page.locator('img').count(), await page.locator('img').evaluateAll(imgs => imgs.slice(0,8).map(i=>({src:i.currentSrc,alt:i.alt,parent:i.parentElement?.outerHTML.slice(0,500)}))));
    console.log('ANCESTORS', await page.locator('img').first().evaluate(i => { const a=[]; let n=i; for(let k=0;k<8&&n;k++,n=n.parentElement) a.push({tag:n.tagName,attrs:Object.fromEntries([...n.attributes].map(x=>[x.name,x.value]))}); return a; }));
    await page.locator('[role="dialog"]').evaluateAll(ds=>ds.forEach(d=>d.remove()));
    const firstCard = page.locator('[data-test-id="gated-pin-rep"]').first();
    if (await firstCard.count()) {
      await firstCard.click({force:true});
      await page.waitForTimeout(2500);
      console.log('CLICKED', page.url(), await page.title());
    }
    const pins = await page.locator('a[href*="/pin/"]').evaluateAll(as => as.map(a => ({
      href: a.href,
      img: a.querySelector('img')?.currentSrc || a.querySelector('img')?.src || '',
      alt: a.querySelector('img')?.alt || '',
      text: a.innerText || ''
    })));
    all.push({query:q, pins});
  }
  fs.writeFileSync(`${root}/candidates.json`, JSON.stringify(all, null, 2));
  fs.writeFileSync(`${root}/resources.json`, JSON.stringify(resources, null, 2));
  console.log(JSON.stringify(all.map(x=>({query:x.query,count:x.pins.length,sample:x.pins.slice(0,5)})),null,2));
  await browser.close();
}

main().catch(e=>{console.error(e);process.exit(1)});
