# Validation results

Validation date: 23 September 2026 (repair and redesign).

## Executed locally

- `npm run audit`: exact five deployment bundles, required files, approved import graph, identical four Event documents, strict mandatory server filters, stable variables getter, v2 refresh contract, no prohibited APIs.
- `npm run compile`: 15 JavaScript/template/CSS source files compiled with `@lwc/compiler` 8.28.2 at API 65. Every gql document parsed with GraphQL 16.11.0. This does not validate Salesforce schema.
- `npm test`: 180 tests across five suites passed at the final validation. Final machine-readable Jest output is in `test-results.json`; use it for the latest count.
- `sf project convert source --root-dir force-app --output-dir /tmp/mymeetings-metadata-final --json`: status 0, no warnings. This verifies package conversion only, not Salesforce server compilation or deployment.
- Local Chromium: 15 fixture/layout cases including Today at 320/360/420, Tomorrow and compact parent Calendar at 420, compact Calendar at 320, expanded Week/Workweek/Month at 1200, narrow date-grouped agenda at 360, expanded modal/calendar and table at 1200, modal cards at 320, the actual error disclosure, and effective 200% zoom. No page errors or horizontal viewport overflow. Week has 168 hourly rows; Workweek has 120.
- Six browser interaction checks passed: View All, event-detail Escape, month overflow to selected day, modal close/remount, native Event navigation request, and compact calendar expansion. Platform services and modal shell are mocked; real component state, templates and handlers are exercised.
- Effective 200% desktop zoom case: 640 CSS px with device scale factor 2 (1280 physical-pixel equivalent). This is a viewport approximation, **not** a manual browser zoom or real Lightning accessibility certification.

`docs/screenshots/` contains the local fixture captures. Native Salesforce controls, styling and modal focus management are mocked; these are not target-org screenshots. No p95 live performance claim is made.

## Issues found and corrected during local work

1. Dependency installation initially failed with network DNS access. Pinned dependencies were installed using authorized network access.
2. A compiler 9.4.3 / Salesforce Jest engine 8.28.2 mismatch was detected. The direct compiler was aligned to 8.28.2; no mismatch warning remains in the used test path.
3. Watchman could not access its socket under the sandbox. Jest runs with `watchman: false` and does not need that service.
4. The Jest DOM parser could not parse CSS container queries. The modal now uses measured container width via ResizeObserver and renders only the selected layout, improving its DOM as well.
5. Browser review revealed default paragraph margins inflating the compact cards and time offsets lengthening ordinary labels. Margins were reset inside each component, while explicit offsets remain for repeated DST times.
6. Local timezone formatter/boundary caching reduced repeated calendar normalization work; cached values contain only formatters and civil-midnight instants, never meeting data.
7. CLI and headless Chromium needed access beyond the filesystem sandbox for their own logging/OS process services. Both were run locally with authorized escalation; no org was accessed.

8. The latest screenshots supplied a concrete INVALID_FIELD response. All four Event queries now use an Opportunity reference semi-join with three sequential operations; no semi-join/OR combination remains. Offline parsing cannot establish target-schema support.
9. The modal no longer dispatches unused custom summary events; a Locker-style throwing mock verifies that this path is not invoked. The catch around date preparation no longer masks unrelated exceptions.
10. A new browser error-state check found that an immediate focus event could restart a fresh failed query and discard its diagnostic. Failed attempts now record their check time; all four consumers preserve the diagnostic on focus.
11. The preview build now explicitly lowers class fields using Babel to avoid native class fields shadowing LWC reactive descriptors. This is test-harness configuration, not a new production dependency.

The screenshot's filter failure is confirmed. The separate modal timezone symptom has been addressed through narrowed error handling and the documented Locker event limitation, but its original stack trace was not supplied.

## Not run

- Target schema introspection or real Event query, including a known qualifying/excluded record comparison.
- Ordinary seller/restricted-user sharing, CRUD and FLS checks.
- Actual record type DeveloperName mapping, status/custom field validation, invited/child recurrence source reconciliation.
- Real Lightning/LWS/CSP execution, platform modal Escape/focus and native navigation.
- Deployment validation, deployment or production modification.
- Live attendee query, external assessment service or dashboard destination verification.
- Target-adapter response association during rapidly changed overlapping/empty ranges.

See `CAPABILITY_REPORT.md` and `ACCEPTANCE.md` for the exact implications.
