---
Created:  2026-06-18 10:18
Modified: 2026-08-30 01:12
---

#   ARCH: Functionality View (FV)

![](23-ARCH-FV-Functionality-View-1.svg)

##  COMPONENT: Web Client {{client}}

-   KIND:           Subsystem
-   RESPONSIBILITY: Render the attendee and operator UI and drive all user interaction.
-   DEPENDS-ON:     [[FV.relay]], [[FV.client-nlp]]

The Vue.js single-page application renders the panel, attendee, studio, moderator, and manager screens, plays the video
stream, and exchanges live data over MQTT, BECAUSE msg.Broadcast delivers its entire experience in the browser.

##  COMPONENT: Client NLP {{client-nlp}}

-   KIND:           Module
-   RESPONSIBILITY: Perform lightweight client-side sentiment and language detection on input.

The client NLP module runs local sentiment analysis and language identification on attendee input before it is sent,
BECAUSE filtering at the source reduces server load and can prevent improper submissions.

##  COMPONENT: Router {{router}}

-   KIND:           Connector
-   RESPONSIBILITY: Route incoming requests across proxy instances of an environment.

The router (HAProxy with NFTables) directs incoming HTTP and WebSocket traffic to proxy instances using round-robin and
separates the dev, QA, and production environments, BECAUSE traffic must be balanced and environments isolated at the edge.

##  COMPONENT: Proxy {{proxy}}

-   KIND:           Connector
-   RESPONSIBILITY: Proxy environment HTTP and WebSocket requests to the relay layer.
-   DEPENDS-ON:     [[FV.relay]]

The proxy layer (HAProxy) forwards requests of a specific environment to the relay layer and scales horizontally per
environment, BECAUSE request handling must scale independently of the messaging layer.

##  COMPONENT: Relay {{relay}}

-   KIND:           Connector
-   RESPONSIBILITY: Maintain thousands of bidirectional WebSocket/MQTT connections.
-   DEPENDS-ON:     [[FV.service]]

The relay layer brokers MQTT messages between clients and the service layer over many concurrent WebSockets and scales
horizontally, BECAUSE real-time fan-out to up to 10000 attendees is the central performance challenge.

##  COMPONENT: Service {{service}}

-   KIND:           Service
-   RESPONSIBILITY: Execute all business logic for events, messages, auth, and statistics.
-   PROVIDES:       [[IM.server-cli]]
-   DEPENDS-ON:     [[FV.database]], [[FV.translation]], [[FV.auth]], [[FV.statistics]]

The service layer is the main server holding event, moderation, access, and configuration logic, reacting to MQTT messages
and persisting state, BECAUSE the authoritative business rules must live in a single server tier.

##  COMPONENT: Authentication Service {{auth}}

-   KIND:           Module
-   RESPONSIBILITY: Issue and validate authorization and session tokens.
-   DEPENDS-ON:     [[FV.database]]

The authentication module generates one-time tokens, sends them via the email gateway, validates logins, and enforces a
single active session per user per event, BECAUSE email-verified, single-session access is the core security mechanism.

##  COMPONENT: Translation Service {{translation}}

-   KIND:           Module
-   RESPONSIBILITY: Produce language-specific message texts via an external LLM.

The translation module translates message texts into the supported languages on the fly while preserving the original,
BECAUSE chat and questions must be available in both German and English.

##  COMPONENT: Statistics Service {{statistics}}

-   KIND:           Module
-   RESPONSIBILITY: Generate periodic event, channel, and user statistics snapshots.
-   DEPENDS-ON:     [[FV.database]]

The statistics module periodically captures cumulative counts of tokens, sessions, connections, and viewers during a running
event, BECAUSE trend dashboards require regular snapshots over the event's lifetime.

##  COMPONENT: Junction Orchestrator {{junction}}

-   KIND:           Component
-   RESPONSIBILITY: Serve the static client content and orchestrate backend delivery over MQTT+.

The Junction component serves the static client bundle and orchestrates its delivery to the relay over MQTT+, BECAUSE the
client must be distributed alongside the same messaging infrastructure used for live data.

##  COMPONENT: Database {{database}}

-   KIND:           Component
-   RESPONSIBILITY: Persist all business objects and static assets.

The PostgreSQL database with the filesystem stores all events, messages, tokens, statistics, and static assets accessed
through the Drizzle persistence layer, BECAUSE the authoritative, durable state of every event must be persisted in one tier.
