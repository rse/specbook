---
Created:  2026-06-19 00:15
Modified: 2026-06-22 18:56
---

#   ARCH: Technology Stack (TS)

##  TIER: Client

### COMPONENT: Client Language <a id="ARCH-TS-client-language"></a>

-   PRODUCT:  TypeScript
-   COVERAGE: Business Model, Data Conversion, Environment Detection
-   WHEN:     Build-Time

All client-side code is authored in strongly-typed TypeScript and compiled to browser JavaScript, BECAUSE a single
strongly-typed language catches contract mismatches against the shared common module at compile time.

### COMPONENT: Client Task Runner <a id="ARCH-TS-client-task-runner"></a>

-   PRODUCT:  STX
-   COVERAGE: Dialog Automation
-   WHEN:     Build-Time

The STX task runner drives the client build, lint, and run tasks from a per-module `stx.conf`, BECAUSE a single task
runner gives every module a consistent developer entry point.

### COMPONENT: Client Build Tool <a id="ARCH-TS-client-build-tool"></a>

-   PRODUCT:  Vite
-   COVERAGE: Markup Loading, Markup Generation
-   WHEN:     Build-Time

Vite serves the client in development with fast HMR and bundles the runtime stack into the optimized static client artifact,
BECAUSE it provides a fast development server and an optimized production bundle for the Vue stack.

### COMPONENT: Client Linting <a id="ARCH-TS-client-linting"></a>

-   PRODUCT:      ESLint
-   COVERAGE:     Smoke Testing
-   WHEN:         Build-Time

ESLint enforces code quality and style for the client TypeScript, complemented by the faster OxLint, HTMLHint for HTML, and
StyleLint for Stylus, BECAUSE multiple focused linters keep each language layer clean and consistent.

### COMPONENT: Styling Framework <a id="ARCH-TS-styling-framework"></a>

-   PRODUCT:      Tailwind CSS
-   COVERAGE:     Interface Theme, Interface Layouting, Interface Effects
-   WHEN:         Build-Time

Tailwind CSS provides the utility-first styling for theme, layout, and effects, with Stylus as the preferred preprocessor
for authoring custom CSS, BECAUSE utility-first styling speeds consistent UI work while Stylus covers bespoke styling.

### COMPONENT: UI Framework <a id="ARCH-TS-ui-framework"></a>

-   PRODUCT:  Vue.js
-   COVERAGE: Dialog Structure, Dialog Life-Cycle, Interface Mask, Data Binding
-   WHEN:     Run-Time

Vue.js provides the reactive, component-based UI framework rendering the panel, attendee, studio, moderator, and manager
screens, BECAUSE a reactive component model is the natural fit for the browser-delivered, real-time experience.

### COMPONENT: Widget Framework <a id="ARCH-TS-widget-framework"></a>

-   PRODUCT:  Reka UI
-   COVERAGE: Interface Widgets, Interface States, Interface Interactions
-   WHEN:     Run-Time

Reka UI supplies the headless, unstyled widget primitives composed into the application's interface elements, BECAUSE
headless widgets provide accessible interaction behavior while leaving the visual styling fully under design control.

### COMPONENT: Client Typography <a id="ARCH-TS-client-typography"></a>

-   PRODUCT:  TypoPRO
-   COVERAGE: Interface Theme
-   WHEN:     Run-Time

TypoPRO supplies the web typography and font assets for the client interface, BECAUSE consistent, self-hosted typography
is needed across the branded UI.

### COMPONENT: Client Iconography <a id="ARCH-TS-client-iconography"></a>

-   PRODUCT:  Fontawesome
-   COVERAGE: Interface Widgets
-   WHEN:     Run-Time

Fontawesome provides the icon set used throughout the client interface, BECAUSE a comprehensive icon library covers the
UI's iconography needs out of the box.

### COMPONENT: Date Management <a id="ARCH-TS-date-management"></a>

-   PRODUCT:  Luxon
-   COVERAGE: Value Formatting, Value Parsing, Localization (L10N)
-   WHEN:     Run-Time

Luxon handles date and time parsing, formatting, and localization across the client UI, BECAUSE robust, locale-aware
date handling is required for event schedules and timestamps in German and English.

### COMPONENT: Client Messaging <a id="ARCH-TS-client-messaging"></a>

-   PRODUCT:      MQTT-Plus
-   COVERAGE:     Client Networking, Dialog Communication
-   WHEN:         Run-Time

MQTT-Plus handles the client's MQTT-over-WebSocket communication with the relay layer on top of the base MQTT.js
functionality, BECAUSE MQTT is the messaging protocol for the real-time relay layer and MQTT-Plus adds the needed handling.

### COMPONENT: Client HTTP Client <a id="ARCH-TS-client-http-client"></a>

-   PRODUCT:  OFetch
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

OFetch provides the client's HTTP/REST request/response communication, BECAUSE REST calls complement the MQTT channel
for request/response-style interactions.

### COMPONENT: Client Logging <a id="ARCH-TS-client-logging"></a>

-   PRODUCT:  Pino
-   COVERAGE: Execution Tracing
-   WHEN:     Run-Time

Pino provides the leveled logging facility wrapping the browser console with structured, prefixed, and time-stamped output,
BECAUSE a single logging library shared with the server keeps client- and server-side tracing consistent.

### COMPONENT: Client Sentiment Analysis <a id="ARCH-TS-client-sentiment"></a>

-   PRODUCT:  natural + @nlpjs/core + multilang-sentiment
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

The natural, @nlpjs/core, and multilang-sentiment libraries perform local sentiment analysis on attendee input in the
browser, BECAUSE filtering sentiment at the source reduces server load and can prevent improper submissions.

### COMPONENT: Client Language Identification <a id="ARCH-TS-client-langid"></a>

-   PRODUCT:  tinyld + franc + lande
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

The tinyld, franc, and lande libraries perform local language identification on attendee input in the browser, BECAUSE
detecting the message language client-side enables on-the-fly handling without an initial server round-trip.

##  TIER: Server

### COMPONENT: Server Language <a id="ARCH-TS-server-language"></a>

-   PRODUCT:  TypeScript
-   COVERAGE: Component Management, Request Processing
-   WHEN:     Build-Time

All server-side code is authored in strongly-typed TypeScript, BECAUSE a single strongly-typed language across client
and server catches contract mismatches against the shared common module at compile time.

### COMPONENT: Server Task Runner <a id="ARCH-TS-server-task-runner"></a>

-   PRODUCT:  STX
-   COVERAGE: Environment Detection
-   WHEN:     Build-Time

The STX task runner drives the server build, lint, and run tasks from a per-module `stx.conf`, BECAUSE a single task
runner gives every module a consistent developer entry point.

### COMPONENT: Server Linting <a id="ARCH-TS-server-linting"></a>

-   PRODUCT:      ESLint
-   COVERAGE:     Request Validation
-   WHEN:         Build-Time

ESLint enforces code quality and style for the server TypeScript, complemented by the faster OxLint, BECAUSE focused
linters keep the server codebase clean and consistent.

### COMPONENT: Server Messaging <a id="ARCH-TS-server-messaging"></a>

-   PRODUCT:      MQTT-Plus
-   COVERAGE:     Server Networking, Component Communication
-   WHEN:         Run-Time

MQTT-Plus handles the server's MQTT messaging for the relay layer on top of the base MQTT.js functionality, BECAUSE
MQTT is the messaging protocol for the real-time relay layer and MQTT-Plus adds the needed handling.

### COMPONENT: Database <a id="ARCH-TS-database"></a>

-   PRODUCT:  PostgreSQL
-   COVERAGE: Persistence, Data Retention
-   WHEN:     Run-Time

PostgreSQL stores the authoritative, durable state of every event together with its channels, messages, tokens, and
statistics snapshots, BECAUSE the event-centric data model is inherently relational and demands transactional
integrity, EU-resident self-hosting, and rich query support for moderation and reporting.

### COMPONENT: Persistence Layer <a id="ARCH-TS-persistence-layer"></a>

-   PRODUCT:      Drizzle
-   COVERAGE:     Persistence, Data Conversion
-   WHEN:         Run-Time

Drizzle provides the type-safe SQL query builder and schema definition layer between the server's TypeScript code and
PostgreSQL, with its schema generated spec-first from the data model, BECAUSE a thin, zero-overhead typed layer
preserves end-to-end TypeScript type-safety and full PostgreSQL feature access without the runtime cost of a heavy ORM.

### COMPONENT: Static Content Server <a id="ARCH-TS-static-content-server"></a>

-   PRODUCT:  Junction
-   COVERAGE: Server Networking, Request Processing
-   WHEN:     Run-Time

Junction serves the static client content over MQTT+ from the backend, BECAUSE the client must be distributed alongside
the same messaging infrastructure used for live data.

### COMPONENT: Argument Parsing <a id="ARCH-TS-argument-parsing"></a>

-   PRODUCT:  Commander.js
-   COVERAGE: Argument Parsing
-   WHEN:     Run-Time

Commander.js parses the server's command-line options and arguments to bootstrap application parameters, BECAUSE a
mature CLI parser covers option handling at server startup without custom code.

### COMPONENT: Configuration Loading <a id="ARCH-TS-configuration-loading"></a>

-   PRODUCT:  dotenvx + YAML
-   COVERAGE: Component Management, Environment Detection
-   WHEN:     Run-Time

dotenvx loads optional environment files into the process environment and the YAML library parses the optional
configuration file, together feeding the layered configuration resolved from defaults, file, environment, and
command-line, BECAUSE the server's runtime parameters and secrets must be configurable from files and the
`BROADCAST_*` environment without hardcoding them.

### COMPONENT: Configuration Validation <a id="ARCH-TS-configuration-validation"></a>

-   PRODUCT:  Valibot
-   COVERAGE: Request Validation
-   WHEN:     Run-Time

Valibot declares the canonical, strict configuration schema that validates and coerces the merged configuration at
startup, BECAUSE a single schema as the source of truth gives fail-fast validation of secrets and a typed
configuration surface that catches misconfiguration before the service runs.

### COMPONENT: Server Logging <a id="ARCH-TS-server-logging"></a>

-   PRODUCT:      Pino
-   COVERAGE:     Execution Tracing
-   WHEN:         Run-Time

Pino provides the server's structured, high-performance logging facility, with pino-pretty rendering human-readable output
during development, BECAUSE low-overhead structured logging is required for tracing the live messaging service.

### COMPONENT: Unique Identifier Generation <a id="ARCH-TS-unique-id"></a>

-   PRODUCT:  nanoid
-   COVERAGE: Peer Information
-   WHEN:     Run-Time

nanoid generates the compact, collision-resistant unique identifiers for server-side peers and entities, BECAUSE short
URL-safe identifiers are needed without the size and overhead of full UUIDs.

### COMPONENT: AI/LLM Connectivity <a id="ARCH-TS-ai-connectivity"></a>

-   PRODUCT:  @ai-sdk
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

The @ai-sdk library connects the server to an external AI/LLM service for on-the-fly translation of message texts,
BECAUSE chat and questions must be made available in both German and English.

### COMPONENT: Server HTTP Client <a id="ARCH-TS-server-http-client"></a>

-   PRODUCT:  OFetch
-   COVERAGE: Client Networking
-   WHEN:     Run-Time

OFetch provides the server's HTTP/REST client used to call the external GraphQL mail-sending API, BECAUSE authorization
token emails are dispatched through an external mail gateway over REST.
