# My Meetings Salesforce implementation

The five deployment bundles in `force-app/main/default/lwc` now include the repair and redesign requested after the September 22 screenshots. The latest user requests supersede the original specification’s date/timezone headings, explanatory scope copy, Retry and Open Calendar buttons, and search boxes. Original specification files are preserved.

The failing polymorphic `What.RecordTypeId` filter has been replaced with an Opportunity reference semi-join. Three sequential operations cover starting, continuing and all-day meetings without combining a semi-join with OR. The redesign adds the rounded shell and blue calendar icon, compact text actions, a clearer expanded calendar and actual Salesforce error details. See [repair notes](docs/REPAIR_AND_REDESIGN.md).

Local compilation, fixture tests, and browser checks are included. **Org validation and deployment were skipped at your request.** Local success does not establish target-org schema or runtime compatibility. Existing integration requirements are in `docs/CONTAINER_INTEGRATION.md` and `docs/CAPABILITY_REPORT.md`.

## Contents

- `homepageMyMeetings`: header, active tabs, record-type metadata, modal launch, native navigation.
- `homepageTodaysMeeting`: own GraphQL query/wire, Today cards and expiry.
- `homepageTomorrowMeetings`: own GraphQL query/wire and tomorrow's civil-day bounds.
- `homepageViewAllMeetings`: LightningModal, own day query, responsive table/cards and pagination.
- `homepageCalendarMeetings`: own range query, six-row month, Week, Workweek, Month, Agenda and inline detail.
- `manifest/package.xml`: exactly these five bundles. No new container, utility bundle, Apex, static resource, Event writes, or runtime sample-data fallback.
- `docs/CONTAINER_INTEGRATION.md`: exact integration snippet for your existing container.
- `docs/ACCEPTANCE.md`: A01–A39 evidence and limits.
- `docs/VALIDATION.md`: commands, outcomes and local screenshot coverage.

## Run local checks

Use Node 22 and `npm ci`, then `npm run check`. This runs the architecture audit, the LWC compiler at API 65, GraphQL syntax parsing, and Salesforce LWC Jest tests. The lockfile pins dependencies. It does not validate a target org's GraphQL schema.

For local browser QA, run `npx playwright install chromium`, then `npm run test:browser`. The browser harness compiles the real component templates/controllers but mocks Salesforce base components, GraphQL and fixture data. It is entirely outside the deployment source. Screenshots are marked accordingly. Browser fixtures are never imported by production LWCs.

## Salesforce setup

1. Copy the five bundles into your existing Salesforce project and use the integration snippet. Preserve your real container's layout, feature flags and other children.
2. Use a target org supporting API 65.0, `lightning/graphql` v2, optional fields, LightningModal, and the required Event schema. API 65 was chosen for documented optional-field support; it has not been tested against your org.
3. Ensure Event exposes `Status__c`, `Topic__c`, and `Interaction_Category__c` with these exact unnamespaced API names. Required filter fields must be readable/filterable. Do not remove filters to work around a mismatch.
4. The parent resolves the exact labels **Renewal Opportunity** and **Growth Opportunity** from GraphQL Opportunity metadata. It does not check creation availability or guess DeveloperNames. For translated labels, supply a reviewed `recordTypeMapping` with org-local IDs as described in the integration document.
5. Set the existing same-org Lightning dashboard route through `manageMeetingsUrl`. Without it, Manage Meetings is disabled with an explanation.
6. The ownership rule is explicitly **Event.OwnerId = current Salesforce user**. Invited-only coverage is not asserted.
7. Full attendees are not implemented against an invented relationship. The primary Who name is labeled accurately; the UI says the full attendee list is unavailable. Confirm the permitted GraphQL participant source before accepting this reduced scope.
8. Arun supplies the Impact Assessment URL later. The four local resolver methods currently return `null` and show **Setup pending**. See `docs/IMPACT_ASSESSMENT.md`.

When you have the authorized org, an explicit validation command is:

```sh
sf project deploy validate --manifest manifest/package.xml --target-org YOUR_AUTHORIZED_ALIAS --test-level RunLocalTests
```

This command has **not** been run. It validates the five bundles only; add your existing container change to your project's reviewed deployment scope. The original org-dependent checks in the mission remain listed as not run rather than silently marked passed.
