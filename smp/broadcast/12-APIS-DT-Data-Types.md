---
Created:  2026-08-30 00:49
Modified: 2026-08-30 14:06
---

APIS: Data Types (DT)
=====================

TYPE: LogLevel
--------------

-   INTERFACES: [[INTERFACE:server-cli]]
-   BASE:       `enum(error,warning,info,debug)`

The verbosity level of the server log, from errors only up to debugging details,
BECAUSE the amount of log output has to be tuned per environment.

TYPE: Configuration
-------------------

-   INTERFACES: [[INTERFACE:server-cli]]

The structure of the YAML configuration file, whose keys are also
the surface of the recognized `BROADCAST_*` environment variables
(`BROADCAST_ADMIN_USERNAME` maps onto `adminUsername`) and of the
corresponding command-line options, where an unrecognized key is a fatal
startup error, BECAUSE one schema has to define all three configuration
layers consistently.

### FIELD

-   adminUsername; TYPE: `string`; CONSTRAINT: `non-empty`;
    The user name of the administrator account,
    BECAUSE the administrator has to be able to log in without any event-specific token.

-   adminPassword; TYPE: `string`; CONSTRAINT: `non-empty`;
    The password of the administrator account,
    BECAUSE the administrator account has to be protected.

-   mqttUrl; TYPE: `string`; DEFAULT: [[DEFAULT_MQTT_URL]];
    The URL of the MQTT broker the server connects to, including the credentials and the topic prefix,
    BECAUSE the server exchanges all live data through the broker.

-   dbUrl; TYPE: `string`; DEFAULT: [[DEFAULT_DB_URL]];
    The URL of the PostgreSQL database the server persists into,
    BECAUSE the authoritative state has to be stored in the database tier.

-   directory; TYPE: `string`; DEFAULT: [[DEFAULT_DIRECTORY]];
    The directory of the static client content the server delivers,
    BECAUSE the client bundle is distributed alongside the server.

-   logLevel; TYPE: [[LogLevel]]; DEFAULT: `info`;
    The verbosity level of the server log,
    BECAUSE the amount of log output has to be tuned per environment.

-   workers; TYPE: `integer`; DEFAULT: `1`; CONSTRAINT: `1..n`;
    The number of worker processes the primary process pre-forks,
    BECAUSE the load-balanced traffic of the broker has to be spread over several processes.

### CONSTANT

-   ENV_PREFIX; TYPE: `string`; VALUE: `BROADCAST_`;
    The prefix of all environment variables overriding configuration parameters, where a double
    underscore separates the nesting path segments and a single underscore the words of one
    camel-cased segment,
    BECAUSE the server has to ignore the unrelated variables of the ambient environment.

-   DEFAULT_MQTT_URL; TYPE: `string`; VALUE: `wss://example:example@127.0.0.1:1883/pr/api/server/?topic=broadcast`;
    The built-in default of the MQTT broker URL,
    BECAUSE the server has to start against a local broker without any configuration.

-   DEFAULT_DB_URL; TYPE: `string`; VALUE: `postgres://127.0.0.1:5432/broadcast`;
    The built-in default of the PostgreSQL database URL,
    BECAUSE the server has to start against a local database without any configuration.

-   DEFAULT_DIRECTORY; TYPE: `string`; VALUE: `client/dst`;
    The built-in default of the static content directory, resolved relative to the installation of the server,
    BECAUSE the client bundle is built next to the server by default.

-   RESPAWN_DELAY; TYPE: `duration`; VALUE: `1000 ms`;
    The backoff delay before an unexpectedly dead worker process is respawned,
    BECAUSE a tight crash-loop would hammer the broker and the database.
