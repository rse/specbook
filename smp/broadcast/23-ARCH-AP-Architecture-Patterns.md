---
Created:  2026-10-09 15:00
Modified: 2026-10-09 15:00
---

ARCH: Architecture Patterns (AP)
================================

-   PATTERN: Publish-Subscribe {{pub-sub}};
    PRINCIPLES: [[PRINCIPLE:stateless-tiers]];
    DRIVEN-BY: [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:config-latency]];
    Every live change is published once onto a per-event topic and fanned
    out by a broker tier to all subscribed clients, so the publisher never
    knows its audience, BECAUSE a single publish reaching thousands of
    subscribers is the only fan-out which scales with the audience.

-   PATTERN: Load-Balanced Stateless Pool {{stateless-pool}};
    PRINCIPLES: [[PRINCIPLE:stateless-tiers]];
    DRIVEN-BY: [[REQUIREMENT:scalability]];
    A tier terminating attendee connections runs as a pool of identical,
    stateless instances behind a round-robin balancer, so capacity grows
    by adding an instance, BECAUSE interchangeable instances are the only
    ones which can be multiplied without coordination.

-   PATTERN: Reverse Proxy Edge {{reverse-proxy-edge}};
    PRINCIPLES: [[PRINCIPLE:stateless-tiers]], [[PRINCIPLE:isolated-persistence]];
    DRIVEN-BY: [[REQUIREMENT:data-isolation]];
    USES: [[PATTERN:stateless-pool]];
    All public traffic enters through a reverse proxy tier which
    terminates TLS, separates the environments, and forwards into a
    private backend network, so no backend instance is ever reachable
    directly, BECAUSE one controlled entry point is easier to secure and
    to scale than many.

-   PATTERN: Modular Monolith {{modular-monolith}};
    PRINCIPLES: [[PRINCIPLE:one-process]];
    The business logic runs as one deployable process whose capabilities
    are separated into modules with explicit internal interfaces, so a
    module can be split off into a service later without redesign,
    BECAUSE module boundaries cost nothing at runtime while service
    boundaries cost an operations unit each.

-   PATTERN: Shared Kernel {{shared-kernel}};
    PRINCIPLES: [[PRINCIPLE:shared-contracts]];
    DRIVEN-BY: [[REQUIREMENT:contract-safety]];
    The client and the server share one common module holding the types,
    topics, and validation rules both sides agree on, imported by both and
    changed only in step, BECAUSE a contract existing once in the code
    cannot drift.

