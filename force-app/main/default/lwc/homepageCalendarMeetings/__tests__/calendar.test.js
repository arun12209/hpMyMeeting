import {createElement} from 'lwc';
import Calendar,{monthGrid,layoutEvents} from 'c/homepageCalendarMeetings';
import {graphql} from 'lightning/graphql';
import {scope,NOW,meeting,response,flush} from '../../../../../../tests/fixtures/meetings';
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date(NOW));});
afterEach(()=>{document.body.replaceChildren();jest.useRealTimers();delete global.ResizeObserver;});
it('always has six full month rows and includes adjacent dates',()=>{const dates=monthGrid('2026-09-22',1);expect(dates).toHaveLength(42);expect(dates[0]).toBe('2026-08-31');expect(dates[41]).toBe('2026-10-11');});
it('lays out overlapping records in separate columns',()=>{const records=layoutEvents([{id:'1',start:0,end:3600000},{id:'2',start:1800000,end:4000000},{id:'3',start:4000000,end:5000000}],0,86400000);expect(records[0].lane).not.toBe(records[1].lane);expect(records[0].lanes).toBe(2);expect(records[2].lanes).toBe(1);});
it('supports grid keyboard selection and emits selected date',async()=>{
 const el=createElement('c-calendar-test',{is:Calendar});el.scopeConfig=scope;el.displayZone='UTC';el.selectedDate='2026-09-22';const changed=jest.fn();el.addEventListener('datechange',changed);document.body.appendChild(el);await flush();
 const day=el.shadowRoot.querySelector('[data-date="2026-09-22"]');day.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));await flush();expect(changed.mock.calls.at(-1)[0].detail.date).toBe('2026-09-23');expect(el.shadowRoot.querySelector('[data-date="2026-09-23"]').tabIndex).toBe(0);
});
it('exposes all 24 hours and detail; narrow regions switch to agenda',async()=>{
 let resize;global.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}disconnect(){}};
 const el=createElement('c-calendar-test',{is:Calendar});el.scopeConfig=scope;el.displayZone='UTC';el.selectedDate='2026-09-22';el.displayMode='expanded';document.body.appendChild(el);await flush();resize([{contentRect:{width:1100}}]);graphql.emit(response([meeting()]));await flush();
 expect(el.shadowRoot.querySelectorAll('.hour')).toHaveLength(7*24);el.shadowRoot.querySelector('.grid-event').click();await flush();expect(el.shadowRoot.querySelector('[data-detail-heading]')).not.toBeNull();
 el.shadowRoot.querySelector('section[aria-label="Meeting details"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flush();expect(el.shadowRoot.querySelector('[data-detail-heading]')).toBeNull();resize([{contentRect:{width:320}}]);await flush();expect(el.shadowRoot.querySelector('.time-grid')).toBeNull();expect(el.shadowRoot.querySelector('article')).not.toBeNull();
});
it('rejects an out-of-range late emission after navigation',async()=>{
 const el=createElement('c-calendar-test',{is:Calendar});el.scopeConfig=scope;el.displayZone='UTC';el.selectedDate='2026-09-22';document.body.appendChild(el);await flush();
 el.shadowRoot.querySelector('lightning-button-icon[alternative-text="Next calendar period"]')?.click();
 // Stub properties are not necessarily reflected as attributes.
 const next=[...el.shadowRoot.querySelectorAll('lightning-button-icon')].find(b=>b.alternativeText==='Next calendar period');next.click();await flush();
 graphql.emit(response([meeting()]));await flush();expect(el.shadowRoot.textContent).not.toContain('Meeting 1');
});
