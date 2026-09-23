# Impact Assessment extension

Arun's four extension points are the identically named methods in:

- `homepageTodaysMeeting/homepageTodaysMeeting.js`
- `homepageTomorrowMeetings/homepageTomorrowMeetings.js`
- `homepageViewAllMeetings/homepageViewAllMeetings.js`
- `homepageCalendarMeetings/homepageCalendarMeetings.js`

Each implements:

```js
resolveImpactAssessmentUrl({ eventId, opportunityId }) {
    void eventId;
    void opportunityId;
    return null;
}
```

Implement the approved dynamic URL using these IDs in each controller. Do not import the parent, create a resolver/service bundle, pass a callback through the modal, or use meeting text as URL parameters without a separately approved requirement. There is no invented domain, deck ID, endpoint or parameter contract.

Add the exact approved hostname(s) to `integrationConfig.approvedImpactHosts`. The existing validation requires HTTPS, rejects credentials and rejects lookalike domains and unspecified subdomains. Explicitly list each approved subdomain. Invalid/unconfigured URLs keep the action disabled with Setup pending.

A configured action is an anchor with `target="_blank"` and `rel="noopener noreferrer"`. The click rechecks the Event's end instant and reruns the resolver with the same Event/Opportunity IDs. An expired event cannot launch an action. The modal remains open for this external action.
