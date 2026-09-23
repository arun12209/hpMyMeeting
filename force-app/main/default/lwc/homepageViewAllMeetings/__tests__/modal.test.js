import {createElement} from 'lwc';
import Modal from 'c/homepageViewAllMeetings';
import {graphql} from 'lightning/graphql';
import {rejectModalSummaryEvents} from 'lightning/modal';
import {scope,NOW,meeting,response,flush} from '../../../../../../tests/fixtures/meetings';
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date(NOW));});
afterEach(()=>{document.body.replaceChildren();jest.useRealTimers();delete global.ResizeObserver;});
async function mount(){const el=createElement('c-modal-test',{is:Modal});el.scopeConfig=scope;el.displayZone='UTC';el.initialDate='2026-09-22';document.body.appendChild(el);await flush();return el;}
it('owns list query then gates it in calendar mode',async()=>{const el=await mount();expect(graphql.getLastConfig().query).toContain('HomepageStartingMeetings');el.shadowRoot.querySelector('[data-tab="calendar"]').click();await flush();expect(el.shadowRoot.querySelector('c-homepage-calendar-meetings')).not.toBeNull();expect(el.shadowRoot.querySelector('.mobile-list')).toBeNull();});
it('returns native navigation as a close result',async()=>{const el=await mount();const close=jest.fn();el.addEventListener('modalclose',close);graphql.emit(response([meeting()]));await flush();el.shadowRoot.querySelector('a[data-event-id]').click();expect(close.mock.calls[0][0].detail.navigation).toEqual({recordId:meeting().Id,objectApiName:'Event'});});
it('loads 1100 records through explicit continuation without false exact counts',async()=>{
 const el=await mount();
 for(let page=0;page<10;page++){graphql.emit(response(Array.from({length:100},(_,i)=>meeting(page*100+i+1)),{startCursor:`s${page}`,endCursor:`e${page}`,hasNextPage:true}));await flush();}
 expect(el.shadowRoot.textContent).toContain('1000 loaded');expect(graphql.getLastConfig().variables.after).toBe('e8');
 [...el.shadowRoot.querySelectorAll('button')].find(b=>b.textContent==='Load more meetings').click();await flush();expect(graphql.getLastConfig().variables.after).toBe('e9');
 graphql.emit(response(Array.from({length:100},(_,i)=>meeting(1001+i)),{startCursor:'s10',endCursor:'e10',hasNextPage:false}));await flush();expect(el.shadowRoot.textContent).toContain('1100 loaded');
 for(let i=0;i<2;i++){[...el.shadowRoot.querySelectorAll('button')].find(b=>b.textContent==='Load more meetings').click();await flush();graphql.emit(response([]));await flush();}
 expect(el.shadowRoot.textContent).toContain('1100 meetings');
});
it('uses a table in a wide container and cards when narrow',async()=>{let resize;global.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}disconnect(){}};const el=await mount();graphql.emit(response([meeting()]));resize([{contentRect:{width:1100}}]);await flush();expect(el.shadowRoot.querySelector('table')).not.toBeNull();expect(el.shadowRoot.querySelector('article')).toBeNull();resize([{contentRect:{width:320}}]);await flush();expect(el.shadowRoot.querySelector('table')).toBeNull();expect(el.shadowRoot.querySelector('article')).not.toBeNull();});
it('does not dispatch summary events from LightningModal (Locker regression)',async()=>{
 rejectModalSummaryEvents(true);
 try{const el=await mount();graphql.emit(response([meeting()]));await flush();expect(el.shadowRoot.querySelector('article')).not.toBeNull();expect(el.shadowRoot.textContent).not.toContain('configured timezone');}finally{rejectModalSummaryEvents(false);}
});
