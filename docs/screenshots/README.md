# Local fixture previews

These images render the actual compiled component templates with mocked Salesforce controls and data. They do not certify the appearance of Salesforce's native modal shell or an org connection.

- `today-420.png`: redesigned compact card.
- `tomorrow-420.png`: Tomorrow with no date/timezone heading.
- `homeCalendar-420.png`: compact month and selected-day preview.
- `expanded-calendar-dialog.png`: expanded week reached through View All.
- `expanded-month-dialog.png`: expanded month and event chips.
- `modal-1200.png`: full-day table.
- `today-420-state-error.png`: expanded Technical details with fixture INVALID_FIELD message.

The full responsive matrix and interactions are in `../browser-results.json`. Run `npm run test:browser` to regenerate them.
