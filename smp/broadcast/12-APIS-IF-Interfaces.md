---
Created:  2026-08-30 00:49
Modified: 2026-08-30 10:20
---

APIS: Interface Model (IM)
==========================

INTERFACE: Server Command Line {{server-cli}}
---------------------------------------------

-   KIND:      CLI
-   LOCATION:  `broadcast`
-   CONSUMERS: [[UP.administrator]]

The command-line program starting the server process of the service
layer, which resolves its runtime parameters from the layered
configuration of built-in defaults, an optional YAML configuration file,
`BROADCAST_*` environment variables, and the command-line options (in
increasing precedence), BECAUSE the administrator and the deployment
automation have to start the very same server with different parameters
per environment without changing any file.

### TYPE: LogLevel

-   BASE: `enum(error,warning,info,debug)`

The verbosity level of the server log, from errors only up to debugging details,
BECAUSE the amount of log output has to be tuned per environment.

### TYPE: Configuration

The structure of the YAML configuration file, whose keys are also
the surface of the recognized `BROADCAST_*` environment variables
(`BROADCAST_ADMIN_USERNAME` maps onto `adminUsername`) and of the
corresponding command-line options, where an unrecognized key is a fatal
startup error, BECAUSE one schema has to define all three configuration
layers consistently.

-   FIELD: adminUsername; TYPE: `string`; CONSTRAINT: `non-empty`;
    The user name of the administrator account,
    BECAUSE the administrator has to be able to log in without any event-specific token.
-   FIELD: adminPassword; TYPE: `string`; CONSTRAINT: `non-empty`;
    The password of the administrator account,
    BECAUSE the administrator account has to be protected.
-   FIELD: mqttUrl; TYPE: `string`; DEFAULT: [[DEFAULT_MQTT_URL]];
    The URL of the MQTT broker the server connects to, including the credentials and the topic prefix,
    BECAUSE the server exchanges all live data through the broker.
-   FIELD: dbUrl; TYPE: `string`; DEFAULT: [[DEFAULT_DB_URL]];
    The URL of the PostgreSQL database the server persists into,
    BECAUSE the authoritative state has to be stored in the database tier.
-   FIELD: directory; TYPE: `string`; DEFAULT: [[DEFAULT_DIRECTORY]];
    The directory of the static client content the server delivers,
    BECAUSE the client bundle is distributed alongside the server.
-   FIELD: logLevel; TYPE: [[LogLevel]]; DEFAULT: `info`;
    The verbosity level of the server log,
    BECAUSE the amount of log output has to be tuned per environment.
-   FIELD: workers; TYPE: `integer`; DEFAULT: `1`; CONSTRAINT: `1..n`;
    The number of worker processes the primary process pre-forks,
    BECAUSE the load-balanced traffic of the broker has to be spread over several processes.

### CONSTANT: ENV_PREFIX

-   TYPE:  `string`
-   VALUE: `BROADCAST_`

The prefix of all environment variables overriding configuration
parameters, where a double underscore separates the nesting path
segments and a single underscore the words of one camel-cased segment,
BECAUSE the server has to ignore the unrelated variables of the ambient
environment.

### CONSTANT: DEFAULT_MQTT_URL

-   TYPE:  `string`
-   VALUE: `wss://example:example@127.0.0.1:1883/pr/api/server/?topic=broadcast`

The built-in default of the MQTT broker URL, BECAUSE the server has to
start against a local broker without any configuration.

### CONSTANT: DEFAULT_DB_URL

-   TYPE:  `string`
-   VALUE: `postgres://127.0.0.1:5432/broadcast`

The built-in default of the PostgreSQL database URL, BECAUSE the server
has to start against a local database without any configuration.

### CONSTANT: DEFAULT_DIRECTORY

-   TYPE:  `string`
-   VALUE: `client/dst`

The built-in default of the static content directory, resolved relative
to the installation of the server, BECAUSE the client bundle is built
next to the server by default.

### CONSTANT: RESPAWN_DELAY

-   TYPE:  `duration`
-   VALUE: `1000 ms`

The backoff delay before an unexpectedly dead worker process is
respawned, BECAUSE a tight crash-loop would hammer the broker and the
database.

### ENDPOINT: broadcast

-   OPERATION: command
-   LOCATOR:   `broadcast [options]`

The sole command of the program, which loads the layered configuration,
brings the database schema up-to-date, pre-forks the configured number
of worker processes, supervises them (respawning a dead one after the
[[RESPAWN_DELAY]]), and runs until it receives a `SIGINT` or `SIGTERM`
signal, which it forwards to all workers before terminating gracefully,
BECAUSE the server is a long-running daemon whose process model has to
stay uniform even for a single worker.

-   OPTION: --version; ALIAS: `-V`; TYPE: `boolean`; DEFAULT: `false`;
    Prints the name and version of the program and exits,
    BECAUSE the deployed version has to be identifiable.

-   OPTION: --help; ALIAS: `-h`; TYPE: `boolean`; DEFAULT: `false`;
    Prints the usage of the program and exits,
    BECAUSE the options have to be discoverable on the command line.

-   OPTION: --log-level; ALIAS: `-l`; TYPE: [[LogLevel]]; DEFAULT: `info`;
    Overrides the `logLevel` configuration parameter,
    BECAUSE the verbosity has to be raised ad-hoc for troubleshooting.

-   OPTION: --config; ALIAS: `-c`; TYPE: `string`; CONSTRAINT: `readable YAML file`;
    The configuration file of the structure [[Configuration]], merged over the built-in defaults,
    BECAUSE a deployment has to keep its parameters in one versioned file.

-   OPTION: --env; ALIAS: `-e`; TYPE: `string`; CONSTRAINT: `readable dotenv file`;
    The environment file loaded in addition to, and overriding, the `.env` file of the current working directory,
    BECAUSE secrets have to be injected without appearing in the configuration file or the command line.

-   OPTION: --admin-username; ALIAS: `-u`; TYPE: `string`;
    Overrides the `adminUsername` configuration parameter,
    BECAUSE the administrator account has to be settable per environment.

-   OPTION: --admin-password; ALIAS: `-p`; TYPE: `string`;
    Overrides the `adminPassword` configuration parameter,
    BECAUSE the administrator account has to be settable per environment.

-   OPTION: --mqtt-url; ALIAS: `-m`; TYPE: `string`; DEFAULT: [[DEFAULT_MQTT_URL]];
    Overrides the `mqttUrl` configuration parameter,
    BECAUSE the broker differs per environment.

-   OPTION: --db-url; ALIAS: `-D`; TYPE: `string`; DEFAULT: [[DEFAULT_DB_URL]];
    Overrides the `dbUrl` configuration parameter,
    BECAUSE the database differs per environment.

-   OPTION: --directory; ALIAS: `-d`; TYPE: `string`; DEFAULT: [[DEFAULT_DIRECTORY]]; CONSTRAINT: `existing directory`;
    Overrides the `directory` configuration parameter,
    BECAUSE the client bundle may be deployed apart from the server.

-   OPTION: --workers; ALIAS: `-w`; TYPE: `integer`; DEFAULT: `1`; CONSTRAINT: `1..n`;
    Overrides the `workers` configuration parameter, rejecting a non-positive or non-integer value as a usage error,
    BECAUSE the process count has to match the CPU resources of the environment.

-   RESULT: log; TYPE: `text`; ARITY: `*`;
    The log lines written to the standard output, each carrying the timestamp, the level, and the originating primary or
    worker process, with the credentials of all URL-valued parameters redacted,
    BECAUSE the operator has to trace the server without ever seeing a secret.

-   RESULT: exit-code; TYPE: `integer`; CONSTRAINT: `0 or 1`;
    The process exit code, `0` after a graceful termination, after `--help`, and after `--version`, and `1` after a
    usage error, an invalid configuration, a failed database migration, or a failed shutdown,
    BECAUSE the process supervisor has to tell a clean stop from a failure.
