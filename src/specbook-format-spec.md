
SpecBook Specification Format
=============================

Artifact Files
--------------

A specification consists of Markdown *artifact* files, which are
scanned recursively from a base directory. Every file has to start with
a frontmatter block carrying the `Created:` and `Modified:` timestamps
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

Object Model
------------

An artifact carries a tree of *objects*. Every object has a mandatory
*kind* (e.g. `ENTITY`), a mandatory *name*, a unique anchor *id*
(explicitly given or derived from the name), an optional *primary*
marker, optional *properties* (key/value pairs), an optional
*description* statement with an optional rationale, and optional *child*
objects. Which kinds, properties, and nestings are allowed is defined by
the schema configuration (see below); object kinds and property keys are
case-sensitive and have to be written exactly as configured. Backquotes
in names and property values are preserved as code markup for rendering,
but are ignored when matching names, references, and constraints.

Three concrete syntaxes exist:

Format Variants
---------------

### Complex Format

Usually used on object hierarchy levels 1-3 (`#`, `##`, `###`). A
heading opens the object, an optional unordered list carries its
properties, and the remaining content up to the next heading is its
description:

```
#   <kind/>: <name/> (<id/>)

-   <key/>: <value/>
-   [...]

<statement/>, BECAUSE <rationale/>.
```

The heading level directly reflects the nesting level: a `##` object
becomes a child of the preceding `#` object, a `###` object a child of
the preceding `##` object, etc. Skipping a level (a heading without a
parent object on the level above) is an error.

### Concise Format

Usually used on level 4 and deeper. A single unordered list item carries
the entire object as `;`-separated segments -- the `<kind/>: <name/>`
head, the `<key/>: <value/>` properties, and the trailing description --
and may wrap over multiple (indented) lines:

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

### Grouped Format

A heading carrying just a *kind* and no `<kind/>: <name/>` pair opens a
*grouping container* instead of an object. The list items below it are
Concise Format items whose kind comes from that heading, so they start
with the (optionally backquoted) name directly:

```
### <kinds/>

-   `<name/>`; <key/>: <value/>; [...];
    <statement/>, BECAUSE <rationale/>.
```

The heading kind is singularized by stripping one trailing `S`, so both
`### STATES` and `### STATE` group objects of kind `STATE`. The grouped
objects become children of the object the heading is nested under. An
unquoted name must not contain a `:` (else the item would look like a
key/value pair) -- backquote it in this case.

When **SpecBook** itself generates specification Markdown, it emits
the Complex Format on levels 1-3 and the Concise Format from level 4
upwards. When **SpecBook** edits existing files, it mirrors the format
each existing object already uses.

Names, Anchors, and Ids
-----------------------

In all formats, the `<name/>` may carry trailing decorations, in any
order:

-   `{{<id/>}}`: the explicit Wiki-style anchor, setting the object id
    (e.g. `## ENTITY: Attendee Browser {{attendee}}`).

-   `(*)`: the *primary* marker, flagging the object as primary (e.g.
    the primary attributes of an entity).

-   `(<token/>)`: a parenthesized token with three possible roles: on
    level 1 it becomes the artifact id (e.g. `# SPEC: Data Model (DM)`);
    on deeper levels it is either accepted as the value of a still
    missing configured property whose constraint it matches (e.g.
    `### SCENARIO: Successful Token Login (Main)` satisfying an
    `enum(Main,Alternative,Exceptional)` property), or else acts as the
    implicit anchor id.

-   `<a id="<id/>"></a>`: an HTML anchor at the very end of a heading,
    as an alternative to `{{<id/>}}` (emitted by **SpecBook** itself
    when exporting normalized Markdown).

When no explicit id is given, the id is derived by slugifying the name
(lowercased, with non-alphanumeric character runs dashed). An explicit
`{{<id/>}}` anchor always takes precedence over a `(<token/>)` id. When
the schema configures a fixed `id` for an object, it has to be
explicitly written in the input, via either `{{<id/>}}` or `(<id/>)`.

Properties
----------

In the Complex Format, each property is an unordered list item of the
form `<key/>: <value/>`, whose value may continue on the following
indented lines of the item (joined with spaces). In the Concise Format,
each property is a `<key/>: <value/>` segment. A property key may carry
a trailing parenthesized annotation (e.g. `WHEN (Context)`), which is
kept for rendering but ignored when matching the key against the schema.

A multi-token convenience exists for pattern-constrained properties:
when a property value fails its (regex or enum) constraint as a whole,
but consists of multiple whitespace-separated tokens of which one
matches the property's own constraint, that token is kept as the value
and the remaining tokens are distributed (case-insensitively) across the
other still unset pattern-constrained properties of the object. Tokens
assignable to no property are reported as errors.

Descriptions and Rationales
---------------------------

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

Wiki-Style References
---------------------

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

Image Embeddings
----------------

A Markdown image `![<alt/>](<file/>)` inside a description or property
value embeds a local image file, resolved relative to the artifact file:
SVG files are inlined as-is; PNG/JPEG files are embedded as base64
`data:` URLs. URLs and other file types are left untouched.

Normalization
-------------

The semantic phase validates the parsed objects against the schema
configuration (unknown kinds and properties, missing required properties
and child kinds, and violated value constraints are reported with
file/line-precise diagnostics) and then normalizes the specification:
artifacts, child objects, and properties are stably reordered along the
schema definition, so the exports always present them in their
configured canonical order.

