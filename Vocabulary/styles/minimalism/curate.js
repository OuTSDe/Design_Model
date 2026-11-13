const fs = require('fs');

const root = 'C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';

async function main() {
  const q = process.argv.slice(2).join(' ') || 'site:pinterest.com/pin minimalist interior mood board furniture swatches';
  const engine = process.env.SEARCH_ENGINE || 'ddg';
  const url = engine === 'brave'
    ? 'https://search.brave.com/search?q=' + encodeURIComponent(q) + '&source=web'
    : engine === 'pinterest'
    ? 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q)
    : engine === 'pinterest-api'
    ? 'https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=' + encodeURIComponent('/search/pins/?q=' + q) + '&data=' + encodeURIComponent(JSON.stringify({options:{article:'',appliedProductFilters:'---',price_max:null,price_min:null,query:q,scope:'pins',auto_correction_disabled:'',top_pin_id:'',filters:''},context:{}}))
    : engine === 'yahoo'
    ? 'https://search.yahoo.com/search?p=' + encodeURIComponent(q) + '&n=30'
    : engine === 'mojeek'
    ? 'https://www.mojeek.com/search?q=' + encodeURIComponent(q)
    : engine === 'google-images'
    ? 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q)
    : 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(q);
  const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36',
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    'x-pinterest-appstate': 'active',
    'x-pinterest-source-url': '/search/pins/?q=' + encodeURIComponent(q),
    'referer': 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q)
  };
  if (engine === 'pinterest-api') {
    const warm = await fetch('https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q), {headers});
    const cookies = warm.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
    headers.cookie = cookies;
    const csrf = /csrftoken=([^;]+)/.exec(cookies)?.[1];
    if (csrf) headers['x-csrftoken'] = csrf;
  }
  const r = await fetch(url, { headers });
  const s = await r.text();
  fs.writeFileSync(`${root}/search.html`, s);
  console.log(r.status, s.length);
  const decoded = s.replaceAll('&amp;', '&').replace(/\\u002f/gi, '/').replaceAll('\\/', '/');
  if (engine === 'pinterest' || engine === 'pinterest-api') {
    const imgs = [...new Set(decoded.match(/https?:\/\/i\.pinimg\.com\/[^"'<> ]+/gi) || [])];
    console.log(imgs.filter(x => !/\/originals\/d5\/3b\/01\//.test(x)).slice(0, 100).join('\n'));
  }
  const re = /https?:\/\/[^"<> ]*pinterest[^"<> ]*\/pin\/[^"<> ]+/gi;
  const direct = decoded.match(re) || [];
  const encoded = [...decoded.matchAll(/uddg=([^&" ]+)/g)].map(m => {
    try { return decodeURIComponent(m[1]); } catch { return ''; }
  }).filter(x => /pinterest\.[^/]+\/pin\//i.test(x));
  const rawLinks = [...decoded.matchAll(/(?:href|url)=["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]);
  console.log([...new Set([...direct, ...encoded, ...rawLinks.filter(x => /pinterest\.[^/]+\/pin\//i.test(x))])].slice(0, 100).join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
