const fs = require('fs');

const queries = process.argv.slice(2);
if (!queries.length) throw new Error('Provide at least one query');

const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};

function walk(value, found) {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value) && value.id && value.images) {
    const image = value.images?.orig || value.images?.['1200x'] || value.images?.['736x'];
    if (image?.url) {
      found.set(String(value.id), {
        id: String(value.id),
        title: value.title || value.grid_title || value.description || '',
        description: value.description || '',
        domain: value.domain || '',
        creator: value.pinner?.full_name || value.pinner?.username || '',
        username: value.pinner?.username || '',
        is_promoted: Boolean(value.is_promoted),
        image_url: image.url,
        width: image.width || 0,
        height: image.height || 0,
        source_url: `https://www.pinterest.com/pin/${value.id}/`,
      });
    }
  }
  for (const child of Object.values(value)) walk(child, found);
}

(async () => {
  const all = new Map();
  for (const query of queries) {
    const dataParam = JSON.stringify({
      options: { query, scope: 'pins', page_size: 50 },
      context: {},
    });
    const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(dataParam)}`;
    const response = await fetch(url, {
      headers: {
        ...headers,
        accept: 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
        'x-pinterest-pws-handler': 'www/search/[scope].js',
      },
    });
    if (!response.ok) throw new Error(`${response.status} for: ${query}`);
    walk(await response.json(), all);
  }
  fs.writeFileSync('pin-candidates.json', JSON.stringify([...all.values()], null, 2));
  console.log(`Saved ${all.size} candidates`);
})();
