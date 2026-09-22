import { createElement } from 'lwc';
import Today, { midnight, dateKey, addDays, normalize, selectCards } from 'c/homepageTodaysMeeting';
import { graphql } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import { DateTime } from 'luxon';
const scope = {sellerId:USER_ID,recordTypeIds:['012000000000001AAA','012000000000002AAA']};
const value = (v) => ({value:v});
const node = (id, end, start = '2026-09-22T09:00:00Z') => ({Id:id,OwnerId:value(USER_ID),Subject:value(id),StartDateTime:value(start),EndDateTime:value(end),IsAllDayEvent:value(false),status:value('Scheduled'),WhatId:value('006000000000001AAA'),What:{Id:'006000000000001AAA',Name:value('Growth'),RecordTypeId:value(scope.recordTypeIds[0])}});
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const emit = (nodes, next = false, cursor = 'page1') => graphql.emit({data:{uiapi:{query:{Event:{edges:nodes.map((n)=>({node:n})),pageInfo:{startCursor:cursor,endCursor:cursor,hasNextPage:next}}}}},refresh:jest.fn().mockResolvedValue()});
afterEach(()=>{document.body.replaceChildren();jest.useRealTimers();});
it.each([['America/New_York','2026-03-08',23],['America/New_York','2026-11-01',25],['Asia/Kolkata','2026-09-22',24],['Asia/Kathmandu','2026-09-22',24],['Australia/Lord_Howe','2026-10-04',23.5]])('constructs %s %s civil midnights', (zone,day,hours)=>{
 const start=midnight(day,zone),end=midnight(addDays(day,1),zone);
 expect((end-start)/3600000).toBe(hours);
 expect(start).toBe(DateTime.fromISO(day,{zone}).startOf('day').toMillis());
 expect(dateKey(start,zone)).toBe(day);
});
it('enforces exact expiry, eligibility and card promotion',()=>{
 const now=Date.parse('2026-09-22T10:30:00Z'); const n=node('00U000000000001AAA',new Date(now).toISOString());
 expect(normalize(n,scope,now-1)).not.toBeNull();expect(normalize(n,scope,now)).toBeNull();expect(normalize(n,scope,now+1)).toBeNull();
 expect(normalize({...n,status:value('Cancelled')},scope,now-1)).toBeNull();
 expect(normalize({...n,What:null},scope,now-1)).toBeNull();
 const records=[1,2,3,4].map((i)=>({id:String(i),start:now+i*1000,end:now+i*2000}));
 expect(selectCards(records,3,true,now+2000).map(m=>m.id)).toEqual(['2','3','4']);
});
it('expires at equality without advancing wire cutoff, promotes fourth and cleans timers',async()=>{
 jest.useFakeTimers();jest.setSystemTime(new Date('2026-09-22T10:29:59.999Z'));
 const el=createElement('c-homepage-todays-meeting',{is:Today});el.scopeConfig=scope;el.displayZone='UTC';document.body.appendChild(el);await flush();
 emit([1,2,3,4].map((i)=>node(`00U00000000000${i}AAA`,i===1?'2026-09-22T10:30:00Z':'2026-09-22T13:00:00Z')));await flush();
 expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(3);
 const asOf=graphql.getLastConfig().variables.asOf;
 jest.advanceTimersByTime(1);await flush();
 expect(el.shadowRoot.querySelectorAll('article')).toHaveLength(3);
 expect(el.shadowRoot.textContent).not.toContain('00U000000000001AAA');
 expect(graphql.getLastConfig().variables.asOf).toBe(asOf);
 el.remove();expect(jest.getTimerCount()).toBe(0);
});
it('does not show incomplete page size as an exact count; deduplicates emissions',async()=>{
 jest.useFakeTimers();jest.setSystemTime(new Date('2026-09-22T10:00:00Z'));
 const el=createElement('c-homepage-todays-meeting',{is:Today});el.scopeConfig=scope;el.displayZone='UTC';const summary=jest.fn();el.addEventListener('summarychange',summary);document.body.appendChild(el);await flush();
 const n=node('00U000000000001AAA','2026-09-22T11:00:00Z');emit([n],true);await flush();
 expect(summary.mock.calls.at(-1)[0].detail.exactCountOrNull).toBeNull();
 emit([n],false,'page2');await flush();emit([n],false,'page2');await flush();
 expect(summary.mock.calls.at(-1)[0].detail.exactCountOrNull).toBe(1);
});
