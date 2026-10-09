---
Created:  2026-10-04 12:00
Modified: 2026-10-04 12:00
---

ARCH: Code Patterns (CP)
========================

##  CODE-PATTERN: Declarative Permission Check {{permission-check}}

-   APPLIES-TO: [[COMPONENT:service]], [[COMPONENT:auth]], [[ROLE:attendee]], [[ROLE:moderator]], [[ROLE:presenter]],
                [[ROLE:manager]], [[ROLE:administrator]]
-   REALIZES:   [[TACTIC:access-security]]
-   DECIDED-BY: [[DECISION:no-accounts]]
-   TOOLS:      [[COMPONENT:persistence-layer]]
-   AVOID:      role checks in the client alone, or an ad-hoc `if (session.role === ...)` inside a DAO method

The authorization model is coded as one declarative permission table,
holding exactly one entry per `PERMISSION` of the Authorization Model
(identified by its anchor id) with the role, the entity, the granted
operations, the admitted lifecycle states, and an optional condition
function, which the single `authorize()` evaluates for every operation
after the event scope check, denying whatever no entry grants, BECAUSE
the table is then reviewed line by line against the specification, while
a check spread over the code is neither complete nor auditable.

```ts mark=1-8,26-35
type Permission<E extends Entity> = {
    id:         string
    role:       Role
    entity:     E
    operations: Operation[]
    states?:    string[]
    condition?: Condition<E>
}

const permissions: AnyPermission[] = [
    { id: "moderator-read-messages", role: "moderator", entity: "Message", operations: [ "read" ] },
    { id: "moderator-decide",        role: "moderator", entity: "Message", operations: [ "accept", "reject" ] },
    { id: "moderator-forward",       role: "moderator", entity: "Message", operations: [ "forward", "update" ],
      states: [ "accepted", "forwarded" ],
      condition: ({ operation, obj, changes }) => obj.type === "Question"
          && (operation !== "update" || confinedTo(changes, "presenterAnnotation", "predecessorId", "questionTags")) }
]

export const authorize = async (db: DB, session: Session, operation: Operation,
    entity: Entity, obj: unknown, changes: object = {}): Promise<void> => {
    if (session.role !== "administrator"
        && (session.user === null || await eventOf[entity](db, obj as Ref) !== session.user.eventId))
        throw new AuthorizationError(session, operation, entity)
    const state = (obj as { state?: string }).state ?? ""
    const ctx   = { db, session, operation, obj, changes } as Context<Entity>
    for (const p of permissions) {
        if (p.role !== session.role || p.entity !== entity || !p.operations.includes(operation))
            continue
        if (p.states !== undefined && operation !== "create" && !p.states.includes(state))
            continue
        if (p.condition !== undefined && !(await (p.condition as Condition<Entity>)(ctx)))
            continue
        return
    }
    throw new AuthorizationError(session, operation, entity)
}
```

##  CODE-PATTERN: DAO per Entity {{dao-per-entity}}

-   APPLIES-TO: [[COMPONENT:service]], [[ENTITY:Event]], [[ENTITY:Channel]], [[ENTITY:Message]],
                [[ENTITY:AuthorizationToken]], [[ENTITY:SessionToken]]
-   REALIZES:   [[TACTIC:typed-contracts]]
-   DECIDED-BY: [[DECISION:typed-sql]], [[DECISION:postgresql-store]]
-   TOOLS:      [[COMPONENT:persistence-layer]], [[TS.TIER:Database.COMPONENT:database]]
-   USES:       [[CODE-PATTERN:permission-check]]
-   AVOID:      a query assembled outside the DAO of its entity, or a DAO writing the table of another entity

Every entity of the Data Model is persisted through exactly one Data
Access Object class (`app-db-dao-dm-*.ts`, a lifecycle-carrying entity
through `app-db-dao-sm-*.ts`), which takes the session and whole objects
(a draft to create, the changed row to update), authorizes every operation
through the shared core *before* touching the Drizzle table, and bundles
the writes of one operation into one transaction, BECAUSE the DAO is then
the single place where an entity meets its table, its permissions, and
its invariants, so a schema or permission change is applied once.

```ts mark=8,11
export class SessionTokenDAO {
    constructor (protected core: DB) {}

    async create (session: Session, draft: Draft<SessionToken>): Promise<SessionToken> {
        const db = this.core.require()

        /*  authorize the creation on the draft  */
        await this.core.authorize(session, "create", "SessionToken", draft)

        /*  bundle multiple operations into a single transaction  */
        return db.transaction(async (tx) => {
            /*  close any prior session of the user for the event (SPEC-DR single-session)  */
            await tx.delete(schema.sessionTokens).where(and(
                eq(schema.sessionTokens.userId,  draft.userId),
                eq(schema.sessionTokens.eventId, draft.eventId)))

            /*  store the draft  */
            const [ row ] = await tx.insert(schema.sessionTokens).values(draft).returning()
            return row
        })
    }
}
```

##  CODE-PATTERN: Version-Checked Write {{versioned-write}}

-   APPLIES-TO: [[COMPONENT:service]], [[UNIT:service-loop]], [[ENTITY:Event]], [[ENTITY:Channel]],
                [[ENTITY:Message]], [[ENTITY:SessionToken]]
-   DECIDED-BY: [[DECISION:modular-service]]
-   TOOLS:      [[COMPONENT:persistence-layer]]
-   USES:       [[CODE-PATTERN:dao-per-entity]]
-   AVOID:      a last-writer-wins `UPDATE` of the whole row, or a read-modify-write across two statements

Every row carries a `version` column, and every update or deletion of a
DAO loads the stored row, derives the changed attributes (`changesOf`),
and writes them in one statement whose `WHERE` also matches the version
the caller based its object on, incrementing it (`bump`) on the way and
raising a `ConflictError` when no row was hit (`stored`), BECAUSE two
moderators editing the same message at once must not silently overwrite
each other, and the version check costs one predicate instead of a lock.

```ts mark=3-5,15-19
/*  ensure a version-checked write of an object of an entity returned the
    stored row, i.e. hit the version it was based on  */
stored<T> (obj: T | undefined, entity: Entity, id: string): T {
    if (obj === undefined)
        throw new ConflictError(entity, id)
    return obj
}

/*  the incremented version of a row (optimistic locking)  */
bump (version: PgColumn): SQL {
    return sql`${version} + 1`
}

/*  usage inside a DAO: delete the row, version-checked (optimistic locking)  */
const [ stored ] = await db
    .delete(schema.sessionTokens)
    .where(and(eq(schema.sessionTokens.sessionId, id), eq(schema.sessionTokens.version, sessionToken.version)))
    .returning({ sessionId: schema.sessionTokens.sessionId })
this.core.stored(stored, "SessionToken", id)
```
