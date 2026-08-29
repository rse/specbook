---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

ARCH: Decision Record (DR)
==========================

##  DECISION: Use MQTT over WebSockets as the live transport {{mqtt-transport}}

-   STATUS:   accepted
-   AFFECTS:  [[FV.relay]], [[FV.service]]
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

##  DECISION: Self-host on Hetzner instead of public cloud {{self-host}}

-   STATUS:   accepted
-   AFFECTS:  [[DP.datacenter]]
-   WHEN:
    The solution must be GDPR-compliant with EU data residency, and a primary economic goal is to minimize recurring cost per
    event, the solution having been built specifically to replace a costlier third-party platform.
-   WHAT:
    We operate all server tiers on self-managed Hetzner infrastructure in Nürnberg, Germany, separated into dev, QA, and
    production environments, rather than on Azure or AWS.
-   WHY:
    Hetzner delivers EU-resident hosting at a fraction of hyperscaler cost, satisfying both the data-residency and
    cost-minimization forces; public cloud was rejected because its per-event egress and compute pricing would undermine the
    cost goal that justified building the solution at all.

##  DECISION: Privacy by design with no permanent user accounts {{no-accounts}}

-   STATUS:   accepted
-   AFFECTS:  [[FV.auth]], [[FV.service]]
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

-   STATUS:   accepted
-   AFFECTS:  [[FV.auth]]
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

-   STATUS:   accepted
-   AFFECTS:  [[FV.service]], [[FV.client]]
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
