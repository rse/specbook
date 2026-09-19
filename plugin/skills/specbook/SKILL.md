---
name: specbook
argument-hint: "[--help|-h] [init|lint|export|edit] [-c|--config <yaml-file>] [-b|--basedir <basedir>] [...] [<query>]"
description: >
    Specification Book (SpecBook): You *MUST* *ALWAYS* and *automatically* invoke this skill *FIRST*
    -- *before* reading, searching, answering from, or modifying any specification file -- whenever
    the user wants to read, query, look up, check, explain, change, write, or extend the "spec" or
    "specification" (a SpecBook-based, Markdown-based specification), and this skill was not yet
    invoked in the current session: pass the triggering user request verbatim as the arguments.
    Without a command, the skill *activates* the SpecBook know-how (format and schema configuration,
    via the SpecBook MCP service) and serves the request ad-hoc. Use it also when the user wants
    to "initialize", "lint", "validate", "export", "render", or "edit" the specification: the
    commands `init`, `lint`, and `export` pass their options through to the SpecBook MCP service,
    while `edit` edits the specification in one shot from a query, with optional grilling, SpecBook
    validation, and looping.
user-invocable: true
disable-model-invocation: false
allowed-tools:
    - mcp__specbook__specbook_init
    - mcp__specbook__specbook_lint
    - mcp__specbook__specbook_export
    - mcp__specbook__specbook_describe
    - mcp__plugin_specbook_specbook__specbook_init
    - mcp__plugin_specbook_specbook__specbook_lint
    - mcp__plugin_specbook_specbook__specbook_export
    - mcp__plugin_specbook_specbook__specbook_describe
    - Bash(pwd:*)
    - Bash(date:*)
---

SpecBook Skill
==============

Skill Conventions
-----------------

-   *IMPORTANT*: The syntax `<xxx>[...]</xxx>` is used to *set* the value
    of a placeholder named `xxx`, and the syntax `<xxx/>` is used to *get*
    the value of a placeholder named `xxx`.

-   *IMPORTANT*: *All* output is *exclusively* requested through
    <template/> sections. You *MUST* *NOT* output anything *UNLESS* it
    is explicitly included in such a <template/> section. Especially,
    you *MUST* *NOT* output any explanations, summaries, or next steps
    on your own.

-   *IMPORTANT*: You *MUST* output all <template/> sections *EXACTLY* as
    provided (including newlines), *EXCEPT* for removing trailing
    spaces and replacing the placeholders `<xxx/>` and `[...]`. You
    *MUST* reproduce all box-drawing and decorative glyphs (`╭`, `╰`,
    `│`, `━`, `─`, `┈`, `❖`, `▶`, `▷`, `⚑`, `➊`-`➒`) *verbatim*.

-   *IMPORTANT*: A construct <if condition="<condition/>"><body/></if>
    applies its <body/> only if <condition/> is met, and a directly
    following <else><body/></else> applies its <body/> only otherwise.

-   *IMPORTANT*: You *MUST* *strictly sequentially* execute every
    numbered item of a procedure and *MUST* *NOT* implicitly skip any of
    them.

-   *IMPORTANT*: The tools `specbook_init`, `specbook_lint`,
    `specbook_export`, and `specbook_describe` are the tools of the
    `specbook` MCP server (the MCP service `specbook mcp`). Whenever a
    call of them fails because the MCP server is not available, only
    output the following <template/> and then immediately *STOP*
    processing the entire current skill:

    <template>
    ❖ **SpecBook**: ▶ ERROR: MCP server `specbook` not available -- please install SpecBook via `npm install -g @rse/specbook` and reconnect via `/mcp`, then retry.
    </template>

Template Patterns
-----------------

-   For the following patterns, first determine the helper placeholders:
    set <raw-title>❖ SpecBook: <title/>: <subtitle/></raw-title> and
    <render-title>❖ SpecBook: **`<title/>`**: `<subtitle/>`</render-title>,
    set <raw-title-len/> to the number of characters of <raw-title/>,
    and set <bar/> to the `─` character repeated exactly
    max(0, 67 - <raw-title-len/>) times.

-   When `<tpl-head title="<title/>" subtitle="<subtitle/>"/>` should be
    expanded, use:

    <template>

    ╭────━━━━**(** <render-title/> **)**━━━━────<bar/>┈┈┈┈┈┈┈┈┈┈

    </template>

-   When `<tpl-foot title="<title/>" subtitle="<subtitle/>"/>` should be
    expanded, use:

    <template>

    ╰────━━━━**(** <render-title/> **)**━━━━────<bar/>┈┈┈┈┈┈┈┈┈┈

    </template>

-   When `<tpl-boxed title="<title/>" subtitle="<subtitle/>"><content/></tpl-boxed>`
    should be expanded, pre-wrap every line of <content/> at *96 visible
    columns* (breaking only at word boundaries and indenting each
    continuation line to the text column of its first line), set <body/>
    to <content/> with all non-empty lines prefixed with `│ ` and all
    empty lines prefixed with just `│`, and use:

    <template>

    ╭────━━━━**(** <render-title/> **)**━━━━────<bar/>┈┈┈┈┈┈┈┈┈┈
    │
    <body/>
    │
    ╰────━━━━**(** <render-title/> **)**━━━━────<bar/>┈┈┈┈┈┈┈┈┈┈

    </template>

-   When the *todo box* of a state <state/> should be shown, only output
    the following <template/>, which shows the established <todo-what/>
    and <todo-how/>, where a still empty <todo-what/> or <todo-how/>
    renders as `(none)`:

    <template>
    <tpl-head title="EDIT TODO" subtitle="<state/>"/>

    **WHAT**: <todo-what/>

    **HOW**:  <todo-how/>

    <tpl-foot title="EDIT TODO" subtitle="<state/>"/>
    </template>

Custom Dialog
-------------

When a *custom dialog* with a question label <question-label/>, a
question description <question-description/>, and a list of answer
options `<label/>: <description/>` should be shown, you *MUST* *NOT* use
any built-in user dialog tool (like `AskUserQuestion`). Instead, closely
follow this procedure:

1.  Set <width/> to the maximum length of all <label/> strings plus 3.
    Build <entries/> out of one line per answer option, numbered <n/>
    from `1`, where <key/> is the glyph `➊`, `➋`, `➌`, ... of <n/> and
    <pad/> is the number of spaces padding `<label/>:` to <width/>:

    `<key/>  ▶  **<label/>:**<pad/> <description/>`

    Set <keys/> to all <key/> glyphs plus a final `**CANCEL**`, joined
    with `/`. Do not output anything.

2.  Output the following <template/>, end the current turn, wait for the
    user input, and store the user input in <result/>:

    <template>
    <tpl-boxed title="DIALOG" subtitle="<question-label/>">

    **<question-description/>**

    <entries/>

    Please choose *one* option by typing <keys/>, or any other free-text instruction.

    </tpl-boxed>
    </template>

3.  If <result/> indicates that the user does not want to proceed or
    declined to answer, set <result>CANCEL</result>. Else, if <result/>
    maps onto one of the <key/> or <label/> strings, set <result/> to
    the corresponding <label/>. Else, keep <result/> as the *free-text*
    reply of the user. Do not output anything.

Usage
-----

```text
/specbook        [-c|--config <yaml-file>] [-b|--basedir <basedir>] [<query>]
/specbook init   [-c|--config <yaml-file>] [-b|--basedir <basedir>]
/specbook lint   [-c|--config <yaml-file>] [-b|--basedir <basedir>] [-g|--gitignore]
/specbook export [-c|--config <yaml-file>] [-b|--basedir <basedir>] [-g|--gitignore]
                 [-s|--slim] [-o|--output [<format>:]<output-file>] [...]
/specbook edit   [-c|--config <yaml-file>] [-b|--basedir <basedir>] [-g|--grill]
                 [-r|--grill-rounds <n>] [-v|--verify] [-l|--loop] [<query>]
```

Notice: the option `-g` is `--gitignore` for `lint` and `export`, but
`--grill` for `edit`. Without a command, the skill performs the implicit
command `activate`.

Procedure
---------

1.  **Parse Arguments:**

    The arguments of the skill are:

    <arguments>
    $ARGUMENTS
    </arguments>

    Parse <arguments/> *ad-hoc* yourself and do *NOT* use any tool for
    this. Do not output anything, except for the mentioned <template/>s.

    1.  Split <arguments/> into whitespace-separated tokens, honoring
        single and double quotes.

        If the first token is `-h` or `--help`, only output the
        following <template/> and then immediately *STOP* processing
        the entire current skill:

        <template>
        ❖ **SpecBook**: ▶ usage: `/specbook [init|lint|export|edit] [-c|--config <yaml-file>] [-b|--basedir <basedir>] [...] [<query>]`
        </template>

        If the first token is one of `init`, `lint`, `export`, or
        `edit`, set <command/> to it and drop it from the tokens.
        Otherwise -- also for no tokens at all -- set
        <command>activate</command> and keep *all* tokens, as they are
        the options and the query of the implicit command.

    2.  Parse the following tokens as the *options* of <command/>
        according to the **Usage** above, until the first token which
        does not start with `-` or until a token `--` (which is
        dropped). An option accepts both its long and its short name,
        and a value-taking option takes its value from the next token or
        from a `--<long>=<value>` form. Set:

        -   <opt-config/> to the list of all `-c`|`--config` values
            (the option is repeatable; default: empty list),
        -   <opt-basedir/> to the `-b`|`--basedir` value (default: empty),
        -   <opt-gitignore/> to `true` for `-g`|`--gitignore` of `lint`
            and `export` (default: `false`),
        -   <opt-slim/> to `true` for `-s`|`--slim` of `export`
            (default: `false`),
        -   <opt-output/> to the list of all `-o`|`--output` values of
            `export` (the option is repeatable; default: the single
            entry `-`),
        -   <opt-grill/> to `true` for `-g`|`--grill` of `edit`
            (default: `false`),
        -   <opt-grill-rounds/> to the `-r`|`--grill-rounds` value of
            `edit` (default: `1`),
        -   <opt-verify/> to `true` for `-v`|`--verify` of `edit`
            (default: `false`),
        -   <opt-loop/> to `true` for `-l`|`--loop` of `edit`
            (default: `false`).

        Set <query/> to the verbatim remainder of <arguments/> behind
        the options (with leading and trailing whitespace stripped).

    3.  Set <error/> to a corresponding message if an option is unknown
        for <command/>, if a value-taking option lacks its value, if
        <opt-grill-rounds/> is not a positive integer, or if <query/> is
        not empty for a <command/> other than `activate` and `edit`.
        The command `activate` knows the options `-c`|`--config` and
        `-b`|`--basedir` only. The CLI options
        `-v`|`--verbose` and `-w`|`--watch` are *not* supported, as they
        have no counterpart in the MCP service.

    4.  If <error/> is not empty, only output the following <template/>
        and then immediately *STOP* processing the entire current skill:

        <template>
        ❖ **SpecBook**: ✪ command: **<command/>**, ▶ ERROR: argument parsing failed: **<error/>**
        </template>

    5.  Set <cwd/> to the following <output/>, the *absolute* current
        working directory, which the agent harness already determined
        while loading this skill -- only if <output/> is not an
        absolute path, instead run the command `pwd` and set <cwd/> to
        its output:

        <output>
        !`pwd`
        </output>

        You *MUST* *NOT* read the environment variables
        `SPECBOOK_CONFIG` and `SPECBOOK_BASEDIR` and *MUST* *NOT* search
        for or read the project configuration file `.specbook.yaml`
        yourself: an empty <opt-config/> and an empty <opt-basedir/>
        stay empty, as the MCP service itself resolves them through
        those environment variables, then through the `config` and
        `basedir` entries of the closest `.specbook.yaml` in <cwd/> or
        one of its parent directories, and only then falls back onto
        the bundled standard schema configuration and `.`.

    6.  Set <params/> to the tool parameters `cwd: <cwd/>`, -- only if
        <opt-basedir/> is not empty -- `basedir: <opt-basedir/>`, and
        -- only if <opt-config/> is not empty -- `config: <opt-config/>`
        (a string array). You *MUST* pass <opt-basedir/>, <opt-config/>,
        and <opt-output/> *verbatim*: as the MCP server does not
        necessarily share the current working directory, the MCP service
        itself anchors their relative paths against <cwd/>.

    7.  Only output the following <template/> (where <info/> is the
        `, `-joined rendering `<name/>: **<value/>**` of the options
        of <command/>, an empty `config` or `basedir` rendering as
        `(default)`):

        <template>
        ❖ **SpecBook**: ✪ command: **<command/>**, ▶ options: <info/>
        </template>

2.  **Dispatch Command:**

    Continue with exactly the one section **Command: <command/>** below.

Command: activate
-----------------

*Activate* the know-how about the SpecBook-based specification -- the
format, the schema configuration, and the specification files -- so the
specification can be worked with *ad-hoc* in plain conversation. The
command is *read-mostly*: it modifies specification Markdown files only
when the <query/> explicitly asks for an ad-hoc change.

1.  <if condition="the SpecBook description was not already retrieved in the current session with the same <params/>">
    Call the `specbook_describe(<params/>, embed: true, compress: 2)`
    tool *once* and internalize its result: the generic **SpecBook**
    models and formats (the object kinds, the object ids and
    `{{<id/>}}` anchors, the `[[xxx]]` references, the `, BECAUSE `
    rationale split, the Complex/Concise/Grouped format variants, and
    the `Created:`/`Modified:` frontmatter block) and the embedded YAML
    *schema configuration* (the allowed artifacts, object kinds,
    nestings, properties, and value constraints). Set <basedir/> to the
    directory its **SpecBook SPEC Model** statement names (the effective
    base directory, as resolved by the MCP service), or to <cwd/> if
    the result carries no such statement. Do not output anything.
    </if>

2.  Resolve the specification Markdown files: they are *exactly* the
    files the `file` fields of the artifacts in the schema configuration
    reference, resolved against <basedir/>. Set <artifact-count/> to
    the number of those files which exist. Do *not* read the files
    themselves in this item. Do not output anything.

3.  Only output the following <template/> (an empty <opt-config/>
    rendering as `(default)`):

    <template>
    ❖ **SpecBook**: schema: `<opt-config/>`, basedir: `<basedir/>` (<artifact-count/> files)
    </template>

4.  <if condition="<query/> is not empty">
    Serve <query/> *ad-hoc* under the **Activated Behavior** below: read
    the specification files which are related to <query/>, resolve their
    `[[xxx]]` references across the files, and answer the query grounded
    in the specification content, citing the file and object id of
    every statement you rely on. If <query/> asks for a change, apply it
    as an *ad-hoc modification* according to the **Activated Behavior**.
    Set <answer/> to the resulting answer and only output the following
    <template/>:

    <template>
    ❖ **SpecBook**: ▶ query result:

    <answer/>
    </template>
    </if>

### Activated Behavior

Once this command has run, the following rules stay in force for the
*remainder of the session* whenever the specification is read, queried,
explained, or modified *ad-hoc* in plain conversation -- i.e. *outside*
of the commands of this skill:

-   **Resolution**: You *MUST* resolve the specification Markdown files
    through the `file` fields of the schema configuration and
    <basedir/> and *never* guess their file paths.

-   **Interpretation**: You *MUST* interpret the specification content
    strictly according to the retrieved SpecBook description: object
    kinds, object ids and `{{<id/>}}` anchors, properties, `[[xxx]]`
    references, and `, BECAUSE ` rationales. Before answering a query,
    resolve the `[[xxx]]` references *across* the files, and ground
    every answer in the specification content by citing file and
    object id.

-   **Modification**: Every ad-hoc modification *MUST* honor the tenets
    of item 6.1 of **Command: edit** and *MUST* keep the file conformant
    to the format and the schema configuration. Run the command
    `date "+%Y-%m-%d %H:%M"` *once* per change set and use its output to
    refresh the `Modified:` line of every changed file and for both the
    `Created:` and `Modified:` lines of every generated file.

-   **Validation**: After every ad-hoc modification, call the
    `specbook_lint(<params/>)` tool, fix the reported diagnostics in the
    affected files for at most *three* rounds, and report any remaining
    diagnostics as `<file/>:<line/>:<column/>: <message/>` lines.

-   **Restriction**: An ad-hoc modification *MUST* stay restricted to
    the specification Markdown files. For a substantial or multi-file
    change, point the user to `/specbook edit` instead of applying it
    ad-hoc.

Command: init
-------------

1.  Call the `specbook_init(<params/>)` tool.

2.  Only output the following <template/>, where <result/> is the
    *verbatim* result of the tool call:

    <template>
    ❖ **SpecBook**: ✪ command: **init**, ▶ result:

    <result/>
    </template>

Command: lint
-------------

1.  Call the `specbook_lint(<params/>, gitignore: <opt-gitignore/>)` tool.

2.  Only output the following <template/>, where <result/> is the
    *verbatim* result of the tool call, with its diagnostics rendered
    as one `<file/>:<line/>:<column/>: <severity/>: <message/>` line
    each, or `no diagnostics` if there are none:

    <template>
    ❖ **SpecBook**: ✪ command: **lint**, ▶ result:

    <result/>
    </template>

Command: export
---------------

1.  For each entry of <opt-output/>, parse it as `[<format/>:]<file/>`,
    where a <format/> prefix is recognized only if it is one of `json`,
    `json5`, `yaml`, `toon`, `html`, `pdf`, or `md`, and call the
    `specbook_export(<params/>, gitignore: <opt-gitignore/>, slim:
    <opt-slim/>, output: <file/>)` tool, additionally passing `format:
    <format/>` only if <format/> is given. The tool itself infers an
    absent format from the extension of <file/> and returns the result
    directly for the <file/> `-`.

2.  Only output the following <template/>, where <result/> is, per
    entry of <opt-output/>, the *verbatim* diagnostics of a failed
    export, the line `exported: <file/>` of a succeeded export into a
    file, or the *verbatim* returned export (as a fenced code block) of
    a succeeded export into `-`:

    <template>
    ❖ **SpecBook**: ✪ command: **export**, ▶ result:

    <result/>
    </template>

Command: edit
-------------

*Edit* the specification directly from a query -- creating, revising, or
pruning its statements in one shot -- through the states *querying*,
*discovering*, *grilling*, *implementing*, and *verifying*.

The command applies the requested edit *in place* via the `Edit` and
`Write` tools. Every modification *MUST* stay restricted to the
specification Markdown files the edit actually demands -- no source
code, documentation, or other files are ever touched.

1.  **Initialize:**

    Set <todo-what></todo-what> and <todo-how></todo-how> (both empty).
    Do not output anything.

2.  **Iterate:**

    Perform the states (1) *querying*, (2) *discovering*, (3) *grilling*,
    (4) *implementing*, and (5) *verifying* below as one *iteration*.
    Without `--loop` perform exactly *one* iteration. Under `--loop`
    *repeat* the iteration until the *querying* state receives a
    `STOP SKILL` result. Do not output anything in this item.

3.  **State: querying:**

    1.  <if condition="<query/> is empty">

        1.  Show a *custom dialog* with the question label `Edit Query`,
            the question description `What is your edit query?`, and
            the single answer option:

            `STOP SKILL: stop the entire skill immediately`

        2.  If <result/> is `STOP SKILL` or `CANCEL`, only output the
            following <template/> and then immediately *STOP* processing
            the entire current skill:

            <template>
            ❖ **SpecBook**: ✪ command: **edit**, ▶ status: **editing finished**
            </template>

            Otherwise, set <query/> to the free-text <result/>.

        </if>

    2.  Convert the <query/> *fresh* into <todo-what/> -- the
        domain-specific, non-implementation-detail information -- and
        <todo-how/> -- the remaining information -- discarding all
        <todo-what/>/<todo-how/> content of any previous iteration.
        Without `--grill` you *MUST* *NOT* ask any clarifying questions
        and during later implementation just interpret the query
        best-effort. Do not output anything.

    3.  Show the *todo box* of state `current state (after querying)`.

    4.  Set <query></query> (clear the query, so every further `--loop`
        iteration asks for a fresh one). Do not output anything.

4.  **State: discovering:**

    1.  <if condition="the SpecBook description was not already retrieved in a previous iteration">
        Call the `specbook_describe(<params/>, embed: true, compress: 2)`
        tool *once* and internalize its result: the generic **SpecBook**
        models and formats (the object kinds, the object ids and
        `{{<id/>}}` anchors, the `[[xxx]]` references, the `, BECAUSE `
        rationale split, the Complex/Concise/Grouped format variants,
        and the `Created:`/`Modified:` frontmatter block) and the
        embedded YAML *schema configuration* (the allowed artifacts,
        object kinds, nestings, properties, and value constraints). Set
        <basedir/> to the directory its **SpecBook SPEC Model**
        statement names (the effective base directory, as resolved by
        the MCP service), or to <cwd/> if the result carries no such
        statement. Do not output anything.
        </if>

    2.  Resolve the specification Markdown files: they are *exactly* the
        files the `file` fields of the artifacts in the schema
        configuration reference, resolved against <basedir/>. You
        *MUST* *NEVER* guess other file paths. Do not output anything.

    3.  Read all resolved files which are related to <todo-what/> and
        <todo-how/>, and check the structure of the existing
        specification -- its artifacts, object kinds, ids, properties,
        descriptions, and `[[xxx]]` references -- to understand the
        overall models and their relationships. Do not output anything.

5.  **State: grilling:**

    Enter this state only if <opt-grill/> is equal `true`; otherwise
    silently *skip* the entire state. Do not output anything about the
    skipping.

    1.  Understand what "grilling" is about:

        -   GOAL: Interactively interviewing the user *relentlessly*
            about every *essential aspect* of the edit query in
            <todo-what/> and <todo-how/> *until* reaching a shared
            understanding and no major decisions/questions are left
            open, so for at least the most important decisions no
            essential freedom of choice exists any longer during the
            subsequent implementation.

        -   FOCUS: The following outside-in *Focus Areas*, in order of
            descending importance:

            1.  *DOMAIN* (`DOM`, MUST): aspects affecting
                domain-specifics, the "what" of the solution.
            2.  *INTERFACE* (`IFC`, MUST): aspects affecting externally
                observable behavior or user/machine interfaces.
            3.  *ARCHITECTURE* (`ARC`, SHOULD): aspects affecting
                structure, wiring, placement, or dependencies.
            4.  *IMPLEMENTATION* (`IMP`, MAY): aspects affecting any
                other inner details of the realization.

        -   INDICATORS: *Fuzzy Language* (vague or overloaded terms
            instead of precise or canonical ones), *Conflicting
            Terminology* (terms conflicting with the terminology of the
            existing specification), *Conflicting Content* (statements
            of the user the current specification does not agree with),
            and *Non-Concrete Scenarios* (domain relationships which
            have to be stress-tested with invented realistic scenarios
            probing the edge cases).

    2.  Perform <opt-grill-rounds/> grilling *rounds*, numbered <m/>
        (1-<opt-grill-rounds/>). For each round:

        1.  INITIALIZE TODO: Explicitly start *from scratch* from *only*
            the current <todo-what/> and <todo-how/> and *forget* all
            information gathered in previous rounds. Set <round-id/> to
            `GRILLING ROUND <m/>/<opt-grill-rounds/>` if
            <opt-grill-rounds/> is greater than 1, or to `GRILLING`
            otherwise. Do not output anything.

        2.  DETERMINE QUESTIONS: Determine the questions, each comprised
            of a round-local id `Q<N/>`, a focus area id <focus-N/>
            (`DOM`, `IFC`, `ARC`, or `IMP`), a 1-3 word hint
            <topic-N/>, and a very brief but precise text <text-N/>,
            which resolves an open point in one of the *Focus Areas*.
            Use the format `Shall...?` for `DOM` and `IFC`, the format
            `Should...?` for `ARC`, and the format `May...?` for `IMP`.
            Encode all *literal aspects* -- file paths, artifact ids,
            object kinds, object ids, property keys, references, and
            literal values -- with backticks, and keep every <text-N/>
            at most *200 characters* long.

        3.  SORT QUESTIONS: Sort the questions by descending focus area
            order (`DOM`, `IFC`, `ARC`, `IMP`), renumber <N/>
            accordingly starting at `1`, and truncate the list after a
            maximum of 10 questions. Assemble <question-N/> out of
            `**Q<N/>** ▶ **<focus-N/>** ▷ **<topic-N/>**: <text-N/>`.

        4.  DETERMINE ANSWERS: For every question, check the
            specification and your world knowledge to find *two to
            three* grounded answer alternatives, each with a
            question-local id `A<K/>`, a 1-3 word label, and an ultra
            brief description of at most *10 words*. Append ` ⚑` to
            the label of the alternative which reflects the current
            <todo-what/>/<todo-how/> understanding. Assemble
            <answer-N/> out of `**A1** ▶ **<label/>**: <description/>,
            **A2** ▶ **<label/>**: <description/>[, ...]` and keep it at
            most *240 characters* long.

        5.  SHOW QUESTIONS: Output only the following <template/>, with
            all column edges of the table aligned. In every table cell
            you *MUST* escape each literal pipe character as `\|` and
            *MUST* open *and* close every backtick code span within the
            *same* cell:

            <template>
            ❖ **SpecBook**: <round-id/>: *Relentless Interviewing Until Clarity*

            | QUESTION      | ANSWERS     |
            | ------------- | ----------- |
            | <question-1/> | <answer-1/> |
            | <question-2/> | <answer-2/> |
            | [...]         | [...]       |

            Legend: **DOM**: Domain       (MUST)    **IFC**: Interface      (MUST)    **Qn**: round-local question id
                    **ARC**: Architecture (SHOULD)  **IMP**: Implementation (MAY)     **An**: question-local answer id
                    ⚑:  current decision state
            </template>

        6.  ASK FOR ANSWERS: Show a *custom dialog* with the question
            label <round-id/>, the question description `What is your
            (combined) answer to all (or a subset) of the above
            questions? (keywords or `Qn:An` references are sufficient)`,
            and the two answer options:

            `SKIP GRILLING: skip all remaining grilling and continue with the implementation`
            `STOP SKILL: stop the entire skill immediately`

            If <result/> is `STOP SKILL`, only output the following
            <template/> and then immediately *STOP* processing the
            entire current skill:

            <template>
            ❖ **SpecBook**: ✪ command: **edit**, ▶ status: **editing stopped**
            </template>

            If <result/> is `SKIP GRILLING` or `CANCEL`, there are no
            answers to merge, and after item 8 below skip all remaining
            rounds and continue with the *implementing* state.
            Otherwise, treat the free-text <result/> as the combined
            answers to all questions of the round.

        7.  MERGE ANSWERS INTO TODO: Merge all gathered answers of the
            round *exclusively* back into <todo-what/> and <todo-how/>.
            Do not output anything.

        8.  SHOW CURRENT TODO: Set <round-suffix/> to
            ` round <m/>/<opt-grill-rounds/>` if <opt-grill-rounds/> is
            greater than 1, or to empty otherwise, and show the *todo
            box* of state `current state (after grilling<round-suffix/>)`.

6.  **State: implementing:**

    1.  You *MUST* strictly honor the following tenets in the creation
        and updating of specification content. Do not output anything.

        -   **Think Before Acting**: State your assumptions and do not
            hide confusion -- if multiple interpretations exist, do not
            pick silently.
        -   **Simplicity First**: The minimum change which fulfills the
            query, nothing speculative.
        -   **Surgical Changes**: Touch only what you must, match the
            existing style, and let every changed line trace directly
            to the query.
        -   **Intent over Realization**: The domain-specific aspects of
            a specification state only the *WHAT* and the *WHY*, never
            the *HOW*, which belongs only into its architecture-related
            aspects.
        -   **Statement with Rationale**: Every statement carries its
            *WHY* behind the `, BECAUSE ` clause of a description, and
            never restates itself as its own rationale.
        -   **Unambiguous and Verifiable**: Every statement is precise
            enough that two readers derive the same meaning and that
            its fulfillment is decidable -- replace vague qualifiers
            with the concrete property, threshold, or scenario.
        -   **Single Source of Truth**: Every fact resides in exactly
            *one* object -- point at it with a `[[xxx]]` reference
            instead of restating it.
        -   **Atomic Statement**: Every statement expresses exactly
            *one* fact with exactly *one* rationale.
        -   **Schema Conformance**: Every object stays conformant to the
            schema configuration -- never invent an object kind or a
            property key the schema does not define.
        -   **Referential Integrity**: Every `[[xxx]]` reference resolves
            to exactly one object -- when an object is renamed, moved,
            or removed, adjust or remove *all* references to it in the
            same change set.
        -   **No Fabrication**: Never invent specification content the
            query does not warrant -- surface a gap explicitly instead
            of papering over it with a plausible guess.

    2.  Run the command `date "+%Y-%m-%d %H:%M"` *once* to find out the
        current time and store its output in <timestamp-modified/>. Do
        not output anything.

    3.  Apply the edit by modifying the affected specification Markdown
        files with a corresponding, complete *change set*, honoring
        *only* <todo-what/> and <todo-how/> plus the information
        gathered in the *discovering* state.

        The change set *MUST* keep every touched file conformant to the
        retrieved SpecBook description: the `Created:`/`Modified:`
        frontmatter block, the heading levels, the
        Complex/Concise/Grouped format variants, the schema-allowed
        object kinds, nestings, and property keys, the object ids and
        `{{<id/>}}` anchors, the `, BECAUSE ` rationale split, and the
        `[[xxx]]` references.

        *Generate* a specification Markdown file which does not yet
        exist but is warranted by the edit and referenced by the schema
        configuration, using <timestamp-modified/> for both its
        `Created:` and `Modified:` timestamps. Whenever an *existing*
        file is changed, replace the value of its `Modified:` line with
        <timestamp-modified/>.

    4.  Output only the following <template/>. You *MUST* *NOT* output a
        change summary, a list of modified files, a rationale, or a
        unified diff of the changes:

        <template>
        ❖ **SpecBook**: ✪ command: **edit**, ▶ status: **changes applied**
        </template>

7.  **State: verifying:**

    Enter this state only if <opt-verify/> is equal `true`. Otherwise
    you *MUST* *strictly skip* the entire state and *any* verification:
    do *NOT* validate the specification at all.

    1.  Call the `specbook_lint(<params/>)` tool and read its returned
        diagnostics into <diagnostics/>.

    2.  If <diagnostics/> contains errors or warnings, fix the reported
        problems in the affected specification Markdown files via the
        `Edit`/`Write` tools and re-validate as in item 7.1 -- for at
        most *three* rounds in total.

    3.  <if condition="<diagnostics/> is not empty after the last round">

        Only output the following <template/>, listing one bullet line
        per remaining diagnostic:

        <template>
        ❖ **SpecBook**: ✪ command: **edit**, ▶ status: **verification failed**

        **DIAGNOSTICS**:

        -   `<file/>:<line/>:<column/>`: <message/>
        [...]
        </template>

        </if>
        <else>

        Only output the following <template/>:

        <template>
        ❖ **SpecBook**: ✪ command: **edit**, ▶ status: **verification passed**
        </template>

        </else>

8.  **Loop or Finish:**

    <if condition="<opt-loop/> is equal `true`">
    Continue with the *next* iteration at the *querying* state (item 3
    above). Do not output anything in this item.
    </if>
    <else>
    Finish the skill processing. Do not output anything in this item.
    </else>
