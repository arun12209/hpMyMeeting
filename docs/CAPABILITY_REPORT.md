# Capability report

## Inspected input

Read the complete Version 3 Markdown specification and the Word document. Paragraph comparison found the same core requirements; the Word document additionally contained three visual references and explanatory captions. All three embedded reference images were inspected. The separate pasted mission was also read. At the initial build, there were no original bundles/imports, failure logs, container, design tokens, or package configuration. The later user request supplied four screenshots: the actual INVALID_FIELD response, failed expanded views, and a rounded icon-bearing card reference. Those screenshots and the explicit revision requests now inform the repair.

## Implemented assumptions and limits

| Capability | Implementation / evidence | Target-org status |
|---|---|---|
| API and adapter | API 65.0; `lightning/graphql` v2; static controller-local documents; returned `refresh()` | Unverified in target; no offline support |
| Metadata | `uiapi.objectInfos`, Opportunity `recordTypeInfos { name recordTypeId }` | Exact two label matches required; no guessed IDs/DeveloperNames |
| Event filter | Current owner, exact statuses, WhatId reference semi-join to Opportunity.RecordTypeId, three sequential date-intersection operations, strict EndDateTime > asOf | Syntax parsed; schema/filterability unverified |
| Field names | `Status__c`, `Topic__c`, `Interaction_Category__c` on Event | Assumes supplied unnamespaced API names |
| Optional presentation | `@optional` topic, category, Who/WhoId; unavailable differs from null | API 65 optional fields documented; FLS simulated only |
| Scope | OwnerId = current user, hardcoded from Salesforce scoped user import | Invited-only/child representation must be reconciled; no visibility broadening |
| Attendees | Primary Who Contact/Lead only, accurately labeled; no fabricated counts | **Full attendees unmet**; participant source and business semantics unknown |
| All-day dates | ActivityDate as date-only start; UTC-midnight EndDateTime as exclusive date end; actual stored end still controls expiry | **Unverified source convention**. Non-midnight/invalid spans are suppressed and make results incomplete. Reconcile native single/multi-day examples before release |
| Recurrence | Uses returned Event occurrence IDs; keeps child events; no RRULE expansion or subject/time deduplication | **Coverage unverified** for old masters, generated occurrences, exceptions and cancellations |
| Pagination | 100 per page, initial 1,000 budget, explicit continuation, replacement by page identity, deduplication by Event ID | Fixture tested to 1,100; actual cursors/limits unverified |
| Refresh | v2 callable refresh, new fixed cutoff, collection restart, scope reset | Membership fixture tested; LDS behavior requires live validation |
| Expiry | Strict server cutoff plus local end > current instant; one capped timeout; foreground prune; guarded actions | Fake-clock tests; managed device clock assumed |
| Calendar | Local custom read-only renderer; no library/CDN, no unsafe HTML, no Event writes | Local Chromium tested; real Lightning/LWS still unverified |
| Container | Exact insertion/configuration snippet supplied | **Integration pending because source was not supplied** |
| Dashboard | Same-org Lightning URL only; disabled when absent | Actual destination not supplied |
| Impact Assessment | Four null resolvers and HTTPS exact-host validation | Intentionally pending Arun's integration |

## Response ordering limitation

The v2 wire response exposes data/errors/refresh, not the variables that produced that emission. Local guards reject out-of-range records, disconnected consumers and queued paging from a retired load; cached pages replace rather than append, and changing range clears records. These checks do **not** prove that an untagged late empty response or an overlapping old range cannot affect the current range's completeness. Refresh function identity is deliberately not treated as a documented request token. A generation counter alone is also not represented as a solution.

Rapid range changes with the actual adapter remain a required live check. If the target adapter can deliver such retired emissions, strengthen request isolation/remount ownership using its verified behavior before release. The current out-of-range mocked test does not establish the stronger guarantee. This remains a known validation/architecture limitation, not an achieved acceptance claim.

## No live claims

No authentication, org selection, org query, schema introspection, metadata retrieval, seller/restricted-user test, Salesforce deployment, or production change was performed. No administrator-only result is being presented as seller validation. No target-org error was fabricated. The supplied screenshot establishes the polymorphic RecordTypeId filter failure. The older eleven-component source remains unavailable. The modal Locker exception is a documented risk addressed locally, not a confirmed target-org trace.

## Public documentation checked

These sources informed the implementation, not certification of the missing org:

- [GraphQL v2 wire contract](https://developer.salesforce.com/docs/platform/lwc/guide/reference-graphql-wire.html)
- [GraphQL metadata fields](https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html)
- [Reference semi-join filters](https://developer.salesforce.com/docs/platform/graphql/guide/filter-joins.html)
- [Semi-join query restrictions](https://developer.salesforce.com/docs/platform/graphql/guide/query-limits.html)
- [LightningModal behavior, headers and Locker event limitations](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-modal.html)
- [Optional fields and object mapping](https://developer.salesforce.com/docs/platform/graphql/guide/query-record-objects.html)
- [Refresh and collection membership](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-refresh.html)
- [Reactive query and variables](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-best.html)
- [Salesforce all-day sync convention](https://help.salesforce.com/s/articleView?id=000382889&language=en_US&type=1)

Event/Task release status, What/Who unions, custom field types, all-day semantics and recurrence must be confirmed for the actual release and data source. No fallback removes eligibility predicates, fetches all Opportunities, substitutes REST/Apex, or introduces fixture data into the deployed source.
