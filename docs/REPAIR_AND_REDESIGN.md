# Repair and redesign — September 2026

The latest user request takes precedence over conflicting presentation instructions in the original documents. Original Markdown and Word specifications are unchanged. No target org was accessed.

## Confirmed failure and repair

The supplied Salesforce screenshot reports `INVALID_FIELD: No such column 'RecordTypeId' on entity 'Name'`, while the generated query filters through `What.RecordTypeId`. Event.What is polymorphic; this target query path cannot filter the Opportunity record type as written.

All four data consumers now use `WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }`. This filters the Opportunity table directly, following Salesforce's [reference semi-join documentation](https://developer.salesforce.com/docs/platform/graphql/guide/filter-joins.html). It preserves the current Event owner, exact Scheduled/Rescheduling statuses, and strict EndDateTime > asOf filter on the server.

Because Salesforce documents restrictions on [combining semi-joins and OR](https://developer.salesforce.com/docs/platform/graphql/guide/query-limits.html), each consumer owns one static document with three named operations, selected sequentially by `operationName`:

1. Timed events starting inside the range.
2. Timed events starting earlier and continuing into the range.
3. All-day events intersecting the date range.

Only one connection is active at a time. Each connection pages independently; all pages are merged by Event ID. Exact counts and empty-state claims wait until all three operations finish. The fixed cutoff is unchanged while paging. No fallback broadens eligibility or fetches every Opportunity. The actual target schema remains unverified.

A failed query now records its attempt time, so an immediate window-focus event does not discard a fresh error and start another load. The same error/focus regression is covered across all four consumers.

The previous date-preparation catch covered unrelated work and could turn another exception into the misleading timezone message shown in the modal screenshot. It now catches date preparation only and retains the actual error. The modal also no longer dispatches unused summary events: Salesforce documents that direct modal event dispatch can fail under Locker. This is a preventive fix for a documented [LightningModal limitation](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-modal.html), not a claim that the screenshot establishes the org's security mode.

## Requested design changes

| Request | Delivered behavior |
|---|---|
| Remove Today/Tomorrow date and timezone | Removed from compact cards; expanded Today/Tomorrow use simple meeting headings. Selected calendar dates remain visible for orientation. Seller timezone still controls calculations. |
| Remove scope copy | Removed from every presentation template. Eligibility remains enforced in data queries. |
| No Retry button; actual errors | One header refresh action. Calm error panel with expandable Technical details preserving Salesforce's message and code. Errors do not claim an exact empty result. |
| Improve View All; remove bottom Open Calendar | View All is a text action with an arrow; Open Calendar is removed. Calendar remains a tab, with a dedicated expand icon. |
| Improve calendar | Compact month with day indicators and selected-day cards. Expanded week/workweek use aligned time columns, all-day lanes, colored event blocks, current-time marker and event details. Month shows event chips and day overflow. |
| Better expanded view, no search | Unified title/icon/header actions, view switch, responsive list/table, and date-grouped agenda on narrow screens. Search removed. |
| Match reference styling | Blue rounded calendar icon, rounded white shell, restrained borders, dark title, consistent icon actions and spacing. Manage Meetings sits in the header and wraps on narrow columns. |

## Delivery and limits

Deployable scope is still exactly the five LWC bundles listed in `manifest/package.xml`. Runtime source contains no fixture data, additional Apex, library bundle, or static resource. Local preview screenshots use fixture data and mocked Salesforce base components; they are not screenshots from a connected org.

The same existing configuration is required: the actual dashboard route and Impact Assessment resolver are not invented. Full attendee coverage remains limited to the primary related person until a verified participant source is supplied. See `CAPABILITY_REPORT.md` for these pre-existing limits and `VALIDATION.md` for local evidence.
