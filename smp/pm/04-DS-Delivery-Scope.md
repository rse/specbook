---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Delivery Scope (DS)

##  DELIVERABLE: Solution Specification {{spec}}

-   KIND:       Document
-   FORMAT:     PDF
-   OWNER:      [[lukas]]
-   APPROVER:   [[tom]]
-   SERVES:       [[obj-predictable]]
-   ACCEPTANCE:   The product owner signs off the requirements, the use cases, and the architecture views.
-   VERIFICATION: Review
-   STATUS:       Accepted

The specification describes the requirements, the user experience, and the
architecture of the solution for the product owner and the engineering team,
BECAUSE a shared, reviewed specification is the basis of the fixed-price
delivery.

##  DELIVERABLE: Production Release 1.0 {{release}}

-   KIND:       Software
-   FORMAT:     OCI images and Git tag
-   OWNER:      [[anna]]
-   APPROVER:   [[maria]]
-   SERVES:       [[obj-backchannel]], [[obj-scale]]
-   ACCEPTANCE:   All acceptance tests pass in the QA environment and the load test sustains 5000 attendees.
-   VERIFICATION: Test
-   STATUS:       In Progress

The release comprises the web client, the backend services, and the middleware
of the solution in the form the production environment runs, BECAUSE the
customer accepts a running system, not source code.

##  DELIVERABLE: Hosting Environments {{hosting}}

-   KIND:       Service
-   OWNER:      [[lukas]]
-   APPROVER:   [[tom]]
-   SERVES:       [[obj-scale]], [[obj-operation]]
-   ACCEPTANCE:   The dev, QA, and production environments are reachable and a failover drill of the stream provider passed.
-   VERIFICATION: Test

The three environments on the hosting provider carry the solution through its
lifecycle, BECAUSE development, acceptance, and operation need isolated
environments of the same shape.

##  DELIVERABLE: Operations Manual {{ops-manual}}

-   KIND:       Document
-   FORMAT:     PDF
-   OWNER:      [[lukas]]
-   APPROVER:   [[tom]]
-   SERVES:       [[obj-operation]]
-   ACCEPTANCE:   The operators perform a backup, a restore, and an event setup by the manual alone.
-   VERIFICATION: Demonstration

The manual tells the operators of the customer how to set up an event, how to
monitor it, and how to recover from the known failure situations, BECAUSE the
customer operates the events without the contractor.

##  DELIVERABLE: Operator Training {{training}}

-   KIND:       Training
-   OWNER:      [[sara]]
-   APPROVER:   [[tom]]
-   SERVES:       [[obj-operation]]
-   ACCEPTANCE:   Every operator moderates a rehearsal event end to end.
-   VERIFICATION: Demonstration

The training teaches the moderators and operators of the customer the
moderation board, the stream control, and the statistics dashboard in a
rehearsal event, BECAUSE the first townhall event is no place to learn the
tools.

##  EXCLUSION

-   Video Stream Production {{excl-stream}};
    The encoding, the distribution, and the operation of the video stream itself are not
    delivered, BECAUSE the stream provider of the customer produces and delivers the stream.

-   Native Mobile Apps {{excl-mobile}};
    No iOS or Android application is delivered, BECAUSE the web client runs in the mobile
    browsers of the attendees.

-   Event Moderation Staffing {{excl-moderation}};
    The moderators and operators of the events are not provided, BECAUSE the customer staffs
    its events with its own trained operators.

-   Identity Provider Integration {{excl-sso}};
    No single sign-on against the corporate identity provider is delivered, BECAUSE the
    attendees join the events through access codes, as the specification demands.

