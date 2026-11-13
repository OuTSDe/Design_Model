const fs=require('fs');
const root='C:/Users/Sanath Acharya B/AppData/Local/Temp/AccordDesignEngine-work/JMWDY5TIJID';
const items={
 mood:[
  ['m1','https://i.pinimg.com/736x/ad/4e/0d/ad4e0d818c3eab554715302d8c1d3d5a.jpg'],
  ['m2','https://i.pinimg.com/736x/3f/e5/ed/3fe5edf1a4ed148450f5314c183aa3ad.jpg'],
  ['m3','https://i.pinimg.com/736x/08/d9/b5/08d9b560e517e9084f4445c21ea788a0.jpg'],
  ['m4','https://i.pinimg.com/736x/9e/7d/f1/9e7df1a998e4363074baad6bdd69fb8b.jpg'],
  ['m5','https://i.pinimg.com/736x/67/7d/68/677d68e513eda9e030fb4d4911c79484.jpg'],
  ['m6','https://i.pinimg.com/736x/05/4a/26/054a26d1190827e3c77efcbbb3c98133.jpg'],
  ['m7','https://i.pinimg.com/736x/0d/2e/62/0d2e62a6e9be21038932f011e9995ccc.jpg'],
  ['m8','https://i.pinimg.com/736x/b6/78/ee/b678eeb91fa1e6498f37bd9c504c41fd.jpg'],
  ['m9','https://i.pinimg.com/736x/13/bb/f6/13bbf6e694ff459a2a339af6c6b337db.jpg']
  ,['m10','https://i.pinimg.com/736x/15/a9/14/15a914cb11440d84ac6d96a7d7cadfc2.jpg']
  ,['m11','https://i.pinimg.com/736x/f0/8f/d3/f08fd39bcfb24202c92b8dfd12abb8ea.jpg']
 ],
 render:[
  ['r1','https://i.pinimg.com/736x/a5/ff/3f/a5ff3f174be05c2ccbc36f8d3e610ab2.jpg'],
  ['r2','https://i.pinimg.com/736x/61/f2/1d/61f21d115ddc23612d2a4c5106572ae3.jpg'],
  ['r3','https://i.pinimg.com/736x/85/50/50/855050ecbc7fbab171dc1bf3685f9dbd.jpg'],
  ['r4','https://i.pinimg.com/736x/bc/09/c0/bc09c033792382de1a2989658289370e.jpg'],
  ['r5','https://i.pinimg.com/736x/97/83/72/978372ea0558756b40ce00d9c8dd4f54.jpg'],
  ['r6','https://i.pinimg.com/736x/d2/5f/cb/d25fcb104300ed97971a68784a3e2e9e.jpg'],
  ['r7','https://i.pinimg.com/736x/ef/b8/63/efb8635578eedb72a9fb108063f9ec5c.jpg'],
  ['r8','https://i.pinimg.com/736x/cf/14/59/cf14594d71735b725d38eb291e102db6.jpg'],
  ['r9','https://i.pinimg.com/736x/ab/2e/d7/ab2ed70f3c0fbaf71eb3f67bc9ff3824.jpg'],
  ['r10','https://i.pinimg.com/736x/83/d7/05/83d705781a1de143828ce2a0498f95d1.jpg'],
  ['r11','https://i.pinimg.com/736x/b4/75/3a/b4753aa83523e2b04853769e0562004b.jpg'],
  ['r12','https://i.pinimg.com/736x/a3/6c/1c/a36c1c2e300d9e95ffbfc75552504469.jpg']
 ]
};
async function main(){
 fs.mkdirSync(root+'/review',{recursive:true});
 for(const [kind,arr] of Object.entries(items)) for(const [name,url] of arr){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}}); const b=Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(`${root}/review/${name}.jpg`,b); console.log(kind,name,r.status,b.length);
 }
}
main().catch(e=>{console.error(e);process.exit(1)});
