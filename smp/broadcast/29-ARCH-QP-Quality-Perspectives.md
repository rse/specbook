---
Created:  2026-06-18 10:18
Modified: 2026-09-05 13:10
---

ARCH: Quality Perspectives (QP)
===============================

##  TACTIC: Connection Scaling {{connection-scaling}}

-   QUALITY:     Scalability
-   ADDRESSES:   [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:scalability]]
-   MECHANISM:   stateless proxy and relay pools behind a round-robin router
-   TRADES-OFF:  Maintainability
-   AFFECTS:     [[COMPONENT:router]], [[COMPONENT:proxy]], [[COMPONENT:relay]], [[UNIT:router]], [[UNIT:proxy-pool]],
                 [[UNIT:relay-pool]], [[TIER:middleware-tier]], [[NODE:router]], [[NODE:proxy]], [[NODE:relay]]
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
-   AFFECTS:    [[COMPONENT:relay]], [[COMPONENT:service]], [[COMPONENT:client]], [[UNIT:relay-pool]], [[UNIT:service-loop]]
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

##  TACTIC: Provider Stream Passthrough {{stream-passthrough}}

-   QUALITY:    Performance
-   ADDRESSES:  [[REQUIREMENT:streaming-quality]]
-   MECHANISM:  provider-hosted encoding and delivery embedded by the client without transcoding
-   AFFECTS:    [[COMPONENT:client]], [[ENTITY:Channel]], [[ENTITY:Resource]]

The video is encoded and delivered by the streaming provider in the produced 1080p30 quality per language and embedded by
the client as a resource of the channel, so the solution never touches the video itself, BECAUSE transcoding or relaying
the video through the solution would cap the quality at the solution's own capacity.

##  TACTIC: Network Segmentation {{network-isolation}}

-   QUALITY:     Security
-   ADDRESSES:   [[REQUIREMENT:data-isolation]], [[REQUIREMENT:gdpr]]
-   MECHANISM:   TLS-only public ingress, private backend VLAN, and an isolated database subnet
-   TRADES-OFF:  Maintainability
-   AFFECTS:     [[TIER:middleware-tier]], [[TIER:database-tier]], [[NODE:router]], [[NODE:database]], [[NETWORK:internet]],
                 [[NETWORK:backend]], [[NETWORK:data]]
-   TOOLS:       [[COMPONENT:reverse-proxy]]

Traffic passes three segments, the TLS-only public Internet up to the hardened router, the private backend VLAN between
the connection-handling tiers and the services, and the isolated data subnet reaching the database from the service
containers alone, BECAUSE every hop an attacker has to cross before reaching the persisted personal data is one more
chance to stop them.

##  TACTIC: Dump-Based Recovery {{recovery}}

-   QUALITY:     Reliability
-   ADDRESSES:   [[REQUIREMENT:recovery]]
-   MECHANISM:   logical database dumps with a rehearsed restore onto a fresh server
-   TRADES-OFF:  Availability
-   AFFECTS:     [[NODE:database]], [[NODE:service]], [[ENTITY:Event]], [[ENTITY:Message]]
-   OPERATED-BY: [[CONCERN:backup]], [[CONCERN:restore]]
-   TOOLS:       [[COMPONENT:database-backup]]

The database is dumped logically on a schedule tightened before each event and rebuilt from the latest dump onto a fresh
server by a rehearsed procedure, BECAUSE a portable dump plus a drilled restore meets the recovery objectives without
operating a standby database.

##  TACTIC: Edge Asset Delivery {{edge-delivery}}

-   QUALITY:    Scalability
-   ADDRESSES:  [[REQUIREMENT:asset-delivery]]
-   MECHANISM:  static client bundle served from a global CDN edge
-   AFFECTS:    [[COMPONENT:client]], [[TIER:edge-tier]], [[NODE:cdn]]
-   TOOLS:      [[COMPONENT:build-tool]]

The client bundle is built into static files and served from the CDN edge close to the audience, so the start surge of an
event downloads from the edge instead of from the data center, BECAUSE a CDN absorbs ten thousand simultaneous downloads
which would saturate the single data center entry point.

##  TACTIC: Shared Typed Contracts {{typed-contracts}}

-   QUALITY:    Maintainability
-   ADDRESSES:  [[REQUIREMENT:contract-safety]]
-   MECHANISM:  common module of shared types compiled by one TypeScript toolchain on both sides
-   AFFECTS:    [[COMPONENT:client]], [[COMPONENT:service]], [[ASPECT:module-split]], [[ASPECT:typescript]],
                [[ASPECT:dependency-layering]], [[ASPECT:linting]], [[ASPECT:identifier-naming]]
-   TOOLS:      [[COMPONENT:language]], [[COMPONENT:linting]]

The message topics and payload types live once in the common module and are compiled into both client and server by the
same strongly typed toolchain, layered so that the module depends on neither side, BECAUSE a contract shared at the type
level turns every mismatch into a build error.

##  TACTIC: Snapshot Observability {{observability}}

-   QUALITY:     Maintainability
-   ADDRESSES:   [[REQUIREMENT:observability]]
-   MECHANISM:   periodic statistics snapshots plus recorded token states and structured logs
-   AFFECTS:     [[COMPONENT:statistics]], [[COMPONENT:auth]], [[UNIT:stats-scheduler]], [[ENTITY:EventStatistic]],
                 [[ENTITY:AuthorizationToken]]
-   OPERATED-BY: [[CONCERN:monitoring]], [[CONCERN:auth-logging]]
-   TOOLS:       [[COMPONENT:logging]]

A scheduled task snapshots the event, channel, and user counters every five minutes and the authentication module records
every token state next to its structured log, BECAUSE the running event can be observed and a failed login explained from
data the solution collects anyway.
