
SpecBook Specification Format
=============================

```
╭ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╮      ╭───────────────────╮
      SpecBook             │     SpecBook      │
│      SCHEMA       │      │       SPEC        │
     Meta Model            │    Meta Model     │
╰ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ╯      ╰─────────┬─────────╯
          │                          │
          │                          │
╭ ─ ─ ─ ─ ▼ ─ ─ ─ ─ ╮      ╭─────────▼─────────╮
      SpecBook             │     SpecBook      │
│      SCHEMA       ├──────▶       SPEC        │
        Model              │       Model       │
╰ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╯      ╰───────────────────╯
```

SpecBook SPEC Meta Model
------------------------

**SpecBook** knows an object model named **SpecBook SPEC Meta Model**,
described in *TypeScript* inside **SpecBook**, which defines the
structure/format of all **SpecBook** *Specifications*. It is reusable
and applied onto the **SpecBook SPEC Model** to validate that it is
technically well-structured:

```ts
type Spec = {
    artifacts:         SpecArtifact[]
}
type SpecArtifact = {
    created:           Date
    modified:          Date
    objects:           SpecObject[]
}
type SpecObject = {
    kind:              string
    id:                string
    anchor?:           string
    paren?:            string
    name:              string
    primary?:          boolean
    description?:      SpecDescription
    properties:        SpecProperty[]
    childs:            SpecObject[]
}
type SpecDescription = {
    description:       string
    rationale?:        string
    embedding?:        string[]
}
type SpecProperty = {
    key:               string
    value:             string
    embedding?:        string[]
}
```

The individual fields are:

-   **Spec**:
    whole specification: the artifacts the corpus is comprised of
    BECAUSE a specification is one corpus of separately authored files

-   **Spec.artifacts: SpecArtifact[]**:
    all artifacts parsed from the Markdown files of the base directory
    BECAUSE the corpus is scanned as a whole to resolve references

-   **SpecArtifact**:
    single artifact: one level 1 heading plus its file timestamps
    BECAUSE artifacts are the unit of authoring, review, and generation

-   **SpecArtifact.created: Date**:
    creation timestamp from the `Created:` frontmatter field
    BECAUSE an origin has to survive Git checkouts and file copies

-   **SpecArtifact.modified: Date**:
    last modification timestamp from the `Modified:` frontmatter field
    BECAUSE freshness steers review and reconciliation of an artifact

-   **SpecArtifact.objects: SpecObject[]**:
    root objects of the artifact, opened by its level 1 heading
    BECAUSE an artifact is the tree below exactly one root object

-   **SpecObject**:
    object of the artifact tree: the atom of a specification
    BECAUSE every statement needs an addressable, kind-typed carrier

-   **SpecObject.kind: string**:
    kind name of the object (e.g. `ENTITY`), case-sensitive
    BECAUSE the kind decides which schema rules apply to the object

-   **SpecObject.id: string**:
    unique anchor id, explicitly given or slugified from the name
    BECAUSE every object has to be linkable by a stable short handle

-   **SpecObject.anchor?: string**:
    explicit `{{xxx}}` anchor given in the heading, if any
    BECAUSE an explicit anchor keeps ids stable when names change

-   **SpecObject.paren?: string**:
    parenthesized `(xxx)` token trailing the name, if any
    BECAUSE one token serves as artifact id, property value, or anchor

-   **SpecObject.name: string**:
    name of the object, as written in its heading or list item
    BECAUSE the name is the human handle and a reference target

-   **SpecObject.primary?: boolean**:
    whether the `(*)` marker flags the object as primary
    BECAUSE some kinds have a distinguished member among their peers

-   **SpecObject.description?: SpecDescription**:
    description statement of the object, with its rationale
    BECAUSE the WHAT alone leaves the WHY of an object unrecorded

-   **SpecObject.properties: SpecProperty[]**:
    key/value properties of the object, in canonical order
    BECAUSE properties carry the structured, machine-checkable content

-   **SpecObject.childs: SpecObject[]**:
    child objects nested one level below this object (RECURSION)
    BECAUSE a specification is a tree, not a flat list of statements

-   **SpecDescription**:
    description of an object: statement, rationale, and images
    BECAUSE the WHAT and the WHY are stored apart to be rendered apart

-   **SpecDescription.description: string**:
    statement text of the description (the WHAT)
    BECAUSE the WHAT is the substance every object has to carry

-   **SpecDescription.rationale?: string**:
    rationale text behind the `, BECAUSE ` split (the WHY)
    BECAUSE a statement without its WHY cannot be judged or revised

-   **SpecDescription.embedding?: string[]**:
    image files embedded via `![xxx](yyy)`, inlined at parse time
    BECAUSE the exports have to stand alone, without the image files

-   **SpecProperty**:
    key/value property attached to an object
    BECAUSE the structured facts of an object belong beside its prose

-   **SpecProperty.key: string**:
    property key, as written in the Markdown content
    BECAUSE the key selects the schema rule the value is checked by

-   **SpecProperty.value: string**:
    property value, joined from its (possibly wrapped) lines
    BECAUSE constraints and references are checked against this text

-   **SpecProperty.embedding?: string[]**:
    image files embedded in the value, inlined at parse time
    BECAUSE the exports have to stand alone, without the image files

SpecBook SPEC Model
-------------------

This is an object model, described in *Markdown* outside **SpecBook**,
which defines a particular **SpecBook** *Specification*. It is the
standalone document of a particular project.

### Artifact Files

A specification consists of Markdown *artifact* files, which are
scanned recursively from a base directory. Every file has to start with
a "frontmatter" block carrying the `Created:` and `Modified:` timestamps
(format `yyyy-LL-dd HH:mm`):

```
---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---
```

Every level 1 heading opens a new *artifact*, so usually each file
carries exactly one. Both ATX headings (`# <text/>`, `## <text/>`, ...)
and Setext headings (`<text/>` underlined with `===` or `---`) are
supported.

### Object Model

An artifact carries a tree of *objects*. Every object has a mandatory
*kind* (e.g. `ENTITY`), a mandatory *name*, a unique anchor *id*
(explicitly given or derived from the name), an optional *primary*
marker, optional *properties* (key/value pairs), an optional
*description* statement with an optional rationale, and optional *child*
objects. Which kinds, properties, and nestings are allowed is defined by
the schema.

### Format Variant: Complex Format

This Markdown format to represent objects is usually used on object
hierarchy levels 1-3 (`#`, `##`, `###`). A heading opens the object,
an optional unordered list carries its properties, and the remaining
content up to the next heading is its description:

```
#   <kind/>: <name/>

-   <key/>: <value/>
-   [...]

<statement/>, BECAUSE <rationale/>.
```

The heading level directly reflects the nesting level: a `##` object
becomes a child of the preceding `#` object, a `###` object a child of
the preceding `##` object, etc. Skipping a level (a heading without a
parent object on the level above) is an error.

### Format Variant: Concise Format

This Markdown format to represent objects is usually used on level 4
and deeper. A single unordered list item carries the entire object as
`;`-separated segments -- the `<kind/>: <name/>` head, the `<key/>:
<value/>` properties, and the trailing description -- and may wrap over
multiple (indented) lines:

```
-   <kind/>: <name/>; <key/>: <value/>; [...];
    <statement/>, BECAUSE <rationale/>.
```

A list item is recognized as a Concise Format object (instead of a
property of the enclosing object) by carrying at least one `;` on its
first line. Every segment of the form `<key/>: <value/>` becomes a
property (unless it contains a ` BECAUSE `), all remaining segments are
joined into the description. Child objects nest as indented list items
below their parent item, where key/value items become properties and
concise items become child objects of that parent:

```
-   <kind/>: <name/>; <key/>: <value/>;
    <statement/>, BECAUSE <rationale/>.

    -   <kind/>: <name/>; <key/>: <value/>;
        <statement/>, BECAUSE <rationale/>.
```

### Format Variant: Grouped Format

This Markdown format to represent objects is a special variant of the
Concise Format. Here, a heading carrying just a *kind* and no `<kind/>:
<name/>` pair opens a *grouping container* instead of an object. The
list items below it are Concise Format items whose kind comes from that
heading, so they start with the (optionally backquoted) name directly:

```
### <kind/>

-   `<name/>`; <key/>: <value/>; [...];
    <statement/>, BECAUSE <rationale/>.
```

The heading kind is taken literally, so `### STATE` groups objects of
kind `STATE`. The grouped objects become children of the object the
heading is nested under. An unquoted name must not contain a `:` (else
the item would look like a key/value pair) -- backquote it in this case.

### Format Usage

When **SpecBook** itself generates specification Markdown, it emits
the Complex Format on levels 1-3 and the Concise Format from level 4
upwards. When **SpecBook** edits existing files, it mirrors the format
each existing object already uses.

### Names, Anchors, and Ids

In all formats, the `<name/>` may carry trailing decorations, in any
order:

-   `{{<id/>}}`: the explicit Wiki-style anchor, setting the object id
    (e.g. `## ENTITY: Attendee Browser {{attendee}}`).

-   `(<token/>)`: a parenthesized token with three possible roles: on
    level 1 it becomes the artifact id (e.g. `# SPEC: Data Model (DM)`);
    on deeper levels it acts as the implicit anchor id.

-   `(*)`: the *primary* marker, flagging the object as primary (e.g.
    the primary attributes of an entity).

When no explicit id is given, the id is derived by "slugifying" the name
(lowercased, with non-alphanumeric character runs dashed). An explicit
`{{<id/>}}` anchor always takes precedence over a `(<token/>)` id. When
the schema configures a fixed `id` for an object, it has to be
explicitly written in the input, via either `{{<id/>}}` or `(<id/>)`.

### Properties

In the Complex Format, each property is an unordered list item of the
form `<key/>: <value/>`, whose value may continue on the following
indented lines of the item (joined with spaces). In the Concise Format,
each property is a `<key/>: <value/>` segment. The key is matched
against the schema exactly as written, and the value has to satisfy the
configured constraint as a whole.

### Descriptions and Rationales

The description of a Complex Format object is all block content below
its heading (up to the next heading) except the property list:
paragraphs, blockquotes, ordered lists (e.g. scenario steps), and
fenced code blocks. A fenced code block
of language `gradia` is skipped, as it is the derived diagram which
**SpecBook** itself emits into exported Markdown and which must not
become authored content on a re-parse. In the Concise Format, the
description is formed by the non-property segments of the item.

A description is split into its *statement* and *rationale* at the first
`, BECAUSE ` (or `, **BECAUSE** `) occurrence:

```
The event is created and configured but not visible to attendees,
BECAUSE an event needs a private setup phase.
```

### Wiki-Style References

A `[[<reference/>]]` anywhere in a name, property value, description, or
rationale is a Wiki-style reference to another object, which is checked
for unique resolvability and rendered as a hyperlink in the HTML/PDF
exports. A reference is a `.`-separated path of segments, where each
segment matches a single object as:

-   `<id/>`: the object id or explicit anchor (e.g. `[[attendee]]`)
-   `<name/>`: the object name (e.g. `[[Attendee Browser]]`)
-   `<kind/>:<name-or-id/>`: kind-qualified (e.g. `[[ENTITY:Event]]`)
-   `<kind/>:*` or `*`: wildcards (for match sets, see below)

Each part can be double-quoted to allow spaces, dots, and colons inside
it (e.g. `[["Vue.js"]]`, whose dot would otherwise be taken as a path
separator). A multi-segment path matches object chains connected by
direct parent-to-child steps, where the leading segments up to the root
may be omitted (e.g. `[[FV.relay]]` matches the object `relay` directly
below the artifact with id `FV`).

A reference has to resolve to exactly one object: a single-segment
reference tries the variants (1) id/anchor, (2) name, and (3)
`<kind/>:<name-or-id/>` in order, where the first variant yielding any
matches decides; several matches are an ambiguity and zero matches an
unresolvable reference, both reported by the linter. Wildcard references
resolve into match *sets* and are used in the schema configuration to
constrain reference-valued properties (e.g. `[[PERSONA:*]]` or
`[[DM.ENTITY:*]]`).

### Image Embeddings

A Markdown image `![<alt/>](<file/>)` inside a description or property
value embeds a local image file, resolved relative to the artifact file:
SVG files are inlined as-is; PNG/JPEG files are embedded as base64
`data:` URLs. URLs and other file types are left untouched.

### Normalization

The semantic phase validates the parsed objects against the schema
configuration (unknown kinds and properties, missing required properties
and child kinds, and violated value constraints are reported with
file/line-precise diagnostics) and then normalizes the specification:
artifacts, child objects, and properties are stably reordered along the
schema definition, so the exports always present them in their
configured canonical order.

