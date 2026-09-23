# Version 3 acceptance evidence

“Local” means compiled source, fixtures and/or the isolated browser harness. It does not mean Salesforce runtime verification. “Pending org” checks were skipped per the user's instruction.

| ID | Evidence / outcome |
|---|---|
| A01 | Local: exact five bundle audit and manifest. Existing container integration pending missing source; snippet supplied. |
| A02 | Local: controller-local wires; conditional mounting; parent lifecycle test. |
| A03 | Local: exact Scheduled/Rescheduling predicates and parameterized positive/negative tests. Stored values pending org. |
| A04 | Local: mandatory server WhatId semi-join to Opportunity.RecordTypeId in all three operations; null/Account/other-type fixture exclusion. Schema pending org. |
| A05 | Owned-only scope implemented and tested; invited coverage/business confirmation pending org. |
| A06 | Required fields represented; null/unavailable tested. Actual field APIs/access pending org. |
| A07 | Local: 0/1/2/3/4/8 fixtures and 1–3 clamp; compact preview never exceeds configured maximum. |
| A08 | Local: all-day / in-progress / upcoming selection and next-card promotion. |
| A09 | Local: complete-only exact summaries; paging and expiry; no first-page total claim. |
| A10 | Null resolver, guarded IDs, URL policy, new-tab anchor path implemented. Real dynamic integration intentionally pending Arun. |
| A11 | Disabled unconfigured dashboard; same-origin Lightning route validation. Actual dashboard pending. |
| A12 | Local: selected-date modal, pagination, no elapsed rows; live query pending. |
| A13 | **Unmet:** no verified full-attendee source. No fabricated +N, attendee pages or acceptance data. |
| A14 | Local: explicitly labeled primary related person with full attendee list unavailable. Reduced-scope business acceptance not asserted. |
| A15 | Local: seller-zone formatting/bounds independent of browser timezone; live Salesforce comparison pending. |
| A16 | Local: New York DST, Lord Howe half-hour transition and independent midnight oracle tests. |
| A17 | Local: strict end, invalid/missing end, cross-midnight, exact midnight, point-event and quarter-hour-zone tests. |
| A18 | Local: explicit date-only all-day fixtures; native/source convention pending org. |
| A19 | Keeps distinct returned occurrence/child IDs. Source recurrence coverage/exceptions pending org. |
| A20 | Local: 100-per-page, 1,000 automatic budget, explicit continuation tested to 1,100, deduplication. |
| A21 | Local: callable refresh and replacement membership; live relink/retype/move/deletion behavior pending org. |
| A22 | Local: disconnect cleanup, modal failure/close, queued-page scope guard and out-of-range stale rejection. Untagged overlapping/empty response association remains unverified; see capability report. |
| A23 | Local: six-row month, date keys, keyboard selection, 24-hour Week, Workweek, Agenda, overlap lanes, inline detail. Native all-day/recurrence agreement pending org. |
| A24 | Local: safe template rendering, fail-closed errors and URL tests. Representative sharing/FLS/LWS checks pending org. |
| A25 | Local: narrow responsive layouts, DOM semantics, keyboard day navigation/focus handling, effective 200%-zoom viewport screenshot. Actual screen reader and Salesforce modal focus/zoom checks not run. |
| A26 | Local architecture audit: no Apex/REST reads, extra service bundle, runtime fixtures, parent import or unsafe HTML. |
| A27 | Local: partial/loading/error states; optional-field degradation; no false exact count. Strong stale-response guarantee remains pending adapter validation. |
| A28 | Local 320/360/420 browser checks: no page overflow; natural-height compact cards. Real homepage and adjacent widgets unavailable. |
| A29 | Local: identical mandatory query documents audited across four controllers. |
| A30 | Local compiler and local browser passed; local Salesforce source-to-metadata conversion passed. Deployment and real console not run. |
| A31 | Local: v2 wire, reactive variables, returned refresh callable, no imperative wire invocation. |
| A32 | Local: LightningModal inheritance, `.open`, no modal NavigationMixin, failed-open and undefined-close restoration. Actual platform Escape handling pending org. |
| A33 | Parameterized eligibility/date/normalization suite across all four consumers. |
| A34 | Screenshot confirms invalid polymorphic RecordTypeId traversal. Replaced with direct Opportunity filtering through a WhatId semi-join; all four consumers have diagnostic and three-operation regressions. Live repair validation pending org. |
| A35 | Local: millisecond-before, equality and after tests across all consumers' normalization; UI boundary action tests. |
| A36 | Local: timeout expiry/promotion, counts and stable query cutoff; no periodic refresh caused by ordinary ticks. |
| A37 | Local: delayed expired emissions, cached emissions and foreground prune tests. Real browser sleep/LDS behavior pending org. |
| A38 | Local: record/assessment click guards, expired detail clearing and stable heading restoration. Real assistive-technology behavior pending. |
| A39 | Local audit: every Event query includes strict asOf; cutoff stored and fixed while paging/ticking. Manual refresh and civil-day rollover restart the load. |

The feature is not represented as fully accepted against A01–A39. Full attendees, target integration and org-dependent evidence remain outstanding.

The subsequent explicit UI revisions are tracked in `REPAIR_AND_REDESIGN.md` and supersede conflicting original presentation requirements.
