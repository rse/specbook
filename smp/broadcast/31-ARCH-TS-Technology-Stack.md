---
Created:  2026-06-19 00:15
Modified: 2026-09-03 10:00
---

#   ARCH: Technology Stack (TS)

##  TIER: Client

### COMPONENT: Client Language {{client-language}}

-   PRODUCT:  TypeScript
-   COVERAGE: Business Model, Data Conversion, Environment Detection
-   WHEN:     Build-Time

All client-side code is authored in strongly-typed TypeScript and compiled to browser JavaScript, BECAUSE a single
strongly-typed language catches contract mismatches against the shared common module at compile time.

### COMPONENT: Client Task Runner {{client-task-runner}}

-   PRODUCT:  STX
-   COVERAGE: Dialog Automation
-   WHEN:     Build-Time

The STX task runner drives the client build, lint, and run tasks from a per-module `stx.conf`, BECAUSE a single task
runner gives every module a consistent developer entry point.

### COMPONENT: Client Build Tool {{client-build-tool}}

-   PRODUCT:  Vite
-   COVERAGE: Markup Loading, Markup Generation
-   WHEN:     Build-Time

Vite serves the client in development with fast HMR and bundles the runtime stack into the optimized static client artifact,
BECAUSE it provides a fast development server and an optimized production bundle for the Vue stack.

### COMPONENT: Client Linting {{client-linting}}

-   PRODUCT:      ESLint
-   COVERAGE:     Smoke Testing
-   WHEN:         Build-Time

ESLint enforces code quality and style for the client TypeScript, complemented by the faster OxLint, HTMLHint for HTML, and
StyleLint for Stylus, BECAUSE multiple focused linters keep each language layer clean and consistent.

### COMPONENT: Styling Framework {{styling-framework}}

-   PRODUCT:      Tailwind CSS
-   COVERAGE:     Interface Theme, Interface Layouting, Interface Effects
-   WHEN:         Build-Time

Tailwind CSS provides the utility-first styling for theme, layout, and effects, with Stylus as the preferred preprocessor
for authoring custom CSS, BECAUSE utility-first styling speeds consistent UI work while Stylus covers bespoke styling.

### COMPONENT: UI Framework {{ui-framework}}

-   PRODUCT:  Vue.js
-   COVERAGE: Dialog Structure, Dialog Life-Cycle, Interface Mask, Data Binding
-   WHEN:     Run-Time

Vue.js provides the reactive, component-based UI framework rendering the panel, attendee, studio, moderator, and manager
screens, BECAUSE a reactive component model is the natural fit for the browser-delivered, real-time experience.

### COMPONENT: Widget Framework {{widget-framework}}

-   PRODUCT:  Reka UI
-   COVERAGE: Interface Widgets, Interface States, Interface Interactions
-   WHEN:     Run-Time

Reka UI supplies the headless, unstyled widget primitives composed into the application's interface elements, BECAUSE
headless widgets provide accessible interaction behavior while leaving the visual styling fully under design control.

### COMPONENT: Client Typography {{client-typography}}

-   PRODUCT:  TypoPRO
-   COVERAGE: Interface Theme
-   WHEN:     Run-Time

TypoPRO supplies the web typography and font assets for the client interface, BECAUSE consistent, self-hosted typography
is needed across the branded UI.

### COMPONENT: Client Iconography {{client-iconography}}

-   PRODUCT:  Fontawesome
-   COVERAGE: Interface Widgets
-   WHEN:     Run-Time

Fontawesome provides the icon set used throughout the client interface, BECAUSE a comprehensive icon library covers the
UI's iconography needs out of the box.

### COMPONENT: Date Management {{date-management}}

-   PRODUCT:  Luxon
-   COVERAGE: Value Formatting, Value Parsing, Localization (L10N)
-   WHEN:     Run-Time

Luxon handles date and time parsing, formatting, and localization across the client UI, BECAUSE robust, locale-aware
date handling is required for event schedules and timestamps in German and English.

### COMPONENT: Client Messaging {{client-messaging}}

-   PRODUCT:      MQTT-Plus
-   COVERAGE:     Client Networking, Dialog Communication
-   WHEN:         Run-Time

MQTT-Plus handles the client's MQTT-over-WebSocket communication with the relay layer on top of the base MQTT.js
functionality, BECAUSE MQTT is the messaging protocol for the real-time relay layer and MQTT-Plus adds the needed handling.

### COMPONENT: Client HTTP Client {{client-http-client}}

-   PRODUCT:  OFetch
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

OFetch provides the client's HTTP/REST request/response communication, BECAUSE REST calls complement the MQTT channel
for request/response-style interactions.

### COMPONENT: Client Logging {{client-logging}}

-   PRODUCT:  Pino
-   COVERAGE: Execution Tracing
-   WHEN:     Run-Time

Pino provides the leveled logging facility wrapping the browser console with structured, prefixed, and time-stamped output,
BECAUSE a single logging library shared with the server keeps client- and server-side tracing consistent.

### COMPONENT: Client Sentiment Analysis {{client-sentiment}}

-   PRODUCT:  natural + @nlpjs/core + multilang-sentiment
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

The natural, @nlpjs/core, and multilang-sentiment libraries perform local sentiment analysis on attendee input in the
browser, BECAUSE filtering sentiment at the source reduces server load and can prevent improper submissions.

### COMPONENT: Client Language Identification {{client-langid}}

-   PRODUCT:  tinyld + franc + lande
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

The tinyld, franc, and lande libraries perform local language identification on attendee input in the browser, BECAUSE
detecting the message language client-side enables on-the-fly handling without an initial server round-trip.

##  TIER: Server

### COMPONENT: Server Language {{server-language}}

-   PRODUCT:  TypeScript
-   COVERAGE: Component Management, Request Processing
-   WHEN:     Build-Time

All server-side code is authored in strongly-typed TypeScript, BECAUSE a single strongly-typed language across client
and server catches contract mismatches against the shared common module at compile time.

### COMPONENT: Server Task Runner {{server-task-runner}}

-   PRODUCT:  STX
-   COVERAGE: Environment Detection
-   WHEN:     Build-Time

The STX task runner drives the server build, lint, and run tasks from a per-module `stx.conf`, BECAUSE a single task
runner gives every module a consistent developer entry point.

### COMPONENT: Server Linting {{server-linting}}

-   PRODUCT:      ESLint
-   COVERAGE:     Request Validation
-   WHEN:         Build-Time

ESLint enforces code quality and style for the server TypeScript, complemented by the faster OxLint, BECAUSE focused
linters keep the server codebase clean and consistent.

### COMPONENT: Server Messaging {{server-messaging}}

-   PRODUCT:      MQTT-Plus
-   COVERAGE:     Server Networking, Component Communication
-   WHEN:         Run-Time

MQTT-Plus handles the server's MQTT messaging for the relay layer on top of the base MQTT.js functionality, BECAUSE
MQTT is the messaging protocol for the real-time relay layer and MQTT-Plus adds the needed handling.

### COMPONENT: Database {{database}}

-   PRODUCT:  PostgreSQL
-   COVERAGE: Persistence, Data Retention
-   WHEN:     Run-Time

PostgreSQL stores the authoritative, durable state of every event together with its channels, messages, tokens, and
statistics snapshots, BECAUSE the event-centric data model is inherently relational and demands transactional
integrity, EU-resident self-hosting, and rich query support for moderation and reporting.

### COMPONENT: Persistence Layer {{persistence-layer}}

-   PRODUCT:      Drizzle
-   COVERAGE:     Persistence, Data Conversion
-   WHEN:         Run-Time

Drizzle provides the type-safe SQL query builder and schema definition layer between the server's TypeScript code and
PostgreSQL, with its schema generated spec-first from the data model, BECAUSE a thin, zero-overhead typed layer
preserves end-to-end TypeScript type-safety and full PostgreSQL feature access without the runtime cost of a heavy ORM.

### COMPONENT: Static Content Server {{static-content-server}}

-   PRODUCT:  Junction
-   COVERAGE: Server Networking, Request Processing
-   WHEN:     Run-Time

Junction serves the static client content over MQTT+ from the backend, BECAUSE the client must be distributed alongside
the same messaging infrastructure used for live data.

### COMPONENT: Argument Parsing {{argument-parsing}}

-   PRODUCT:  Commander.js
-   COVERAGE: Argument Parsing
-   WHEN:     Run-Time

Commander.js parses the server's command-line options and arguments to bootstrap application parameters, BECAUSE a
mature CLI parser covers option handling at server startup without custom code.

### COMPONENT: Configuration Loading {{configuration-loading}}

-   PRODUCT:  dotenvx + YAML
-   COVERAGE: Component Management, Environment Detection
-   WHEN:     Run-Time

dotenvx loads optional environment files into the process environment and the YAML library parses the optional
configuration file, together feeding the layered configuration resolved from defaults, file, environment, and
command-line, BECAUSE the server's runtime parameters and secrets must be configurable from files and the
`BROADCAST_*` environment without hardcoding them.

### COMPONENT: Configuration Validation {{configuration-validation}}

-   PRODUCT:  Valibot
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

Valibot declares the canonical, strict configuration schema that validates and coerces the merged configuration at
startup, BECAUSE a single schema as the source of truth gives fail-fast validation of secrets and a typed
configuration surface that catches misconfiguration before the service runs.

### COMPONENT: Server Logging {{server-logging}}

-   PRODUCT:      Pino
-   COVERAGE:     Execution Tracing
-   WHEN:         Run-Time

Pino provides the server's structured, high-performance logging facility, with pino-pretty rendering human-readable output
during development, BECAUSE low-overhead structured logging is required for tracing the live messaging service.

### COMPONENT: Unique Identifier Generation {{unique-id}}

-   PRODUCT:  nanoid
-   COVERAGE: Peer Information
-   WHEN:     Run-Time

nanoid generates the compact, collision-resistant unique identifiers for server-side peers and entities, BECAUSE short
URL-safe identifiers are needed without the size and overhead of full UUIDs.

### COMPONENT: AI/LLM Connectivity {{ai-connectivity}}

-   PRODUCT:  @ai-sdk
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

The @ai-sdk library connects the server to an external AI/LLM service for on-the-fly translation of message texts,
BECAUSE chat and questions must be made available in both German and English.

### COMPONENT: Server HTTP Client {{server-http-client}}

-   PRODUCT:  OFetch
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

OFetch provides the server's HTTP/REST client used to call the external GraphQL mail-sending API, BECAUSE authorization
token emails are dispatched through an external mail gateway over REST.

### COMPONENT: Container Orchestration {{container-orchestration}}

-   PRODUCT:      Docker Compose
-   ALTERNATIVES: Kubernetes, Nomad
-   WHEN:         Operate-Time

Docker Compose runs and recreates the service containers of an environment from a per-environment compose file, with
the proxy and relay instances added by the same file, BECAUSE a single-host orchestration is sufficient for the
per-environment container count and avoids operating a cluster.

### COMPONENT: Database Backup {{database-backup}}

-   PRODUCT:      pg_dump
-   ALTERNATIVES: pgBackRest, Barman
-   WHEN:         Operate-Time

The pg_dump utility of PostgreSQL produces the logical database dumps stored together with the filesystem assets on the
backup storage and restored with pg_restore, BECAUSE a logical dump is portable across PostgreSQL versions and needs
no additional backup server.
