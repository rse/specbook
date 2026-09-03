---
Created:  2026-06-18 10:18
Modified: 2026-09-03 22:55
---

ARCH: Quality Perspectives (QP)
===============================

##  TACTIC: Connection Scaling {{connection-scaling}}

-   QUALITY:     Scalability
-   ADDRESSES:   [[NR.attendee-scale]], [[NR.scalability]]
-   MECHANISM:   stateless proxy and relay pools behind a round-robin router
-   TRADES-OFF:  Maintainability
-   AFFECTS:     [[FV.proxy]], [[FV.relay]], [[CO.relay-pool]], [[DP.proxy]], [[DP.relay]]
-   OPERATED-BY: [[OV.scaling]]
-   TOOLS:       [[TS.Server.container-orchestration]]

The proxy and relay tiers scale horizontally as stateless pools so connection load distributes across instances per
environment, BECAUSE a single broker cannot hold the required attendee count while a sharded pool can.

##  TACTIC: Live Failover Continuity {{failover}}

-   QUALITY:    Availability
-   ADDRESSES:  [[NR.failover]]
-   MECHANISM:  multi-provider resources with server-pushed active-resource switch
-   AFFECTS:    [[FV.service]], [[FV.client]], [[ENTITY:Channel]], [[ENTITY:Resource]]
-   TOOLS:      [[TS.Common.messaging]]

Each channel carries multiple configured resources and the service pushes the active-resource change over MQTT so clients
follow automatically, BECAUSE provider outages must be survived without attendee action.

##  TACTIC: Privacy by Design {{privacy}}

-   QUALITY:    Privacy
-   ADDRESSES:  [[NR.privacy]], [[NR.gdpr]]
-   MECHANISM:  automated anonymization on finish and no permanent accounts
-   TRADES-OFF: Usability
-   AFFECTS:    [[FV.service]], [[FV.database]], [[ENTITY:User]], [[ENTITY:Message]], [[ENTITY:AuthorizationToken]],
                [[ENTITY:SessionToken]]

Personal data exists only while an event runs and is automatically anonymized or deleted on finish, with no standing user
accounts, BECAUSE minimizing retained personal data is the strongest guarantee against data-protection risk.

##  TACTIC: Email-Verified Access {{access-security}}

-   QUALITY:    Security
-   ADDRESSES:  [[NR.token-strength]]
-   MECHANISM:  unguessable URLs plus time-limited one-time tokens and single sessions
-   TRADES-OFF: Usability
-   AFFECTS:    [[FV.auth]], [[ENTITY:AuthorizationToken]], [[ENTITY:SessionToken]]

Access requires an unguessable URL and a short-lived one-time token, with only one active session enforced per user per event,
BECAUSE layered, expiring secrets keep unauthorized viewers out without permanent credentials.

##  TACTIC: Real-Time Reactivity {{reactivity}}

-   QUALITY:    Performance
-   ADDRESSES:  [[NR.config-latency]]
-   MECHANISM:  MQTT publish/subscribe fan-out on per-event topics
-   AFFECTS:    [[FV.relay]], [[FV.service]], [[FV.client]]
-   TOOLS:      [[TS.Common.messaging]]

Configuration and interaction changes are published on per-event MQTT topics and fanned out to subscribers, BECAUSE
publish/subscribe propagates every change to all clients within the required time without polling.

##  TACTIC: Abuse Resistance {{abuse-resistance}}

-   QUALITY:    Security
-   ADDRESSES:  [[NR.throttling]]
-   MECHANISM:  per-user rate limiting plus client and server sentiment filtering
-   TRADES-OFF: Usability
-   AFFECTS:    [[FV.service]], [[FV.client-nlp]]
-   TOOLS:      [[TS.Client.client-sentiment]]

Interaction is protected by configurable per-user throttling and optional client- and server-side sentiment checks,
BECAUSE combining rate limits with content filtering defends the interaction channels against flooding and abuse.

##  TACTIC: Universal Browser Reach {{portability}}

-   QUALITY:    Portability
-   ADDRESSES:  [[NR.browser-compat]], [[NR.mobile-usability]]
-   MECHANISM:  standards-based responsive web client with no plugins
-   AFFECTS:    [[FV.client]], [[DP.client-device]]
-   TOOLS:      [[TS.Client.ui-framework]], [[TS.Client.styling-framework]]

The client is a standards-based responsive web application that adapts from desktop to mobile without plugins, BECAUSE a
plugin-free web app reaches every recent browser on managed and unmanaged devices.
