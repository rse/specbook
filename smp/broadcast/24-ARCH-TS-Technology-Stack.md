---
Created:  2026-06-19 00:15
Modified: 2026-09-03 18:05
---

#   ARCH: Technology Stack (TS)

##  TIER: Common

### COMPONENT: Language {{language}}

-   PRODUCT:  TypeScript
-   LICENSE:  Apache-2.0
-   PHASE:    Build-Time
-   COVERAGE: Build, Standardization

All client-side and server-side code, including the shared common module, is authored in strongly-typed TypeScript and
compiled to JavaScript, BECAUSE a single strongly-typed language catches contract mismatches against the shared common
module at compile time.

### COMPONENT: Task Runner {{task-runner}}

-   PRODUCT:  STX
-   LICENSE:  MIT
-   PHASE:    Build-Time
-   COVERAGE: Tooling

The STX task runner drives the build, lint, and run tasks of every module from a per-module `stx.conf`, BECAUSE a single
task runner gives every module a consistent developer entry point.

### COMPONENT: Linting {{linting}}

-   PRODUCT:  ESLint
-   LICENSE:  MIT
-   PHASE:    Build-Time
-   COVERAGE: Standardization

ESLint enforces code quality and style for the client and server TypeScript, complemented by the faster OxLint, HTMLHint
for HTML, and StyleLint for Stylus, BECAUSE multiple focused linters keep each language layer clean and consistent.

### COMPONENT: Messaging {{messaging}}

-   PRODUCT:    MQTT-Plus
-   LICENSE:    MIT
-   PHASE:      Run-Time
-   COVERAGE:   Client Networking, Dialog Communication, Server Networking, Component Communication
-   USED-BY:    [[COMPONENT:client]], [[COMPONENT:relay]], [[COMPONENT:service]]

MQTT-Plus handles the MQTT-over-WebSocket communication of the client with the relay layer and the MQTT messaging of the
service and relay layers on top of the base MQTT.js functionality, BECAUSE MQTT is the messaging protocol for the
real-time relay layer and MQTT-Plus adds the needed request/response and event handling on all tiers alike.

### COMPONENT: HTTP Client {{http-client}}

-   PRODUCT:  OFetch
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Client Networking
-   USED-BY:  [[COMPONENT:client]], [[COMPONENT:auth]]

OFetch provides the HTTP/REST request/response communication of the client and the call of the external GraphQL
mail-sending API by the authentication service, BECAUSE REST calls complement the MQTT channel for request/response-style
interactions on both tiers.

### COMPONENT: Logging {{logging}}

-   PRODUCT:  Pino
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Execution Tracing
-   USED-BY:  [[COMPONENT:client]], [[COMPONENT:service]]

Pino provides the leveled, structured logging facility, wrapping the browser console on the client and rendered
human-readably by pino-pretty on the server during development, BECAUSE a single logging library shared by client and
server keeps the tracing consistent.

##  TIER: Client

### COMPONENT: Build Tool {{build-tool}}

-   PRODUCT:  Vite
-   LICENSE:  MIT
-   PHASE:    Build-Time
-   COVERAGE: Build

Vite serves the client in development with fast HMR and bundles the runtime stack into the optimized static client
artifact, BECAUSE it provides a fast development server and an optimized production bundle for the Vue stack.

### COMPONENT: Styling Framework {{styling-framework}}

-   PRODUCT:  Tailwind CSS
-   LICENSE:  MIT
-   PHASE:    Build-Time, Run-Time
-   COVERAGE: Build, Interface Theme, Interface Layouting, Interface Effects
-   USED-BY:  [[COMPONENT:client]]

Tailwind CSS generates the utility-first styling for theme, layout, and effects at build time, with Stylus as the
preferred preprocessor for authoring custom CSS, BECAUSE utility-first styling speeds consistent UI work while Stylus
covers bespoke styling.

### COMPONENT: UI Framework {{ui-framework}}

-   PRODUCT:  Vue.js
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Dialog Structure, Dialog Life-Cycle, Interface Mask, Data Binding
-   USED-BY:  [[COMPONENT:client]]

Vue.js provides the reactive, component-based UI framework rendering the panel, attendee, studio, moderator, and manager
screens, BECAUSE a reactive component model is the natural fit for the browser-delivered, real-time experience.

### COMPONENT: Widget Framework {{widget-framework}}

-   PRODUCT:  Reka UI
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Interface Widgets, Interface States, Interface Interactions
-   USED-BY:  [[COMPONENT:client]]

Reka UI supplies the headless, unstyled widget primitives composed into the application's interface elements, BECAUSE
headless widgets provide accessible interaction behavior while leaving the visual styling fully under design control.

### COMPONENT: Typography {{typography}}

-   PRODUCT:  TypoPRO
-   LICENSE:  OFL-1.1, Apache-2.0, MIT, CC0-1.0 (per font)
-   PHASE:    Run-Time
-   COVERAGE: Interface Theme
-   USED-BY:  [[COMPONENT:client]]

TypoPRO supplies the web typography and font assets for the client interface, BECAUSE consistent, self-hosted typography
is needed across the branded UI.

### COMPONENT: Iconography {{iconography}}

-   PRODUCT:  Fontawesome
-   LICENSE:  CC-BY-4.0, OFL-1.1, MIT (per asset)
-   PHASE:    Run-Time
-   COVERAGE: Interface Widgets
-   USED-BY:  [[COMPONENT:client]]

Fontawesome provides the icon set used throughout the client interface, BECAUSE a comprehensive icon library covers the
UI's iconography needs out of the box.

### COMPONENT: Date Management {{date-management}}

-   PRODUCT:  Luxon
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Data Conversion
-   USED-BY:  [[COMPONENT:client]]

Luxon handles date and time parsing, formatting, and localization across the client UI, BECAUSE robust, locale-aware
date handling is required for event schedules and timestamps in German and English.

### COMPONENT: Sentiment Analysis {{client-sentiment}}

-   PRODUCT:  natural + @nlpjs/core + multilang-sentiment
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Presentation Model
-   USED-BY:  [[COMPONENT:client-nlp]]

The natural, @nlpjs/core, and multilang-sentiment libraries perform local sentiment analysis on attendee input in the
browser, BECAUSE filtering sentiment at the source reduces server load and can prevent improper submissions.

### COMPONENT: Language Identification {{client-langid}}

-   PRODUCT:  tinyld + franc + lande
-   PHASE:    Run-Time
-   COVERAGE: Presentation Model
-   USED-BY:  [[COMPONENT:client-nlp]]

The tinyld, franc, and lande libraries perform local language identification on attendee input in the browser, BECAUSE
detecting the message language client-side enables on-the-fly handling without an initial server round-trip.

##  TIER: Middleware

### COMPONENT: Reverse Proxy {{reverse-proxy}}

-   PRODUCT:  HAProxy
-   LICENSE:  GPL-2.0
-   PHASE:    Run-Time
-   COVERAGE: Request Routing, Load Balancing, Transport Security
-   USED-BY:  [[COMPONENT:router]], [[COMPONENT:proxy]]

HAProxy terminates the inbound HTTP and WebSocket traffic at the edge router, firewalled by NFTables, and forwards it
per environment from the proxy instances to the relay layer, BECAUSE a single mature proxy covers both the hardened
entry point and the horizontally scaled per-environment forwarding.

### COMPONENT: Message Broker {{message-broker}}

-   PRODUCT:    Mosquitto
-   LICENSE:    EPL-2.0
-   PHASE:      Run-Time
-   COVERAGE:   Message Brokering
-   USED-BY:    [[COMPONENT:relay]]

Mosquitto brokers the MQTT messages between the thousands of WebSocket connections of the clients and the service
layer as a pool of instances per environment, BECAUSE a lightweight, proven MQTT broker sustains the connection count of
a large event without business logic of its own.

##  TIER: Server

### COMPONENT: Runtime {{runtime}}

-   PRODUCT:  Node.js
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Environment Detection, Process Management, Server Networking
-   USED-BY:  [[COMPONENT:service]], [[COMPONENT:junction]]

Node.js executes the business services and the Junction orchestrator as single-threaded event loops in the service
containers, BECAUSE the message-driven service logic is I/O-bound and an event loop handles it with the least
concurrency complexity.

### COMPONENT: Persistence Layer {{persistence-layer}}

-   PRODUCT:      Drizzle
-   ALTERNATIVES: Prisma, TypeORM
-   LICENSE:      Apache-2.0
-   PHASE:        Run-Time
-   COVERAGE:     Database Access, Database Connectivity, Database Schema
-   USED-BY:      [[COMPONENT:service]]

Drizzle provides the type-safe SQL query builder and schema definition layer between the server's TypeScript code and
PostgreSQL, with its schema generated spec-first from the data model, BECAUSE a thin, zero-overhead typed layer
preserves end-to-end TypeScript type-safety and full PostgreSQL feature access without the runtime cost of a heavy ORM.

### COMPONENT: Static Content Server {{static-content-server}}

-   PRODUCT:  Junction
-   PHASE:    Run-Time
-   COVERAGE: Server Networking, Request Processing
-   USED-BY:  [[COMPONENT:junction]]

Junction serves the static client content over MQTT+ from the backend, BECAUSE the client must be distributed alongside
the same messaging infrastructure used for live data.

### COMPONENT: Argument Parsing {{argument-parsing}}

-   PRODUCT:  Commander.js
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Argument Parsing
-   USED-BY:  [[COMPONENT:service]]

Commander.js parses the server's command-line options and arguments to bootstrap application parameters, BECAUSE a
mature CLI parser covers option handling at server startup without custom code.

### COMPONENT: Configuration Loading {{configuration-loading}}

-   PRODUCT:  dotenvx + YAML
-   LICENSE:  BSD-3-Clause, ISC
-   PHASE:    Run-Time, Operate-Time
-   COVERAGE: Configuration Parsing, Configuration
-   USED-BY:  [[COMPONENT:service]]

dotenvx loads optional environment files into the process environment and the YAML library parses the optional
configuration file, together feeding the layered configuration resolved from defaults, file, environment, and
command-line, BECAUSE the server's runtime parameters and secrets must be configurable from files and the
`BROADCAST_*` environment without hardcoding them.

### COMPONENT: Configuration Validation {{configuration-validation}}

-   PRODUCT:  Valibot
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Configuration Parsing
-   USED-BY:  [[COMPONENT:service]]

Valibot declares the canonical, strict configuration schema that validates and coerces the merged configuration at
startup, BECAUSE a single schema as the source of truth gives fail-fast validation of secrets and a typed
configuration surface that catches misconfiguration before the service runs.

### COMPONENT: Unique Identifier Generation {{unique-id}}

-   PRODUCT:  nanoid
-   LICENSE:  MIT
-   PHASE:    Run-Time
-   COVERAGE: Peer Information
-   USED-BY:  [[COMPONENT:service]]

nanoid generates the compact, collision-resistant unique identifiers for server-side peers and entities, BECAUSE short
URL-safe identifiers are needed without the size and overhead of full UUIDs.

### COMPONENT: AI/LLM Connectivity {{ai-connectivity}}

-   PRODUCT:  @ai-sdk
-   LICENSE:  Apache-2.0
-   PHASE:    Run-Time
-   COVERAGE: Client Networking
-   USED-BY:  [[COMPONENT:translation]]

The @ai-sdk library connects the translation service to an external AI/LLM service for on-the-fly translation of
message texts, BECAUSE chat and questions must be made available in both German and English.

### COMPONENT: Container Orchestration {{container-orchestration}}

-   PRODUCT:      Docker Compose
-   ALTERNATIVES: Kubernetes, Nomad
-   LICENSE:      Apache-2.0
-   PHASE:        Operate-Time
-   COVERAGE:     Installation, Upgrade, Capacity

Docker Compose runs and recreates the service containers of an environment from a per-environment compose file, with
the proxy and relay instances added by the same file, BECAUSE a single-host orchestration is sufficient for the
per-environment container count and avoids operating a cluster.

##  TIER: Database

### COMPONENT: Database {{database}}

-   PRODUCT:  PostgreSQL
-   LICENSE:  PostgreSQL License
-   PHASE:    Run-Time
-   COVERAGE: Storage Engine, Transaction Management, Query Language, Indexing
-   USED-BY:  [[FV.database]]

PostgreSQL stores the authoritative, durable state of every event together with its channels, messages, tokens, and
statistics snapshots, BECAUSE the event-centric data model is inherently relational and demands transactional
integrity, EU-resident self-hosting, and rich query support for moderation and reporting.

### COMPONENT: Database Backup {{database-backup}}

-   PRODUCT:      pg_dump
-   ALTERNATIVES: pgBackRest, Barman
-   LICENSE:      PostgreSQL License
-   PHASE:        Operate-Time
-   COVERAGE:     Backup, Recovery

The pg_dump utility of PostgreSQL produces the logical database dumps stored together with the filesystem assets on the
backup storage and restored with pg_restore, BECAUSE a logical dump is portable across PostgreSQL versions and needs
no additional backup server.
