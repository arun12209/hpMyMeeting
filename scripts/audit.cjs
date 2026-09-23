const fs=require('fs'),path=require('path'),assert=require('assert');const {parse,print}=require('graphql');
const root='force-app/main/default/lwc';
const expected=['homepageMyMeetings','homepageTodaysMeeting','homepageTomorrowMeetings','homepageViewAllMeetings','homepageCalendarMeetings'];
assert.deepStrictEqual(fs.readdirSync(root).filter(name=>fs.statSync(path.join(root,name)).isDirectory()).sort(),[...expected].sort(),'Exactly five deployment bundles');
const documents=[];
for(const name of expected){
 const dir=path.join(root,name);for(const ext of ['js','html','js-meta.xml'])assert(fs.existsSync(path.join(dir,`${name}.${ext}`)));
 const js=fs.readFileSync(path.join(dir,`${name}.js`),'utf8'),html=fs.readFileSync(path.join(dir,`${name}.html`),'utf8');
 assert(!/await\s+(?:graphql|gql)\s*\(/.test(js));assert(!/refreshApex|refreshGraphQL|uiGraphQLApi|localStorage|sessionStorage/.test(js));assert(!/innerHTML|lwc:dom/.test(html+js));
 const imports=[...js.matchAll(/from ['"]c\/([^'"]+)/g)].map(m=>m[1]);assert.deepStrictEqual(imports,name==='homepageMyMeetings'?['homepageViewAllMeetings']:[]);
 if(name!=='homepageMyMeetings'){
  assert(js.includes("@wire(graphql, { query: '$activeQuery', variables: '$queryVariables', operationName: '$activeOperation' })"));
  const gql=js.match(/const MEETINGS_QUERY = gql`([\s\S]+?)`/)[1];documents.push(print(parse(gql)));
  for(const filter of ['OwnerId: { eq: $sellerId }','Status__c: { in: ["Scheduled", "Rescheduling"] }','WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }','EndDateTime: { gt: { value: $asOf } }'])assert.equal(gql.split(filter).length-1,3,`${name}: every operation needs ${filter}`);
  assert(!/StageName|IsClosed|IsChild.*eq/.test(gql));assert(!/\bor\s*:/.test(gql),'No semi-join/OR combination');assert.equal(parse(gql).definitions.length,3);
  assert(!/Date\.now|new Date/.test(js.match(/get queryVariables\(\) \{([\s\S]*?)\n    \}/)[1]));
 }
 if(name==='homepageViewAllMeetings')assert(js.includes('extends LightningModal')&&!js.includes('NavigationMixin'));
 assert(!html.includes('<c-homepage-view-all-meetings'));
}
assert(documents.every(d=>d===documents[0]),'Four identical mandatory query contracts');
const manifest=fs.readFileSync('manifest/package.xml','utf8');assert.equal((manifest.match(/<members>/g)||[]).length,5);
console.log('Architecture audit passed: exact five bundles, controller-local query parity, strict server cutoff, allowed imports and v2 contract.');
