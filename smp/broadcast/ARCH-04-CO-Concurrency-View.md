---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

ARCH: Concurrency View (CO)
===========================

##  UNIT: Router Process {{router}}

-   KIND:         Process
-   HOSTS:        [[FV.router]]
-   MULTIPLICITY: 1 per data center entry point
-   COORDINATION: stateless round-robin distribution

The router runs as a single front-door process per data center distributing connections across environments and proxy
instances, BECAUSE a stateless balancer can spread load without holding per-connection state.

##  UNIT: Proxy Pool {{proxy-pool}}

-   KIND:         Pool
-   HOSTS:        [[FV.proxy]]
-   MULTIPLICITY: 0..n instances per environment
-   COORDINATION: shared-nothing behind the router

The proxy layer runs as a pool of independent, stateless reverse-proxy instances per environment, BECAUSE request handling
must scale out horizontally to absorb connection spikes.

##  UNIT: Relay Pool {{relay-pool}}

-   KIND:         Pool
-   HOSTS:        [[FV.relay]]
-   MULTIPLICITY: 0..n MQTT broker instances per environment
-   COORDINATION: MQTT topic subscriptions and broker bridging

The relay layer runs as a pool of Mosquitto/MQTT-Plus broker instances each maintaining thousands of WebSocket connections and
fanning out per-event topics, BECAUSE sustaining up to 10000 concurrent connections requires horizontal broker scaling.

##  UNIT: Service Event Loop {{service-loop}}

-   KIND:         EventLoop
-   HOSTS:        [[FV.service]], [[FV.auth]], [[FV.translation]]
-   MULTIPLICITY: 0..n Node.js instances per environment
-   COORDINATION: MQTT message passing and database transactions

The service runs as Node.js single-threaded event loops that react to MQTT messages and serialize state changes through
database transactions, BECAUSE an event-loop model handles many concurrent I/O-bound interactions without shared-memory
races.

##  UNIT: Statistics Scheduler {{stats-scheduler}}

-   KIND:         Thread
-   HOSTS:        [[FV.statistics]]
-   MULTIPLICITY: 1 active per running event
-   COORDINATION: timer-driven, writes via database transactions

A scheduled task within the service captures a statistics snapshot every five minutes for each running event, BECAUSE
periodic cumulative counts must be produced on a fixed cadence independent of user activity.

##  UNIT: Database Server {{database}}

-   KIND:         Process
-   HOSTS:        [[FV.database]]
-   MULTIPLICITY: 1 primary per environment
-   COORDINATION: ACID transactions with optimistic concurrency via the ORM

PostgreSQL runs as the single authoritative persistence process per environment serializing concurrent writes through
transactions, BECAUSE a single source of truth with ACID guarantees keeps event state consistent under concurrency.
