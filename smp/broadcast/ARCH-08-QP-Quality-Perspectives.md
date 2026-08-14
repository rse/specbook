---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   ARCH: Quality Perspectives (QP)

##  PERSPECTIVE: Connection Scaling <a id="ARCH-QP-connection-scaling"></a>

-   QUALITY:   Scalability
-   ADDRESSES: SPEC-NR-attendee-scale, SPEC-NR-scalability
-   TACTIC:    stateless proxy and relay pools behind a round-robin router
-   AFFECTS:   ARCH-FV-relay, ARCH-DP-relay

The proxy and relay tiers scale horizontally as stateless pools so connection load distributes across instances per
environment, BECAUSE a single broker cannot hold 10000 concurrent WebSockets while a sharded pool can.

##  PERSPECTIVE: Live Failover Continuity <a id="ARCH-QP-failover"></a>

-   QUALITY:   Availability
-   ADDRESSES: SPEC-NR-failover
-   TACTIC:    multi-provider resources with server-pushed active-resource switch
-   AFFECTS:   ARCH-FV-service, ARCH-FV-client

Each channel carries multiple configured resources and the service pushes the active-resource change over MQTT so clients
follow automatically, BECAUSE provider outages must be survived without attendee action.

##  PERSPECTIVE: Privacy by Design <a id="ARCH-QP-privacy"></a>

-   QUALITY:   Privacy
-   ADDRESSES: SPEC-NR-privacy, SPEC-NR-gdpr
-   TACTIC:    automated anonymization on finish and no permanent accounts
-   AFFECTS:   ARCH-FV-service, ARCH-FV-database

Personal data exists only while an event runs and is automatically anonymized or deleted on finish, with no standing user
accounts, BECAUSE minimizing retained personal data is the strongest guarantee against data-protection risk.

##  PERSPECTIVE: Email-Verified Access <a id="ARCH-QP-access-security"></a>

-   QUALITY:   Security
-   ADDRESSES: SPEC-NR-token-strength
-   TACTIC:    unguessable URLs plus time-limited one-time tokens and single sessions
-   AFFECTS:   ARCH-FV-auth

Access requires an unguessable URL and a short-lived one-time token, with only one active session enforced per user per event,
BECAUSE layered, expiring secrets keep unauthorized viewers out without permanent credentials.

##  PERSPECTIVE: Real-Time Reactivity <a id="ARCH-QP-reactivity"></a>

-   QUALITY:   Performance
-   ADDRESSES: SPEC-NR-config-latency
-   TACTIC:    MQTT publish/subscribe fan-out on per-event topics
-   AFFECTS:   ARCH-FV-relay, ARCH-FV-service

Configuration and interaction changes are published on per-event MQTT topics and fanned out to subscribers, BECAUSE
publish/subscribe delivers sub-two-second propagation to all clients without polling.

##  PERSPECTIVE: Abuse Resistance <a id="ARCH-QP-abuse-resistance"></a>

-   QUALITY:   Security
-   ADDRESSES: SPEC-NR-throttling
-   TACTIC:    per-user rate limiting plus client and server sentiment filtering
-   AFFECTS:   ARCH-FV-service, ARCH-FV-client-nlp

Interaction is protected by configurable per-user throttling and optional client- and server-side sentiment checks,
BECAUSE combining rate limits with content filtering defends the interaction channels against flooding and abuse.

##  PERSPECTIVE: Cost-Efficient Hosting <a id="ARCH-QP-cost"></a>

-   QUALITY:   Maintainability
-   ADDRESSES: SPEC-NR-cost
-   TACTIC:    self-hosted commodity infrastructure with a CDN front
-   AFFECTS:   ARCH-DP-datacenter, ARCH-DP-cdn

Server tiers run on cost-effective Hetzner infrastructure while a CDN offloads static delivery, BECAUSE self-hosting plus
edge caching minimizes recurring per-event cost versus public cloud.

##  PERSPECTIVE: Universal Browser Reach <a id="ARCH-QP-portability"></a>

-   QUALITY:   Portability
-   ADDRESSES: SPEC-NR-browser-compat, SPEC-NR-mobile-usability
-   TACTIC:    standards-based responsive web client with no plugins
-   AFFECTS:   ARCH-FV-client, ARCH-DP-client-device

The client is a standards-based responsive Vue application that adapts from desktop to mobile without plugins, BECAUSE a
plugin-free web app reaches every recent browser on managed and unmanaged devices.
