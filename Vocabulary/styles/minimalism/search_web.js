const { chromium } = require('playwright-core');
const fs=require('fs');
const root='C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';
const queries=process.argv.slice(2);
async function main(){
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-blink-features=AutomationControlled']});
 const c=await b.newContext({viewport:{width:1440,height:1200},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36'});
 const p=await c.newPage(); const out=[];
 for(const q of queries){
   const u='https://www.google.com/search?q='+encodeURIComponent(q)+'&num=30';
   await p.goto(u,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(2500);
   const all=await p.locator('a[href]').evaluateAll(as=>as.map(a=>({href:a.href,text:(a.innerText||'').trim()})));
   const links=all.filter(x=>/google\.com\/goto\?url=/i.test(x.href)&&/Pinterest/i.test(x.text)).slice(0,12);
   const resolved=[];
   for(const x of links){
     const rp=await c.newPage();
     try{
       await rp.goto(x.href,{waitUntil:'domcontentloaded',timeout:60000}); await rp.waitForTimeout(1200);
       resolved.push({search_title:x.text.split('\n')[0],url:rp.url(),title:await rp.title(),image:await rp.locator('meta[property="og:image"]').getAttribute('content').catch(()=>null)});
     }catch(e){resolved.push({search_title:x.text.split('\n')[0],error:String(e)});}
     await rp.close();
   }
   out.push({q,title:await p.title(),resolved}); console.log(JSON.stringify(out.at(-1),null,2));
 }
 fs.writeFileSync(root+'/web-results.json',JSON.stringify(out,null,2)); await b.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
