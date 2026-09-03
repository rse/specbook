---
Created:  2026-06-18 10:18
Modified: 2026-09-03 14:30
---

#   ARCH: Deployment View (DP)

##  TIER: Client {{client-tier}}

-   LOCATION: Attendee and operator devices
-   STACK:    [[TS.Client]]

The client tier is the web client running on the devices of the audience and the operators, BECAUSE the interactive part
of the solution must run where the people are, without installation.

##  TIER: Edge {{edge-tier}}

-   LOCATION: Cloudflare edge network

The edge tier delivers the static client bundle from a global content delivery network, BECAUSE static content is best
served close to a large, distributed audience instead of from the data center.

##  TIER: Data Center {{datacenter}}

-   LOCATION: Hetzner cloud (Nürnberg, DE), separated into dev, QA, and production environments

The data center tier groups all server-side tiers within one EU-resident hosting location, BECAUSE EU-resident
self-hosting satisfies GDPR and minimizes per-event cost versus public cloud.

##  TIER: Middleware {{middleware-tier}}

-   PART-OF:  [[DP.datacenter]]
-   STACK:    [[TS.Middleware]]

The middleware tier terminates, balances, and relays the client connections between the Internet and the business
services, BECAUSE sustaining thousands of bidirectional connections is a concern separate from the business logic.

##  TIER: Server {{server-tier}}

-   PART-OF:  [[DP.datacenter]]
-   STACK:    [[TS.Server]]

The server tier runs the business services and the orchestrator, BECAUSE the business logic must scale and change
independently of the connection handling and the persistence.

##  TIER: Database {{database-tier}}

-   PART-OF:  [[DP.datacenter]]
-   STACK:    [[TS.Database]]

The database tier holds the authoritative persistent state, BECAUSE durable state must reside on a protected tier
reachable from the business services alone.

##  NODE: Client Device {{client-device}}

-   KIND:        Device
-   TIER:        [[DP.client-tier]]
-   PLATFORM:    Browser (desktop, tablet, mobile)
-   HOSTS:       [[FV.client]], [[FV.client-nlp]]
-   INSTANCES:   1 per attendee or operator
-   CONNECTS-TO: [[DP.cdn]], [[DP.router]]
-   NETWORKS:    [[DP.internet]]

The attendee and operator devices run the web client and local NLP entirely in the browser, BECAUSE the solution requires
no installation and must run on both managed and unmanaged devices.

##  NODE: Cloudflare CDN {{cdn}}

-   KIND:        Managed
-   TIER:        [[DP.edge-tier]]
-   PLATFORM:    Cloudflare edge network
-   CONNECTS-TO: [[DP.router]]
-   NETWORKS:    [[DP.internet]]

A Cloudflare CDN edge distributes the static client bundle and static resources close to users, BECAUSE static content must
be delivered quickly and stably to a large, distributed audience.

##  NODE: Edge Router {{router}}

-   KIND:        Server
-   TIER:        [[DP.middleware-tier]]
-   PLATFORM:    Linux x86-64
-   HOSTS:       [[CO.router]]
-   INSTANCES:   1 per data center entry point
-   CONNECTS-TO: [[DP.proxy]]
-   NETWORKS:    [[DP.internet]], [[DP.backend]]

The edge router terminates inbound HTTP and WebSocket traffic and round-robins it to per-environment proxies, BECAUSE a
single hardened entry point must balance load and isolate environments.

##  NODE: Proxy Servers {{proxy}}

-   KIND:        Server
-   TIER:        [[DP.middleware-tier]]
-   PLATFORM:    Linux x86-64
-   HOSTS:       [[CO.proxy-pool]]
-   INSTANCES:   0..n per environment
-   CONNECTS-TO: [[DP.relay]]
-   NETWORKS:    [[DP.backend]]

The proxy servers run several reverse proxy instances per environment forwarding to the relay brokers, BECAUSE
per-environment scaling of request handling needs multiple proxy instances.

##  NODE: Relay Brokers {{relay}}

-   KIND:        Server
-   TIER:        [[DP.middleware-tier]]
-   PLATFORM:    Linux x86-64
-   HOSTS:       [[CO.relay-pool]]
-   INSTANCES:   0..n per environment
-   NETWORKS:    [[DP.backend]]

The relay brokers run several MQTT broker instances per environment holding the live WebSocket connections, BECAUSE
sustaining thousands of bidirectional connections requires a dedicated, scalable messaging node.

##  NODE: Service Containers {{service}}

-   KIND:        Container
-   TIER:        [[DP.server-tier]]
-   PLATFORM:    OCI containers on Linux x86-64
-   HOSTS:       [[CO.service-loop]], [[FV.junction]]
-   INSTANCES:   0..n per environment
-   CONNECTS-TO: [[DP.relay]], [[DP.database]]
-   NETWORKS:    [[DP.backend]], [[DP.data]]

The service containers run the Node.js business services and the Junction orchestrator per environment, BECAUSE
containerized services give reproducible, independently scalable business logic.

##  NODE: Database Server {{database}}

-   KIND:        Server
-   TIER:        [[DP.database-tier]]
-   PLATFORM:    Linux x86-64
-   HOSTS:       [[CO.database]]
-   INSTANCES:   1 primary per environment
-   NETWORKS:    [[DP.data]]

The database server runs PostgreSQL with filesystem asset storage as the authoritative persistence node, BECAUSE durable
state must reside on a protected, non-public node.

##  NETWORK: Public Internet {{internet}}

-   SCOPE:      Public
-   PROTOCOLS:  HTTPS 443, WSS 443
-   ADDRESSING: Public IPv4 and IPv6

The public Internet carries all attendee and operator traffic to the CDN and the edge router over TLS only, BECAUSE the
audience joins from arbitrary, untrusted networks.

##  NETWORK: Backend Network {{backend}}

-   SCOPE:      Private
-   PROTOCOLS:  HTTP, WS, WSS
-   ADDRESSING: Hetzner private vSwitch, per-environment VLAN

The backend network connects the router, the proxies, the relays, and the service containers within the data center,
BECAUSE the internal hops must stay unreachable from the Internet while remaining cheap to scale per environment.

##  NETWORK: Data Network {{data}}

-   SCOPE:      Isolated
-   PROTOCOLS:  TCP 5432
-   ADDRESSING: Hetzner private vSwitch, database subnet

The data network connects the service containers to the database server only, BECAUSE the persistence node must be
reachable from the business services alone.

