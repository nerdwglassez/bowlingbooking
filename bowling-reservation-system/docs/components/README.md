# Component architecture index

This section documents reusable component contracts and where they are used across customer and employee experiences.

| Component doc | Purpose |
|---------------|---------|
| [UI_PRIMITIVES.md](UI_PRIMITIVES.md) | Shared `components/ui/*` building blocks and usage rules |
| [BOOKING_COMPONENTS.md](BOOKING_COMPONENTS.md) | Customer booking-specific components and state contracts |
| [STAFF_COMPONENTS.md](STAFF_COMPONENTS.md) | Staff/manager/admin component contracts and guardrails |
| [LAYOUT_COMPONENTS.md](LAYOUT_COMPONENTS.md) | Shared header/layout components and variant behavior |
| [COMPONENT_ROUTE_MATRIX.md](COMPONENT_ROUTE_MATRIX.md) | Route-to-component dependency map for impact analysis |

## Usage

- Update component docs in the same PR when component props or state contracts change.
- Keep route-level behavior in flow docs; keep reusable UI behavior in this section.
- Use placeholders in examples, not real identifiers or secrets.
