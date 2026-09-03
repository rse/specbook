---
Created:  2026-06-18 10:18
Modified: 2026-09-03 22:55
---

ARCH: Operations View (OV)
==========================

##  CONCERN: Release Rollout {{rollout}}

-   CATEGORY:  Upgrade
-   TRIGGER:   on every release, outside running events
-   OPERATOR:  [[UP.administrator]]
-   ELEMENTS:  [[DP.service]]
-   TOOLS:     [[TS.Server.container-orchestration]]

A release is rolled out per environment by pulling the new service
container images and recreating the service containers between events,
BECAUSE a running broadcast must never be interrupted by a rollout.

##  CONCERN: Config-File Provisioning {{config-provisioning}}

-   CATEGORY:  Configuration
-   TRIGGER:   before each event
-   OPERATOR:  [[UP.administrator]]
-   ELEMENTS:  [[FV.service]]
-   TOOLS:     [[TS.Server.configuration-loading]]

Streaming providers, their parameters, admins, and broker URLs are
provisioned through a `broadcast.yaml` configuration file read by the
service, BECAUSE provider endpoints and administrators are operational
concerns kept out of the database.

##  CONCERN: Role Assignment {{role-assignment}}

-   CATEGORY:  Administration
-   TRIGGER:   on event creation
-   OPERATOR:  [[UP.administrator]]
-   ADDRESSES: [[NR.privacy]]
-   ELEMENTS:  [[FV.auth]]

The first Manager of an event is assigned by the Software Administrator
through configuration rather than a UI, BECAUSE permanent roles must be
controlled administratively to uphold privacy by design.

##  CONCERN: Live Statistics Monitoring {{monitoring}}

-   CATEGORY:  Monitoring
-   TRIGGER:   during each event
-   OPERATOR:  [[UP.administrator]]
-   ADDRESSES: [[NR.attendee-scale]]
-   ELEMENTS:  [[FV.statistics]], [[DP.proxy]], [[DP.relay]]

During a broadcast the administrator watches the statistics dashboard
for the attendee curve, the channel distribution, and the
authentication-flow counters, BECAUSE capacity and login problems must
be detected while the audience is still online.

##  CONCERN: Authentication Diagnostics {{auth-logging}}

-   CATEGORY:  Incident
-   TRIGGER:   on reported login failures
-   OPERATOR:  [[UP.administrator]]
-   ELEMENTS:  [[FV.auth]]
-   TOOLS:     [[TS.Common.logging]]

Reported attendee login failures are diagnosed from the recorded token
states (issued, sent, used) and the server log, BECAUSE operators must
find out why an attendee fails to authenticate while the event runs.

##  CONCERN: Horizontal Scaling {{scaling}}

-   CATEGORY:  Capacity
-   TRIGGER:   ahead of large events
-   OPERATOR:  [[UP.administrator]]
-   ADDRESSES: [[NR.scalability]], [[NR.attendee-scale]]
-   ELEMENTS:  [[DP.proxy]], [[DP.relay]], [[DP.service]]
-   TOOLS:     [[TS.Server.container-orchestration]]

Operators scale an environment by adding proxy, relay, and service
instances ahead of large events, BECAUSE townhall-scale audiences of up
to 10000 require capacity provisioned per environment.

##  CONCERN: Database Backup {{backup}}

-   CATEGORY:  Backup
-   TRIGGER:   nightly and before each event
-   OPERATOR:  [[UP.administrator]]
-   ADDRESSES: [[NR.gdpr]]
-   ELEMENTS:  [[DP.database]], [[DM.Event]]
-   TOOLS:     [[TS.Database.database-backup]]

The PostgreSQL database and the filesystem assets are dumped nightly and
before each event onto the backup storage of the same data center,
BECAUSE event setups must survive a database loss without leaving the
EU hosting boundary.

##  CONCERN: Database Restore {{restore}}

-   CATEGORY:  Recovery
-   TRIGGER:   on database loss
-   OPERATOR:  [[UP.administrator]]
-   ELEMENTS:  [[DP.database]], [[DP.service]]
-   TOOLS:     [[TS.Database.database-backup]], [[TS.Server.container-orchestration]]

A lost database is rebuilt from the latest dump onto a fresh database
server and the service containers are recreated against it, BECAUSE the
recovery must be a rehearsed procedure rather than an improvisation
during an event.
