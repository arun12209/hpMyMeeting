const path=require('path'),fs=require('fs'),assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='file://'+path.resolve('tests/browser/dist/index.html');
async function inspect(page){return page.evaluate(()=>{
 const elements=[];function visit(root){for(const el of root.querySelectorAll('*')){elements.push(el);if(el.shadowRoot)visit(el.shadowRoot);}}visit(document);
 const overflow=elements.filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return s.display!=='none'&&r.width>0&&r.right>innerWidth+1&&!el.closest('.time-scroll');}).map(el=>el.tagName+'.'+el.className);
 return {overflow:overflow.slice(0,10),cards:elements.filter(el=>el.tagName==='ARTICLE').length,hours:elements.filter(el=>el.className==='hour').length,text:elements.some(el=>el.shadowRoot?.textContent.includes('Service kickoff'))};
});}
(async()=>{
 const browser=await chromium.launch({headless:true});const rows=[],errors=[],interactions=[];
 const cases=[['today',320],['today',360],['today',420],['tomorrow',420],['homeCalendar',420],['calendar',320],['calendar',1200,'&expanded=1'],['calendar',360,'&expanded=1'],['calendar',1200,'&expanded=1&view=month'],['calendar',1200,'&expanded=1&view=workweek'],['modal',1200],['modal',320],['modal',1200,'&calendar=1'],['today',420,'&state=error']];
 for(const [surface,width,query=''] of cases){
  const page=await browser.newPage({viewport:{width,height:950}});page.on('pageerror',e=>{errors.push(`${surface}/${width}: ${e.message}`);console.error(e.stack);});
  await page.goto(base+`?surface=${surface}${query}`);await page.waitForTimeout(250);
  if(query.includes('state=error')){await page.locator('.error-details summary').click();assert((await page.locator('.error-details pre').innerText()).includes('INVALID_FIELD'));}
  const result=await inspect(page);rows.push({surface,width,query,...result});
  const suffix=query.replaceAll('&','-').replaceAll('=','-');
  await page.screenshot({path:`docs/screenshots/${surface}-${width}${suffix}.png`,fullPage:true});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:1050}});page.on('pageerror',e=>errors.push(`interactions: ${e.message}`));
 await page.goto(base+'?surface=today');await page.getByRole('button',{name:'View all 5 meetings'}).click();
 await page.locator('.preview-modal table').waitFor();assert.equal(await page.locator('.preview-modal tbody tr').count(),5);interactions.push('View all opens independently wired list with five rows');
 assert.equal(await page.locator('c-homepage-todays-meeting').count(),0);
 await page.locator('.preview-modal [data-tab="calendar"]').click();await page.locator('.preview-modal .grid-event').first().waitFor();
 await page.screenshot({path:'docs/screenshots/expanded-calendar-dialog.png',fullPage:true});
 await page.locator('.preview-modal .grid-event').first().click();await page.locator('[data-detail-heading]').waitFor();await page.locator('[data-detail-heading]').press('Escape');await page.locator('.preview-modal .grid-event').first().waitFor();interactions.push('Calendar event detail opens and Escape returns to calendar');
 await page.locator('.preview-modal [data-view="month"]').click();await page.locator('.preview-modal .month-event').first().waitFor();
 await page.screenshot({path:'docs/screenshots/expanded-month-dialog.png',fullPage:true});
 await page.locator('.preview-modal .overflow').first().click();await page.locator('.preview-modal tbody tr').first().waitFor();assert.equal(await page.locator('.preview-modal tbody tr').count(),5);interactions.push('Month overflow opens the correct selected-day list');
 await page.keyboard.press('Escape');await page.locator('.preview-modal').waitFor({state:'detached'});await page.locator('c-homepage-todays-meeting article').first().waitFor();interactions.push('Modal close remounts compact meetings');
 await page.locator('[data-tab="tomorrow"]').click();await page.locator('c-homepage-tomorrow-meetings article').first().waitFor();
 await page.locator('c-homepage-tomorrow-meetings a[data-event-id]').first().click();assert.equal((await page.evaluate(()=>window.__lastNavigation))?.attributes.objectApiName,'Event');interactions.push('Tomorrow meeting requests native Event navigation');
 await page.locator('[data-tab="calendar"]').click();await page.getByRole('button',{name:'Expand calendar',exact:true}).click();await page.locator('.preview-modal .grid-event').first().waitFor();interactions.push('Compact calendar expands directly into the week view');
 await page.close();
 const zoom=await browser.newPage({viewport:{width:640,height:500},deviceScaleFactor:2});await zoom.goto(base+'?surface=modal');await zoom.waitForTimeout(250);rows.push({surface:'modal-effective-200-percent',width:640,...await inspect(zoom)});await zoom.screenshot({path:'docs/screenshots/modal-effective-200-percent.png',fullPage:true});await zoom.close();
 await browser.close();const report={rows,errors,interactions};fs.writeFileSync('docs/browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length||rows.some(r=>r.overflow.length||(!r.query?.includes('state=error')&&!r.text)))process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1);});
