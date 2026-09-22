// Local browser QA only. This file is never included in the Salesforce manifest.
export const gql=(strings)=>strings.join('');
const v=value=>({value});
const subjects=['Service kickoff','Quarterly business review with a long subject that must remain readable','Renewal check-in','Planning session','Follow-up'];
export class graphql {
 constructor(callback){this.callback=callback;this.connected=false;}
 connect(){this.connected=true;}
 disconnect(){this.connected=false;}
 update(config){this.config=config;if(!config.query||!config.variables?.asOf)return;this.emit();}
 emit(){queueMicrotask(()=>{
  if(!this.connected)return;
  const nodes=subjects.map((subject,i)=>({Id:`00U00000000000${i+1}AAA`,OwnerId:v('005000000000001AAA'),Subject:v(subject),
   StartDateTime:v(`2026-09-22T${String(11+i).padStart(2,'0')}:00:00Z`),EndDateTime:v(`2026-09-22T${String(11+i).padStart(2,'0')}:45:00Z`),IsAllDayEvent:v(false),ActivityDate:v('2026-09-22'),
   status:v(i===2?'Rescheduling':'Scheduled'),topic:v(i===1?'Quarterly business review and service planning':'Review'),category:v('Retention'),WhatId:v('006000000000001AAA'),
   What:{Id:'006000000000001AAA',Name:v('Edge Communications renewal opportunity'),RecordTypeId:v('012000000000001AAA')},WhoId:v('003000000000001AAA'),Who:{Id:'003000000000001AAA',Name:v('Bertha B.')}}))
  .filter(n=>n.StartDateTime.value<this.config.variables.rangeEnd&&n.EndDateTime.value>this.config.variables.rangeStart);
  this.callback({data:{uiapi:{query:{Event:{edges:nodes.map(node=>({node})),pageInfo:{startCursor:'first',endCursor:'last',hasNextPage:false}}}}},refresh:async()=>this.emit()});
 });}
}
