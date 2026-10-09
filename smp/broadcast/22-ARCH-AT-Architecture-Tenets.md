---
Created:  2026-10-09 14:00
Modified: 2026-10-09 14:00
---

ARCH: Architecture Tenets (AT)
==============================

-   MAXIM: Privacy over Convenience {{privacy-first}};
    DRIVEN-BY: [[REQUIREMENT:gdpr]], [[REQUIREMENT:privacy]], [[PREMISE:message-personal-data]];
    Whenever a design can hold less personal data or hold it for a shorter
    time, it does so, even at the cost of a feature or a convenience,
    BECAUSE the attendees are a captive audience whose data the solution
    merely borrows for the duration of an event.

-   MAXIM: Scale Out over Scale Up {{scale-out}};
    DRIVEN-BY: [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:scalability]], [[PREMISE:start-surge]];
    The capacity of the solution grows by adding instances of a tier, never
    by growing a single instance, BECAUSE the attendee count of an event is
    bounded only by the audience and a surge arrives within minutes.

-   MAXIM: Buy before Build {{buy-before-build}};
    DRIVEN-BY: [[REQUIREMENT:cost]], [[PREMISE:provider-delivery]];
    A capability a mature product or provider already delivers is taken
    from it and merely integrated, BECAUSE the solution earns its value in
    the live interaction, not in re-implementing video delivery, brokering,
    or storage.

-   MAXIM: Simplicity over Flexibility {{simplicity}};
    DRIVEN-BY: [[REQUIREMENT:maintenance-window]], [[PREMISE:eu-hosting]];
    The solution takes the simplest structure which satisfies the
    requirements and defers every generalization until a second concrete
    need exists, BECAUSE a small team operates it on its own
    infrastructure during live events.

-   PRINCIPLE: Stateless Connection Tiers {{stateless-tiers}};
    MAXIMS: [[MAXIM:scale-out]];
    DRIVEN-BY: [[REQUIREMENT:attendee-scale]];
    IMPLICATIONS: Every instance of the proxy and relay tiers is interchangeable, so an instance can be added, replaced, or removed during an event without a client noticing;
    A tier which terminates attendee connections MUST NOT hold state a
    peer instance cannot reconstruct, BECAUSE only an interchangeable
    instance can be multiplied behind a round-robin router.

-   PRINCIPLE: No Permanent Identity {{no-permanent-identity}};
    MAXIMS: [[MAXIM:privacy-first]];
    DRIVEN-BY: [[REQUIREMENT:token-strength]];
    IMPLICATIONS: Access is granted per event through a one-time factor, every attendee record is bound to its event, and nothing survives the retention of that event;
    The solution MUST NOT keep an attendee identity beyond the event it
    was created for, BECAUSE a permanent account is personal data the
    solution has no need to hold.

-   PRINCIPLE: Logical over Physical Resources {{logical-resources}};
    MAXIMS: [[MAXIM:buy-before-build]];
    DRIVEN-BY: [[REQUIREMENT:failover]];
    IMPLICATIONS: Every provider-delivered capability is addressed through a logical element of the solution which maps onto one of several physical provider resources, so a provider can be switched live;
    A provider resource MUST be referenced through a logical element of
    the solution and never directly, BECAUSE a bought capability must stay
    replaceable to keep the buy decision cheap.

-   PRINCIPLE: One Service Process {{one-process}};
    MAXIMS: [[MAXIM:simplicity]];
    The business logic SHOULD run as a single modular service process,
    BECAUSE the scaling pressure lies in the connection tiers, not in the
    logic.

-   PRINCIPLE: Isolated Persistence {{isolated-persistence}};
    MAXIMS: [[MAXIM:privacy-first]];
    DRIVEN-BY: [[REQUIREMENT:data-isolation]];
    The persistence tier MUST be reachable from the service tier alone,
    BECAUSE the personal data of an audience deserves a boundary the
    connection tiers cannot cross.

-   PRINCIPLE: Shared Contracts in Code {{shared-contracts}};
    MAXIMS: [[MAXIM:simplicity]];
    DRIVEN-BY: [[REQUIREMENT:contract-safety]];
    IMPLICATIONS: The types and topics the client and the server exchange are defined once in a module both import, so a contract change breaks the build instead of the event;
    A contract between the client and the server MUST exist exactly once
    in the code, BECAUSE a duplicated contract drifts and a drifted
    contract fails live.

