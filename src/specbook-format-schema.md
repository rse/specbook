
SpecBook Schema Format
======================

The YAML schema configuration (see
[`ase.specbook.yaml`](smp/ase.specbook.yaml) for a comprehensive
example) defines which domain-specific objects are allowed: the artifact
kinds with their `file` mapping on the first level, the object kinds of
the deeper levels, and their properties with optional value constraints:
regular expressions `/xxx/`, object references `[[xxx]]`, enumerations
`enum(xxx,yyy)`, tag sets `tags(xxx,yyy)`, and lists `list(xxx[, ...])`
of such alternatives. The `file` field is only allowed on the first
(artifact) level.

An object kind can additionally carry a `diagram` field, which derives a
[Gradia](https://github.com/rse/gradia) diagram for every object of that
kind. Its `type` selects the diagram shape (`graph`, `hub`, or `grid`),
`nodes` and `edges` select the participating objects through
comma-separated `[[xxx]]` reference patterns (`nodes` defaults to the
object itself plus all objects below it), `center` names the object a
`hub` is projected onto (default: `self`), `onlyConnected` drops the
edge-less nodes of a `graph`, `collapse` (default: `true`) omits a
degenerated diagram consisting of a single node only, `qualified` labels
every node with its object kind, `properties` lists the property names
whose values are attached to the nodes as key/value annotations (with
every `[[xxx]]` reference stripped to its target object name), and
`config` passes arbitrary Gradia rendering options (e.g.
`grid-columns-max: 5`) through to the diagram.

The edges are derived from the `[[xxx]]` references of the node objects
-- from their property values only, or, with `links: all`, from their
descriptions as well. As the *nesting* of the objects carries no such
reference, `hierarchy: true` additionally derives a containment edge
from every node object to each of its child objects which is part of the
node set. This is what turns a parent object into the hub of its own
children, as the `TIER` objects of the sample schema configuration
demonstrate:

```yaml
-   kind: TIER
    diagram:
        type: hub
        center: self
        hierarchy: true
```

A `grid` is edge-less by definition and hence accepts neither `edges`
nor `hierarchy`.

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

