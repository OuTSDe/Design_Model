const fs = require('fs');

const root = 'C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';
const pins = process.argv.slice(2);
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';

function unescapeHtml(s='') {
  return s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replace(/\\u002f/gi, '/').replaceAll('\\/', '/');
}

async function main() {
  for (const p of pins) {
    const url = p.startsWith('http') ? p : `https://www.pinterest.com/pin/${p}/`;
    const r = await fetch(url, {headers:{'user-agent':ua, 'accept':'text/html,application/xhtml+xml'}});
    const s = await r.text();
    fs.writeFileSync(`${root}/pin-${pins.indexOf(p)}.html`, s);
    const image = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(s)?.[1]
      || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(s)?.[1];
    const title = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i.exec(s)?.[1]
      || /<title>(.*?)<\/title>/i.exec(s)?.[1];
    const relatedIds = [...new Set([
      ...[...s.matchAll(/["']id["']\s*:\s*["'](\d{12,20})["']/g)].map(m=>m[1]),
      ...[...s.matchAll(/\/pin\/(\d{12,20})\/?/g)].map(m=>m[1]),
      ...[...s.matchAll(/["']pin_id["']\s*:\s*["'](\d{12,20})["']/g)].map(m=>m[1])
    ])];
    console.log(JSON.stringify({url,status:r.status,bytes:s.length,title:unescapeHtml(title),image:unescapeHtml(image),relatedIds:relatedIds.slice(0,30)}));
  }
}

main().catch(e=>{console.error(e);process.exit(1)});
