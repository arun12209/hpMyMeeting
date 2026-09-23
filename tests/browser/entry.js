import {createElement} from 'lwc';
import Parent from 'c/homepageMyMeetings';
import Calendar from 'c/homepageCalendarMeetings';
import Modal from 'c/homepageViewAllMeetings';
const RealDate = Date; const fixed=RealDate.parse('2026-09-22T10:00:00Z');
window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
const params=new URLSearchParams(location.search);const surface=params.get('surface')||'today';
const el=createElement('c-preview',{is:surface==='calendar'?Calendar:surface==='modal'?Modal:Parent});
el.scopeConfig={sellerId:'005000000000001AAA',recordTypeIds:['012000000000001AAA','012000000000002AAA']};
el.displayZone='UTC';el.maxVisibleMeetings=2;el.selectedDate='2026-09-22';el.initialDate='2026-09-22';
if(params.get('expanded'))el.displayMode='expanded';
el.initialView=params.get('view')||'week';
if(surface==='modal'&&params.get('calendar'))el.initialMode='calendar';
if(surface==='modal'||surface==='calendar')document.querySelector('#mount').className='wide';
if(surface==='today'||surface==='tomorrow'||surface==='homeCalendar')el.manageMeetingsUrl='/lightning/o/Event/home';
document.querySelector('#mount').append(el);

if(surface==='tomorrow'||surface==='homeCalendar')setTimeout(()=>el.shadowRoot.querySelector(`[data-tab="${surface==='tomorrow'?'tomorrow':'calendar'}"]`)?.click(),40);
