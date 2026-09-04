---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
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

-   REQUIREMENT: Mobile Usability {{mobile-usability}};
    PRIORITY: COULD; CATEGORY: Usability;
    QUALIFIES: [[REQUIREMENT:mobile]];
    METRIC: attendee screens fully usable at 360 px viewport width in portrait and landscape;
    The system COULD render the attendee experience responsively for
    mobile phones in landscape and portrait orientation, BECAUSE a
    substantial share of attendees join from mobile devices.
