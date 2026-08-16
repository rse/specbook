---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   ARCH: Information View (IV)

##  ASPECT: Event-Centric Persistence {{event-persistence}}

-   CONCERN:   Persistence
-   ENTITIES:  [[ENTITY:Event]], [[ENTITY:Channel]], [[ENTITY:Resource]], [[ENTITY:Role]]
-   OWNER:     ARCH-FV-service
-   LIFECYCLE: created in planning, edited while running, deleted explicitly by a manager

The service persists every event together with its channels, resources, and roles as one aggregate in PostgreSQL via
Drizzle, BECAUSE the data model is event-centric and all entities hang off the owning event.

##  ASPECT: Message and Translation Store {{message-store}}

-   CONCERN:   Persistence
-   ENTITIES:  [[ENTITY:Message]], [[ENTITY:MessageText]], [[ENTITY:QuestionTag]]
-   OWNER:     ARCH-FV-service
-   LIFECYCLE: created on submission, translated and moderated, anonymized or deleted on finish

Each message is stored once with its language-specific texts and tags, retaining the original language alongside translated
variants, BECAUSE the human original must always be distinguishable from AI-translated text.

##  ASPECT: Live Message Flow {{message-flow}}

-   CONCERN:   Flow
-   ENTITIES:  [[ENTITY:Message]]
-   OWNER:     ARCH-FV-relay
-   LIFECYCLE: published to MQTT topics, fanned out to subscribers, persisted by the service

Messages, likes, and state changes flow as MQTT messages on per-event topics through the relay to all subscribed clients while
the service persists authoritative state, BECAUSE real-time fan-out to thousands of clients is the system's core data flow.

##  ASPECT: Configuration Propagation {{config-flow}}

-   CONCERN:   Flow
-   ENTITIES:  [[ENTITY:Event]]
-   OWNER:     ARCH-FV-service
-   LIFECYCLE: changed by an operator, published to all clients, applied without reload

Event configuration changes are persisted and immediately published over MQTT so connected clients reconcile their view,
BECAUSE live toggles such as enabling chat must reach the audience within seconds.

##  ASPECT: Token and Session Ownership {{auth-ownership}}

-   CONCERN:   Ownership
-   ENTITIES:  [[ENTITY:AuthorizationToken]], [[ENTITY:SessionToken]], [[ENTITY:User]]
-   OWNER:     ARCH-FV-auth
-   LIFECYCLE: issued at provisioning or login, used for access, deleted on finish

The authentication module exclusively owns authorization tokens, session tokens, and the helper user records, enforcing one
active session per user per event, BECAUSE access secrets must have a single authoritative owner.

##  ASPECT: Statistics Snapshots {{stats-retention}}

-   CONCERN:   Retention
-   ENTITIES:  [[ENTITY:EventStatistic]], [[ENTITY:ChannelStatistic]], [[ENTITY:UserStatistic]]
-   OWNER:     ARCH-FV-statistics
-   LIFECYCLE: written every five minutes while running, retained for reporting after finish

Statistics are appended as immutable periodic snapshots during a running event and retained past finish for the manager's
trend reporting, BECAUSE trends require a durable time series independent of the anonymized live data.

##  ASPECT: Anonymization on Finish {{anonymization}}

-   CONCERN:   Retention
-   ENTITIES:  [[ENTITY:Message]], [[ENTITY:User]], [[ENTITY:AuthorizationToken]], [[ENTITY:SessionToken]]
-   OWNER:     ARCH-FV-service
-   LIFECYCLE: triggered on event finish, irreversibly removing personal data

On event finish the service runs the anonymization procedure that reduces likes to counts, anonymizes sender names, and
deletes tokens, users, and moderator roles, BECAUSE privacy by design forbids retaining personal data beyond the event.
