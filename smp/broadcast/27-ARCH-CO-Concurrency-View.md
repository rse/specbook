---
Created:  2026-06-18 10:18
Modified: 2026-09-02 12:28
---

ARCH: Concurrency View (CO)
===========================

##  RESOURCE: Client Connections {{client-connections}}

-   KIND:             Queue
-   CAPACITY:         10000

The accepted client connections the router has assigned but no proxy instance has taken over yet, bounded by the
connection limit of the router, BECAUSE a full backlog has to reject new connections at the edge instead of exhausting
the proxies.

##  RESOURCE: Broker Connections {{broker-connections}}

-   KIND:             Queue
-   CAPACITY:         10000

The WebSocket connections the proxies forward to the MQTT brokers, bounded by the maximum number of concurrent
connections per environment, BECAUSE the brokers are dimensioned for exactly this number of clients.

##  RESOURCE: Service Topics {{service-topics}}

-   KIND:             Topic
-   CAPACITY:         1000

The MQTT messages queued on the service topics for the service event loops, bounded by the queued message limit of the
brokers, BECAUSE a bounded broker queue sheds load during a burst instead of letting the backlog grow without limit.

##  RESOURCE: Database Connections {{db-connections}}

-   KIND:             Pool
-   CAPACITY:         10
-   TOKENS:           10

The pooled PostgreSQL connections of a service instance, all of them free initially, each one taken for a transaction
and returned once the database answered, BECAUSE a fixed pool caps the concurrent transactions the database has to
serve.

##  RESOURCE: Pending Queries {{pending-queries}}

-   KIND:             Queue

The transactions sent over a taken connection and not yet answered by the database, bounded only through the pool their
connections come from, BECAUSE the pool already limits them and a second bound would merely duplicate it.

##  UNIT: Router Process {{router}}

-   KIND:             Process
-   HOSTS:            [[COMPONENT:router]]
-   MULTIPLICITY:     1 per data center entry point
-   COORDINATES-WITH: [[UNIT:proxy-pool]]
-   COORDINATION:     stateless round-robin distribution
-   PRODUCES:         [[RESOURCE:client-connections]]

The router runs as a single front-door process per data center, distributing connections across environments and proxy
instances, BECAUSE a stateless balancer can spread load without holding per-connection state.

##  UNIT: Proxy Pool {{proxy-pool}}

-   KIND:             Pool
-   HOSTS:            [[COMPONENT:proxy]]
-   MULTIPLICITY:     0..n instances per environment
-   COORDINATES-WITH: [[UNIT:relay-pool]], [[UNIT:service-loop]]
-   COORDINATION:     shared-nothing behind the router
-   CONSUMES:         [[RESOURCE:client-connections]]
-   PRODUCES:         [[RESOURCE:broker-connections]]

The proxy layer runs as a pool of independent, stateless reverse-proxy instances per environment, BECAUSE request handling
must scale out horizontally to absorb connection spikes.

##  UNIT: Relay Pool {{relay-pool}}

-   KIND:             Pool
-   HOSTS:            [[COMPONENT:relay]]
-   MULTIPLICITY:     0..n MQTT broker instances per environment
-   COORDINATES-WITH: [[UNIT:service-loop]]
-   COORDINATION:     MQTT topic subscriptions and broker bridging
-   CONSUMES:         [[RESOURCE:broker-connections]]
-   PRODUCES:         [[RESOURCE:service-topics]]

The relay layer runs as a pool of Mosquitto/MQTT-Plus broker instances, each maintaining thousands of WebSocket connections and
fanning out per-event topics, BECAUSE sustaining up to 10000 concurrent connections requires horizontal broker scaling.

##  UNIT: Service Event Loop {{service-loop}}

-   KIND:             EventLoop
-   HOSTS:            [[COMPONENT:service]], [[COMPONENT:auth]], [[COMPONENT:translation]]
-   MULTIPLICITY:     0..n Node.js instances per environment
-   COORDINATES-WITH: [[UNIT:database]]
-   COORDINATION:     MQTT message passing and database transactions
-   CONSUMES:         [[RESOURCE:service-topics]], [[RESOURCE:db-connections]]
-   PRODUCES:         [[RESOURCE:pending-queries]]

The service runs as Node.js single-threaded event loops that react to MQTT messages and serialize state changes through
database transactions, BECAUSE an event-loop model handles many concurrent I/O-bound interactions without shared-memory
races.

##  UNIT: Statistics Scheduler {{stats-scheduler}}

-   KIND:             Task
-   PART-OF:          [[UNIT:service-loop]]
-   HOSTS:            [[COMPONENT:statistics]]
-   MULTIPLICITY:     1 active per running event
-   COORDINATES-WITH: [[UNIT:database]]
-   COORDINATION:     timer-driven, writes via database transactions
-   CONSUMES:         [[RESOURCE:db-connections]]
-   PRODUCES:         [[RESOURCE:pending-queries]]

A scheduled task on the service event loop captures a statistics snapshot every five minutes for each running event, BECAUSE
periodic cumulative counts must be produced on a fixed cadence independent of user activity.

##  UNIT: Database Server {{database}}

-   KIND:             Process
-   HOSTS:            [[FV.database]]
-   MULTIPLICITY:     1 primary per environment
-   COORDINATION:     ACID transactions with optimistic concurrency via the ORM
-   CONSUMES:         [[RESOURCE:pending-queries]]
-   PRODUCES:         [[RESOURCE:db-connections]]

PostgreSQL runs as the single authoritative persistence process per environment, serializing concurrent writes through
transactions, BECAUSE a single source of truth with ACID guarantees keeps event state consistent under concurrency.
