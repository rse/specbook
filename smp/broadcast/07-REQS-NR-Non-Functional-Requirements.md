---
Created:  2026-06-18 10:18
Modified: 2026-09-05 13:10
---

REQS: Non-Functional Requirements (NR)
======================================

-   REQUIREMENT: Concurrent Attendee Scale {{attendee-scale}};
    PRIORITY: MUST; CATEGORY: Performance;
    PREMISES: [[PREMISE:audience-bound]], [[PREMISE:start-surge]];
    METRIC: 2500 to 10000 concurrently connected attendees per event;
    The system MUST support between 2500 and 10000 attendees connected
    to a single event at the same time, BECAUSE msg Filmstudio video
    productions must reach an audience of this size simultaneously.

-   REQUIREMENT: Horizontal Scalability {{scalability}};
    PRIORITY: MUST; CATEGORY: Performance;
    PREMISES: [[PREMISE:audience-bound]], [[PREMISE:start-surge]];
    METRIC: 10000 concurrent WebSocket connections per event;
    The system MUST scale horizontally by running multiple proxy, relay,
    and server instances per runtime environment so that 10000
    concurrent WebSocket connections are served per event, BECAUSE a
    single instance cannot handle the required connection volume and
    response times.

-   REQUIREMENT: Streaming Quality {{streaming-quality}};
    PRIORITY: MUST; CATEGORY: Performance;
    PREMISES: [[PREMISE:two-languages]], [[PREMISE:provider-delivery]];
    METRIC: 1920x1080 pixels at 30 fps in 2 languages;
    The system MUST process and distribute video at 1080p30 (1920x1080
    at 30 fps) in both German and English, BECAUSE productions are
    delivered in this defined quality and the two required languages.

-   REQUIREMENT: Provider Failover Continuity {{failover}};
    PRIORITY: MUST; CATEGORY: Reliability;
    QUALIFIES: [[REQUIREMENT:provider-switch]];
    PREMISES: [[PREMISE:provider-delivery]];
    METRIC: all attendee clients on the fallback provider within 10 seconds;
    The system MUST switch to a fallback streaming provider during a
    running event with attendee clients following the switch
    automatically within seconds and without user interaction, BECAUSE
    provider outages must not interrupt the live audience.

-   REQUIREMENT: Cross-Browser Compatibility {{browser-compat}};
    PRIORITY: MUST; CATEGORY: Compatibility;
    QUALIFIES: [[REQUIREMENT:browser-access]];
    PREMISES: [[PREMISE:websocket-passage]];
    METRIC: the last 2 major versions of Chrome, Edge, Firefox, and Safari;
    The system MUST run in any reasonably recent version of the major
    web browsers (Chrome, Edge, Firefox, Safari) without plugins,
    BECAUSE attendees use heterogeneous managed and unmanaged devices.

-   REQUIREMENT: GDPR Compliance {{gdpr}};
    PRIORITY: MUST; CATEGORY: Compliance;
    QUALIFIES: [[REQUIREMENT:gdpr-eu]];
    PREMISES: [[PREMISE:eu-hosting]], [[PREMISE:message-personal-data]];
    METRIC: 100 % of personal data processed and hosted within the EU;
    The system MUST process all personal data in compliance with GDPR
    and host it exclusively within the EU (data center in Nürnberg,
    Germany), BECAUSE the operator is legally bound to European
    data-protection requirements.

-   REQUIREMENT: Privacy by Design {{privacy}};
    PRIORITY: MUST; CATEGORY: Security;
    PREMISES: [[PREMISE:message-personal-data]];
    METRIC: 0 attendee personal-data records retained after the event finish procedure;
    The system MUST retain attendee personal data only while an event
    runs, anonymizing or deleting all of it within the automated finish
    procedure when the event finishes, BECAUSE minimizing personal-data
    retention is the core privacy guarantee of the product.

-   REQUIREMENT: Unguessable Access Tokens {{token-strength}};
    PRIORITY: MUST; CATEGORY: Security;
    QUALIFIES: [[REQUIREMENT:individual-url]], [[REQUIREMENT:automatic-url]];
    PREMISES: [[PREMISE:email-at-hand]], [[PREMISE:email-delivery]], [[PREMISE:url-leakage]];
    METRIC: token expiry <= 5 minutes by default;
    The system MUST use unguessable event URLs and time-limited
    authorization tokens that by default expire within 5 minutes,
    BECAUSE weak access secrets would let unauthorized viewers join the
    event.

-   REQUIREMENT: Isolated Persistence Node {{data-isolation}};
    PRIORITY: MUST; CATEGORY: Security;
    QUALIFIES: [[REQUIREMENT:gdpr-eu]];
    PREMISES: [[PREMISE:message-personal-data]];
    METRIC: 0 routes to the database port from outside the business services;
    The system MUST keep the persistence node reachable from the business
    services alone, with no route from the Internet or from the
    connection-handling tiers, BECAUSE the persisted personal data is
    protected best by a node an attacker of the public entry point
    cannot even address.

-   REQUIREMENT: Event Setup Recovery {{recovery}};
    PRIORITY: MUST; CATEGORY: Reliability;
    PREMISES: [[PREMISE:eu-hosting]];
    METRIC: RPO <= 24 hours (<= 1 hour right before an event) and RTO <= 2 hours;
    The system MUST allow the event setups and their messages to be
    restored after a database loss within 2 hours from a backup at most
    24 hours old, and at most 1 hour old right before an event, BECAUSE
    a prepared event must not have to be re-entered under time pressure
    on the day of the broadcast.

-   REQUIREMENT: Event-Safe Maintenance {{maintenance-window}};
    PRIORITY: MUST; CATEGORY: Reliability;
    METRIC: 0 rollouts or reconfigurations while an event runs;
    The system MUST be upgraded and reconfigured only while no event
    runs, BECAUSE a live audience cannot be asked to wait for a restart.

-   REQUIREMENT: Live Configuration Latency {{config-latency}};
    PRIORITY: SHOULD; CATEGORY: Performance;
    QUALIFIES: [[REQUIREMENT:config-propagation]];
    METRIC: propagation to all connected clients <= 2 seconds;
    The system SHOULD propagate an event configuration change to all
    connected clients within 2 seconds, BECAUSE operators expect toggles
    such as enabling chat to take effect near-instantly for the live
    audience.

-   REQUIREMENT: Per-Event Cost Efficiency {{cost}};
    PRIORITY: SHOULD; CATEGORY: Constraint;
    PREMISES: [[PREMISE:eu-hosting]];
    METRIC: recurring cost per event below the equivalent Azure or AWS hosting cost;
    The system SHOULD minimize the recurring cost per event by
    self-hosting on Hetzner infrastructure rather than Azure or AWS,
    excluding one-off development cost, BECAUSE low operating cost per
    event is a primary economic justification for building the
    solution.

-   REQUIREMENT: Interaction Abuse Throttling {{throttling}};
    PRIORITY: SHOULD; CATEGORY: Security;
    QUALIFIES: [[REQUIREMENT:chat]], [[REQUIREMENT:questions]];
    PREMISES: [[PREMISE:interaction-abuse]];
    METRIC: <= 10 submissions per user per minute by default, configurable per event;
    The system SHOULD throttle chat and question submissions to a
    configurable maximum per user per minute, BECAUSE rate limiting
    prevents denial-of-service abuse of the interaction channels.

-   REQUIREMENT: Start-Surge Asset Delivery {{asset-delivery}};
    PRIORITY: SHOULD; CATEGORY: Performance;
    QUALIFIES: [[REQUIREMENT:browser-access]];
    PREMISES: [[PREMISE:start-surge]];
    METRIC: client bundle delivered within 3 seconds at 10000 simultaneous joins;
    The system SHOULD deliver the static client bundle to each of 10000
    attendees joining within the same minute in at most 3 seconds,
    BECAUSE the audience arrives in a surge right at the start of the
    event and must not be held back by the download.

-   REQUIREMENT: Compile-Time Contract Safety {{contract-safety}};
    PRIORITY: SHOULD; CATEGORY: Maintainability;
    METRIC: 100 % of the client/server message contracts type-checked at build time;
    The system SHOULD catch every mismatch between the message contracts
    of client and server at build time instead of at runtime, BECAUSE a
    contract slip surfacing only during a live event is the costliest
    defect the solution can have.

-   REQUIREMENT: Live Diagnosability {{observability}};
    PRIORITY: SHOULD; CATEGORY: Maintainability;
    QUALIFIES: [[REQUIREMENT:event-stats]], [[REQUIREMENT:debug-stats]];
    METRIC: event counters at most 5 minutes old, every login failure traceable from token states and log;
    The system SHOULD let the administrator see the attendee, channel,
    and authentication-flow counters of a running event with at most 5
    minutes delay and trace every login failure from the recorded token
    states and the log, BECAUSE capacity and access problems must be
    diagnosed while the audience is still online.

-   REQUIREMENT: Mobile Usability {{mobile-usability}};
    PRIORITY: COULD; CATEGORY: Usability;
    QUALIFIES: [[REQUIREMENT:mobile]];
    METRIC: attendee screens fully usable at 360 px viewport width in portrait and landscape;
    The system COULD render the attendee experience responsively for
    mobile phones in landscape and portrait orientation, BECAUSE a
    substantial share of attendees join from mobile devices.
