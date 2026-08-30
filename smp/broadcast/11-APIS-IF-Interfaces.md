---
Created:  2026-08-30 00:49
Modified: 2026-08-30 14:06
---

APIS: Interfaces (IF)
=====================

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
