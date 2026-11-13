const fs=require('fs');
const root='C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';
const rs=JSON.parse(fs.readFileSync(root+'/resources.json','utf8'));
for(const r of rs.filter(x=>x.url.includes('BaseSearchResource'))){
  const j=JSON.parse(r.body);
  console.log('data type',Array.isArray(j.resource_response?.data),typeof j.resource_response?.data, Object.keys(j.resource_response?.data||{}));
  console.log('first result', JSON.stringify(j.resource_response?.data?.results?.[0],null,2));
  const found=[];
  function walk(x){
    if(!x||typeof x!=='object')return;
    if(x.id&&x.images){found.push({id:x.id,title:x.title||x.grid_title||x.description||x.closeup_description||'',images:x.images,domain:x.domain||'',link:x.link||''});return;}
    for(const v of Object.values(x))walk(v);
  }
  walk(j.resource_response?.data);
  console.log(JSON.stringify(found,null,2));
}
