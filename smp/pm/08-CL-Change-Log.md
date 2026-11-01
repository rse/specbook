---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Change Log (CL)

##  ISSUE: Personal Data in Test Set {{chg-testdata}}

-   KIND:       Problem
-   WEEK:       6
-   STATUS:     Resolved
-   RAISED-BY:  [[lea]]
-   OWNER:      [[lukas]]
-   CONCERNS:   [[con-legal]], [[wp-test-auto]], [[tests]]
-   IMPACT:     The test automation ran against synthetic data for one week, 1 PD of the architect to generate it, no change of the schedule.
-   DECISION:   Resolved in week 6 by the project manager within her authority: the handed-over list was deleted and a synthetic one generated.

The attendee list the customer handed over for the acceptance tests contains
the real names and email addresses of its employees, BECAUSE the export of the
HR system was not anonymized before it left the customer.

##  ISSUE: Vote Result Export {{chg-export}}

-   KIND:       Request
-   WEEK:       7
-   STATUS:     Approved
-   RAISED-BY:  [[tom]]
-   OWNER:      [[anna]]
-   CONCERNS:   [[release]], [[wp-backend]], [[backend]]
-   IMPACT:     +4 PD on the backend implementation funded from the reserve, the go-live unchanged.
-   DECIDED-BY: [[steering]]
-   DECISION:   Approved in week 8 as a change of the fixed-price scope funded from the reserve.

The product owner asks for a CSV export of the results of the live votings
after an event, BECAUSE the corporate communications department reports the
outcomes of the townhall events to the board.

##  ISSUE: Chat Latency Above Target {{chg-latency}}

-   KIND:       Off-Spec
-   WEEK:       9
-   STATUS:     Resolved
-   RAISED-BY:  [[lea]]
-   OWNER:      [[jonas]]
-   CAUSED-BY:  [[load-missed]]
-   CONCERNS:   [[obj-scale]], [[release]], [[wp-middleware]], [[wp-load]]
-   IMPACT:     3 PD of middleware work within the construction budget, no change of the schedule.
-   DECISION:   Resolved in week 10 by the project manager within her authority: a second relay broker per environment, as the contingency of the risk foresees.

The incremental load test of week 9 measured a chat message latency of 3.5
seconds at 3000 simulated attendees, above the two seconds the specification
demands, BECAUSE a single relay broker per environment saturates under the
WebSocket fan-out.

##  ISSUE: Single Sign-On {{chg-sso}}

-   KIND:       Request
-   WEEK:       9
-   STATUS:     Deferred
-   RAISED-BY:  [[acme]]
-   OWNER:      [[anna]]
-   CONCERNS:   [[obj-predictable]], [[con-time]], [[release]]
-   IMPACT:     +15 PD and a dependency onto the identity team of the customer, which the go-live date does not permit.
-   DECIDED-BY: [[steering]]
-   DECISION:   Deferred in week 10 to a release 1.1 after the go-live, the exclusion of the scope standing.

The IT department of the customer asks for a login through the corporate
identity provider instead of the access codes, BECAUSE its security policy
prefers one identity for every internal application.

