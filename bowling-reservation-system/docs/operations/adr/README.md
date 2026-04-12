# Architecture decision records (ADR)

Use ADRs to capture decisions that materially impact reservation flow, employee experience, shared services, or operational behavior.

## When to create an ADR

Create an ADR when you:

- Add or change a core domain contract (auth, availability, pricing, payment).
- Introduce a cross-cutting dependency or integration.
- Replace an implementation pattern that affects multiple routes/components.
- Accept a trade-off that future contributors must understand.

Do not create ADRs for small copy/layout changes.

## ADR format

Use sequential filenames:

- `ADR-0001-short-title.md`
- `ADR-0002-short-title.md`

Suggested content:

1. Title
2. Status (`Proposed`, `Accepted`, `Superseded`, `Deprecated`)
3. Context
4. Decision
5. Consequences (pros/cons)
6. Alternatives considered
7. Follow-up tasks

## Initial ADR template

See [ADR_TEMPLATE.md](ADR_TEMPLATE.md).
