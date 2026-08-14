---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   ARCH: Operations View (OV)

##  CONCERN: Config-File Provisioning <a id="ARCH-OV-config-provisioning"></a>

-   CATEGORY: Configuration
-   ELEMENT:  ARCH-FV-service

Streaming providers, their parameters, admins, and broker URLs are provisioned through a `broadcast.yaml` configuration file
read by the service, BECAUSE provider endpoints and administrators are operational concerns kept out of the database.

##  CONCERN: Event Import and Export <a id="ARCH-OV-event-portability"></a>

-   CATEGORY: Provisioning
-   ELEMENT:  ARCH-FV-service

An event with its related entities can be serialized to YAML and re-imported, and attendees are provisioned from Ventari Excel
sheets, BECAUSE operators need a repeatable way to create recurring and demonstration events.

##  CONCERN: Role Assignment <a id="ARCH-OV-role-assignment"></a>

-   CATEGORY: Configuration
-   ELEMENT:  ARCH-FV-auth

User role assignment is administered through configuration rather than a UI, with the Software Administrator creating events
and assigning the first Manager, BECAUSE permanent roles must be controlled administratively to uphold privacy by design.

##  CONCERN: Live Statistics Monitoring <a id="ARCH-OV-monitoring"></a>

-   CATEGORY: Monitoring
-   ELEMENT:  ARCH-FV-statistics

Operators monitor running events through the statistics dashboard showing attendee curves, channel distribution, and the
authentication-flow debugging counters, BECAUSE event health must be observable live during the broadcast.

##  CONCERN: Authentication Diagnostics <a id="ARCH-OV-auth-logging"></a>

-   CATEGORY: Logging
-   ELEMENT:  ARCH-FV-auth

The token states issued, sent, and used are recorded and surfaced as debugging statistics for the login flow, BECAUSE
operators must diagnose why attendees fail to authenticate during an event.

##  CONCERN: Anonymization on Finish <a id="ARCH-OV-anonymization"></a>

-   CATEGORY: Support
-   ELEMENT:  ARCH-FV-service

Finishing an event automatically runs the documented anonymization procedure that strips personal data while retaining
exportable anonymized results, BECAUSE GDPR compliance must be an automated operational guarantee, not a manual step.

##  CONCERN: Horizontal Scaling <a id="ARCH-OV-scaling"></a>

-   CATEGORY: Provisioning
-   ELEMENT:  ARCH-DP-relay

Operators scale an environment by adding proxy, relay, and service instances ahead of large events, BECAUSE townhall-scale
audiences of up to 10000 require capacity provisioned per environment.

##  CONCERN: Provider Failover <a id="ARCH-OV-failover"></a>

-   CATEGORY: Recovery
-   ELEMENT:  ARCH-FV-service

During an event a manager recovers from provider problems by activating a configured fallback resource, which propagates to
all clients automatically, BECAUSE streaming outages must be mitigated live without interrupting the audience.
