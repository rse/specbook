
SpecBook Schema Format
======================

```
╭───────────────────╮      ╭ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╮
│     SpecBook      │            SpecBook
│      SCHEMA       │      │       SPEC        │
│    Meta Model     │           Meta Model
╰─────────┬─────────╯      ╰ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ╯
          │                          │
          │                          │
╭─────────▼─────────╮      ╭ ─ ─ ─ ─ ▼ ─ ─ ─ ─ ╮
│     SpecBook      │            SpecBook
│      SCHEMA       ├──────▶       SPEC        │
│       Model       │              Model
╰───────────────────╯      ╰ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╯
```

SpecBook SCHEMA Meta Model
--------------------------

**SpecBook** knows an object model named **SpecBook SCHEMA Meta Model**,
described in *TypeScript* inside **SpecBook**, which defines the
structure/format of all **SpecBook** *Schemas*. It is reusable and
applied onto the **SpecBook SCHEMA Model** to validate that it is
technically well-structured:

```ts
type Schema = SchemaObject[]
type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    optional?:         boolean
    diagram?:          SchemaDiagram
    format?:           SchemaFormat
    props?:            SchemaProperty[]
    childs?:           SchemaObject[]
}
type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid"
    nodes?:            string
    edges?:            string
    center?:           string
    links?:            "props" | "all"
    edgeTarget?:       string
    edgeArity?:        string
    hierarchy?:        boolean
    onlyConnected?:    boolean
    collapse?:         boolean
    qualified?:        boolean
    properties?:       string[]
    config?:           Partial<GradiaConfig>
}
type SchemaFormat = {
    type?:             "auto" | "complex" | "concise"
    maxTableColumns?:  number
    withUnusedProps?:  boolean
}
type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
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
    "group-box-padding":         number
    "group-box-gap":             number
    "graph-columns-max":         number
    "graph-channel-width-max":   number
    "graph-gutter-height-max":   number
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

The individual fields are:

-   **Schema**:
    whole schema: the object kinds the corpus is comprised of
    BECAUSE this configures SpecBook for a particular context

-   **SchemaObject**:
    object kind: an artifact (level 1) or an object nested below it
    BECAUSE artifacts and their content follow one recursive structure

-   **SchemaObject.kind: string**:
    kind name of the object (e.g. `SPEC`, `REQUIREMENT`)
    BECAUSE it discriminates objects and anchors `[[xxx]]` references

-   **SchemaObject.name?: string**:
    exact artifact name (level 1) or name regex (deeper levels)
    BECAUSE artifacts are fixed documents, deeper names need a rule only

-   **SchemaObject.id?: string**:
    short identifier the object explicitly carries in its heading
    BECAUSE stable ids keep `[[xxx]]` references free of prose names

-   **SchemaObject.file?: string**:
    Markdown file the level 1 artifact is generated into and resides in
    BECAUSE artifacts must map deterministically onto files

-   **SchemaObject.desc?: string**:
    prose description of the object kind
    BECAUSE it guides the authors and instructs the AI

-   **SchemaObject.optional?: boolean**:
    whether the kind may be absent below its parent (default: `false`)
    BECAUSE not every kind is mandatory below every parent object

-   **SchemaObject.diagram?: SchemaDiagram**:
    diagram generated for every object of this kind
    BECAUSE relations buried in references are graspable only when drawn

-   **SchemaObject.format?: SchemaFormat**:
    HTML/PDF rendering format of the child objects of this kind
    BECAUSE rich objects need sections, uniform ones read as tables

-   **SchemaObject.props?: SchemaProperty[]**:
    properties allowed on objects of this kind
    BECAUSE they carry the structured, machine-checkable content

-   **SchemaObject.childs?: SchemaObject[]**:
    object kinds allowed one level below this object (RECURSION)
    BECAUSE the nesting defines and bounds the document structure

-   **SchemaDiagram**:
    diagram derived for every object of an object kind
    BECAUSE the relations of a specification are graspable only when drawn

-   **SchemaDiagram.type?: "graph" | "hub" | "grid"**:
    diagram shape: `graph` (free), `hub` (centered), `grid` (edge-less)
    BECAUSE one object set tells different stories as different shapes

-   **SchemaDiagram.nodes?: string**:
    comma-separated `[[xxx]]` patterns of the nodes (default: self and
    descendants)
    BECAUSE a diagram is readable only when reduced to relevant objects

-   **SchemaDiagram.edges?: string**:
    comma-separated `[[xxx]]` patterns of the objects acting as edges,
    not nodes
    BECAUSE some relations are objects, yet still connect two nodes

-   **SchemaDiagram.center?: string**:
    object a `hub` diagram is projected onto (default: `self`)
    BECAUSE a hub needs one focus, not always the owning object

-   **SchemaDiagram.links?: "props" | "all"**:
    edge source: property values (`props`) or also texts (`all`)
    BECAUSE prose references are incidental and need an opt-in

-   **SchemaDiagram.edgeTarget?: string**:
    edge property naming the target node (default: the first property
    whose value is a single reference)
    BECAUSE the convention breaks on multiple references per object

-   **SchemaDiagram.edgeArity?: string**:
    edge property carrying the edge arity (default: `ARITY`)
    BECAUSE cardinality labels are named domain-specifically

-   **SchemaDiagram.hierarchy?: boolean**:
    whether containment edges derive from the nesting (default: `false`)
    BECAUSE the nesting carries no reference and would stay invisible

-   **SchemaDiagram.onlyConnected?: boolean**:
    whether a `graph` drops its edge-less nodes (default: `false`)
    BECAUSE isolated nodes dilute a diagram about relationships

-   **SchemaDiagram.collapse?: boolean**:
    whether a single-node diagram is omitted (default: `true`)
    BECAUSE it carries no information but still consumes space

-   **SchemaDiagram.qualified?: boolean**:
    whether every node is labeled with its kind (default: `false`)
    BECAUSE names alone are ambiguous across multiple object kinds

-   **SchemaDiagram.properties?: string[]**:
    property names attached to the nodes as key/value annotations
    BECAUSE the node name alone rarely makes the nodes comparable

-   **SchemaDiagram.config?: SchemaGradiaConfig**:
    arbitrary Gradia rendering options (e.g. `grid-columns-max: 5`)
    BECAUSE layout tuning is cosmetics, not a schema concern

-   **SchemaFormat**:
    HTML/PDF rendering of the child objects of an object kind
    BECAUSE one uniform rendering fits neither rich nor numerous objects

-   **SchemaFormat.type?: "auto" | "complex" | "concise"**:
    rendering: `complex` (sections), `concise` (tables), or `auto`
    BECAUSE sections bury small objects, tables truncate rich ones

-   **SchemaFormat.maxTableColumns?: number**:
    maximum column count of the tables below (default: `4`)
    BECAUSE the fixed print/PDF page width bounds the table width

-   **SchemaFormat.withUnusedProps?: boolean**:
    whether unused properties still render (default: `false`)
    BECAUSE empty entries are noise, unless the gap is the message

-   **SchemaProperty**:
    property allowed on the objects of an object kind
    BECAUSE properties carry the structured content beside the prose

-   **SchemaProperty.name: string**:
    property key as it occurs in the Markdown content
    BECAUSE the key binds the authored content to its constraint

-   **SchemaProperty.desc?: string**:
    prose description of the property
    BECAUSE it guides the authors and instructs the AI

-   **SchemaProperty.value?: string**:
    constraint: regexp `/xxx/`, link `[[xxx]]`, `enum(...)`, `tags(...)`,
    `list(...)`
    BECAUSE constrained values stay checkable and resolvable

-   **SchemaProperty.optional?: boolean**:
    whether the property may be missing (default: `false`)
    BECAUSE not every property applies to every object

-   **SchemaGradiaConfig**:
    the Gradia rendering options, mirrored from `@rse/gradia`
    BECAUSE the diagram cosmetics remain Gradia's concern, not SpecBook's

-   **SchemaGradiaConfig."font-*": string | boolean**:
    font of all diagram texts and whether it is embedded into the SVG
    BECAUSE an embedded font renders alike where it is not installed

-   **SchemaGradiaConfig."color-node-*": string**:
    colors of the node boxes in their regular, primary, and ghost role
    BECAUSE the role of a node has to be readable at a glance

-   **SchemaGradiaConfig."color-group-*", "color-edge-*": string**:
    colors of the group boxes and of the edges and their labels
    BECAUSE both have to stay visible yet recede behind the nodes

-   **SchemaGradiaConfig."size-*", "group-box-*": number**:
    geometry of the canvas, the node boxes, and the edge routing
    BECAUSE the geometry has to fit both the page and the text lengths

-   **SchemaGradiaConfig."graph-*": number**:
    layout of a `graph`: columns, channels, gutters, and separations
    BECAUSE a free network needs room for its edges, not just its nodes

-   **SchemaGradiaConfig."hub-*": number**:
    layout of a `hub`: channel widths, node gap, and node degree
    BECAUSE a hub grows sideways and has to be bounded per side

-   **SchemaGradiaConfig."grid-*": number | boolean**:
    layout of a `grid`: column bounds, tile gaps, and tile width
    BECAUSE a catalog reads best as evenly sized tiles in stable columns

### Structure

This schema meta model defines which domain-specific objects are
allowed: the object kinds with their `file` mapping on the first
level, the object kinds of the deeper levels, and their properties
with optional value constraints: regular expressions `/xxx/`,
object references `[[xxx]]`, enumerations `enum(xxx,yyy)`, tag sets
`tags(xxx,yyy)`, and lists `list(xxx[, ...])` of such alternatives.

### Links

The edges are derived from the `[[xxx]]` references of the node objects
-- from their property values only, or, with `links: all`, from their
descriptions as well. As the *nesting* of the objects carries no such
reference, `hierarchy: true` additionally derives a containment edge
from every node object to each of its child objects which is part of the
node set. This is what turns a parent object into the hub of its own
children. A `grid` is edge-less by definition and hence accepts neither
`edges` nor `hierarchy`.

### Diagrams

An object kind can additionally carry a `diagram` field, which derives
a [Gradia](https://github.com/rse/gradia) diagram for every object of
that kind. Its `type` selects the diagram shape (`graph`, `hub`, or
`grid`), `nodes` and `edges` select the participating objects through
comma-separated `[[xxx]]` reference patterns (`nodes` defaults to the
object itself plus all objects below it), `center` names the object
a `hub` is projected onto (default: `self`), `onlyConnected` drops
the edge-less nodes of a `graph`, `collapse` (default: `true`) omits
a degenerated diagram consisting of a single node only, `qualified`
labels every node with its object kind, `properties` lists the
property names whose values are attached to the nodes as key/value
annotations (with every `[[xxx]]` reference stripped to its target
object name), and `config` passes arbitrary Gradia rendering options
(e.g. `grid-columns-max: 5`) through to the diagram.

### Format

An object kind can furthermore carry a `format` field, which controls
how the HTML/PDF export renders the child objects of every object of
that kind. Its `type` selects the rendering: `complex` (nested
sections), `concise` (compact per-kind tables), or the default `auto`,
which collapses only the deepest level into tables. Below a `concise`
object, unconfigured children implicitly stay `concise` and render as
sub-tables inside the description cells, while an explicitly configured
`type` is always honored, even a `complex` rendering pressed into a
cell. `maxTableColumns` (default: `4`) bounds the columns of the compact
tables below the object (wider groups chunk their properties into
embedded per-object tables), and `withUnusedProps` (default: `false`)
unconditionally renders the defined but unused properties of that kind,
as empty property table lines or table columns. Objects collapsed into
tables carry no headings and hence leave the table of contents and the
PDF outline.

SpecBook SCHEMA Model
---------------------

The **SpecBook SCHEMA Model** is derived from the above **SpecBook
SCHEMA Meta Model** and is an object model, described in *YAML* outside
**SpecBook**, which defines a particular **SpecBook** *Schema*. It is
reusable and applied onto the **SpecBook SPEC Model** to validate that
it is domain-wise well-structured.

