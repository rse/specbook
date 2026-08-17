---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

ARCH: Development View (DV)
===========================

##  ASPECT: Client/Common/Server Split {{module-split}}

-   CATEGORY: Structure

The codebase is organized into `src/client`, `src/common`, and
`src/server` modules, with shared types and topic definitions living in
the common module imported by both sides, BECAUSE client and server must
agree on contracts without duplicating them.

##  ASPECT: TypeScript Everywhere {{typescript}}

-   CATEGORY: Standardization

All client-side and server-side code is written in strongly-typed
TypeScript against shared type definitions, BECAUSE a single typed
language across the stack catches contract mismatches at compile time.

##  ASPECT: STX Task Running {{stx-tasks}}

-   CATEGORY: Tooling

Build, lint, and run tasks are driven uniformly by the STX task runner
with per-module `stx.conf` files, BECAUSE a single task runner gives
every module a consistent developer entry point.

##  ASPECT: Vite Client Build {{vite-build}}

-   CATEGORY: Build

The client is built and served in development by Vite, bundling the
Vue, Pinia, Reka UI, Tailwind, and Stylus stack into the static client
artifact, BECAUSE Vite provides fast HMR development and an optimized
production bundle.

##  ASPECT: Layered Linting {{linting}}

-   CATEGORY: Standardization

Code quality is enforced with ESLint and the faster OxLint for
TypeScript, HTMLHint for HTML, and StyleLint for Stylus, BECAUSE
multiple focused linters keep each language layer clean and consistent.

##  ASPECT: Dependency Layering {{dependency-layering}}

-   CATEGORY: Dependency

The common module must depend on neither client nor server, while both
client and server may depend on common, BECAUSE a one-directional
dependency keeps the shared contract free of platform-specific concerns.

##  ASPECT: Git Codeline {{codeline}}

-   CATEGORY: Codeline

The project is versioned in a single Git repository hosted on the
self-administered Gitea, with the Software Administrator granting
repository access, BECAUSE self-hosted version control keeps source
under full organizational control.
