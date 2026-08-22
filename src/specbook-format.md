
SpecBook
========

```
╭───────────────────╮      ╭───────────────────╮
│     SpecBook      │      │     SpecBook      │
│      SCHEMA       │      │       SPEC        │
│    Meta Model     │      │    Meta Model     │
╰─────────┬─────────╯      ╰─────────┬─────────╯
          │                          │
          │                          │
╭─────────▼─────────╮      ╭─────────▼─────────╮
│     SpecBook      │      │     SpecBook      │
│      SCHEMA       ├──────▶       SPEC        │
│       Model       │      │       Model       │
╰───────────────────╯      ╰───────────────────╯
```

**SpecBook** deals with 4 distinct object models and their particular
structure/format, each represented in a formal language:

-   **SpecBook SCHEMA Meta Model**:
    This is an object model, described in *TypeScript* inside **SpecBook**,
    which defines the structure/format of all **SpecBook** *Schemas*.
    It is reusable and applied onto the **SpecBook SCHEMA Model** to
    validate that it is technically well-structured.

-   **SpecBook SPEC Meta Model**:
    This is an object model, described in *TypeScript* inside **SpecBook**,
    which defines the structure/format of all **SpecBook** *Specifications*.
    It is reusable and applied onto the **SpecBook SPEC Model** to
    validate that it is technically well-structured.

-   **SpecBook SCHEMA Model**:
    This is an object model, described in *YAML* outside **SpecBook**,
    which defines a particular **SpecBook** *Schema*.
    It is reusable and applied onto the **SpecBook SPEC Model** to
    validate that it is domain-wise well-structured.

-   **SpecBook SPEC Model**:
    This is an object model, described in *Markdown* outside **SpecBook**,
    which defines a particular **SpecBook** *Specification*.
    It is the standalone document of a particular project.
