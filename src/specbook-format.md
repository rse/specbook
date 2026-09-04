
SpecBook Models and Formats
===========================

```
╭───────────────────╮      ╭───────────────────╮
│     SpecBook      │      │     SpecBook      │
│      SCHEMA       │      │       SPEC        │
│    META Model     │      │    META Model     │
│    (internal)     │      │    (internal)     │
╰─────────┬─────────╯      ╰─────────┬─────────╯
          │                          │
          │                          │
╭─────────▼─────────╮      ┏━━━━━━━━━▼━━━━━━━━━┓
│     SpecBook      │      ┃     SpecBook      ┃
│      SCHEMA       ├──────▶       SPEC        ┃
│       Model       │      ┃       Model       ┃
╰───────────────────╯      ┗━━━━━━━━━━━━━━━━━━━┛
```

**SpecBook** deals with four distinct object models and their particular
formats, each represented in a formal language and serving a particular
task:

-   **SpecBook SCHEMA Meta Model**:
    This is an object model, described in *TypeScript*, internal
    to **SpecBook**, which defines the format of all **SpecBook**
    *Schemas*. It is generic and applied onto the **SpecBook SCHEMA
    Model** to validate that it is technically well-structured.

-   **SpecBook SPEC Meta Model**:
    This is an object model, described in *TypeScript*, internal
    to **SpecBook**, which defines the format of all **SpecBook**
    *Specifications*. It is generic and applied onto the **SpecBook SPEC
    Model** to validate that it is technically well-structured.

-   **SpecBook SCHEMA Model**:
    This is an object model, described in *YAML*, outside of
    **SpecBook**, which defines a particular **SpecBook** *Schema*.
    It is user-supplied (or the bundled standard one) and non-generic
    but reusable and applied onto the **SpecBook SPEC Model** to
    validate that it is domain-wise well-structured.

-   **SpecBook SPEC Model**:
    This is an object model, described in *Markdown*, outside
    of **SpecBook**, which defines a particular **SpecBook**
    *Specification*. It is user-supplied and non-generic and
    non-reusable and is the standalone specification of a particular
    project.

SpecBook SCHEMA Meta Model
--------------------------

### Structure

This meta model defines which domain-specific objects are allowed in
a *Schema*: the object kinds with their `file` mapping on the first
level, the object kinds of the deeper levels, and their properties
with optional value constraints: regular expressions `/xxx/` (implicitly
anchored, so they have to match the value as a whole),
object references `[[xxx]]`, enumerations `enum(xxx,yyy)`, tag sets
`tags(xxx,yyy)`, and lists `list(xxx[, ...])` of such alternatives,
whose comma-separated items are split at top-level commas only, i.e.
outside double quotes, `[[xxx]]` references, and parentheses.

```ts
type Schema = SchemaObject[]
type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    refs?:             string
    optional?:         boolean
    referenced?:       string[]
    automaton?:        SchemaAutomaton
    diagram?:          SchemaDiagram
    format?:           SchemaFormat
    props?:            SchemaProperty[]
    children?:         SchemaObject[]
}
type SchemaAutomaton = {
    nodes:             string
    edges:             string
    source:            string
    target:            string
    initial:           string
    final:             string
}
type SchemaDiagramCenter = {
    source?:           string
    property?:         string
    label?:            string
    kind?:             string
}
type SchemaDiagramCenterEdges = {
    property:          string
    inbound?:          string
    outbound?:         string
    both?:             string
    labeled?:          string
}
type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid"
    nodes?:            string
    edges?:            string
    center?:           string | SchemaDiagramCenter
    centerEdges?:      SchemaDiagramCenterEdges
    links?:            "props" | "all"
    labeled?:          boolean
    edgeSource?:       string
    edgeTarget?:       string
    edgeArity?:        string
    hierarchy?:        boolean
    deep?:             boolean
    onlyConnected?:    boolean
    collapse?:         boolean
    qualified?:        boolean
    properties?:       string[]
    config?:           Partial<GradiaConfig>
}
type SchemaFormat = {
    type?:             "auto" | "complex" | "concise"
    maxTableColumns?:  number
    maxCellHeight?:    number
    withUnusedProps?:  boolean
}
type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
    unique?:           boolean | string
    present?:          boolean | string
    local?:            boolean
    symmetric?:        boolean
    acyclic?:          boolean
}
type SchemaGradiaConfig = Partial<{
    "font-family":               string
    "font-embed":                boolean
    "color-node-regular-name":   string
    "color-node-regular-box":    string
    "color-node-regular-border": string
    "color-node-primary-name":   string
    "color-node-primary-box":    string
    "color-node-primary-border": string
    "color-node-ghost-name":     string
    "color-node-ghost-box":      string
    "color-node-ghost-border":   string
    "color-group-name":          string
    "color-group-box":           string
    "color-group-border":        string
    "color-edge-line":           string
    "color-edge-name":           string
    "color-edge-arity":          string
    "color-edge-halo":           string
    "size-canvas-margin":        number
    "size-node-width-min":       number
    "size-node-width-max":       number
    "size-node-height-scale":    number
    "size-edge-corner-radius":   number
    "size-edge-hop-radius":      number
    "size-edge-track-gap":       number
    "size-edge-port-gap":        number
    "group-box-padding":         number
    "group-box-gap":             number
    "graph-columns-max":         number
    "graph-channel-width-max":   number
    "graph-channel-width-min":   number
    "graph-gutter-height-max":   number
    "graph-gutter-height-min":   number
    "graph-node-separation":     number
    "graph-rank-separation":     number
    "graph-node-degree-max":     number
    "hub-channel-width-max":     number
    "hub-channel-width-min":     number
    "hub-node-gap":              number
    "hub-node-degree-max":       number
    "grid-columns-max":          number
    "grid-columns-min":          number
    "grid-gap-horizontal":       number
    "grid-gap-vertical":         number
    "grid-node-width-equal":     boolean
}>
```

-   `Schema`:
    whole schema: the object kinds the corpus consists of,
    BECAUSE this configures SpecBook for a particular context

-   `SchemaObject`:
    object kind: an artifact (level 1) or an object nested below it,
    BECAUSE artifacts and their content follow one recursive structure

-   `SchemaObject.kind: string`:
    kind name of the object (e.g. `REQS`, `REQUIREMENT`), unique among
    its siblings, on level 1 together with its `id`,
    BECAUSE it discriminates objects and anchors `[[xxx]]` references

-   `SchemaObject.name?: string`:
    exact artifact name (level 1) or name regex (deeper levels),
    BECAUSE artifacts are fixed documents, deeper names need a rule only

-   `SchemaObject.id?: string`:
    short locally-unique identifier the object explicitly carries in its heading,
    BECAUSE stable ids keep `[[xxx]]` references free of prose names

-   `SchemaObject.file?: string`:
    Markdown file the level 1 artifact is generated into and resides in,
    optionally shared with the other artifacts carrying the same file,
    BECAUSE artifacts must map deterministically onto files

-   `SchemaObject.desc?: string`:
    prose description of the object kind,
    BECAUSE it guides the authors and instructs the AI

-   `SchemaObject.refs?: string`:
    Markdown list of the standards, books, articles, or websites
    (`-   <id>: <title> (<year>),` followed by an indented `<url>` line)
    primarily describing the methodology the object kind picks up (left
    out when the configuration is emitted compressed by level 2 or higher),
    BECAUSE the authors and the AI can consult the original method

-   `SchemaObject.optional?: boolean`:
    whether the kind may be absent below its parent or, for a level 1
    artifact, from its file (default: `false`),
    BECAUSE not every kind is mandatory below every parent object

-   `SchemaObject.referenced?: string[]`:
    wildcard references (e.g. `[[*]]` for any object, `[[UC.USE-CASE:*]]`
    for the use cases) matching the objects -- themselves or through their
    descendants -- from which every object of this kind has to be referenced
    at least once, where a lapse is reported as a warning only,
    BECAUSE a term nobody uses or a requirement no use case exercises is dead weight

-   `SchemaObject.automaton?: SchemaAutomaton`:
    finite state machine the child objects of every object of this kind form,
    BECAUSE a lifecycle is only trustworthy when its dead-ends and
    livelocks are ruled out

-   `SchemaObject.diagram?: SchemaDiagram`:
    diagram generated for every object of this kind,
    BECAUSE relations buried in references are graspable only when drawn

-   `SchemaObject.format?: SchemaFormat`:
    HTML/PDF rendering format of the objects of this kind,
    BECAUSE rich objects need sections, uniform ones read as tables

-   `SchemaObject.props?: SchemaProperty[]`:
    properties allowed on objects of this kind,
    BECAUSE they carry the structured, machine-checkable content

-   `SchemaObject.children?: SchemaObject[]`:
    object kinds allowed one level below this object (RECURSION),
    BECAUSE the nesting defines and bounds the document structure

-   `SchemaAutomaton`:
    finite state machine formed by the child objects of an object: the
    nodes have to be reachable from an initial node, a node without
    outgoing edge has to be final (else it is a dead-end), and a final
    node has to be reachable from every node (else it is a livelock),
    BECAUSE the structural sanity of a state machine is checkable, not just describable

-   `SchemaAutomaton.nodes: string`:
    child object kind whose objects are the nodes (e.g. `STATE`),
    BECAUSE the states are objects of their own, carrying descriptions and flags

-   `SchemaAutomaton.edges: string`:
    child object kind whose objects are the edges (e.g. `TRANSITION`),
    BECAUSE the transitions are objects of their own, carrying guards and effects

-   `SchemaAutomaton.source: string`:
    reference-valued property of an edge object referencing its source node,
    BECAUSE an edge is directed

-   `SchemaAutomaton.target: string`:
    reference-valued property of an edge object referencing its target node,
    BECAUSE an edge is directed

-   `SchemaAutomaton.initial: string`:
    property of a node object flagging (with the value `true`) an initial node,
    BECAUSE reachability needs a start (the check is skipped without any
    initial node)

-   `SchemaAutomaton.final: string`:
    property of a node object flagging (with the value `true`) a final node,
    BECAUSE resting is legal in a final node only (the livelock check is
    skipped without any final node)

-   `SchemaDiagram`:
    diagram derived for every object of an object kind,
    BECAUSE the relations of a specification are graspable only when drawn

-   `SchemaDiagram.type?: "graph" | "hub" | "grid"`:
    diagram shape: `graph` (free), `hub` (centered), `grid` (edge-less),
    BECAUSE one object set tells different stories as different shapes

-   `SchemaDiagram.nodes?: string`:
    comma-separated `[[xxx]]` patterns of nodes (default: self and descendants),
    BECAUSE a diagram is readable only when reduced to relevant objects

-   `SchemaDiagram.edges?: string`:
    comma-separated `[[xxx]]` patterns of the objects acting as edges, not nodes,
    BECAUSE some relations are objects, yet still connect two nodes

-   `SchemaDiagram.center?: string | SchemaDiagramCenter`:
    object a `hub` diagram is projected onto (default: `self`), or a
    synthetic center node, labeled from a referenced `source` object (or
    one of its properties, via `property`) or a literal `label`, typed
    (under `qualified`) by `kind`, and linked to the `source` object,
    BECAUSE the focus of a hub is not always a specification object --
    the solution itself, e.g., sits in the middle of a context diagram
    without being modeled anywhere

-   `SchemaDiagram.centerEdges?: SchemaDiagramCenterEdges`:
    synthesized center edges of a `hub`: the `property` of the node
    objects whose `inbound` value maps onto a node-to-center edge, whose
    `outbound` value onto a center-to-node edge, and whose `both` value
    onto both edges (the second placement rendered as a "ghost" node),
    each optionally named by the value of the `labeled` property,
    BECAUSE the nodes carry no `[[xxx]]` reference to a synthetic center,
    so their relation to it lives in a direction property instead

-   `SchemaDiagram.links?: "props" | "all"`:
    edge source: property values (`props`) or also texts (`all`),
    BECAUSE prose references are incidental and need an opt-in

-   `SchemaDiagram.labeled?: boolean`:
    whether the edges derived from property values carry the lower-cased
    property key as their label (default: `false`),
    BECAUSE edges of several reference properties need telling apart

-   `SchemaDiagram.edgeSource?: string`:
    edge property naming the source node (default: the parent object),
    BECAUSE an edge object is not always nested below its own source

-   `SchemaDiagram.edgeTarget?: string`:
    edge property naming the target node (default: the first non-source
    property whose value is a single reference),
    BECAUSE the convention breaks on multiple references per object

-   `SchemaDiagram.edgeArity?: string`:
    edge property carrying the edge arity (default: `ARITY`),
    BECAUSE cardinality labels are named domain-specifically

-   `SchemaDiagram.hierarchy?: boolean`:
    whether containment edges derive from the nesting (default: `false`),
    BECAUSE the nesting carries no reference and would stay invisible

-   `SchemaDiagram.deep?: boolean`:
    whether the references of the descendants of a node count as its own,
    counted as the arity (default: `false`),
    BECAUSE the relations between coarse objects live in their fine parts

-   `SchemaDiagram.onlyConnected?: boolean`:
    whether a `graph` drops its edge-less nodes (default: `false`),
    BECAUSE isolated nodes dilute a diagram about relationships

-   `SchemaDiagram.collapse?: boolean`:
    whether a single-node diagram is omitted (default: `true`),
    BECAUSE it carries no information but still consumes space

-   `SchemaDiagram.qualified?: boolean`:
    whether every node is labeled with its kind (default: `false`),
    BECAUSE names alone are ambiguous across multiple object kinds

-   `SchemaDiagram.properties?: string[]`:
    property names attached to the nodes as key/value annotations,
    BECAUSE the node name alone rarely makes the nodes comparable

-   `SchemaDiagram.config?: SchemaGradiaConfig`:
    arbitrary Gradia rendering options (e.g. `grid-columns-max: 5`),
    BECAUSE layout tuning is cosmetics, not a schema concern

-   `SchemaFormat`:
    HTML/PDF rendering of the objects of an object kind among their siblings,
    BECAUSE one uniform rendering fits neither rich nor numerous objects

-   `SchemaFormat.type?: "auto" | "complex" | "concise"`:
    rendering: `complex` (sections), `concise` (tables), or `auto`,
    BECAUSE sections bury small objects, tables truncate rich ones

-   `SchemaFormat.maxTableColumns?: number`:
    maximum column count of the table of the kind (default: `4`),
    BECAUSE the fixed print/PDF page width bounds the table width

-   `SchemaFormat.maxCellHeight?: number`:
    percent a table cell may tower over its row before it folds (default: `40`),
    BECAUSE a cell of rich prose otherwise dwarfs the whole table

-   `SchemaFormat.withUnusedProps?: boolean`:
    whether unused properties still render (default: `false`),
    BECAUSE empty entries are noise, unless the gap is the message

-   `SchemaProperty`:
    property allowed on the objects of an object kind,
    BECAUSE properties carry the structured content beside the prose

-   `SchemaProperty.name: string`:
    property key as it occurs in the Markdown content,
    BECAUSE the key binds the authored content to its constraint

-   `SchemaProperty.desc?: string`:
    prose description of the property,
    BECAUSE it guides the authors and instructs the AI

-   `SchemaProperty.value?: string`:
    constraint: regexp `/xxx/`, link `[[xxx]]`, `enum(...)`, `tags(...)`, `list(...)`,
    BECAUSE constrained values stay checkable and resolvable

-   `SchemaProperty.optional?: boolean`:
    whether the property may be missing (default: `false`),
    BECAUSE not every property applies to every object

-   `SchemaProperty.unique?: boolean | string`:
    whether every value (`true`) or only the values matching a regexp or
    enum expression occur at most once among the sibling objects of the kind,
    BECAUSE some markers, like a `Main` flow, designate a single sibling

-   `SchemaProperty.present?: boolean | string`:
    whether some value (`true`) or a value matching a regexp or enum
    expression has to occur on at least one sibling object of the kind,
    so that `unique` plus `present` demand exactly one and `present` on
    an optional kind demands at least one object of that kind,
    BECAUSE some markers, like an initial state, are not just single but indispensable

-   `SchemaProperty.local?: boolean`:
    whether the reference-valued property has to reference objects below
    the parent object of the referencing object only (default: `false`),
    BECAUSE a transition between the states of two different lifecycles is nonsense

-   `SchemaProperty.symmetric?: boolean`:
    whether every object the reference-valued property references has to
    reference the referencing object back through the same property
    (default: `false`),
    BECAUSE an undirected relation authored on one side only is half a lie

-   `SchemaProperty.acyclic?: boolean`:
    whether following the reference-valued property from object to object
    must never return to an object already passed (default: `false`),
    BECAUSE a hierarchy with a loop has no root and an inclusion with a
    loop never ends

-   `SchemaGradiaConfig`:
    the Gradia rendering options, mirrored from `@rse/gradia`,
    BECAUSE the diagram cosmetics remain Gradia's concern, not SpecBook's

-   `SchemaGradiaConfig."font-*": string | boolean`:
    font of all diagram texts and whether it is embedded into the SVG,
    BECAUSE an embedded font renders alike where it is not installed

-   `SchemaGradiaConfig."color-node-*": string`:
    colors of the node boxes in their regular, primary, and ghost role,
    BECAUSE the role of a node has to be readable at a glance

-   `SchemaGradiaConfig."color-group-*", "color-edge-*": string`:
    colors of the group boxes and of the edges and their labels,
    BECAUSE both have to stay visible yet recede behind the nodes

-   `SchemaGradiaConfig."size-*", "group-box-*": number`:
    geometry of the canvas, the node boxes, and the edge routing,
    BECAUSE the geometry has to fit both the page and the text lengths

-   `SchemaGradiaConfig."graph-*": number`:
    layout of a `graph`: columns, channel and gutter bounds, and separations,
    BECAUSE a free network needs room for its edges, not just its nodes

-   `SchemaGradiaConfig."hub-*": number`:
    layout of a `hub`: channel widths, node gap, and node degree,
    BECAUSE a hub grows sideways and has to be bounded per side

-   `SchemaGradiaConfig."grid-*": number | boolean`:
    layout of a `grid`: column bounds, tile gaps, and tile width,
    BECAUSE a catalog reads best as evenly sized tiles in stable columns

### Links

The edges are derived from the `[[xxx]]` references of the node objects
-- from their property values only, or, with `links: all`, from their
descriptions as well. Every referenced object is lifted to its nearest
ancestor-or-self within the node set, so a reference onto the scenario
of a use case yields an edge onto the use case. With `deep: true` the
references of all descendants of a node object count as its own and the
number of references behind an edge becomes its arity, so a diagram of
coarse objects (like the artifacts of a whole specification) shows the
relations living in their fine-grained parts. With `labeled: true` an
edge derived from a property value carries the lower-cased property key
as its label, telling the edges of different properties apart, while
the edges derived from descriptions stay unlabeled.

An object acting as an edge (`edges`) connects its parent object to the
object its target property references. Where an edge object is a sibling
of its own source instead of a child of it, `edgeSource` names the
property carrying that source.

As the *nesting* of the objects carries no such reference, `hierarchy:
true` additionally derives a containment edge from every node object to
each of its child objects which is part of the node set.

This is what turns a parent object into the hub of its own children. A
`grid` is edge-less by definition and hence accepts neither `edges` nor
`hierarchy`.

### Diagrams

An object kind can additionally carry a `diagram` field, which derives
a [Gradia](https://github.com/rse/gradia) diagram for every object of
that kind. Its `type` selects the diagram shape (`graph`, `hub`, or
`grid`), `nodes` and `edges` select the participating objects through
comma-separated `[[xxx]]` reference patterns (`nodes` defaults to the
object itself plus all objects below it), and `center` names the object
a `hub` is projected onto (default: `self`).

Instead of naming an existing object, `center` can also declare a
*synthetic* center node, which represents something no specification
object models -- like the solution itself in the middle of a context
diagram. Such a center is labeled from a referenced `source` object (or
one of its properties, via `property`) or a literal `label`, and links
to the `source` object. As the nodes carry no `[[xxx]]` reference to a
synthetic center, `centerEdges` synthesizes the edges from a direction
`property` of the node objects: its `inbound` value maps onto a
node-to-center edge, its `outbound` value onto a center-to-node edge,
and its `both` value onto both edges, each optionally named by the value
of the `labeled` property.

`onlyConnected` drops the edge-less nodes of a `graph`, `collapse`
(default: `true`) omits a degenerated diagram consisting of a single
node only, `qualified` labels every node with its object kind,
`properties` lists the property names whose values are attached to the
nodes as key/value annotations (with every `[[xxx]]` reference stripped
to its target object name), and `config` passes arbitrary Gradia
rendering options (e.g. `grid-columns-max: 5`) through to the diagram.

### Format

An object kind can furthermore carry a `format` field, which controls
how the HTML/PDF export renders the objects of that kind among their
siblings, so that the sibling kinds below one parent can render
differently (e.g. one kind as a table, another as sections). Its `type`
selects the rendering: `complex` (nested sections), `concise` (one
compact table of all sibling objects of the kind), or the default
`auto`, which collapses only the deepest level into tables.

Inside a `concise` table, unconfigured child kinds implicitly stay
`concise` and render as sub-tables inside the description cells, while
an explicitly configured `type` is always honored, even a `complex`
rendering pressed into a cell. `maxTableColumns` (default: `4`) bounds
the columns of the compact table of the kind (a wider group chunks
its properties into embedded per-object tables), `maxCellHeight`
(default: `40`) is the percentage a table cell of the kind may exceed
the height of every other non-empty cell of its row before the HTML
export folds its remaining text away, and `withUnusedProps`
(default: `false`) unconditionally renders the defined but unused
properties of that kind, as property table lines or table columns. In
the HTML/PDF export, a property absent from an object shows an "empty
set" marker in place of its value, which tells it apart from a property
given with an empty value.
Property lines and table columns follow the property order of the
schema, with properties unknown to the schema appended in document order.
Objects collapsed into tables carry no headings and hence leave the
table of contents and the PDF outline.

SpecBook SPEC Meta Model
------------------------

### Structure

This meta model defines which domain-specific objects are allowed in a
*Specification*.

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
    children:          SpecObject[]
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

-   `Spec`:
    whole specification: the artifacts the corpus consists of,
    BECAUSE a specification is one corpus of separately authored files

-   `Spec.artifacts: SpecArtifact[]`:
    all artifacts parsed from the Markdown files the SCHEMA references,
    BECAUSE the corpus is parsed as a whole to resolve references

-   `SpecArtifact`:
    single artifact: one level 1 heading plus its file timestamps,
    BECAUSE artifacts are the unit of authoring, review, and generation

-   `SpecArtifact.created: Date`:
    creation timestamp from the `Created:` "frontmatter" field,
    BECAUSE an origin has to survive Git checkouts and file copies

-   `SpecArtifact.modified: Date`:
    last modification timestamp from the `Modified:` "frontmatter" field,
    BECAUSE freshness steers review and reconciliation of an artifact

-   `SpecArtifact.objects: SpecObject[]`:
    root objects of the artifact, opened by its level 1 heading,
    BECAUSE an artifact is the tree below exactly one root object

-   `SpecObject`:
    object of the artifact tree: the atom of a specification,
    BECAUSE every statement needs an addressable, kind-typed carrier

-   `SpecObject.kind: string`:
    kind name of the object (e.g. `ENTITY`), case-sensitive,
    BECAUSE the kind decides which schema rules apply to the object

-   `SpecObject.id: string`:
    locally-unique anchor id, explicitly given or "slugified" from the name,
    BECAUSE every object has to be linkable by a stable handle

-   `SpecObject.anchor?: string`:
    explicit `{{xxx}}` anchor given in the heading, if any,
    BECAUSE an explicit anchor keeps ids stable when names change

-   `SpecObject.paren?: string`:
    parenthesized `(xxx)` token trailing the name, if any,
    BECAUSE one token serves as artifact id, property value, or anchor

-   `SpecObject.name: string`:
    name of the object, as written in its heading or list item,
    BECAUSE the name is the human handle and a reference target

-   `SpecObject.primary?: boolean`:
    whether the `(*)` marker flags the object as primary,
    BECAUSE some kinds have a distinguished member among their peers

-   `SpecObject.description?: SpecDescription`:
    description statement of the object, with its rationale,
    BECAUSE the WHAT alone leaves the WHY of an object unrecorded

-   `SpecObject.properties: SpecProperty[]`:
    key/value properties of the object, in canonical order,
    BECAUSE properties carry the structured, machine-checkable content

-   `SpecObject.children: SpecObject[]`:
    child objects nested one level below this object (RECURSION),
    BECAUSE a specification is a tree, not a flat list of statements

-   `SpecDescription`:
    description of an object: statement, rationale, and images,
    BECAUSE the WHAT and the WHY are stored apart to be rendered apart

-   `SpecDescription.description: string`:
    statement text of the description (the WHAT),
    BECAUSE the WHAT is the substance every object has to carry

-   `SpecDescription.rationale?: string`:
    rationale text behind the `, BECAUSE ` split (the WHY),
    BECAUSE a statement without its WHY cannot be judged or revised

-   `SpecDescription.embedding?: string[]`:
    image files embedded via `![xxx](yyy)`, inlined at parse time,
    one entry per file in markup order (empty for an unreadable file),
    BECAUSE the exports have to stand alone, without the image files

-   `SpecProperty`:
    key/value property attached to an object,
    BECAUSE the structured facts of an object belong beside its prose

-   `SpecProperty.key: string`:
    property key, as written in the Markdown content,
    BECAUSE the key selects the schema rule the value is checked by

-   `SpecProperty.value: string`:
    property value, joined from its (possibly wrapped) lines,
    BECAUSE constraints and references are checked against this text

-   `SpecProperty.embedding?: string[]`:
    image files embedded in the value, inlined at parse time,
    one entry per file in markup order (empty for an unreadable file),
    BECAUSE the exports have to stand alone, without the image files

SpecBook SCHEMA Model
---------------------

### Artifacts

A schema consists of a YAML file, which is exactly a serialization of
the object model defined by the **SpecBook SCHEMA Meta Model**, or of
several such files, merged in order into one schema (the later files
into the earlier ones, where the objects merge deeply and the elements
of the lists are matched by their identity). If no particular schema is
given, the standard schema configuration bundled with **SpecBook**
applies.

SpecBook SPEC Model
-------------------

### Artifacts

A specification consists of Markdown *artifact* files, which the SCHEMA
Model references by their `file` fields and which are resolved against
a base directory. Every file has to start with
a "frontmatter" block carrying the `Created:` and `Modified:` timestamps
(format `yyyy-LL-dd HH:mm`):

```
---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---
```

Every level 1 heading opens a new *artifact*, so usually each file
carries exactly one. Several artifacts nevertheless reside in one file
whenever the schema configures the same `file` for them: they then
follow each other on level 1, below the single frontmatter block of that
file. Both ATX headings (`# <text/>`, `## <text/>`, ...) and Setext
headings (`<text/>` underlined with `===` or `---`) are supported.

As the timestamps are a property of the *file* and not of the individual
artifact, the normalized Markdown export -- which merges the entire
corpus into a single document -- carries the earliest `Created:` and the
latest `Modified:` timestamp of all artifacts in its single frontmatter
block, so the per-artifact timestamps do not survive this round-trip.

### Object Model

An artifact carries a tree of *objects*. Every object has a mandatory
*kind* (e.g. `ENTITY`), a mandatory *name*, an anchor *id* (explicitly
given or derived from the name, and unique among the sibling objects of
its kind), an optional *primary* marker, optional *properties* (key/value
pairs), an optional *description* statement with an optional rationale,
and optional *child* objects. Which kinds, properties, and nestings are
allowed is defined by the schema.

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
first line. Every segment of the form `<key/>: <value/>` (with a
possibly empty value) becomes a property, unless it contains a
` BECAUSE ` or is the last segment of a `.`-terminated item (as a
description like `Note: xxx` has to survive the round-trip through
exported Markdown); all remaining segments are joined into the
description. Child objects nest as indented list items below their
parent item, where key/value items become properties and concise items
become child objects of that parent:

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
upwards -- unless a descendant of an object carries a description which
no single list item can carry: a multi-line one (a fenced code block, an
ordered list, a blockquote, or multiple paragraphs) or one carrying a
`;` (which a re-parse would split into a spurious property plus a
truncated description). All child objects of such an object then stay in
the Complex Format (as sibling objects have to share the format), with
headings reaching down to level 6. When **SpecBook** edits existing
files, it mirrors the format each existing object already uses.

### Names, Anchors, and Ids

In all formats, the `<name/>` may carry trailing decorations, in any
order:

-   `{{<id/>}}`: the explicit Wiki-style anchor, setting the object id
    (e.g. `## ENTITY: Attendee Browser {{attendee}}`).

-   `(<token/>)`: a parenthesized token with three possible roles: on
    level 1 it becomes the artifact id (e.g. `# DATA: Data Model (DM)`);
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
each property is a `<key/>: <value/>` segment. A value carrying a `;`
or a ` BECAUSE ` cannot be a segment and has to become a key/value item
nested below the item instead -- a `;` value additionally starting on a
continuation line of that item, as a `;` on the first line of a list
item marks a Concise Format object. The key is matched
against the schema exactly as written and may occur only once per
object, and the value has to satisfy the configured constraint as a
whole.

### Descriptions and Rationales

The description of a Complex Format object is all block content below
its heading (up to the next heading) except the property list:
paragraphs, blockquotes, ordered lists (e.g. scenario steps or test
case procedures), and fenced code blocks. A fenced code block of
language `gradia` is skipped, as it is the derived diagram which
**SpecBook** itself emits into exported Markdown and which must not
become authored content on a re-parse. In the Concise Format, the
description is formed by the non-property segments of the item, so a
description carrying a `;` cannot be a segment either and forces its
object into the Complex Format.

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
matches decides; several matches are narrowed down to the ones nearest
to the referencing object, i.e. sharing the longest ancestor chain with
it (so `[[STATE:Draft]]` inside a lifecycle picks the `Draft` state of
this very lifecycle, even if other lifecycles carry a `Draft` state,
too); still several matches are an ambiguity and zero matches an
unresolvable reference, both reported by the linter. Wildcard references
resolve into match *sets* and are used in the schema configuration to
constrain reference-valued properties (e.g. `[[PERSONA:*]]` or
`[[DM.ENTITY:*]]`).

### Image Embeddings

A Markdown image `![<alt/>](<file/>)` inside a description or property
value embeds a local image file, resolved relative to the artifact file:
SVG files are inlined as-is; PNG/JPEG files are embedded as base64
`data:` URLs. URLs and other file types are left untouched.

A reference carrying the `{theme}` placeholder -- e.g.
`![Logo](logo-{theme}.svg)` -- is a *theme-aware* embedding: it expands
into the two variants `light` and `dark`, both of which have to exist and
both of which are embedded, as two consecutive entries in this order. The
HTML export shows just the variant matching the color theme currently
active in the document, while the PDF export (like print in general)
always uses the `light` variant.
