---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Work Breakdown (WB)

##  WORK-PACKAGE: Project Management {{wp-pm}}

-   OWNER:    [[anna]]

The management of the project across all phases, BECAUSE planning, control,
and communication are work of their own, not a by-product of the engineering.

##  WORK-PACKAGE: Planning and Control {{wp-control}}

-   PART-OF:  [[wp-pm]]
-   EFFORT:   20
-   OWNER:    [[anna]]

The maintenance of the plan, the tracking of the progress and the budget, and
the handling of the risks, ending with the closing report of the project.

##  WORK-PACKAGE: Customer Communication {{wp-comm}}

-   PART-OF:  [[wp-pm]]
-   EFFORT:   10
-   OWNER:    [[anna]]

The status reports, the steering committees, and the phase gates with the
customer, ending with the acceptance of the final deliverables.

##  WORK-PACKAGE: Specification {{wp-spec}}

-   OWNER:    [[lukas]]

The specification of the solution from the requirements down to the
architecture, BECAUSE the fixed-price delivery rests on an agreed scope.

##  WORK-PACKAGE: Requirements Analysis {{wp-reqs}}

-   PART-OF:  [[wp-spec]]
-   EFFORT:   15
-   OWNER:    [[lukas]]
-   PRODUCES: [[spec]]

The workshops with the product owner and the writing of the requirements, the
domain rules, and the use cases, ending with the reviewed requirements part of
the specification.

##  WORK-PACKAGE: Architecture Design {{wp-arch}}

-   PART-OF:  [[wp-spec]]
-   EFFORT:   15
-   OWNER:    [[lukas]]
-   PRODUCES: [[spec]]

The design of the data model, the interfaces, and the architecture views,
ending with the reviewed architecture part of the specification.

##  WORK-PACKAGE: Implementation {{wp-impl}}

-   OWNER:    [[jonas]]

The implementation of the solution in all its tiers, BECAUSE the client, the
backend, and the middleware are built by different people in parallel.

##  WORK-PACKAGE: Client Implementation {{wp-client}}

-   PART-OF:  [[wp-impl]]
-   EFFORT:   40
-   OWNER:    [[sara]]
-   PRODUCES: [[release]]

The implementation of the web client with its login, stream, chat, voting, and
moderation dialogs, ending with the client bundle served by the CDN.

##  WORK-PACKAGE: Backend Implementation {{wp-backend}}

-   PART-OF:  [[wp-impl]]
-   EFFORT:   45
-   OWNER:    [[jonas]]
-   PRODUCES: [[release]]

The implementation of the business services, the orchestrator, and the
database schema, ending with the service images.

##  WORK-PACKAGE: Middleware Setup {{wp-middleware}}

-   PART-OF:  [[wp-impl]]
-   EFFORT:   15
-   OWNER:    [[jonas]]
-   PRODUCES: [[release]], [[hosting]]

The configuration of the edge router, the reverse proxies, and the MQTT
brokers, ending with the middleware images and their environment
configurations.

##  WORK-PACKAGE: Quality Assurance {{wp-qa}}

-   OWNER:    [[lea]]

The verification of the solution against the specification, BECAUSE the
acceptance of the release rests on passed tests, not on a demonstration.

##  WORK-PACKAGE: Test Automation {{wp-test-auto}}

-   PART-OF:  [[wp-qa]]
-   EFFORT:   20
-   OWNER:    [[lea]]
-   PRODUCES: [[release]]

The automation of the acceptance tests of the test cases of the specification,
ending with the test suite running in the delivery pipeline.

##  WORK-PACKAGE: Load Testing {{wp-load}}

-   PART-OF:  [[wp-qa]]
-   EFFORT:   10
-   COST:     2500 EUR
-   OWNER:    [[lea]]

The load tests of the relay and the services with thousands of simulated
attendees through a rented load generation service, ending with the load test
report.

##  WORK-PACKAGE: Transition {{wp-transition}}

-   OWNER:    [[lukas]]

The transition of the solution into the operation by the customer, BECAUSE the
contractor leaves the project while the events go on.

##  WORK-PACKAGE: Hosting Provisioning {{wp-hosting}}

-   PART-OF:  [[wp-transition]]
-   EFFORT:   10
-   COST:     6000 EUR
-   OWNER:    [[lukas]]
-   PRODUCES: [[hosting]]

The provisioning of the dev, QA, and production environments on the hosting
provider with their networks and nodes, including the rental fees of the
environments until the go-live, ending with the reachable environments.

##  WORK-PACKAGE: Operations Documentation {{wp-ops-doc}}

-   PART-OF:  [[wp-transition]]
-   EFFORT:   8
-   OWNER:    [[lukas]]
-   PRODUCES: [[ops-manual]]

The writing of the operations manual with its procedures, ending with the
reviewed manual.

##  WORK-PACKAGE: Operator Training {{wp-training}}

-   PART-OF:  [[wp-transition]]
-   EFFORT:   5
-   OWNER:    [[sara]]
-   PRODUCES: [[training]]

The preparation and the delivery of the operator training with its rehearsal
event, ending with the trained operators.

