import USER_ID from '@salesforce/user/Id';
export const scope = { sellerId: USER_ID, recordTypeIds: ['012000000000001AAA','012000000000002AAA'] };
export const v = (value) => ({value});
export const NOW = '2026-09-22T10:00:00.000Z';
export function meeting(i=1, override={}) {
 const id=`00U${String(i).padStart(12,'0')}AAA`;
 return { Id:id, OwnerId:v(USER_ID), Subject:v(`Meeting ${i}`), StartDateTime:v('2026-09-22T11:00:00.000Z'),EndDateTime:v('2026-09-22T12:00:00.000Z'),
 IsAllDayEvent:v(false), ActivityDate:v('2026-09-22'),status:v('Scheduled'),topic:v('Review'),category:v('Retention'),
 WhatId:v('006000000000001AAA'),What:{Id:'006000000000001AAA',Name:v('Opportunity'),RecordTypeId:v(scope.recordTypeIds[0])},
 WhoId:v('003000000000001AAA'),Who:{Id:'003000000000001AAA',Name:v('Primary Person')},...override };
}
export const response=(nodes, {startCursor='first',endCursor='last',hasNextPage=false,refresh=jest.fn().mockResolvedValue()}={})=>({data:{uiapi:{query:{Event:{edges:nodes.map(node=>({node})),pageInfo:{startCursor,endCursor,hasNextPage}}}}},refresh});
export async function flush(){ for(let i=0;i<10;i++) await Promise.resolve(); }
