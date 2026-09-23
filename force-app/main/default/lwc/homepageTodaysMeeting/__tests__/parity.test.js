import { createElement } from 'lwc';
import * as today from 'c/homepageTodaysMeeting';
import * as tomorrow from 'c/homepageTomorrowMeetings';
import * as modal from 'c/homepageViewAllMeetings';
import * as calendar from 'c/homepageCalendarMeetings';
import { graphql } from 'lightning/graphql';
import { DateTime } from 'luxon';
import {scope, v, NOW, meeting, response, flush} from '../../../../../../tests/fixtures/meetings';
const consumers=[['today',today],['tomorrow',tomorrow],['modal',modal],['calendar',calendar]];
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date(NOW));});
afterEach(()=>{document.body.replaceChildren();jest.useRealTimers();});
describe.each(consumers)('%s eligibility parity',(name,module)=>{
 const normalize=module.normalize;
 it.each(['Scheduled','Rescheduling'])('accepts exact %s status and both record types',(status)=>{
  for(const recordTypeId of scope.recordTypeIds) expect(normalize(meeting(1,{status:v(status),What:{...meeting().What,RecordTypeId:v(recordTypeId)}}),scope,Date.now())).not.toBeNull();
 });
 it.each(['Cancelled','Completed','scheduled',''])('rejects %s status',(status)=>expect(normalize(meeting(1,{status:v(status)}),scope,Date.now())).toBeNull());
 it.each([null,{}, {Id:'001000000000001AAA',Name:v('Account')},{Id:'006000000000001AAA',RecordTypeId:v('012000000000099AAA')}])('rejects unqualified What %j',(What)=>expect(normalize(meeting(1,{What}),scope,Date.now())).toBeNull());
 it('excludes different owner, invalid end and denied mandatory fields',()=>{
  for(const change of [{OwnerId:v('005000000000099AAA')},{EndDateTime:v(null)},{EndDateTime:v('invalid')},{IsAllDayEvent:undefined},{StartDateTime:v('invalid')}]) expect(normalize(meeting(1,change),scope,Date.now())).toBeNull();
 });
 it('keeps null distinct from inaccessible optional fields and primary person coverage honest',()=>{
  const m=normalize(meeting(1,{topic:v(null),category:undefined,WhoId:undefined,Who:undefined}),scope,Date.now());
  expect(m.topic).toBe('Not specified');expect(m.category).toBe('Unavailable');expect(m.person).toBe('Unavailable');
 });
 it('handles exact expiry and zero-duration future events',()=>{
  const n=meeting(1,{StartDateTime:v('2026-09-22T10:30:00Z'),EndDateTime:v('2026-09-22T10:30:00Z')});const end=Date.parse(n.EndDateTime.value);
  expect(normalize(n,scope,end-1)).not.toBeNull();expect(normalize(n,scope,end)).toBeNull();expect(normalize(n,scope,end+1)).toBeNull();
 });
 it('assigns zero-duration midnight, cross-midnight and exclusive end to correct days',()=>{
  const midnight=Date.parse('2026-09-23T00:00:00Z');
  expect(module.intersects({start:midnight,end:midnight},'2026-09-23','2026-09-24','UTC')).toBe(true);
  expect(module.intersects({start:midnight-1000,end:midnight},'2026-09-23','2026-09-24','UTC')).toBe(false);
  expect(module.intersects({start:midnight-1000,end:midnight+1000},'2026-09-23','2026-09-24','UTC')).toBe(true);
 });
 it('keeps all-day dates stable across positive and negative zones',()=>{
  const m=normalize(meeting(1,{IsAllDayEvent:v(true),ActivityDate:v('2026-09-22'),EndDateTime:v('2026-09-24T00:00:00Z')}),scope,Date.now());
  for(const zone of ['Asia/Kolkata','America/Los_Angeles']) {
   expect(module.intersects(m,'2026-09-23','2026-09-24',zone)).toBe(true);
   expect(module.intersects(m,'2026-09-24','2026-09-25',zone)).toBe(false);
  }
 });
 it.each([['America/New_York','2026-03-08'],['America/New_York','2026-11-01'],['Asia/Kathmandu','2026-09-22'],['Australia/Lord_Howe','2026-10-04'],['America/Havana','2026-03-08']])('matches a timezone-library oracle for %s %s',(zone,day)=>{
  expect(module.midnight(day,zone)).toBe(DateTime.fromISO(day,{zone}).startOf('day').toMillis());
 });
 it('validates external destinations exactly',()=>{
  for(const url of ['javascript:alert(1)','http://approved.example','https://approved.example.evil.test','https://user:secret@approved.example','//approved.example']) expect(module.safeExternalUrl(url,['approved.example'])).toBeNull();
  expect(module.safeExternalUrl('https://approved.example/path',['approved.example'])).toBe('https://approved.example/path');
 });
 it('preserves distinct recurrence/child identities without synthesizing occurrences',()=>{
  const nodes=[meeting(1,{IsChild:v(true)}),meeting(2,{IsChild:v(false)})];
  expect(nodes.map(n=>normalize(n,scope,Date.now()).id)).toHaveLength(2);
 });
});
describe.each(consumers)('%s wire and lifecycle',(name,module)=>{
 async function mount(){const el=createElement('c-meetings-test',{is:module.default});el.scopeConfig=scope;el.displayZone='UTC';if(name==='modal') el.initialDate='2026-09-22';if(name==='calendar')el.selectedDate='2026-09-22';document.body.appendChild(el);await flush();return el;}
 const nodesFor=(count,overrides={})=>Array.from({length:count},(_,i)=>meeting(i+1,name==='tomorrow'?{StartDateTime:v('2026-09-23T11:00:00Z'),EndDateTime:v('2026-09-23T12:00:00Z'),...overrides}:overrides));
 it('gates missing configuration',async()=>{const el=createElement('c-meetings-test',{is:module.default});document.body.appendChild(el);await flush();expect(graphql.getLastConfig().query).toBeUndefined();expect(el.shadowRoot.textContent).toContain('setup pending');});
 it.each([0,1,2,3,4,8])('renders %i records with correct compact limits',async(count)=>{
  const el=await mount();graphql.emit(response(nodesFor(count)));await flush();
  const cards=el.shadowRoot.querySelectorAll('article');expect(cards.length).toBe(name==='modal'?count:Math.min(3,count));
 });
 it('treats initial undefined as loading and GraphQL errors as failure, not empty',async()=>{
  const el=await mount();graphql.emit({});await flush();expect(el.shadowRoot.textContent).toContain('Loading');
  graphql.emit({data:response(nodesFor(1)).data,errors:[{message:'Denied'}]});await flush();
  expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(0);expect(el.shadowRoot.textContent).toContain('Meetings couldn’t load');expect(el.shadowRoot.textContent).not.toContain('0 meetings · All loaded');
 });
 it('rejects delayed expired records and cached emissions after expiry without changing cutoff',async()=>{
  const el=await mount();const asOf=graphql.getLastConfig().variables.asOf;
  const end=name==='tomorrow'?'2026-09-23T12:00:00Z':'2026-09-22T12:00:00Z';
  graphql.emit(response(nodesFor(2)));await flush();
  jest.setSystemTime(new Date(end));graphql.emit(response(nodesFor(2)));await flush();
  expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(0);expect(graphql.getLastConfig().variables.asOf).toBe(asOf);
 });
 it('prunes on foreground before waiting for refresh',async()=>{
  const el=await mount();graphql.emit(response(nodesFor(2)));await flush();
  jest.setSystemTime(new Date(name==='tomorrow'?'2026-09-23T12:00:00Z':'2026-09-22T12:00:00Z'));
  window.dispatchEvent(new Event('focus'));await flush();expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(0);
 });
 it('cleans timeout and listeners on disconnect',async()=>{
  const el=await mount();graphql.emit(response(nodesFor(1)));await flush();el.remove();expect(jest.getTimerCount()).toBe(0);
 });
 it('refreshes using the v2 callable and replaces collection membership',async()=>{
  const el=await mount();const refresh=jest.fn().mockResolvedValue();graphql.emit(response(nodesFor(2),{refresh}));await flush();
  jest.setSystemTime(new Date(Date.now()+1000));await el.refreshMeetings();await flush();expect(refresh).toHaveBeenCalledTimes(1);expect(graphql.getLastConfig().variables.after).toBeNull();
  graphql.emit(response([nodesFor(3)[2]]));await flush();expect(el.shadowRoot.textContent).toContain('Meeting 3');expect(el.shadowRoot.textContent).not.toContain('Meeting 1');
 });
 it('makes boundary-time record actions inert',async()=>{
  const el=await mount();const navigation=jest.fn();el.addEventListener('requestnavigation',navigation);el.addEventListener('modalclose',navigation);
  graphql.emit(response(nodesFor(1)));await flush();const link=el.shadowRoot.querySelector('a[data-event-id]');
  jest.setSystemTime(new Date(name==='tomorrow'?'2026-09-23T12:00:00Z':'2026-09-22T12:00:00Z'));link.click();await flush();expect(navigation).not.toHaveBeenCalled();
 });
});
it.each(consumers)('%s distinguishes repeated-hour offsets',(_name,module)=>{
 const one=module.formatTime(Date.parse('2026-11-01T05:30:00Z'),'America/New_York','en-US');
 const two=module.formatTime(Date.parse('2026-11-01T06:30:00Z'),'America/New_York','en-US');
 expect(one).toContain('GMT-4');expect(two).toContain('GMT-5');
});
describe.each(consumers)('%s reported deployment regressions',(name,module)=>{
 it('retains the actual INVALID_FIELD message without Retry, false empty or incomplete footer',async()=>{
  const el=createElement('c-error-test',{is:module.default});el.scopeConfig=scope;el.displayZone='America/Chicago';document.body.appendChild(el);await flush();
  const message="INVALID_FIELD: No such column 'RecordTypeId' on entity 'Name'.";
  graphql.emit({errors:[{message,extensions:{errorCode:'INVALID_FIELD'}}]});await flush();
  expect(el.shadowRoot.querySelector('.error-details pre').textContent).toContain(message);
  window.dispatchEvent(new Event('focus'));await flush();
  expect(el.shadowRoot.querySelector('.error-details pre').textContent).toContain(message);
  expect(el.shadowRoot.querySelector('.loading-state')).toBeNull();
  expect([...el.shadowRoot.querySelectorAll('button')].some(b=>b.textContent==='Retry')).toBe(false);
  expect(el.shadowRoot.textContent).not.toContain('Results incomplete');expect(el.shadowRoot.textContent).not.toContain('configured timezone');
 });
 it('merges starting, continuing and all-day connections even when their cursors match',async()=>{
  const el=createElement('c-lane-test',{is:module.default});el.scopeConfig=scope;el.displayZone='UTC';if(name==='modal')el.initialDate='2026-09-22';document.body.appendChild(el);await flush();
  const day=name==='tomorrow'?'2026-09-23':'2026-09-22';
  const start=graphql.getLastConfig().variables.rangeStart;
  graphql.emit(response([meeting(1,{StartDateTime:v(`${day}T11:00:00Z`),EndDateTime:v(`${day}T12:00:00Z`)})]));await flush();
  graphql.emit(response([meeting(2,{StartDateTime:v(new Date(Date.parse(start)-3600000).toISOString()),EndDateTime:v(`${day}T12:00:00Z`)})]));await flush();
  graphql.emit(response([meeting(3,{IsAllDayEvent:v(true),StartDateTime:v(`${day}T00:00:00Z`),ActivityDate:v(day),EndDateTime:v(`${module.addDays(day,1)}T00:00:00Z`)})]));await flush();
  expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(3);
  expect(el.shadowRoot.textContent).toContain('3 meetings');
  for(const number of [1,2,3])expect(el.shadowRoot.textContent).toContain(`Meeting ${number}`);
 });
 it('keeps query cutoff fixed and counts incomplete until all three independent operations finish',async()=>{
  const el=createElement('c-operation-test',{is:module.default});el.scopeConfig=scope;el.displayZone='UTC';if(name==='modal')el.initialDate='2026-09-22';document.body.appendChild(el);await flush();
  const cutoff=graphql.getLastConfig().variables.asOf;expect(graphql.getLastConfig().operationName).toBe('HomepageStartingMeetings');
  graphql.emit(response([]));await flush();expect(graphql.getLastConfig().operationName).toBe('HomepageContinuingMeetings');expect(el.shadowRoot.textContent).not.toContain('0 meetings');
  graphql.emit(response([]));await flush();expect(graphql.getLastConfig().operationName).toBe('HomepageAllDayMeetings');
  graphql.emit(response([]));await flush();expect(el.shadowRoot.textContent).toContain('0 meetings');expect(graphql.getLastConfig().variables.asOf).toBe(cutoff);
 });
});
