---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

SPEC: Non-Functional Requirements (NR)
======================================

##  REQUIREMENT: Concurrent Attendee Scale {{attendee-scale}}

-   PRIORITY: MUST
-   CATEGORY: Performance

The system MUST support between 2500 and 10000 attendees connected to a
single event at the same time, BECAUSE msg Filmstudio video productions
must reach an audience of this size simultaneously.

##  REQUIREMENT: Horizontal Scalability {{scalability}}

-   PRIORITY: MUST
-   CATEGORY: Performance

The system MUST scale horizontally by running multiple proxy, relay, and
server instances per runtime environment so that 10000 concurrent
WebSocket connections are served per event, BECAUSE a single instance
cannot handle the required connection volume and response times.

##  REQUIREMENT: Streaming Quality {{streaming-quality}}

-   PRIORITY: MUST
-   CATEGORY: Performance

The system MUST process and distribute video at 1080p30 (1920x1080 at 30
fps) in both German and English, BECAUSE productions are delivered in
this defined quality and the two required languages.

##  REQUIREMENT: Provider Failover Continuity {{failover}}

-   PRIORITY: MUST
-   CATEGORY: Reliability

The system MUST switch to a fallback streaming provider during a running
event with attendee clients following the switch automatically within
seconds and without user interaction, BECAUSE provider outages must not
interrupt the live audience.

##  REQUIREMENT: Cross-Browser Compatibility {{browser-compat}}

-   PRIORITY: MUST
-   CATEGORY: Compatibility

The system MUST run in any reasonably recent version of the major web
browsers (Chrome, Edge, Firefox, Safari) without plugins, BECAUSE
attendees use heterogeneous managed and unmanaged devices.

##  REQUIREMENT: GDPR Compliance {{gdpr}}

-   PRIORITY: MUST
-   CATEGORY: Compliance

The system MUST process all personal data in compliance with GDPR and
host it exclusively within the EU (data center in Nürnberg, Germany),
BECAUSE the operator is legally bound to European data-protection
requirements.

##  REQUIREMENT: Privacy by Design {{privacy}}

-   PRIORITY: MUST
-   CATEGORY: Security

The system MUST retain attendee personal data only while an event runs
and MUST anonymize or delete all attendee personal data within the
automated finish procedure when the event finishes, BECAUSE minimizing
personal-data retention is the core privacy guarantee of the product.

##  REQUIREMENT: Unguessable Access Tokens {{token-strength}}

-   PRIORITY: MUST
-   CATEGORY: Security

The system MUST use unguessable event URLs and time-limited
authorization tokens that by default expire within 5 minutes, BECAUSE
weak access secrets would let unauthorized viewers join the event.

##  REQUIREMENT: Live Configuration Latency {{config-latency}}

-   PRIORITY: SHOULD
-   CATEGORY: Performance

The system SHOULD propagate an event configuration change to all
connected clients within 2 seconds, BECAUSE operators expect toggles
such as enabling chat to take effect near-instantly for the live
audience.

##  REQUIREMENT: Per-Event Cost Efficiency {{cost}}

-   PRIORITY: SHOULD
-   CATEGORY: Maintainability

The system SHOULD minimize the recurring cost per event by self-hosting
on Hetzner infrastructure rather than Azure or AWS, excluding one-off
development cost, BECAUSE low operating cost per event is a primary
economic justification for building the solution.

##  REQUIREMENT: Interaction Abuse Throttling {{throttling}}

-   PRIORITY: SHOULD
-   CATEGORY: Security

The system SHOULD throttle chat and question submissions to a
configurable maximum per user per minute, BECAUSE rate limiting prevents
denial-of-service abuse of the interaction channels.

##  REQUIREMENT: Mobile Usability {{mobile-usability}}

-   PRIORITY: COULD
-   CATEGORY: Usability

The system COULD render the attendee experience responsively for mobile
phones in landscape and portrait orientation, BECAUSE a substantial
share of attendees join from mobile devices.
