---
Created:  2026-06-18 10:18
Modified: 2026-09-03 22:55
---

ARCH: Quality Perspectives (QP)
===============================

##  TACTIC: Connection Scaling {{connection-scaling}}

-   QUALITY:     Scalability
-   ADDRESSES:   [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:scalability]]
-   MECHANISM:   stateless proxy and relay pools behind a round-robin router
-   TRADES-OFF:  Maintainability
-   AFFECTS:     [[COMPONENT:proxy]], [[COMPONENT:relay]], [[UNIT:relay-pool]], [[NODE:proxy]], [[NODE:relay]]
-   OPERATED-BY: [[CONCERN:scaling]]
-   TOOLS:       [[COMPONENT:container-orchestration]]

The proxy and relay tiers scale horizontally as stateless pools so connection load distributes across instances per
environment, BECAUSE a single broker cannot hold the required attendee count while a sharded pool can.

##  TACTIC: Live Failover Continuity {{failover}}

-   QUALITY:    Availability
-   ADDRESSES:  [[REQUIREMENT:failover]]
-   MECHANISM:  multi-provider resources with server-pushed active-resource switch
-   AFFECTS:    [[COMPONENT:service]], [[COMPONENT:client]], [[ENTITY:Channel]], [[ENTITY:Resource]]
-   TOOLS:      [[COMPONENT:messaging]]

Each channel carries multiple configured resources and the service pushes the active-resource change over MQTT so clients
follow automatically, BECAUSE provider outages must be survived without attendee action.

##  TACTIC: Privacy by Design {{privacy}}

-   QUALITY:    Privacy
-   ADDRESSES:  [[REQUIREMENT:privacy]], [[REQUIREMENT:gdpr]]
-   MECHANISM:  automated anonymization on finish and no permanent accounts
-   TRADES-OFF: Usability
-   AFFECTS:    [[COMPONENT:service]], [[FV.database]], [[ENTITY:User]], [[ENTITY:Message]], [[ENTITY:AuthorizationToken]],
                [[ENTITY:SessionToken]]

Personal data exists only while an event runs and is automatically anonymized or deleted on finish, with no standing user
accounts, BECAUSE minimizing retained personal data is the strongest guarantee against data-protection risk.

##  TACTIC: Email-Verified Access {{access-security}}

-   QUALITY:    Security
-   ADDRESSES:  [[REQUIREMENT:token-strength]]
-   MECHANISM:  unguessable URLs plus time-limited one-time tokens and single sessions
-   TRADES-OFF: Usability
-   AFFECTS:    [[COMPONENT:auth]], [[ENTITY:AuthorizationToken]], [[ENTITY:SessionToken]]

Access requires an unguessable URL and a short-lived one-time token, with only one active session enforced per user per event,
BECAUSE layered, expiring secrets keep unauthorized viewers out without permanent credentials.

##  TACTIC: Real-Time Reactivity {{reactivity}}

-   QUALITY:    Performance
-   ADDRESSES:  [[REQUIREMENT:config-latency]]
-   MECHANISM:  MQTT publish/subscribe fan-out on per-event topics
-   AFFECTS:    [[COMPONENT:relay]], [[COMPONENT:service]], [[COMPONENT:client]]
-   TOOLS:      [[COMPONENT:messaging]]

Configuration and interaction changes are published on per-event MQTT topics and fanned out to subscribers, BECAUSE
publish/subscribe propagates every change to all clients within the required time without polling.

##  TACTIC: Abuse Resistance {{abuse-resistance}}

-   QUALITY:    Security
-   ADDRESSES:  [[REQUIREMENT:throttling]]
-   MECHANISM:  per-user rate limiting plus client and server sentiment filtering
-   TRADES-OFF: Usability
-   AFFECTS:    [[COMPONENT:service]], [[COMPONENT:client-nlp]]
-   TOOLS:      [[COMPONENT:client-sentiment]]

Interaction is protected by configurable per-user throttling and optional client- and server-side sentiment checks,
BECAUSE combining rate limits with content filtering defends the interaction channels against flooding and abuse.

##  TACTIC: Universal Browser Reach {{portability}}

-   QUALITY:    Portability
-   ADDRESSES:  [[REQUIREMENT:browser-compat]], [[REQUIREMENT:mobile-usability]]
-   MECHANISM:  standards-based responsive web client with no plugins
-   AFFECTS:    [[COMPONENT:client]], [[NODE:client-device]]
-   TOOLS:      [[COMPONENT:ui-framework]], [[COMPONENT:styling-framework]]

The client is a standards-based responsive web application that adapts from desktop to mobile without plugins, BECAUSE a
plugin-free web app reaches every recent browser on managed and unmanaged devices.
