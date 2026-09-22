# My Meetings Product Specification

Product requirements and implementation contract for the Salesforce Actionable Homepage

Prepared for Arun Kumar and the Customer 360 team · 22 September 2026 · Version 3.0

## 1 Product and architecture decision

Create a new LWC named `homepageMyMeetings`, embedded in the existing `homepageContainer`. Use this plural name consistently in source, metadata, imports, tests, and documentation. This feature originated as a new component. An earlier AI attempt may now exist in the repository: inspect it and repair or replace only its verified feature code, rather than assuming a clean folder or generating a second competing implementation. Preserve the real container’s responsibilities and sibling components.

Use exactly five bundles: homepageMyMeetings, homepageTodaysMeeting, homepageTomorrowMeetings, homepageViewAllMeetings, and homepageCalendarMeetings. Today and Tomorrow are separate components as requested. Keep each tab’s card markup and attendee disclosure inside that tab’s template. There is no extra agenda, card, attendee, data-provider, query-service, modal-wrapper, or utility bundle. A small amount of matching markup and controller-local logic is intentional; tests keep the duplicated business rules consistent.

Salesforce does not prohibit a child LWC from owning a GraphQL wire. Its wire belongs in that component’s JavaScript class, and Salesforce also supports correctly structured JavaScript module exports. Therefore the previous failure cannot be attributed to separation alone without its code and error. For this project, use the simpler restriction: every gql document, @wire declaration, variables getter, response handler, cursor state, and refresh function lives in the same consuming controller file. Never invoke the query wire adapter as an imperative function or instantiate another LWC class as a data service. [S02, S31, S32]

The component is a focused CRM meeting reader: eligible Renewal and Growth Opportunity meetings, preparation context, and access to Impact Assessment. It is not a complete personal calendar or an external availability system. Read meeting data using `lightning/graphql` in the current user’s security context. No Apex Event queries, REST SOQL substitution, or copied Event database are permitted.

The homepage displays at most three meetings per agenda tab. View All provides the full selected-day list. Calendar provides a compact month selector and an expanded week, workweek, month, and agenda workspace. The primary card action is Open Impact Assessment; Manage Meetings opens the existing dashboard. Custom scheduling, invitations, provider synchronization, and recurrence editing are outside this release.

## 2 Changes and evidence

Version 3 replaces the previous component decomposition and corrects the status value to Scheduled. The delivered feature must use exactly five custom LWC bundles, with GraphQL documents and wires declared in the controller that consumes the data. The previous broad meeting scope, generic compact rows, Join-first actions, and speculative client classification remain superseded. The user’s company requirements now define eligibility and mandatory fields. Unlinked events, Account-linked events, and events linked to other Opportunity record types must not be fetched by the production meeting query or displayed. Do not add an inferred internal/client classification filter to otherwise qualifying Opportunity meetings.

| Requirement | Binding decision |
|---|---|
| New component | Create homepageMyMeetings inside existing homepageContainer |
| Status filter | Use Status__c values Scheduled and Rescheduling after confirming stored API values |
| Opportunity filter | Only Renewal Opportunity and Growth Opportunity record types |
| Required content | Subject, StartDateTime, Topic__c, Opportunity, attendees, Interaction_Category__c |
| Homepage limit | Maximum three cards; no fourth card or hidden scroll list |
| Meeting expiry | EndDateTime must be strictly greater than now in every surface; remove at equality |
| Preparation action | Open Impact Assessment on every meeting card; dynamic URL built later by Arun |
| Management action | Manage Meetings in the top right, linked to the existing dashboard |
| Expanded list | All eligible meetings for the selected day, with explicit pagination |
| Source constraint | GraphQL meeting reads; no Apex fallback |

The original homepage photograph shows a narrow right column beside a wide To-Do area, with On My Radar below meetings. The new agenda photograph establishes the required information and preparation action. The second new photograph establishes an expanded table, tabs, close control, and scrollable list. These are rough layout references, not exact CSS measurements or approved typography. The expanded mockup includes different dates under Today; implement correct selected-day filtering instead of reproducing that sample inconsistency. Use the written label Manage Meetings, even though the mockup uses My Meetings Fasttrack.

No target org, source repository, schema, dashboard URL, or attendee relationship sample was supplied. Public Salesforce composition, GraphQL polymorphic filters, joins, metadata, field operators, adapter, and modal documentation were retrieved directly on 22 September 2026. The broader product comparison and native calendar research are retained from 17 September. Org-specific feasibility is unverified. The refreshed polymorphic documentation still labels Event and Task support as Beta starting with API v59.0; do not interpret general UI API object availability as a production support guarantee. Confirm the target release, relevant feature status, and company acceptance before deployment. [S01, S02, S26]

## 3 Eligibility and the meaning of My Meetings

An eligible event must satisfy every condition: it is readable by the current seller; it belongs to the agreed personal meeting scope; its Status__c is one of the two approved stored values; its What relationship is an Opportunity; that Opportunity has one of the two approved record types; its occurrence intersects the selected date range; and its valid EndDateTime is strictly later than the current instant. At now equal to EndDateTime, the meeting is already expired and must not render. Apply the same predicate to lists, counts, calendar indicators, search, overflow, and expanded views.

The user supplied record type labels, not DeveloperNames or record type IDs. Resolve the actual Opportunity record types in the org. Do not invent `Renewal_Opportunity` or `Growth_Opportunity`, and do not hardcode sandbox IDs. Do not filter on the Event’s own RecordTypeId. Do not exclude closed Opportunities or add an Opportunity owner condition; neither was requested. The user has corrected and confirmed the required value as Scheduled. Use Scheduled and Rescheduling in queries, fixtures, tests, and configuration. If the actual org metadata conflicts, report the discrepancy; never revert to the superseded spelling or broaden the predicate.

Proposed initial personal scope is `Event.OwnerId = currentUserId`, including readable child Event records where relevant. This is an explicit implementation assumption, not a confirmed business rule. Salesforce visibility is broader than ownership, and owning the Opportunity does not mean owning the meeting. Before release, reconcile with representative sellers and determine whether invited-only meetings are required. If they are, prove a supported invitee relationship or child-event route in GraphQL. Never switch to all visible company events to approximate My Meetings, and never label an owned-only implementation as including every invitation.

If an eligibility field is inaccessible or a mandatory predicate cannot be applied reliably, fail closed for the affected scope. Do not show unverified records. Optional presentation fields can degrade gracefully; eligibility fields cannot be removed to make the query pass.

## 4 Five component structure and ownership

Exactly five feature bundles are allowed. The existing homepageContainer is not a new bundle and is excluded from this count. Salesforce base components, Jest files, and a reviewed calendar static resource are not custom LWC bundles. Do not create a sixth custom bundle, including a JavaScript-only API module. These canonical names use lowercase initial letters and the correct spelling Tomorrow; do not use HomepageTommorowMeetings or add alternate singular/plural variants.

| Bundle or module | Responsibility | Data access |
|---|---|---|
| homepageMyMeetings | Existing-container integration, header, tabs, configuration, modal launch, final native navigation | Configuration metadata only if needed; no Event wire |
| homepageTodaysMeeting | Today range, maximum three cards, inline attendee disclosure, View All intent | Its own controller-local gql and @wire |
| homepageTomorrowMeetings | Tomorrow range, maximum three cards, inline attendee disclosure, View All intent | Its own controller-local gql and @wire |
| homepageViewAllMeetings | LightningModal subclass; complete selected-day table/card list and Calendar mode | Own day query in its controller; disabled during Calendar mode |
| homepageCalendarMeetings | Mini month and expanded Week, Workweek, Month, Agenda, inline detail | Own visible-range query in its controller |

Every bundle has a same-named .js controller, .html template, and .js-meta.xml file, plus .css only when needed. The first, second, third, and fifth bundles extend LightningElement, with NavigationMixin only where native navigation is needed. homepageViewAllMeetings extends LightningModal; it is launched with its imported class’s .open() method and contains lightning-modal-header/body/footer. Do not render a LightningModal subclass as an ordinary c-homepage-view-all-meetings tag. [S23]

Integration tags are c-homepage-my-meetings in homepageContainer; c-homepage-todays-meeting, c-homepage-tomorrow-meetings, and c-homepage-calendar-meetings within the parent; and c-homepage-calendar-meetings within the expanded modal only for Calendar mode. Child bundles are not exposed in App Builder. Follow the existing container’s deployment target conventions; standalone HomePage exposure is optional, not required merely for nesting.

The parent’s only custom JavaScript class import for this feature is the modal class. Ordinary children are referenced through templates, not imported and constructed with new. No child imports its parent controller. No circular imports, c/componentName/helper paths, cross-bundle relative imports, generic query executors, custom wire adapters, shared mutable stores, or query registries are permitted. Private non-query helper files within an existing bundle are allowed only when necessary; by default keep helpers as plain functions or methods in the controller. Keep GraphQL definitions in the controller regardless. [S31]

### 4.1 Active view and query ownership

Only the selected home tab child is mounted using supported conditional rendering. Today mounts homepageTodaysMeeting; Tomorrow mounts homepageTomorrowMeetings; Calendar mounts homepageCalendarMeetings in compact mode. Do not hide all three active wired components with CSS. Switching tabs may read the new date range; LDS can serve cached data. Do not promise a zero-request tab switch. Show a count only on the active tab after its child reports a valid count. Clear the count when that child unmounts; omit inactive tab badges so they cannot become stale as meetings expire. This avoids a second background data or clock owner.

Before expanding, set the parent’s isExpanded flag and unmount the compact child. Pass scope configuration, display timezone, originating date, and initial mode to homepageViewAllMeetings.open(). Do not pass raw wire objects, refresh callbacks, service instances, live binding assumptions, or parent-owned pagination into the modal. The modal loads its own day directly. While its Calendar mode is active, return undefined from its own day-query getter and mount the same homepageCalendarMeetings in expanded mode. Calendar owns its queries and rendering; it must not import or launch the modal, avoiding a cycle.

A query getter remains undefined until required configuration and range values exist and its surface is active. Use a static gql document declared in that same controller and reactive variables. This connected-Lightning design deliberately excludes Mobile Offline prefetch expectations. Query gating prevents new requests; it is not a promise that an already-started server request is cancelled. Guard late results before updating the active view. [S33]

A finally block in the launcher resets isExpanded and restores the source tab even when opening fails or the modal is dismissed with Escape. Recalculate Today/Tomorrow on return and revalidate stale data. Save only presentation state in the parent, such as tab, selected date, and calendar mode; do not add an application data cache. The modal may return a small close result for native navigation, handled by homepageMyMeetings after close. Do not apply NavigationMixin directly to LightningModal or introduce a navigation-wrapper sixth component. [S23]

### 4.2 Deliberate duplication and safeguards

The four data-consuming controllers each contain their own schema-validated static query and the small date/normalization functions they need. This is a conscious simplicity tradeoff. Keep the mandatory eligibility predicates identical and verify them with one parameterized Jest suite covering all four controllers. Build and prove Today first, then derive Tomorrow and the expanded readers from that working implementation. Copying a proven query is allowed; inventing four different query strategies is not.

Today and Tomorrow have matching card templates and the same property/event contracts. Only their date and compact selection rules differ. Accessibility and null/error behavior must match. The View All and Calendar templates contain their own inline row, card, attendee, and detail markup; no additional renderer component or custom datatable-type bundle is allowed. Prefer a native semantic table styled with SLDS for View All.

## 5 Homepage design

### 5.1 Layout and density

Use the existing homepage surface, font, border, radius, and spacing tokens. Initial fallback values are white surface, #181818 text, #526171 secondary text, #D8DDE6 border, and #0B5CAB actions. Follow a 4 px spacing rhythm with 8, 12, and 16 px gaps. Design at 320, 360, and 420 CSS px, then measure the real region at 100 percent zoom. Avoid decorative glass, oversized icons, gradients, or large colored status pills.

Header: My Meetings at left and the text action Manage Meetings at right. Refresh is a secondary icon action with an accessible name. At narrow widths, allow a deliberate two-row header, keeping Manage Meetings aligned right; do not squeeze the title or turn the management action into an unexplained icon. Below it, place Today, Tomorrow, Calendar as real peer tabs. A small day/date and display-timezone line anchors the content.

Three full cards containing all requested fields cannot fit the original approximately 250 to 350 px card footprint. Budget roughly 180 to 210 px per card at 360 px width, plus about 130 px for header, tabs, date, and footer. Three cards therefore need approximately 670 to 760 px, with additional height for wrapping or zoom. These are starting layout budgets, not fixed heights. Default maxVisibleMeetings is three; allow the existing container to pass one, two, or three, capped at three. If the real homepage cannot accommodate three, use two and View All. Never hide mandatory information with clipping to meet a height budget.

No nested scroll region in the compact agenda. Let the card grow naturally up to the configured number of cards, reserving matching skeleton space during initial loading. View All is the continuation mechanism. Respect the layout needs of On My Radar below it.

### 5.2 Meeting card hierarchy

Each card shows, in this order: seller-local start and end time with a subtle temporal label; subject as a link; linked Opportunity name; category and topic with visible labels; attendee summary; Open Impact Assessment. Subject may wrap to two lines; Opportunity may wrap to two lines. Full values remain available in the accessible name and expanded detail. Do not put critical full text only in a hover tooltip.

Use compact labeled text for Category and Topic, rather than a large stack of generic pills. Show Rescheduling as a small text badge when applicable. Scheduled does not need an attention badge. Null category or topic says Not specified. A field denied by permissions says Unavailable when needed; do not imply a blank business value.

Subject opens the native Event record using supported navigation. Opportunity opens the related Opportunity. These are distinct links; the whole card is not a clickable container with nested interactive controls. Calendar event selection may open an in-component detail region first, with Open event as a clear link.

The Impact Assessment button has the exact requested label. Prefer a full-width outline action in narrow cards; at least 32 px high for fine pointers and 44 px on touch. Until configured, retain the button disabled with visible nearby text Setup pending. Once configured, indicate that it opens an external tool in a new tab. Never route to a dummy domain.

### 5.3 Selection and counts

First exclude every meeting whose EndDateTime is less than or equal to now. Apply this before selecting cards, sorting, calculating counts, search, calendar dots, and overflow. Today then prioritizes eligible all-day meetings, in-progress timed meetings, and upcoming meetings by start time. Display selected timed cards chronologically. If only two valid meetings remain, show two; never fill a spare slot with an elapsed meeting. Tomorrow uses the same expiry gate, then all-day first and earliest starts.

Keep the full loaded eligible day in memory rather than only three selected records. When a visible meeting ends, recompute the selection and promote the next loaded unexpired meeting into its slot. If more server pages remain and the loading budget permits, continue normal pagination; otherwise expose the existing incomplete/continuation state. View All includes all unexpired eligible meetings for the selected day, never earlier completed meetings. No Earlier today section or history toggle belongs in this release.

When complete, show tab counts and footer text such as View all today (8). When loading or incomplete, omit the exact total or explicitly label a lower bound; never present the first page size as the total. Keep View All available whenever results exist, even when three or fewer exist, because it provides a readable table. For zero results, the footer can offer Open calendar instead. Empty copy is No upcoming or ongoing Opportunity meetings today, with a concise scope explanation available. Never say Your calendar is clear: other events are intentionally excluded.

## 6 View All experience

View All opens homepageViewAllMeetings in list mode, on the originating date. The title is My Meetings, with Today, Tomorrow, and Calendar tabs, an explicit date heading, display timezone, refresh, and a platform-supported close control. Today and Tomorrow each show only their own local calendar day and only meetings whose EndDateTime is still in the future. A date opened from the mini month appears as a selected-date agenda within Calendar, rather than being mislabeled Today.

Use a large LightningModal. Respect its supported sizing rather than overriding private platform DOM. The table body scrolls within the modal; keep the header and essential controls available. On narrow containers, replace the table with inline cards using the same visual contract and a Load more action. Do not create horizontal page overflow to preserve a desktop table.

| Column | Contents |
|---|---|
| Start time | Local start and end, All day where appropriate; full date in date heading |
| Subject | Event link, up to two lines, temporal or Rescheduling label when useful |
| Attendees | Known participant summary with accessible overflow and completeness state |
| Related to | Opportunity link; full name available in detail |
| Category and topic | Two labeled values; meaningful null and access states |
| Action | Open Impact Assessment with the same configuration behavior as cards |

Start-time ascending is the default sort; all-day rows appear first. Permit ascending/descending start-time sorting when the full selected-day set is loaded. Search this day searches permitted loaded subject, Opportunity, topic, category, and known attendee names. While incomplete, label it Search loaded meetings and retain Load more; do not claim a global or exhaustive search. Search is local and cannot resurrect expired records. Expiry also applies while a search, attendee disclosure, or detail region is open.

Provide a count, completeness state, and explicit Load more or Retry. A successful page is not proof of a complete day. Load initial pages automatically within the budget in section 12, then require continuation if needed. Sticky table headers, correct column labels, and visible focus are required. Use a native semantic table with SLDS styling, native links/buttons, and inline attendee disclosure. Do not add a custom datatable-type bundle or force unsupported custom content into standard cells.

Do not open a second modal over the first for attendees or detail. Use an inline disclosure or a detail region within the same dialog. Escape closes a local disclosure before closing the dialog. Return from detail restores the row and scroll position. Manage Meetings remains available in the expanded header or action area.

## 7 Calendar experience

The compact Calendar tab is a six-row month picker, not a squeezed week grid. It shows month/year, previous/next, Today, weekday labels, a distinct today marker, a selected-date marker, and meeting dots. Use one to three dots, where three means three or more; accessible names provide an exact count only after complete loading. Blank indicators during loading do not mean no meetings.

Below the month, show the selected date and up to the configured maximum of inline meeting cards, with View all for this date and Expand calendar. This can be taller than the agenda tabs. For a constrained homepage, configure one selected-day preview card; full details remain in expansion. Do not compress date targets or mandatory field text to force the month into the original empty-state height.

Expanded Calendar provides Week, Workweek, Month, and Agenda. Workweek defaults to Monday to Friday unless the project’s locale or business configuration establishes otherwise. Week always exposes weekend meetings. Month provides titles, dates, and +N more overflow. Week uses a time grid, separate all-day lane, overlap columns, and a subtle current-time line. The entire 24-hour day must remain reachable; an initial scroll position at 08:00 is not a data filter.

Calendar is a view of eligible meetings that have not ended, not an in-component history browser. Past date cells are normally empty; an ongoing multi-day meeting can still intersect a past date and remain eligible because its end has not passed. Explain the scope as Only meetings that have not ended. Request the actual visible date span, including adjacent-month days in the month grid. A week view uses the locale’s first weekday. Navigation changes the range; selection changes the detail/agenda. Preserve selected date across mode changes. Detail shows the same required fields and action as the card, full date/time, duration if known, and Open event. There is no drag, resize, creation, or edit interaction in this release.

Below about 760 px available content width, prefer Agenda over a seven-column time grid. A docked detail area is allowed only when at least 720 px remains for the calendar itself; otherwise replace the body with detail and a Back action. Use container measurements, not browser width alone.

For expanded rendering, evaluate a maintained calendar library such as FullCalendar against the org’s LWS, CSP, accessibility, bundle size, and license requirements. Pin a verified version as a Salesforce static resource and lazy-load it on expansion. Do not fetch scripts from a runtime CDN. Do not assume an older library version is current or a commercial scheduler license is included. A failed library spike requires a documented accessible custom reader or staged delivery, not an untested production dependency. The mini month belongs inside homepageCalendarMeetings with its tested date-grid model; it is not a separate bundle. [S19, S20]

## 8 Attendees and the Salesforce Name field

WhoId and its Who relationship represent the primary related person; they do not establish the complete attendee list. Owner is not automatically organizer. Related contacts are not automatically invited attendees, and a participant record does not prove acceptance. These distinctions matter when the business requests multiple names.

Discover the actual source in the target org: EventRelation, EventWhoRelation, another supported child relationship, and the org’s Shared Activities behavior. Verify both semantics and GraphQL availability. An object appearing in the general REST object reference does not establish UI API GraphQL support. Introspection, a bounded real query, and comparison with native Event attendees are required. EventRelation and EventWhoRelation support has not been proven for this project. [S03, S21, S28, S29]

Preferred implementation batches participant reads for the visible Event IDs, using a supported GraphQL connection or object. Fetch the attendee subset rather than every relationship to the Event. Paginate the relation connection independently. Deduplicate by verified participant identity, not display name. Preserve distinction among contact, lead, internal user, and other supported types. Do not invent unknown email identities, RSVP states, or external attendees that the source does not expose.

At 360 px, show the first known attendee as a quiet name chip or text link, followed by +N when the remaining distinct count is exact. At wider widths, allow two names. Name order is deterministic, using a verified primary attendee first, then localized name order with identity as tie-breaker. Initials are optional; photographs and a new avatar service are unnecessary. Long names truncate accessibly without pushing the overflow control offscreen.

Clicking +N reveals an accessible list of all loaded attendees within the current surface. Each readable person record may be linked. If more participant pages exist, provide Load more attendees and say More attendees rather than inventing N. Distinguish complete, partial, unavailable, and loading states. A complete empty attendee list says No attendees recorded.

If full attendees cannot be read through GraphQL, show the verified primary person as Primary contact, followed by Full attendee list unavailable and Open event. Do not label that person as the entire attendee list. This is a degraded mode requiring explicit business acceptance before release; multiple-attendee support remains unmet. Do not silently introduce Apex or REST attendee reads. Where the primary person is not a contact, use Primary related person instead of mislabeling their type.

## 9 Timezone and date rules

Default to the seller’s Salesforce user timezone, obtained through the appropriate Salesforce internationalization module for the Lightning context. Browser or operating-system timezone must not silently control this component. Use the user’s locale for date formatting and 12/24-hour conventions. Display a concise timezone label near the date, with its IANA identifier available in detail. Avoid ambiguous numeric dates like 3/11/2026; use 11 Mar 2026 or the locale’s equivalent. [S22]

Salesforce DateTime values represent instants. Parse their explicit UTC/offset values and format them in the seller’s zone. The timezone in which the organizer originally entered a meeting cannot be recovered from StartDateTime alone. If no verified source field stores it, do not invent Meeting timezone or convert using the organizer’s current User timezone. If an existing reliable field is later mapped, show the original scheduled zone secondarily in detail; the seller’s zone still governs tab membership.

Today is the seller’s current calendar date. Tomorrow is the next calendar date, including weekends. Compute the UTC instant corresponding to local midnight at each boundary independently; do not calculate tomorrow by adding 24 hours. A day may be 23 or 25 hours during daylight-saving transitions. Use an approved existing timezone utility or a pinned, tested library through the project’s supported packaging. Browser Intl formats instants but does not itself provide a complete arbitrary-zone midnight constructor. Do not write an untested offset guessing loop.

A timed meeting overlaps a day when start is before the day’s exclusive end and end is after its start. A meeting ending exactly at midnight belongs to the previous day only. A zero-duration event can appear before its scheduled instant but is expired at that instant because start equals end. Its date membership uses its start; handle a supported point-event branch without bypassing the strict end-after-now gate. A missing, inaccessible, or invalid EndDateTime prevents proof of the mandatory expiry rule: exclude that record and mark the affected result incomplete/unavailable as appropriate. Never invent a duration or use StartDateTime alone to decide expiry. A cross-midnight event appears on each intersected day, with a continuation label and full date range in detail. Count it once per day, and once by Event occurrence identity in a multi-day unique total.

All-day events are calendar dates, not midnight appointments in the seller’s timezone. Keep an explicit date-only start and exclusive end in the domain model. Verify Salesforce ActivityDate and end-field semantics with native examples, including multi-day all-day events, before normalizing. Never pass a date-only string through browser-local Date parsing and shift it across timezones. The all-day query may need its own date predicate; it must retain the same status, Opportunity, record-type, personal-scope, and EndDateTime-after-now filters. Expiry uses the actual stored EndDateTime instant even though its visual date span is date-only. Reconcile that stored end with native all-day examples; do not silently replace it with seller-local midnight.

On midnight, browser wake, and return to a stale visible tab, recalculate the seller’s date and refresh the active range. A minute timer updates In progress or Starts in 10 min locally and must not trigger minute-by-minute queries. Stop timers when hidden or disconnected. For repeated DST hours, distinguish both instants with explicit offset in the ambiguous time label. Do not use an ambiguous abbreviation such as CST by itself. Half-hour and quarter-hour offsets must work.

P0 needs one display timezone. A persistent timezone switcher, multiple parallel axes, timezone preferences database, and travel detection are not necessary. A secondary timezone is a later feature only if sellers demonstrate the need.

### 9.1 Exact expiry while the page stays open

The eligibility rule is Date.parse(event.EndDateTime.value) > nowMs. Equality is excluded. A meeting ending at 10:30:00 is visible at 10:29:59.999 if it meets the other filters, and absent at 10:30:00.000 or later. Timezones change formatting, not this comparison of instants. Start time does not determine completion; an in-progress meeting remains until its end.

Use two layers. Each GraphQL query adds EndDateTime > $asOf to reject records already expired when loading. Set queryAsOf once when starting a range load, manual refresh, or stale/wake revalidation, then keep it fixed throughout that pagination cycle. Each data emission is also filtered against the current device instant before rendering, so a meeting ending during a slow response never flashes onscreen. Never compute new Date() or Date.now() inside a reactive GraphQL variables getter, and never bind a ticking UI clock to $asOf.

After a successful emission or local expiry, schedule one local timeout for the earliest end among loaded unexpired meetings. Cap the wait at 60 seconds to recheck after clock changes and integrate any existing minute-label/midnight scheduler rather than running competing timers. On callback, read Date.now(), remove every record now expired, recalculate cards/counts/dots/overflow/search/detail, and schedule the next check. This callback does not issue a Salesforce query merely because time passed. Clear it on disconnect or when the surface is inactive. Each of the four data-consuming controllers applies this same tested algorithm; only the mounted surface owns an active expiry timer.

Browser timers can be delayed by sleep, background throttling, or a busy main thread. On visibilitychange to visible, focus, and pageshow, immediately reapply local expiry before any asynchronous refresh. This ensures stale meetings do not remain when the user returns. A browser cannot guarantee a paint at the exact millisecond, but the first evaluation/render at or after the end must exclude the record, with no intentional grace period. Use the managed device clock; an incorrectly set system clock is a limitation, not a reason to add a custom clock-synchronization service.

If an expired meeting owns focus or an open detail/disclosure, close its content, move focus to a stable day heading or next valid control, and announce Meeting ended and was removed once. Do not announce every timer tick. Decrement exact counts only from a complete loaded scope; retain partial labels when pages remain. If all meetings expire, render the scoped empty state and no stale action button. Recheck the expiry predicate immediately before an Impact Assessment action or meeting-detail opening as well, guarding the boundary between an old render and a click. An already opened external page is outside this component’s control.

## 10 GraphQL feasibility and hard gates

Use `lightning/graphql`, importing gql and graphql together into each consuming controller, with reactive variables and the returned refresh function. Pin the component metadata API version to a version actually supported and tested in the company org. If the existing project uses lightning/uiGraphQLApi, inspect its reason and verify v2 availability before choosing the adapter; do not mix v1 and v2 imports or refresh APIs. The adapter uses LDS and the current user’s object and field permissions. It exposes `errors` plural. It does not currently support Mobile Offline. Scope this release to connected Lightning use. [S02, S05]

Salesforce documents polymorphic filters for What and shows type-specific nested filters. This is the preferred route to filter Event.What to Opportunity and then Opportunity.RecordTypeId in the same query. Salesforce also documents semi-joins over reference fields, including polymorphic references. These are credible implementation routes; neither is certified for this org until the actual Event filter schema is inspected and queried. [S26, S27]

| Capability | Current assessment | Release requirement |
|---|---|---|
| Event reads and custom fields | Supported platform direction; exact schema and release status unverified | Query as ordinary seller and restricted user |
| Status predicate | Straightforward if exposed and filterable | Verify stored values and filter type |
| Opportunity record type predicate | Prefer polymorphic What filter; semi-join alternative | Server must exclude nonqualifying events |
| Multiple attendees | Main unresolved data capability | Prove GraphQL attendee source or disclose unmet requirement |
| Seller-local dates | Feasible in client/domain layer | DST and all-day fixtures pass |
| Full recurrence coverage | Source-dependent | Reconcile current occurrences from older series |
| Impact Assessment | UI and extension contract feasible now | Dynamic URL remains Arun’s integration task |
| Existing dashboard | Configuration-driven navigation | Obtain and validate real dashboard destination |

Do not query every eligible Opportunity in the org and put all IDs in a giant Event filter. Do not fetch unfiltered Events and discard non-Opportunity records client-side as a silent fallback: the user explicitly requested not bringing those events. A bounded candidate-fetch fallback would change that requirement and is therefore not authorized by this specification. If neither a polymorphic filter nor a supported semi-join works, report the exact schema error and leave the live data integration blocked while continuing isolated UI work.

Required gate evidence is a sanitized capability report with API version, Event filter type, What filter shape, available relationship union types, record-type metadata mapping, status values, mandatory custom field access, attendee coverage, recurrence coverage, all-day convention, and representative-user query outcomes. Tests with Jest fixtures do not prove live Salesforce capability. Do not log raw meeting data in the report.

## 11 Metadata and query contract

Read metadata before compiling production query documents. Activity custom fields are expected on Event as Status__c, Topic__c, and Interaction_Category__c; verify namespace prefixes and access. Do not query an invented generic Activity connection. GraphQL objectInfos can expose object, field, record-type, and supported picklist metadata; picklist metadata availability is API-version dependent. Prefer this route where supported. Existing project metadata tooling may provide build-time mappings without changing the GraphQL-only meeting-read rule. [S30]

Resolve the two Opportunity record types by the supplied labels during discovery, verify actual DeveloperNames, and persist a reviewed mapping in the project’s configuration. At runtime use org-specific IDs resolved by supported metadata, or a verified DeveloperName relationship filter. A record type being unavailable for creation does not mean existing records of that type must be excluded from reads. Never derive names by replacing spaces with underscores.

The following remains a candidate timed-event query, not drop-in certified code. After validating it, place its gql declaration directly in homepageTodaysMeeting.js, homepageTomorrowMeetings.js, homepageViewAllMeetings.js, and homepageCalendarMeetings.js as appropriate. Do not save it in a separate queries LWC or import it from a data-service bundle. Introspection must confirm every field, scalar, filter, orderBy field, and inline-fragment type. It intentionally excludes all-day events, which require their verified date query. It illustrates an owned-only scope assumption; invited coverage must be resolved separately. [S03, S04, S26]

```graphql
query HomepageTimedMeetings(
  $sellerId: ID!
  $recordTypeIds: [ID!]!
  $rangeStart: DateTime!
  $rangeEnd: DateTime!
  $asOf: DateTime!
  $after: String
) {
  uiapi {
    query {
      Event(
        first: 100
        after: $after
        where: {
          and: [
            { OwnerId: { eq: $sellerId } }
            { Status__c: { in: ["Scheduled", "Rescheduling"] } }
            { IsAllDayEvent: { eq: false } }
            { What: { Opportunity: {
                RecordTypeId: { in: $recordTypeIds }
            } } }
            { StartDateTime: { lt: { value: $rangeEnd } } }
            { EndDateTime: { gt: { value: $rangeStart } } }
            { EndDateTime: { gt: { value: $asOf } } }
          ]
        }
        orderBy: { StartDateTime: { order: ASC } }
      ) {
        edges {
          cursor
          node {
            Id
            Subject { value }
            StartDateTime { value }
            EndDateTime { value }
            IsAllDayEvent { value }
            Status__c { value }
            Topic__c { value }
            Interaction_Category__c { value }
            WhatId { value }
            WhoId { value }
            What {
              ... on Opportunity {
                Id
                Name { value }
                RecordTypeId { value }
              }
            }
          }
        }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
}
```

Exclude invalid/missing end instants, and add supported zero-duration handling explicitly if fixtures require it; the sample’s strict overlap branch alone does not cover those records. Resolve picklist display labels with supported returned metadata/label fields. Use stored values for eligibility. The primary Who name and attendee enrichment are separate schema-validated selections; their absence from this sample is not a claim that WhoId is sufficient.

If the polymorphic predicate is unavailable but the reference semi-join is supported, validate this replacement predicate in isolation, with all other filters retained:

```graphql
WhatId: {
  inq: {
    Opportunity: { RecordTypeId: { in: $recordTypeIds } }
    ApiName: "Id"
  }
}
```

Respect semi-join restrictions, including combinations with OR and other joins, rather than mechanically composing arbitrary predicates. Do not nest an additional record-type semi-join unnecessarily when resolved record-type IDs suffice. All queries remain bounded by date and personal scope, and every timed, all-day, or alternative Event selection retains the strict end-after-asOf gate. Attendee relation reads are bounded to eligible Event IDs; ignore enrichment for a meeting that has since expired. Do not invent an EndDateTime field on a relation object. Use variables for dates, IDs, and cursors, never interpolated user text. Optional field directives are permitted only if supported by the pinned API; they do not make missing filter fields or unsupported objects safe. [S08, S27]

### 11.1 Controller wiring requirements

In each data-consuming controller, import LightningElement or the required LightningModal base, wire and api as needed from lwc, and gql/graphql from lightning/graphql. Use a named static gql document at controller module scope. The class has a query getter that returns that document when ready, a variables getter with every required variable populated, and a wired response method using @wire(graphql, { query: '$activeQuery', variables: '$queryVariables' }). The exact getter names can differ, but all pieces stay in this file.

The response handler consumes data, errors, and refresh. Capture the callable refresh reference for the current wire result; normalize permitted data without mutating the payload and exclude expired records at response-processing time. Initial undefined data is loading, not zero meetings. Do not write await graphql(...), await gql(...), refreshApex on a GraphQL wire, or refreshGraphQL from v1 against a v2 response. For a justified v1 implementation, use the v1-specific documented contract throughout and do not rely on v2-only features. This change is an org compatibility decision that must be documented, not an automatic fallback. [S02, S34]

Getters are pure: no cursor changes, requests, normalization side effects, timers, or state assignments from getters or renderedCallback. Pagination changes variables in an explicit controller method and deduplicates repeated emissions. Keep separate state for timed/all-day/attendee connections. Do not add an undefined optional attendee selection to the mandatory base query and then swallow its failure. Avoid dynamically interpolated field names and fragments until the static query works in the target org.

Validate one minimal Event query with the mandatory business filters first, then add each required display field and primary person selection, then the proven attendee relationship. Add required conditions incrementally to locate a failure, but the deployed production query always retains every mandatory filter. A probe without mandatory filters may inspect schema; it must never feed the seller UI. Record the actual GraphQL validation error before changing syntax.

## 12 Pagination refresh and coverage

Each mounted agenda child loads only its own seller-local day. View All loads its selected day independently in its own controller. Calendar loads only its visible span. No separate data component is involved. Use cursor pagination and deduplicate repeated wire emissions by Event occurrence identity. Page size 100 is an initial tuning value, not a total limit. The three-card limit is applied after eligibility, normalization, and compact selection, not as `first: 3` on an incomplete query. [S07]

Automatically load up to an initial safety budget of 1,000 Event records per active range, with no more than two independent connections in flight. This is a configurable client budget, not a Salesforce platform limit. Stop with explicit partial status and Continue loading if more records exist. Do not silently truncate. Retain distinct completeness for Event results, all-day results, and attendee enrichment. Exact meeting counts require the Event scope to be complete; exact attendee counts require their relation scope to be complete.

Use an active range/request generation to ignore late responses after navigation. Key data by user, zone, date range, scope/configuration version, and query shape. Merge pages by ID; preserve deterministic ordering with a stable identity tie-breaker. Refresh advances queryAsOf, resets cursors, re-evaluates membership, and replaces the range result after a successful consistent reload. Cached individual record updates do not guarantee the membership of the original filtered collection has been recalculated. [S06]

Manual refresh preserves current tab, date, search, and mode where possible. A record moved to a different date, switched to an excluded status, reassigned, relinked, or deleted must disappear after refresh. An inserted matching event must appear. Do not poll the full calendar on a minute timer. Resume refresh on visibility when the existing data is older than a configurable initial five-minute threshold, plus mandatory local-day rollover handling. Refresh reads Salesforce; it does not force Outlook, Google, or Einstein Activity Capture synchronization. [S13]

Do not drop all IsChild records, deduplicate by subject/time, or expand recurring masters into guessed occurrences. Validate owned and invited copies, materialized recurrence, rescheduled exceptions, deleted occurrences, and current meetings from series created long ago. If GraphQL returns only a master without a supported way to enumerate the required occurrences, recurrence coverage is a blocker, not a reason to silently invent RRULE logic.

## 13 Normalized data and component APIs

Each consuming controller normalizes its own GraphQL nodes before rendering, using the same tested mapping. Templates do not navigate deeply through wire payloads. Mandatory eligibility remains in every server query. The following is a logical contract; use the project’s JavaScript conventions rather than introducing TypeScript solely for this feature.

```text
Meeting
  key, eventId, subject, statusValue
  startInstant, endInstant, isAllDay
  startDateOnly, endDateExclusive
  opportunity: id, name, recordTypeId
  topic: value, label, availability
  category: value, label, availability
  primaryPerson: id, name, objectApiName, availability
  attendees: items[], completeness, exactCountOrNull
  timeQuality, sourceCoverage

RangeResult
  key, startDate, endDateExclusive, displayZone
  meetings[], completeness, hasMore, queryAsOf
  eventErrors[], enrichmentErrors[], lastCheckedAt
```

Availability differentiates value, empty, and unavailable. Range completeness differentiates loading, partial, complete, and failed. Do not serialize these records into localStorage or sessionStorage. User view preferences may be retained under a namespaced key without meeting content.

Today and Tomorrow accept scopeConfig, displayZone, maxVisibleMeetings, and integrationConfig as immutable @api inputs. They compute their own date and own their records, loading state, GraphQL errors, cursors, and refresh reference. They expose an @api refreshMeetings() method to the parent and emit summarychange with dateKey, exactCountOrNull, completeness, and lastCheckedAt. summarychange must not carry raw GraphQL responses.

View All receives initialDate, initialMode, scopeConfig, displayZone, and integrationConfig through .open(). It owns its table data and pagination; these open arguments are not live bindings. Calendar accepts displayMode (compact or expanded), selectedDate, initialView, scopeConfig, displayZone, and integrationConfig. It owns its range data and exposes refreshMeetings(). Its datechange event reports selection to the direct owner; its viewall or expand request is handled by the homepage parent or by the already-open modal, never by importing that owner.

Use viewall, expand, datechange, summarychange, and requestnavigation as narrowly scoped user intents. The direct parent binds an explicit handler; no unbounded bubbles/composed events or cross-page message bus. IDs and dates are event payloads, not HTML, DOM objects, or function callbacks. The modal handles Calendar navigation requests by returning a close result to its launcher. A stable event/Opportunity identity accompanies every preparation action regardless of surface.

## 14 Action and configuration contracts

### 14.1 Open Impact Assessment

Implement a small controller method resolveImpactAssessmentUrl({ eventId, opportunityId }) returning a string or null. Default to null until Arun supplies the dynamic link. The four consuming controllers declare this method locally, using the same contract and any permitted integrationConfig properties. Do not create a resolver LWC, import the parent controller into children, or pass functions through LightningModal.open(). Document the four method locations for Arun’s later integration; consistency tests cover the Event and Opportunity arguments.

Cards and rows render Open Impact Assessment disabled with Setup pending when the local resolver returns null. Once configured, prefer a validated anchor styled as the action with target=_blank and rel=noopener noreferrer. The modal opens the external link directly from the user’s click and remains open; it does not need custom modal event forwarding. Do not invent URL parameter names, deck IDs, authentication, or a custom Event URL field. The initial release intentionally includes the extension point rather than an invented external integration.

Require HTTPS for external URLs, no embedded credentials, and an administrator-reviewed exact host or true subdomain allowlist. Build parameters later with URL and URLSearchParams; never concatenate unencoded record values. Do not include attendee names, emails, or sensitive meeting text in the link unless the integration explicitly requires them. Open only on user action, in a new tab with noopener and noreferrer. An unconfigured or rejected URL leaves the button disabled with an honest explanatory message. Technical inability to build the URL is not evidence that no assessments exist.

### 14.2 Manage Meetings

Expose a `manageMeetingsUrl` configuration property or use the existing homepage configuration mechanism. Supply the actual existing dashboard URL at deployment. Use the project’s supported Salesforce navigation pattern; a verified relative Salesforce route or same-org HTTPS URL is acceptable. Do not guess a Dashboard record ID or assume a particular dashboard page-reference type without testing it. A new tab preserves the seller’s homepage context; label that behavior accessibly. If no destination is configured, show a disabled action with Dashboard link not configured rather than a broken link.

### 14.3 Configuration boundaries

The existing container passes maximum visible cards, dashboard destination, display options, and feature flag using its established conventions. Validate maxVisibleMeetings to 1–3. Keep reviewed business configuration in homepageMyMeetings.js or the project’s existing configuration path and pass immutable values down; end users cannot broaden the predicates to all Events. Keep static query text local to each consuming controller. Required field API names are explicit constants. Resolve record type IDs per org. Keep the local URL resolver methods within the five-bundle boundary; do not add an integration utility bundle. No new Custom Metadata object is required unless the project already uses a supported configuration path.

## 15 Accessibility and security

Target WCAG 2.2 AA for the custom experience. Use platform base components where they fit: tab behavior, buttons, tooltips, icons, and LightningModal. Test keyboard navigation, visible focus, screen reader announcements, 200 percent zoom, reduced motion, and effective 320 px content width. Calendar date navigation follows an established accessible grid pattern with arrow keys, Home/End, Page Up/Down, and Enter/Space selection. Provide a full date and truthful count in each date’s accessible name. Agenda is the equivalent accessible calendar representation. [S24]

Use text as well as color for selected date, today, Rescheduling, In progress, overlap, and errors. No essential hover-only information. Attendee overflow is a button with expanded state and keyboard-reachable contents. Close local disclosures before the modal, restore focus, and do not trap focus outside the active dialog. Do not announce a countdown every minute.

All record text is untrusted. Use escaped templates or supported formatted components; never insert subject, participant, or Opportunity strings through innerHTML. Enforce platform sharing, CRUD, and FLS through the current-user GraphQL context. Do not use elevated credentials or expose hidden names through counts, search, tooltip, telemetry, or cached snapshots. A denied Opportunity relationship means the event cannot be verified against mandatory eligibility and must not render.

P0 performs no Event writes. Do not attach updateRecord to drag callbacks, implement RSVP writes, or create Tasks as a surprise feature. External actions require clicks and the validated URL contract. Log sanitized error categories and timings rather than meeting subjects, participant names, URLs, or sensitive GraphQL payloads.

## 16 Small enhancements and later scope

The useful surprises should save a seller time without requiring another backend or inventing business conclusions.

| Enhancement | Release | Boundaries |
|---|---|---|
| Next and In progress labels | P0 | Derived from verified times in seller zone; no minute query |
| Rescheduling badge | P0 | Driven only by Status__c, not timing guesses |
| Context preserved on expansion | P0 | Same day, filters, and return focus |
| Search within the day or range | P0 | Clearly label partial loaded-data search |
| Overlap hint | P1 | Only among loaded eligible meetings; never claim full availability |
| Copy meeting summary | P1 | User-triggered plain text with permitted fields; no automatic sharing |
| Native Meeting Digest link | P1 | Enable only if useful and available in the org |
| Secondary timezone | Later | Add only after a concrete seller need is validated |
| Join link | Later | Requires a real verified source and URL validation |
| Create edit drag invitations sync | Separate scope | Requires write, recurrence, provider, and permission contracts |

A safe overlap label is Overlaps another Opportunity meeting shown here. Do not use Free time, No conflicts, or Calendar clear when the component deliberately excludes other meetings. Preparation completeness scores, AI summaries, risk scores, and attendee acceptance indicators are not inferred from the six requested fields.

## 17 Product research and native Salesforce gaps

There is no objective world’s best designed calendar. For this CRM homepage, Fantastical is the strongest compact agenda-to-calendar interaction reference; Apple Calendar is a useful reference for restraint and temporal clarity; Notion Calendar is useful for contextual detail and fast navigation. This is a design judgment based on public product materials, not a comparative usability study or award claim. Google Calendar provides a familiar model for week grids and scheduling conventions; Morgen suggests later connections between preparation tasks and time planning. [S14–S18]

Salesforce already provides day, week, month, and table views, previews, coworker calendars, public/resource calendars, and printable views. Object calendars can display Opportunity business dates. These are not missing features. Meeting Digest already supplies meeting context and preparation/follow-up capabilities in supported configurations. The opportunity here is a precise, consistently filtered homepage experience connected to this company’s Impact Assessment workflow. [S09, S11, S12]

| Documented native limitation or workflow gap | Proposed benefit |
|---|---|
| Native Calendar does not offer hiding weekends in the documented view | Workweek plus full Week, with weekends always reachable |
| Preview fields and other-user/public/resource details are limited | Consistent permitted Opportunity, category, topic, and attendee context |
| Native view has configuration-dependent item display limits | Explicit pagination and truthful completeness rather than silent omission |
| Object-calendar filter/sharing restrictions | One deployed and maintained business predicate for the pilot |
| Narrow homepage lacks full calendar space | Compact agendas and month navigation with purposeful expansion |
| Company-specific assessment preparation requires another tool | Stable Opportunity-aware action beside each eligible meeting |

The native limitations above were reviewed on 17 September against S10 and S11; confirm them against the target org’s release before describing them in launch materials. Native item limits vary, including documented 150/500 behavior; do not advertise a universal 150 limit or that this component is unlimited. Consistent pagination is a correctness requirement, not an excuse to query unbounded history.

## 18 States performance and operations

Initial loading preserves header and tab geometry and shows skeleton cards. A complete empty day shows the scoped empty message. A failed query shows Could not load meetings with Retry. A refresh failure preserves last known permitted results with Could not refresh and last-checked time. Unsupported configuration or mandatory field access shows a specific unavailable message, without raw schema internals in the seller UI. Participant enrichment errors do not erase otherwise valid meetings; they change attendee completeness.

GraphQL may return data and errors together. Classify errors by required eligibility, required display data, and optional enrichment. Never mark the affected range complete merely because some records arrived. Suppress records whose eligibility cannot be verified. Preserve verified records with a visible partial state when the response supports doing so safely.

Initial performance targets, to measure rather than claim achieved: warm useful agenda within 1.5 seconds and cold within 3 seconds at p95 on an agreed test network; cached tab content becoming useful within 200 ms where LDS has matching data; no expanded calendar library in the initial homepage bundle path. Avoid one participant query per card. Enrich visible cards in batches and hydrate more rows on demand. Pin dependencies, release timers/listeners/renderer instances, and measure repeated open/close behavior.

Use existing telemetry only. Suggested measurements are load duration, query/page count, partial/error category, View All use, calendar expansion, and action click. Exclude record content and full external URLs. A feature flag in the existing container permits rollback without a data migration.

## 19 Acceptance criteria

| ID | Scenario | Required result |
|---|---|---|
| A01 | Component creation | Exactly the five named feature bundles; homepageMyMeetings embedded once in existing homepageContainer |
| A02 | Local query ownership | Each selected tab queries in its own controller; inactive tabs do not run; no query/service bundle |
| A03 | Status values | Scheduled and Rescheduling included; all other values excluded using verified API values |
| A04 | Related record | Only the two Opportunity record types; Account, null, other objects/types excluded server-side |
| A05 | Personal scope | Agreed owner/invitee fixtures reconcile; no broadening to all visible events |
| A06 | Required fields | Subject, time, topic, Opportunity, people, and category present with correct null/access states |
| A07 | Card limit | 0, 1, 2, 3, 4, and 8 events never show more than configured maximum of three |
| A08 | Today selection | Only unexpired in-progress/upcoming/all-day meetings; next loaded record fills an expired card’s slot |
| A09 | Counts | Exact only after complete eligibility scope; three cards may correctly accompany total eight |
| A10 | Impact action | Same Event/Opportunity IDs across surfaces; null resolver is disabled, valid link opens once |
| A11 | Management | Actual configured dashboard opens; missing destination is honest and nonclickable |
| A12 | View All | Origin day preserved; only unexpired records through continuation; no mixed dates under Today |
| A13 | Attendees | 0, 1, 2, 10, duplicate names, restricted names, and paginated people handled without invented counts |
| A14 | Attendee fallback | Primary person never mislabeled full attendees; unmet requirement clearly reported |
| A15 | Timezone | Seller in Kolkata, browser in New York, event entered elsewhere still assigned/displayed correctly |
| A16 | DST | New York spring/fall transitions and repeated hour labels pass; no fixed 24-hour bounds |
| A17 | Date edges | Strict expiry with midnight/cross-midnight/zero-duration fixtures; invalid end excluded; quarter-hour zone passes |
| A18 | All-day | Date-only single/multi-day meetings match native display in positive and negative offsets |
| A19 | Recurrence | Old series with current occurrence, exceptions, child copies, and cancellations reconcile |
| A20 | Pagination | More than 100 and 1,000 records remain reachable with truthful partial state and no duplicates |
| A21 | Refresh | Moved, relinked, retyped, status-changed, deleted, and new Events update membership |
| A22 | Race and lifecycle | Rapid range changes, close while loading, and repeated expansion do not leak or overwrite state |
| A23 | Calendar | Dates, weekends, overflow, overlaps, selected day, and all-day lane agree with agenda |
| A24 | Access and safety | Ordinary/restricted users, malicious text, and deceptive URLs do not expose or execute content |
| A25 | Accessibility | Keyboard, screen reader, 200 percent zoom, 320 px width, focus restore, and touch targets pass |
| A26 | Data boundary | Controller-local GraphQL reads; no Apex, REST SOQL, query-service import, runtime fixture, or client-filter-only fallback |
| A27 | Incomplete/error | No false empty calendar, exact count, or full attendee claim from partial data |
| A28 | Host fit | Mandatory fields readable, no fourth card, no clipping or compact inner scroll; adjacent home content usable |
| A29 | Status regression | All four query documents use Scheduled and Rescheduling; the superseded misspelling appears in no production predicate |
| A30 | Deployment and console | Five-bundle dependency set validates and runs in the actual org with no missing module or unhandled JavaScript error |
| A31 | Adapter contract | Adapter imports, variables, errors, and refresh match the chosen version; no imperative query-wire invocation |
| A32 | Modal lifecycle | Correct LightningModal base/open pattern, no direct NavigationMixin, Escape and failure restore home |
| A33 | Cross-view parity | Same fixture IDs yield identical eligibility and field mapping across Today, Tomorrow, View All, and Calendar |
| A34 | Existing failed attempt | Reported failures reproduced or explicitly unverified; obsolete feature imports removed without unrelated deletion |
| A35 | Exact expiry boundary | End 10:30 is included at 10:29:59.999 and excluded at 10:30:00.000 and later in all four consumers |
| A36 | Page remains open | Expiry removes meeting, updates counts/dots/rows and promotes next card without periodic GraphQL requests |
| A37 | Sleep or delayed response | Foreground recheck and response-time filtering prevent expired meetings from reappearing |
| A38 | Active detail and click | Expired detail/action disappears accessibly; a boundary-time click rechecks eligibility before opening |
| A39 | Query cutoff stability | Every Event query has strict end-after-asOf; asOf stays fixed across page/timer changes within a load cycle |

Use fake-clock unit tests for exact expiry, timer cleanup, no timer-triggered query variable changes, and foreground rechecks, alongside focused unit tests for temporal boundaries, compact selection, deduplication, completeness, URL validation, and state transitions. Use LWC Jest for properties, events, adapters, and DOM behavior. Use the existing browser test framework in the real Lightning/LWS container for focus, layout, navigation, and renderer lifecycle. Validate actual queries as an ordinary pilot seller and a restricted user; administrator-only success is insufficient. Use authorized sandbox fixtures, never modify real meetings merely to test.

## 20 Implementation sequence and failure prevention

The objective is a successful integrated handoff from one AI work session, with verification during that session. Do not interpret one shot as generating all files before the first compile. No prompt can certify an unseen org. The build agent must produce evidence as it progresses and fix failures at the layer where they occur.

### 20.1 Inspect and diagnose

Read repository guidance, existing homepageContainer, current feature files, package/API versions, and prior deployment/browser/GraphQL errors. Count the existing generated bundles and map their imports before changing them. Distinguish build-time missing-module or template errors, runtime JavaScript errors, GraphQL schema validation, permissions, empty-data filters, and navigation failures. Reproduce the failure when possible; do not claim the separate component was the root cause solely from its filename.

Confirm authorized org aliases and deployment scope. Use the project’s established Salesforce CLI and validation commands. Do not change the default org, authenticate to an unrelated org, retrieve the whole org, or deploy to production just to test. Preserve user modifications and unrelated shared components. Remove or archive obsolete local generated helpers only after checking all references; removal of deployed org metadata needs its own authorized deployment scope.

### 20.2 Prove Today with real filters

Validate Event exposure, status values, Opportunity record-type mapping, personal scope, timezone, and minimum field access. Make one small bounded query work as a pilot seller. Then implement homepageMyMeetings integration and homepageTodaysMeeting with controller-local query/wire. Compile/validate these first and run the actual component in the sandbox. A result of zero must be reconciled against a known eligible Event, not accepted as proof of success.

Inspect LWC compile output and browser console. Use supported simple template expressions, precomputed view-model booleans, stable record keys, and correctly cased folder/import/tag names. Do not assume complex template expressions are enabled merely because an AI model knows newer syntax. Use the actual repo compiler/API support. [S35]

### 20.3 Add Tomorrow and View All

Derive homepageTomorrowMeetings from the proven Today implementation, changing only its date range and selection behavior. Add shared-fixture parity tests. Then implement homepageViewAllMeetings as the one LightningModal bundle, with its own validated controller-local query and cursor pagination. Test the first and subsequent pages, originating date, actions, dismissal, and return focus before adding a calendar engine.

### 20.4 Add Calendar and enrichment

Implement homepageCalendarMeetings with its own local query and compact/expanded rendering. First prove date navigation and Agenda against real Event records; then add Month and the validated Week/Workweek renderer. Complete verified attendee enrichment, strict expiry, all-day/recurrence edge cases, error states, refresh, and midnight handling. These are required release checks, not excuses to silently omit records.

### 20.5 Validate the complete dependency set

Run the project’s lint/compiler checks, focused Jest suite, and Salesforce deployment validation for exactly the five feature bundles plus the necessary homepageContainer edit and approved resources/metadata. Confirm actual org rendering, a real matching Event in Today or Tomorrow, more-than-three View All behavior, record navigation, Calendar date consistency, and ordinary/restricted-user access. Report the command outcomes and separate deployment success from browser and query success.

Deliver source, metadata, tests, sanitized query/schema evidence, a precise five-bundle manifest, configuration instructions, screenshots, performance observations, and remaining limitations. Record whether the prior error was reproduced and fixed. If org access or failed source is unavailable, finish all verifiable work and name the missing validation; do not fabricate a successful deployment or include runtime mock data.

## 21 Decisions still requiring org information

| Input | Default or next step |
|---|---|
| Personal ownership/invitation scope | Proposed OwnerId current user; validate whether invitee coverage is required |
| Exact record-type identity | Resolve the supplied labels to actual org IDs and verified DeveloperNames |
| Status API values | Confirm Scheduled and Rescheduling without silent spelling changes |
| Attendee source | Prove GraphQL relation availability and business semantics |
| Existing dashboard | Supply actual destination through existing configuration |
| External integration | Arun implements URL resolver later; default returns null |
| Real homepage dimensions | Measure and choose two or three cards without hiding mandatory content |
| Event support and recurrence | Confirm target release policy and representative source coverage |

These are discovery/configuration tasks, not reasons to invent missing metadata or stop all useful UI work. Attendee support and server-side eligibility can become genuine release blockers under the GraphQL-only constraint. Dashboard and Impact Assessment actions remain explicitly unconfigured until their destinations are supplied.

## 22 Definition of done

The release is complete when exactly the five named bundles work inside the existing container, all four consuming controllers own their GraphQL correctly and remove meetings at EndDateTime, business eligibility is enforced server-side, all required fields and actions have correct states, the selected-day View All and calendar agree, timezone/recurrence cases reconcile, and applicable acceptance criteria pass under representative permissions. Full multiple-attendee support must either be proven or recorded as an unmet requirement with an explicitly accepted reduced scope.

A fixture-only demonstration is not a live integration. A primary-contact chip is not complete attendee support. A three-record response is not a full-day count. A visually polished calendar cannot override these data requirements. The handoff must name any remaining unconfigured actions and capability limits without claiming completion of them.

## 23 AI implementation handoff

Use My_Meetings_AI_Build_Prompt.md with this specification and the three screenshots. Version 3 supersedes all earlier component, status, and elapsed-meeting instructions. Use exactly the five named bundles and controller-local GraphQL; Today and Tomorrow are separate tab components. Latest explicit user instructions govern conflicts; otherwise follow this specification and report discrepancies without silently reducing mandatory scope.

## 24 Research sources

Platform pages S02–S04, S23, and S25–S27/S30 were retrieved directly on 22 September 2026. S01 and S05–S22/S24 retain the 17 September review. S28/S29 are object-reference pointers whose current rendered contents were not retrieved in this update; they do not prove GraphQL support. S31–S35 and the adapter/modal pages were also checked for Version 3. All target-org claims remain subject to schema and user validation.

S01 · Salesforce UI API All Supported Objects. Event and Task were visible in the current rendered list; the page also cautions that the list can lag support. https://developer.salesforce.com/docs/atlas.en-us.uiapi.meta/uiapi/ui_api_all_supported_objects.htm

S02 · Salesforce lightning graphql adapter reference. https://developer.salesforce.com/docs/platform/lwc/guide/reference-graphql-wire.html

S03 · Salesforce GraphQL Query Objects. https://developer.salesforce.com/docs/platform/graphql/guide/query-record-objects.html

S04 · Salesforce GraphQL Field Operators. https://developer.salesforce.com/docs/platform/graphql/guide/filter-fields.html

S05 · Salesforce GraphQL Wire Adapter Limitations. https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-limitations.html

S06 · Salesforce Update Cached Query Results. https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-refresh.html

S07 · Salesforce Paginate Results. https://developer.salesforce.com/docs/platform/graphql/guide/paginate.html

S08 · Salesforce GraphQL Query Limitations. https://developer.salesforce.com/docs/platform/graphql/guide/query-limits.html

S09 · Salesforce Calendar Views in Lightning Experience. https://help.salesforce.com/s/articleView?id=sales.activities_using_calendar_icons_lex.htm&language=en_US&type=5

S10 · Salesforce Considerations for Using Calendars in Lightning Experience. https://help.salesforce.com/s/articleView?id=sales.creating_calendars_lex.htm&language=en_US&type=5

S11 · Salesforce Considerations for Calendars Created from a Salesforce Object. https://help.salesforce.com/s/articleView?id=sales.calendar_create_limitations.htm&language=en_US&type=5

S12 · Salesforce Meeting Preparation and Follow Up with Meeting Digest. https://help.salesforce.com/s/articleView?id=sales.meetings_use_digest_parent.htm&language=en_US&type=5

S13 · Salesforce How Events Sync with Einstein Activity Capture. https://help.salesforce.com/s/articleView?id=sales.aac_event_sync_how_it_works.htm&language=en_US&type=5

S14 · Apple Calendar User Guide for Mac. https://support.apple.com/en-euro/guide/calendar/welcome/mac

S15 · Google Calendar product overview. https://workspace.google.com/products/calendar/

S16 · Fantastical product overview. https://flexibits.com/fantastical

S17 · Notion Calendar product overview. https://www.notion.com/product/calendar

S18 · Morgen product overview. https://www.morgen.so/

S19 · FullCalendar documentation and license. https://fullcalendar.io/docs and https://fullcalendar.io/license

S20 · Salesforce Use Third Party JavaScript Libraries. https://developer.salesforce.com/docs/platform/lwc/guide/js-third-party-library.html

S21 · Salesforce Event Object Reference. Field semantics were reviewed in the rendered documentation. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_event.htm

S22 · Salesforce scoped module reference including user and internationalization imports. https://developer.salesforce.com/docs/platform/lwc/guide/reference-salesforce-modules.html

S23 · Salesforce Lightning Modal reference. https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-modal.html

S24 · W3C WAI ARIA Date Picker Dialog Example. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/

S25 · Salesforce Compose Components. https://developer.salesforce.com/docs/platform/lwc/guide/create-components-compose.html

S26 · Salesforce Polymorphic Relationship Filters. Includes What type filters and a page-level Event/Task Beta note. https://developer.salesforce.com/docs/platform/graphql/guide/filter-polymorphic.html

S27 · Salesforce Semi Join and Anti Join Filters. https://developer.salesforce.com/docs/platform/graphql/guide/filter-joins.html

S28 · Salesforce EventRelation object reference. Reference pointer only for this update; GraphQL exposure unverified. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_eventrelation.htm

S29 · Salesforce EventWhoRelation object reference. Reference pointer only for this update; GraphQL exposure unverified. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_eventwhorelation.htm

S30 · Salesforce GraphQL Get Object Metadata. https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html

S31 · Salesforce Share JavaScript Code. Confirms supported module patterns and circular-import restrictions; separate query modules are prohibited here by project design, not a universal platform ban. https://developer.salesforce.com/docs/platform/lwc/guide/js-share-code.html

S32 · Salesforce Decorators. Components declare wire adapters in their JavaScript class. https://developer.salesforce.com/docs/platform/lwc/guide/reference-decorators.html

S33 · Salesforce GraphQL Wire Adapter Best Practices. Reactive query/variables, deferred query getters, and pagination. https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-best.html

S34 · Salesforce GraphQL API Wire Adapter comparison. Distinguishes v1/v2 refresh and feature contracts. https://developer.salesforce.com/docs/platform/lwc/guide/reference-graphql-intro.html

S35 · Salesforce HTML Template Directives. Use syntax supported by the actual LWC compiler and API configuration. https://developer.salesforce.com/docs/platform/lwc/guide/reference-directives.html
