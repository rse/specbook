---
Created:  2026-06-18 10:18
Modified: 2026-09-02 12:28
---

ARCH: Quality Perspectives (QP)
===============================

##  PERSPECTIVE: Connection Scaling {{connection-scaling}}

-   QUALITY:   Scalability
-   ADDRESSES: [[NR.attendee-scale]], [[NR.scalability]]
-   TACTIC:    stateless proxy and relay pools behind a round-robin router
-   AFFECTS:   [[FV.relay]], [[CO.relay-pool]], [[DP.relay]]

The proxy and relay tiers scale horizontally as stateless pools so connection load distributes across instances per
environment, BECAUSE a single broker cannot hold 10000 concurrent WebSockets while a sharded pool can.

##  PERSPECTIVE: Live Failover Continuity {{failover}}

-   QUALITY:   Availability
-   ADDRESSES: [[NR.failover]]
-   TACTIC:    multi-provider resources with server-pushed active-resource switch
-   AFFECTS:   [[FV.service]], [[FV.client]]

Each channel carries multiple configured resources and the service pushes the active-resource change over MQTT so clients
follow automatically, BECAUSE provider outages must be survived without attendee action.

##  PERSPECTIVE: Privacy by Design {{privacy}}

-   QUALITY:   Privacy
-   ADDRESSES: [[NR.privacy]], [[NR.gdpr]]
-   TACTIC:    automated anonymization on finish and no permanent accounts
-   AFFECTS:   [[FV.service]], [[FV.database]]

Personal data exists only while an event runs and is automatically anonymized or deleted on finish, with no standing user
accounts, BECAUSE minimizing retained personal data is the strongest guarantee against data-protection risk.

##  PERSPECTIVE: Email-Verified Access {{access-security}}

-   QUALITY:   Security
-   ADDRESSES: [[NR.token-strength]]
-   TACTIC:    unguessable URLs plus time-limited one-time tokens and single sessions
-   AFFECTS:   [[FV.auth]]

Access requires an unguessable URL and a short-lived one-time token, with only one active session enforced per user per event,
BECAUSE layered, expiring secrets keep unauthorized viewers out without permanent credentials.

##  PERSPECTIVE: Real-Time Reactivity {{reactivity}}

-   QUALITY:   Performance
-   ADDRESSES: [[NR.config-latency]]
-   TACTIC:    MQTT publish/subscribe fan-out on per-event topics
-   AFFECTS:   [[FV.relay]], [[FV.service]]

Configuration and interaction changes are published on per-event MQTT topics and fanned out to subscribers, BECAUSE
publish/subscribe delivers sub-two-second propagation to all clients without polling.

##  PERSPECTIVE: Abuse Resistance {{abuse-resistance}}

-   QUALITY:   Security
-   ADDRESSES: [[NR.throttling]]
-   TACTIC:    per-user rate limiting plus client and server sentiment filtering
-   AFFECTS:   [[FV.service]], [[FV.client-nlp]]

Interaction is protected by configurable per-user throttling and optional client- and server-side sentiment checks,
BECAUSE combining rate limits with content filtering defends the interaction channels against flooding and abuse.

##  PERSPECTIVE: Cost-Efficient Hosting {{cost}}

-   QUALITY:   Maintainability
-   ADDRESSES: [[NR.cost]]
-   TACTIC:    self-hosted commodity infrastructure with a CDN front
-   AFFECTS:   [[DP.datacenter]], [[DP.cdn]]

Server tiers run on cost-effective Hetzner infrastructure while a CDN offloads static delivery, BECAUSE self-hosting plus
edge caching minimizes recurring per-event cost versus public cloud.

##  PERSPECTIVE: Universal Browser Reach {{portability}}

-   QUALITY:   Portability
-   ADDRESSES: [[NR.browser-compat]], [[NR.mobile-usability]]
-   TACTIC:    standards-based responsive web client with no plugins
-   AFFECTS:   [[FV.client]], [[DP.client-device]]

The client is a standards-based responsive Vue application that adapts from desktop to mobile without plugins, BECAUSE a
plugin-free web app reaches every recent browser on managed and unmanaged devices.
