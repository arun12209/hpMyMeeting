# Dependency manifest

No production third-party JavaScript or static resource is required. Runtime uses Salesforce LWC, LightningModal, NavigationMixin, GraphQL v2, Salesforce i18n/user modules, browser Intl and ResizeObserver.

Pinned development dependencies (full transitive versions in package-lock.json):

- `@babel/core` 7.29.7
- `@babel/plugin-transform-class-properties` 7.28.6
- `@lwc/compiler` 8.28.2
- `@salesforce/sfdx-lwc-jest` 7.9.0
- `graphql` 16.11.0
- `luxon` 3.7.2
- `playwright` 1.62.1
- `rollup` 4.63.4

Luxon is a timezone test oracle only. Babel, Rollup and Playwright belong only to the isolated browser harness. No dependency is loaded from a CDN in Salesforce.
