// Browser fixtures ONLY. Not in Salesforce deployment source.
export const gql=(strings)=>strings.join('');
const v=value=>({value});
const subjects=['Service kickoff','Quarterly business review','Renewal check-in','Planning session','Follow-up'];
export class graphql {
 constructor(callback){this.callback=callback;this.connected=false;this.version=0;}
 connect(){this.connected=true;}
 disconnect(){this.connected=false;}
 update(config){this.config=config;this.version++;if(!config.query)return;this.emit();}
 emit(){const config=this.config;const version=this.version;queueMicrotask(()=>{
  if(!this.connected||version!==this.version)return;
  if(config.query.includes('HomepageMeetingRecordTypes')){this.callback({data:{uiapi:{objectInfos:[{ApiName:'Opportunity',recordTypeInfos:[{name:'Renewal Opportunity',recordTypeId:'012000000000001AAA'},{name:'Growth Opportunity',recordTypeId:'012000000000002AAA'}]}]}}});return;}
  if(new URLSearchParams(location.search).get('state')==='error'){this.callback({errors:[{message:"Exception while fetching data (/uiapi/query/Event): INVALID_FIELD: No such column 'RecordTypeId' on entity 'Name'.",extensions:{errorCode:'INVALID_FIELD'}}]});return;}
  const vars=config.variables;if(!vars?.asOf)return;
  const nodes=subjects.flatMap((subject,i)=>[22,23,24].map(day=>({Id:`00U000000000${day}${i+1}AAA`,OwnerId:v('005000000000001AAA'),Subject:v(subject),
   StartDateTime:v(`2026-09-${day}T${String(11+i).padStart(2,'0')}:00:00Z`),EndDateTime:v(`2026-09-${day}T${String(11+i).padStart(2,'0')}:45:00Z`),IsAllDayEvent:v(false),ActivityDate:v(`2026-09-${day}`),
   status:v(i===2?'Rescheduling':'Scheduled'),topic:v(i===1?'Quarterly business review':'Service planning'),category:v('Retention'),WhatId:v('006000000000001AAA'),
   What:{Id:'006000000000001AAA',Name:v(['Edge Communications renewal','Dickenson growth opportunity','Northstar renewal'][i%3]),RecordTypeId:v('012000000000001AAA')},WhoId:v('003000000000001AAA'),Who:{Id:'003000000000001AAA',Name:v(['Bertha B.','Andy Young','Jane Grey'][i%3])}})))
   .filter(n=>config.operationName==='HomepageStartingMeetings'&&n.StartDateTime.value>=vars.rangeStart&&n.StartDateTime.value<vars.rangeEnd&&n.EndDateTime.value>vars.asOf);
  this.callback({data:{uiapi:{query:{Event:{edges:nodes.map(node=>({node})),pageInfo:{startCursor:'first',endCursor:'last',hasNextPage:false}}}}},refresh:async()=>this.emit()});
 });}
}
