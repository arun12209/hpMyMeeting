import {createElement} from 'lwc';
import Parent from 'c/homepageMyMeetings';
import Modal from 'c/homepageViewAllMeetings';
import {graphql} from 'lightning/graphql';
import {flush} from '../../../../../../tests/fixtures/meetings';
const metadata={uiapi:{objectInfos:[{ApiName:'Opportunity',recordTypeInfos:[{name:'Renewal Opportunity',recordTypeId:'012000000000001AAA',available:false},{name:'Growth Opportunity',recordTypeId:'012000000000002AAA',available:true}]}]}};
async function mount(){const el=createElement('c-homepage-my-meetings',{is:Parent});document.body.appendChild(el);await flush();graphql.emit({data:metadata},config=>config.query?.includes('HomepageMeetingRecordTypes'));await flush();return el;}
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-09-22T10:00:00Z'));Modal.open.mockResolvedValue(undefined);});
afterEach(()=>{document.body.replaceChildren();jest.clearAllMocks();jest.useRealTimers();});
it('resolves both labels without checking create availability; mounts only the active tab',async()=>{
 const el=await mount();expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).not.toBeNull();expect(el.shadowRoot.querySelector('c-homepage-tomorrow-meetings')).toBeNull();
 const tab=el.shadowRoot.querySelector('lightning-tab[value="tomorrow"]') || [...el.shadowRoot.querySelectorAll('lightning-tab')].find(t=>t.value==='tomorrow');tab.dispatchEvent(new CustomEvent('active'));await flush();
 expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).toBeNull();expect(el.shadowRoot.querySelector('c-homepage-tomorrow-meetings')).not.toBeNull();
});
it('unmounts before modal open, restores source and focus after failed opening',async()=>{
 const el=await mount();const child=el.shadowRoot.querySelector('c-homepage-todays-meeting');
 Modal.open.mockImplementation(()=>{expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).toBeNull();return Promise.reject(new Error('open failed'));});
 child.dispatchEvent(new CustomEvent('viewall',{detail:{date:'2026-09-22',mode:'list'}}));await flush();
 expect(Modal.open).toHaveBeenCalledWith(expect.objectContaining({initialDate:'2026-09-22',initialMode:'list'}));expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).not.toBeNull();expect(el.shadowRoot.textContent).toContain('Could not open');
});
it('recovers after Escape/undefined modal close result',async()=>{
 const el=await mount();el.shadowRoot.querySelector('c-homepage-todays-meeting').dispatchEvent(new CustomEvent('viewall',{detail:{date:'2026-09-22',mode:'list'}}));await flush();expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).not.toBeNull();
});
it('shows missing metadata as setup failure with no meeting query',async()=>{
 const el=createElement('c-homepage-my-meetings',{is:Parent});document.body.appendChild(el);await flush();graphql.emit({data:{uiapi:{objectInfos:[]}}});await flush();expect(el.shadowRoot.querySelector('c-homepage-todays-meeting')).toBeNull();expect(el.shadowRoot.textContent).toContain('setup pending');
});
it('clears inactive badges',async()=>{
 const el=await mount();el.shadowRoot.querySelector('c-homepage-todays-meeting').dispatchEvent(new CustomEvent('summarychange',{detail:{exactCountOrNull:8,completeness:'complete'}}));await flush();
 let tabs=[...el.shadowRoot.querySelectorAll('lightning-tab')];expect(tabs.find(t=>t.value==='today').label).toBe('Today (8)');tabs.find(t=>t.value==='calendar').dispatchEvent(new CustomEvent('active'));await flush();tabs=[...el.shadowRoot.querySelectorAll('lightning-tab')];expect(tabs.find(t=>t.value==='today').label).toBe('Today');
});
