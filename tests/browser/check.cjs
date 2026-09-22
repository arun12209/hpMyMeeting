const path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const rows=[];const errors=[];
 for(const [surface,width,expanded] of [['today',320,false],['today',360,false],['today',420,false],['calendar',320,false],['calendar',1200,true],['calendar',360,true],['modal',1200,false],['modal',320,false]]){
  const page=await browser.newPage({viewport:{width,height:950}});page.on('pageerror',e=>errors.push(`${surface}/${width}: ${e.message}`));
  await page.goto('file://'+path.resolve('tests/browser/dist/index.html')+`?surface=${surface}${expanded?'&expanded=1':''}`);
  await page.waitForTimeout(250);
  const result=await page.evaluate(()=>{
   const elements=[];function visit(root){for(const el of root.querySelectorAll('*')){elements.push(el);if(el.shadowRoot)visit(el.shadowRoot);}}visit(document);
   const overflow=elements.filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return s.display!=='none'&&r.width>0&&r.right>innerWidth+1&&!el.closest('.time-scroll');}).map(el=>el.tagName+'.'+el.className);
   return {overflow:overflow.slice(0,10),cards:elements.filter(el=>el.tagName==='ARTICLE').length,hours:elements.filter(el=>el.className==='hour').length,text:elements.map(el=>el.shadowRoot?.textContent||'').join(' ').includes('Service kickoff')};
  });
  rows.push({surface,width,expanded,...result});
  await page.screenshot({path:`docs/screenshots/${surface}-${width}${expanded?'-expanded':''}.png`,fullPage:true});await page.close();
 }
 // Emulate the effective CSS viewport at 200% desktop zoom: 1280 physical -> 640 CSS px.
 const zoom=await browser.newPage({viewport:{width:640,height:500},deviceScaleFactor:2});await zoom.goto('file://'+path.resolve('tests/browser/dist/index.html')+'?surface=modal');await zoom.waitForTimeout(250);await zoom.screenshot({path:'docs/screenshots/modal-effective-200-percent.png',fullPage:true});await zoom.close();
 await browser.close();console.log(JSON.stringify({rows,errors},null,2));if(errors.length||rows.some(r=>r.overflow.length||!r.text))process.exitCode=1;
})();
