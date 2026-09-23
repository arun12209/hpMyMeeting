# Integrating with the existing homepageContainer

No `homepageContainer` source was supplied. Do not replace it with a guessed implementation. Insert this component once into its existing meetings region:

```html
<template lwc:if={showMyMeetings}>
    <c-homepage-my-meetings
        max-visible-meetings="2"
        manage-meetings-url={meetingsDashboardUrl}
        integration-config={meetingIntegrations}>
    </c-homepage-my-meetings>
</template>
```

Add the corresponding values using your existing configuration conventions:

```js
// Example container properties, not a replacement controller.
showMyMeetings = true;
meetingsDashboardUrl = ''; // Your existing /lightning/... dashboard route.
meetingIntegrations = Object.freeze({ approvedImpactHosts: Object.freeze([]) });
```

Two cards are recommended as the initial constrained-column configuration shown in the supplied Word reference. The component accepts 1–3 and defaults to 3; measure the real host before release. Cards have natural height and no inner scrollbar. Calendar preview is one card when mounted by the parent.

`displayZone` defaults to `@salesforce/i18n/timeZone`; locale comes from `@salesforce/i18n/locale`. Browser timezone does not determine the selected day. An optional explicit `display-zone` must be an IANA timezone.

Record types resolve at runtime by exact metadata labels. No org IDs ship in production source. If labels are translated or renamed, pass a reviewed mapping to the parent's `record-type-mapping` property:

```js
// Fill from actual reviewed metadata in YOUR org. Empty strings intentionally do not work.
meetingRecordTypes = Object.freeze({
    'Renewal Opportunity': '',
    'Growth Opportunity': ''
});
```

The mapping is matched against actual metadata IDs, not accepted as a substitute for readable Opportunity metadata. `available=false` describes creation and does not exclude an existing record type from reads. DeveloperNames are neither guessed nor queried through nonexistent metadata properties.

All children are unexposed (`isExposed=false`); embed the parent through your real container. The parent imports only the modal. Other children are mounted conditionally through templates. The modal opens with `.open()`, has no NavigationMixin, and returns native record navigation to the parent. No sixth bundle is required.

Changing the dashboard to an external URL is intentionally unsupported: Manage Meetings expects the same org's `/lightning/` route. Impact Assessment has a separate HTTPS host allowlist.
