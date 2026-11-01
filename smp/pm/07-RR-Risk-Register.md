---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Risk Register (RR)

##  RISK: Key Developer Unavailable {{key-dev}}

-   PROBABILITY: Medium
-   IMPACT:      High
-   STATUS:      Mitigated
-   OWNER:       [[anna]]
-   AFFECTS:     [[wp-backend]], [[wp-client]]
-   TRIGGER:     A developer reports more than three sick days in a sprint or announces a notice period.
-   STRATEGY:    Reduce
-   MITIGATION:  The two developers review each other's work weekly, so either can continue the other's stream.
-   CONTINGENCY: The architect takes over the stream and the construction phase is extended by two weeks.

A developer falls ill or leaves during the construction phase, BECAUSE the
client and the backend streams each rest on a single person.

##  RISK: Late Hosting Provisioning {{late-hosting}}

-   PROBABILITY: Low
-   IMPACT:      High
-   STATUS:      Open
-   OWNER:       [[lukas]]
-   AFFECTS:     [[wp-hosting]], [[hosting]], [[provision]]
-   TRIGGER:     The order confirmation of the provider names a delivery date later than week 9.
-   STRATEGY:    Transfer
-   MITIGATION:  The environments are ordered at the start of the construction phase under a contractual delivery date with a penalty.
-   CONTINGENCY: The load tests run in the dev environment and the go-live is postponed until production exists.

The hosting provider delivers the ordered infrastructure late, BECAUSE the
private network and the database subnet are custom orders with a lead time.

##  RISK: Load Target Missed {{load-missed}}

-   PROBABILITY: Medium
-   IMPACT:      Medium
-   STATUS:      Occurred
-   OWNER:       [[lea]]
-   AFFECTS:     [[wp-load]], [[release]], [[load]]
-   TRIGGER:     An incremental load test during construction falls short of its scaled attendee target.
-   STRATEGY:    Reduce
-   MITIGATION:  The relay and the services are load-tested incrementally during construction, not only at the end.
-   CONTINGENCY: Additional relay brokers and service containers are provisioned per environment.

The release sustains fewer than the 5000 attendees the acceptance demands,
BECAUSE the WebSocket fan-out of the relay is untested at that scale.

##  RISK: Scope Creep {{scope-creep}}

-   PROBABILITY: High
-   IMPACT:      Medium
-   STATUS:      Open
-   OWNER:       [[tom]]
-   AFFECTS:     [[wp-reqs]], [[spec]]
-   TRIGGER:     A sprint review yields more than two change requests beyond the approved specification.
-   STRATEGY:    Avoid
-   MITIGATION:  Every change request after the specification approval is estimated and decided by the steering committee.
-   CONTINGENCY: The change is deferred to a release 1.1 after the go-live.

The customer asks for features beyond the approved specification during
construction, BECAUSE the stakeholders see the solution for the first time in
the sprint reviews.

##  RISK: Stream Provider Change {{provider}}

-   PROBABILITY: Low
-   IMPACT:      Medium
-   STATUS:      Open
-   OWNER:       [[lukas]]
-   AFFECTS:     [[wp-client]]
-   STRATEGY:    Accept
-   MITIGATION:  The provider contract negotiation of the customer is watched in the steering committee, the player already being encapsulated behind a provider-neutral component.

The customer switches its video stream provider before the go-live, BECAUSE
the provider contract of the customer is renegotiated during the project.

##  RISK: Backchannel Ignored {{ignored}}

-   PROBABILITY: Medium
-   IMPACT:      High
-   STATUS:      Open
-   OWNER:       [[tom]]
-   AFFECTS:     [[workforce]], [[release]]
-   TRIGGER:     Fewer than a fifth of the attendees of the rehearsal event post a chat message or cast a vote.
-   STRATEGY:    Reduce
-   MITIGATION:  The workforce is consulted on the backchannel in the stakeholder updates and briefed before the first event, where the moderators answer the first questions live.
-   CONTINGENCY: The voting is dropped from the first event and introduced in the second one after an internal campaign.

The employees ignore the chat and the voting of the first townhall event,
BECAUSE a backchannel nobody uses misses the objective of the project
regardless of the delivered release.

##  RISK: Second Department Adopts Solution {{adoption}}

-   TYPE:        Opportunity
-   PROBABILITY: Medium
-   IMPACT:      Medium
-   STATUS:      Open
-   OWNER:       [[anna]]
-   AFFECTS:     [[release]], [[training]], [[acme]]
-   TRIGGER:     The HR department of the customer attends a sprint review or asks for a demonstration.
-   STRATEGY:    Enhance
-   MITIGATION:  The product owner invites the HR department to the sprint reviews, and the operator training is prepared so that it can be repeated for a second department.
-   CONTINGENCY: A follow-up project for the all-hands meetings of the HR department is offered after the go-live.

The HR department of the customer adopts Broadcast for its monthly all-hands
meetings, BECAUSE a second event format on the same installation doubles the
value of the solution for the customer and yields a follow-up project for the
contractor.

