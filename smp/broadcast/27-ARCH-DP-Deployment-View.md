---
Created:  2026-06-18 10:18
Modified: 2026-09-02 12:28
---

#   ARCH: Deployment View (DP)

##  NODE: Client Device {{client-device}}

-   KIND:     Device
-   PLATFORM: Recent web browser on desktop, tablet, or mobile
-   HOSTS:    [[FV.client]], [[FV.client-nlp]]
-   NETWORK:  Public internet over HTTPS and WSS

The attendee and operator devices run the web client and local NLP entirely in the browser, BECAUSE the solution requires
no installation and must run on both managed and unmanaged devices.

##  NODE: Cloudflare CDN {{cdn}}

-   KIND:     Managed
-   PLATFORM: Cloudflare edge network
-   NETWORK:  Public edge, TLS 443

A Cloudflare CDN edge distributes the static client bundle and static resources close to users, BECAUSE static content must
be delivered quickly and stably to a large, distributed audience.

##  NODE: Edge Router {{router}}

-   KIND:     Server
-   PLATFORM: Linux with HAProxy and NFTables
-   HOSTS:    [[CO.router]]
-   NETWORK:  Public ingress, TLS 443, environment separation

The edge router terminates inbound HTTP and WebSocket traffic and round-robins it to per-environment proxies, BECAUSE a
single hardened entry point must balance load and isolate environments.

##  NODE: Proxy Tier {{proxy}}

-   KIND:     Server
-   PLATFORM: Linux with HAProxy
-   HOSTS:    [[CO.proxy-pool]]
-   NETWORK:  Private network behind the router

The proxy tier runs several HAProxy instances per environment forwarding to the relay tier, BECAUSE per-environment scaling
of request handling needs multiple proxy instances.

##  NODE: Relay Tier {{relay}}

-   KIND:     Server
-   PLATFORM: Linux with Mosquitto and MQTT-Plus
-   HOSTS:    [[CO.relay-pool]]
-   NETWORK:  Private network, WSS upstream

The relay tier runs several MQTT broker instances per environment holding the live WebSocket connections, BECAUSE
sustaining thousands of bidirectional connections requires a dedicated, scalable messaging tier.

##  NODE: Service Tier {{service}}

-   KIND:     Container
-   PLATFORM: Junction container running Node.js
-   HOSTS:    [[CO.service-loop]], [[FV.junction]]
-   NETWORK:  Private network to relay and database

The service tier runs the Node.js business services and the Junction orchestrator in containers per environment, BECAUSE
containerized services give reproducible, independently scalable business logic.

##  NODE: Database Tier {{database}}

-   KIND:     Server
-   PLATFORM: Linux with PostgreSQL and filesystem storage
-   HOSTS:    [[CO.database]]
-   NETWORK:  Private network, no public exposure

The database tier runs PostgreSQL with filesystem asset storage as the authoritative persistence node, BECAUSE durable
state must reside on a protected, non-public node.

##  NODE: Hetzner Data Center {{datacenter}}

-   KIND:     Cluster
-   PLATFORM: Hetzner infrastructure in Nürnberg, Germany
-   HOSTS:    [[CO.router]], [[CO.proxy-pool]], [[CO.relay-pool]], [[CO.service-loop]], [[CO.database]]
-   NETWORK:  EU-resident private network with public ingress

All server-side tiers are hosted in the Hetzner Nürnberg data center separated into dev, QA, and production environments,
BECAUSE EU-resident self-hosting satisfies GDPR and minimizes per-event cost versus public cloud.
