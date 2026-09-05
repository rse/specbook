---
Created:  2026-06-18 10:18
Modified: 2026-09-05 13:10
---

ARCH: Design Decisions (DD)
===========================

##  DECISION: Use MQTT over WebSockets as the live transport {{mqtt-transport}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:config-latency]], [[PREMISE:websocket-passage]]
-   AFFECTS:      [[COMPONENT:relay]], [[COMPONENT:service]], [[UNIT:relay-pool]]
-   DECIDES:      [[TACTIC:reactivity]], [[COMPONENT:messaging]], [[COMPONENT:message-broker]]
-   ALTERNATIVES: REST polling, bespoke WebSocket protocol
-   WHEN:
    A single event must push video state, configuration changes, chat, questions, and likes to between 2500 and 10000
    concurrently connected browsers with sub-two-second latency, and the same channel must carry bidirectional interaction.
-   WHAT:
    We use MQTT over WebSockets as the live transport, brokered by Mosquitto and MQTT-Plus in a horizontally scaled relay
    tier, with per-event topics for fan-out and a thin Node.js service reacting to published messages.
-   WHY:
    MQTT's publish/subscribe model fans a single publish out to thousands of subscribers far more cheaply than per-client REST
    polling or bespoke socket handling, and its mature broker ecosystem already solves connection scaling; a plain HTTP/REST
    design was rejected because it cannot deliver low-latency server-initiated fan-out at this connection count.
-   CONSEQUENCES:
    Every live capability has to be expressible as messages on per-event topics, and the relay tier becomes a scaling and
    operating unit of its own, while attendee networks blocking WebSocket traffic lock their users out of the live channel.

##  DECISION: Self-host on Hetzner instead of public cloud {{self-host}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:gdpr]], [[REQUIREMENT:cost]], [[PREMISE:eu-hosting]]
-   AFFECTS:      [[TIER:datacenter]], [[ASPECT:codeline]]
-   ALTERNATIVES: Azure, AWS, GitHub
-   WHEN:
    The solution must be GDPR-compliant with EU data residency, and a primary economic goal is to minimize recurring cost per
    event, the solution having been built specifically to replace a costlier third-party platform.
-   WHAT:
    We operate all server tiers on self-managed Hetzner infrastructure in Nürnberg, Germany, separated into dev, QA, and
    production environments, rather than on Azure or AWS, and keep the source on a self-administered Gitea rather than on
    a hosted forge.
-   WHY:
    Hetzner delivers EU-resident hosting at a fraction of hyperscaler cost, satisfying both the data-residency and
    cost-minimization forces; public cloud was rejected because its per-event egress and compute pricing would undermine the
    cost goal that justified building the solution at all.
-   CONSEQUENCES:
    Provisioning, scaling, monitoring, and backup are operated by the team itself instead of being consumed as managed
    services, so the Operations View carries the procedures a hyperscaler would have provided.

##  DECISION: Privacy by design with no permanent user accounts {{no-accounts}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:privacy]], [[REQUIREMENT:gdpr]], [[PREMISE:message-personal-data]]
-   AFFECTS:      [[COMPONENT:auth]], [[COMPONENT:service]], [[ENTITY:User]], [[PRINCIPLE:privacy-identity]]
-   DECIDES:      [[TACTIC:privacy]]
-   ALTERNATIVES: persistent user accounts
-   WHEN:
    Events handle personal attendee data under GDPR, yet attendance is transient and the operator wants to carry as little
    personal-data liability as possible while still supporting per-event identity for chat and moderation.
-   WHAT:
    We hold no permanent user accounts: users exist only via an event access list, role grant, or pattern match, and on event
    finish an automated procedure anonymizes messages and deletes users, tokens, and Moderator roles.
-   WHY:
    Deleting personal data the moment it is no longer needed minimizes both breach impact and compliance burden, which
    outweighs the convenience of persistent accounts; a conventional account model was rejected because standing personal data
    is exactly the liability privacy by design exists to avoid.

##  DECISION: Email one-time token as the authentication factor {{email-token}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:token-strength]], [[PREMISE:email-at-hand]], [[PREMISE:email-delivery]]
-   AFFECTS:      [[COMPONENT:auth]], [[PATTERN:two-factor-login]], [[PRINCIPLE:frictionless-join]]
-   DECIDES:      [[TACTIC:access-security]]
-   ALTERNATIVES: password accounts, external identity providers
-   WHEN:
    Access must be limited to invited attendees without permanent credentials, while also supporting frictionless and fully
    automated joining for large distributions provisioned from the Event Registration System.
-   WHAT:
    We authenticate via a one-time "NNN-NNN" token emailed to the attendee's address, with optionally pre-generated tokens
    embeddable in the access URL for automatic entry, and we enforce a single active session per user per event.
-   WHY:
    An emailed token proves control of the authorized address with zero stored credentials and reuses email as a channel
    everyone already has, fitting the no-accounts stance; password accounts and external identity providers were rejected as
    too heavy and as reintroducing the persistent personal data the design forbids.

##  DECISION: Decouple logical Channels from physical provider Resources {{channel-resource}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:failover]], [[PREMISE:provider-delivery]], [[PREMISE:two-languages]]
-   AFFECTS:      [[COMPONENT:service]], [[COMPONENT:client]], [[ENTITY:Channel]], [[ENTITY:Resource]]
-   DECIDES:      [[TACTIC:failover]]
-   ALTERNATIVES: direct binding of clients to a single provider stream
-   WHEN:
    Productions ship in multiple languages and resolutions and must survive a streaming-provider outage mid-event by switching
    providers without attendees having to act or even notice.
-   WHAT:
    We model an event as logical Channels each backed by multiple physical Resources, where exactly one Channel and one
    Resource are active at a time, and switching the active Resource is pushed live to all clients.
-   WHY:
    Separating the audience-facing logical stream from interchangeable provider endpoints makes live failover a state change
    rather than a reconfiguration, satisfying both the multi-variant and continuity forces; binding clients directly to a
    single provider was rejected because it would make any provider problem an event-ending failure.

##  DECISION: Embed provider-delivered video instead of self-hosted streaming {{provider-streaming}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:streaming-quality]], [[REQUIREMENT:cost]], [[PREMISE:provider-delivery]]
-   AFFECTS:      [[COMPONENT:client]], [[ENTITY:Channel]], [[ENTITY:Resource]], [[ENTITY:provider]]
-   DECIDES:      [[TACTIC:stream-passthrough]]
-   ALTERNATIVES: self-hosted media server (e.g. OvenMediaEngine, Wowza), relaying the video through the data center
-   WHEN:
    Productions are delivered in 1080p30 in two languages to up to 10000 attendees, the streaming providers already encode
    and distribute the video worldwide, and the per-event cost has to stay low.
-   WHAT:
    We leave the video entirely with the streaming providers: the client embeds the provider player of the active resource,
    and the solution carries only the metadata telling every client which resource to play.
-   WHY:
    A provider delivers the produced quality from a global network for a per-event fee, whereas self-hosted streaming would
    need transcoding and egress capacity for 10000 viewers in the data center; a self-hosted media server was rejected as
    the single most expensive and most fragile piece the solution could take on.
-   CONSEQUENCES:
    The solution depends on the providers for the entire video path, so the provider failover has to be a first-class
    mechanism, and the video quality is capped by what the providers deliver rather than tunable by the solution.

##  DECISION: One modular service process instead of microservices {{modular-service}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:cost]], [[REQUIREMENT:contract-safety]], [[REQUIREMENT:scalability]]
-   AFFECTS:      [[COMPONENT:service]], [[COMPONENT:auth]], [[COMPONENT:translation]], [[COMPONENT:statistics]],
                  [[UNIT:service-loop]], [[NODE:service]]
-   ALTERNATIVES: one service per capability (authentication, messaging, translation, statistics)
-   WHEN:
    The business logic of events, access, moderation, translation, and statistics is small and shares one data model, the
    connection load is carried by the relay tier anyway, and a small team operates the solution itself.
-   WHAT:
    We run the entire business logic as one Node.js service process with authentication, translation, and statistics as
    modules inside it, scaled by running several identical instances per environment.
-   WHY:
    The scaling problem of the solution is the connection count, which the relay tier solves, not the business logic, so
    splitting it would buy nothing but network hops, partial failures, and contracts to keep in sync; per-capability
    services were rejected because they multiply the operating effort of a self-hosted solution.
-   CONSEQUENCES:
    Every module shares the release cycle and the failure domain of the service, and a module growing a load profile of its
    own has to be carved out later at the cost of a refactoring.

##  DECISION: TypeScript with a shared common module across client and server {{typed-common}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:contract-safety]]
-   AFFECTS:      [[ASPECT:module-split]], [[ASPECT:typescript]], [[ASPECT:dependency-layering]], [[ASPECT:identifier-naming]]
-   DECIDES:      [[TACTIC:typed-contracts]], [[COMPONENT:language]]
-   ALTERNATIVES: plain JavaScript, per-tier types generated from an interface description (e.g. OpenAPI, AsyncAPI)
-   WHEN:
    Client and server exchange dozens of message types over MQTT topics, both sides evolve together in one repository, and
    a contract mismatch would surface only during a live event.
-   WHAT:
    We write client, server, and a common module in TypeScript, keep every topic and payload type in the common module, and
    let both sides import it, with the common module depending on neither of them.
-   WHY:
    Sharing the types directly makes the compiler the contract check with no generator and no drift between a description
    and the code; plain JavaScript was rejected as it leaves mismatches to runtime, and generated per-tier types as they
    reintroduce an intermediate description to keep in sync.

##  DECISION: Vue.js single-page client with headless widgets {{vue-client}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:browser-compat]], [[REQUIREMENT:mobile-usability]], [[REQUIREMENT:config-latency]]
-   AFFECTS:      [[COMPONENT:client]], [[ASPECT:vite-build]]
-   DECIDES:      [[TACTIC:portability]], [[COMPONENT:ui-framework]], [[COMPONENT:widget-framework]], [[COMPONENT:build-tool]]
-   ALTERNATIVES: React, Svelte, server-rendered pages with progressive enhancement
-   WHEN:
    The attendee and operator screens run in any recent browser on managed and unmanaged desktop and mobile devices, react
    to server-pushed changes within seconds, and are styled to the corporate design without a native look.
-   WHAT:
    We build the client as a Vue.js single-page application composed of headless Reka UI widgets styled with Tailwind CSS,
    bundled by Vite into static files.
-   WHY:
    A reactive component model maps server-pushed state straight onto the screen, and headless widgets give accessible
    behavior while leaving the styling free; React was rejected for its heavier toolchain in a small team, Svelte for its
    thinner ecosystem, and server-rendered pages because they cannot follow live state without reloads.

##  DECISION: HAProxy as a two-stage router and proxy edge {{haproxy-edge}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:scalability]], [[REQUIREMENT:data-isolation]]
-   AFFECTS:      [[COMPONENT:router]], [[COMPONENT:proxy]], [[UNIT:router]], [[UNIT:proxy-pool]], [[TIER:middleware-tier]],
                  [[NODE:router]], [[NODE:proxy]]
-   DECIDES:      [[COMPONENT:reverse-proxy]]
-   ALTERNATIVES: nginx, Traefik, a managed cloud load balancer
-   WHEN:
    Ten thousand long-lived WebSocket connections per event have to enter one hardened data center entry point and be
    spread across the per-environment proxy and relay instances, with dev, QA, and production separated at the edge.
-   WHAT:
    We terminate all traffic at one HAProxy router process per entry point, firewalled by NFTables, which round-robins it
    to a pool of HAProxy proxy instances per environment forwarding to the relay brokers.
-   WHY:
    HAProxy handles WebSocket upgrades and connection counts of this size with a mature configuration model and serves both
    stages with one product; nginx was rejected for its weaker connection-level balancing, Traefik for its
    container-centric configuration, and a managed load balancer because the solution is self-hosted.
-   CONSEQUENCES:
    The router is a single point of entry per data center and its capacity is the ceiling of the environment, and every
    routing change touches a hand-maintained configuration.

##  DECISION: Three network segments with an isolated database subnet {{network-segments}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:data-isolation]], [[REQUIREMENT:gdpr]]
-   AFFECTS:      [[NETWORK:internet]], [[NETWORK:backend]], [[NETWORK:data]], [[NODE:database]], [[TIER:database-tier]]
-   DECIDES:      [[TACTIC:network-isolation]]
-   ALTERNATIVES: one flat private network, database attached to the backend network
-   WHEN:
    The persisted personal data of the attendees lives on the database server, while the router, proxies, and relays face
    the Internet and are the parts most likely to be compromised.
-   WHAT:
    We segment the data center into a private backend VLAN carrying the router, proxies, relays, and services, and an
    isolated data subnet carrying only the database and the service containers, behind the TLS-only public Internet.
-   WHY:
    A compromised connection-handling node then still has no route to the database, which is the strongest containment
    available at no recurring cost on a private vSwitch; a flat network was rejected because it makes every node a
    stepping stone to the personal data.

##  DECISION: Single-host Docker Compose instead of a cluster orchestrator {{compose-orchestration}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:cost]], [[REQUIREMENT:scalability]], [[REQUIREMENT:maintenance-window]]
-   AFFECTS:      [[NODE:service]], [[NODE:proxy]], [[NODE:relay]]
-   DECIDES:      [[COMPONENT:container-orchestration]]
-   ALTERNATIVES: Kubernetes, Nomad
-   WHEN:
    Each environment runs a handful of proxy, relay, and service instances on self-managed servers, scaling is planned
    ahead of an event rather than reacting to load, and rollouts happen only between events.
-   WHAT:
    We run and recreate the containers of an environment with Docker Compose from one compose file per environment, adding
    instances by editing that file and recreating between events.
-   WHY:
    Planned, per-event scaling and rollouts between events need no scheduler, self-healing, or rolling updates, so a
    cluster would add an operating burden without a benefit; Kubernetes and Nomad were rejected because operating the
    cluster would cost more than the solution it hosts.
-   CONSEQUENCES:
    There is no automatic failover of a crashed instance during an event, and growing beyond one host per environment
    means revisiting this decision.

##  DECISION: PostgreSQL as the single self-hosted relational store {{postgresql-store}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:gdpr]], [[REQUIREMENT:recovery]], [[REQUIREMENT:cost]], [[PREMISE:eu-hosting]]
-   AFFECTS:      [[FV.database]], [[UNIT:database]], [[NODE:database]], [[TIER:database-tier]]
-   DECIDES:      [[TS.TIER:Database.COMPONENT:database]]
-   ALTERNATIVES: a document store (e.g. MongoDB), an embedded database (e.g. SQLite), a managed cloud database
-   WHEN:
    Events, channels, messages, tokens, and statistics form a relational model with transactional invariants, the data
    has to stay in the EU data center, and moderation and reporting need ad-hoc queries over it.
-   WHAT:
    We persist all state in one self-hosted PostgreSQL primary per environment, accessed by the service alone, with the
    filesystem beside it for the static assets.
-   WHY:
    A relational store with ACID transactions matches the model and the consistency the moderation needs, and PostgreSQL
    self-hosts on the same servers at no license cost; a document store was rejected for its weaker invariants, an
    embedded database for its single-writer limit across service instances, and a managed database as it leaves the
    self-hosted boundary.

##  DECISION: Typed SQL builder instead of a full ORM {{typed-sql}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:contract-safety]], [[REQUIREMENT:attendee-scale]]
-   AFFECTS:      [[COMPONENT:service]], [[FV.database]]
-   DECIDES:      [[COMPONENT:persistence-layer]]
-   ALTERNATIVES: Prisma, TypeORM
-   WHEN:
    The service persists the event state through TypeScript against PostgreSQL, the schema is generated spec-first from the
    data model, and the message handlers have to stay cheap under the load of a large event.
-   WHAT:
    We access PostgreSQL through Drizzle, a typed SQL query builder and schema definition layer, with the schema derived
    from the data model.
-   WHY:
    A thin typed layer keeps the end-to-end type safety of the shared contracts down to the database without the query
    overhead and abstraction leaks of a heavy ORM; Prisma was rejected for its separate schema language and query engine,
    TypeORM for its runtime cost and weaker typing.

##  DECISION: Logical dumps instead of continuous archiving for backup {{logical-dumps}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:recovery]], [[REQUIREMENT:cost]]
-   AFFECTS:      [[NODE:database]]
-   DECIDES:      [[TACTIC:recovery]], [[COMPONENT:database-backup]]
-   ALTERNATIVES: pgBackRest, Barman (continuous WAL archiving with point-in-time recovery)
-   WHEN:
    The recovery objective tolerates the loss of a day of changes (an hour right before an event), the data volume per
    event is small, and the backup must stay within the EU data center without a backup server of its own.
-   WHAT:
    We back up with logical pg_dump dumps taken nightly and before each event onto the backup storage of the data center
    and restore them with pg_restore onto a fresh server.
-   WHY:
    A logical dump is portable across PostgreSQL versions, needs no additional server, and meets the objectives as the data
    changes mainly before an event; continuous archiving was rejected because point-in-time recovery buys nothing for data
    that is anonymized at the end of every event anyway.

##  DECISION: Serve the static client from a CDN edge outside the data center {{cdn-edge}}

-   STATUS:       Accepted
-   DRIVEN-BY:    [[REQUIREMENT:asset-delivery]], [[REQUIREMENT:gdpr]], [[PREMISE:start-surge]]
-   AFFECTS:      [[TIER:edge-tier]], [[NODE:cdn]], [[ENTITY:cdn]]
-   DECIDES:      [[TACTIC:edge-delivery]]
-   ALTERNATIVES: serving the bundle from the data center router, a second Hetzner location
-   WHEN:
    Up to 10000 attendees download the client bundle within the same minute at the start of an event, the data center has
    one entry point, and the personal data has to stay within the EU.
-   WHAT:
    We serve the static client bundle and static resources from a Cloudflare CDN edge, while every live connection and
    every request carrying personal data goes to the data center directly.
-   WHY:
    The bundle is public, identical for everyone, and cacheable, exactly what a CDN absorbs at any scale, so the start surge
    never reaches the data center; serving it from the router was rejected because the surge would compete with the live
    connections for the same entry point.
-   CONSEQUENCES:
    Only static, non-personal content leaves the EU hosting boundary, but the CDN sees the client addresses, so the data
    processing agreement with the CDN provider is part of the GDPR compliance evidence.
