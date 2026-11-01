---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Project Schedule (PS)

-   START: 2026-08-24

##  PHASE: Inception {{inception}}

-   GOAL:   The scope and the architecture of the solution are agreed in the signed-off specification.
-   BUDGET: 45

The inception phase turns the vision of the customer into the agreed
specification, BECAUSE the fixed-price construction can start only on an agreed
scope.

### TASK

-   Kick-off {{kickoff}}; STATUS: Done;
    The project starts with the kick-off meeting of all parties.

-   Steer Project {{steer}}; DURATION: 14.5; AFTER: [[kickoff]]; OWNER: [[anna]]; REALIZES: [[wp-control]], [[wp-comm]]; STATUS: Active;
    The project is planned, tracked, and reported until its closing.

-   Analyze Requirements {{analyze}}; DURATION: 3; AFTER: [[kickoff]]; STAFF: [[lukas]], [[tom]]; REALIZES: [[wp-reqs]]; STATUS: Done;
    The requirements part of the specification is written and reviewed.

-   Design Architecture {{design}}; DURATION: 3; AFTER: [[analyze]]; STAFF: [[lukas]]; REALIZES: [[wp-arch]]; STATUS: Done;
    The architecture part of the specification is written and reviewed.

-   Specification Approved {{spec-approved}}; AFTER: [[design]]; ACCEPTS: [[spec]]; GATES: [[gate]]; STATUS: Done;
    The product owner signs off the specification.

##  PHASE: Construction {{construction}}

-   GOAL:   The feature-complete release runs in the QA environment with its acceptance tests passing.
-   BUDGET: 135

The construction phase builds the solution in parallel work streams on the
agreed specification, BECAUSE the client, the backend, and the middleware are
independent enough to be built at once.

### TASK

-   Set Up Middleware {{middleware}}; DURATION: 2; AFTER: [[spec-approved]]; STAFF: [[jonas]]; REALIZES: [[wp-middleware]]; STATUS: Done;
    The router, the proxies, and the brokers run in the dev environment.

-   Implement Backend {{backend}}; DURATION: 6; AFTER: [[spec-approved]]; STAFF: [[jonas]]; REALIZES: [[wp-backend]]; STATUS: Active;
    The services and the orchestrator run against the database.

-   Implement Client {{client}}; DURATION: 6; AFTER: [[spec-approved]]; STAFF: [[sara]]; REALIZES: [[wp-client]]; STATUS: Active;
    The web client runs against the dev environment.

-   Automate Tests {{tests}}; DURATION: 4; AFTER: [[middleware]]; STAFF: [[lea]]; REALIZES: [[wp-test-auto]]; STATUS: Active;
    The acceptance tests run in the delivery pipeline.

-   Feature Complete {{feature-complete}}; AFTER: [[backend]], [[client]], [[tests]]; GATES: [[gate]];
    The release is feature-complete and deployed into the QA environment.

##  PHASE: Transition {{transition}}

-   GOAL:   The customer operates the production environment and runs its first townhall event.
-   BUDGET: 40

The transition phase proves the release under load, hands the operation over
to the customer, and goes live, BECAUSE a release is done only once the
customer runs it on their own.

### TASK

-   Provision Hosting {{provision}}; DURATION: 2; START: 9; AFTER: [[spec-approved]]; STAFF: [[lukas]]; REALIZES: [[wp-hosting]];
    The dev, QA, and production environments are reachable on the hosting provider.

-   Run Load Tests {{load}}; DURATION: 2; AFTER: [[feature-complete]], [[provision]]; STAFF: [[lea]], [[jonas]]; REALIZES: [[wp-load]];
    The load test report proves the capacity of the release.

-   Write Operations Manual {{ops-doc}}; DURATION: 1.5; AFTER: [[feature-complete]]; STAFF: [[lukas]]; REALIZES: [[wp-ops-doc]];
    The operations manual is reviewed by the operators.

-   Train Operators {{train}}; DURATION: 1; AFTER: [[ops-doc]]; STAFF: [[sara]]; REALIZES: [[wp-training]];
    The operators moderated a rehearsal event.

-   Go-Live {{go-live}}; AFTER: [[load]], [[train]]; ACCEPTS: [[release]], [[hosting]], [[ops-manual]], [[training]]; GATES: [[gate]];
    The production environment is accepted and the first townhall event is run.

