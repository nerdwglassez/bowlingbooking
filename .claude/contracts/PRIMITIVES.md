# Primitives Contract

Source of truth for **every file under `src/components/ui/`**. Agents building primitives MUST read this file and the canonical reference (`src/components/ui/button.tsx`) before writing code.

This contract was canonicalized after a 3-way best-of-N exploration (CVA / pure-function / Radix Slot). Strategy C — **shadcn-style: `Slot` + variant function** — won. See `.cursor/AGENTS.md` for the rationale; the short version is: server-component-safe, smallest dep, `asChild` enables `<Link>` styling without wrapping.

---

## 1. Canonical pattern (READ `button.tsx` FIRST)

Every primitive follows this skeleton:

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ')
}

export type FooVariant = 'a' | 'b' | 'c'
export type FooSize = 'sm' | 'md' | 'lg'

export type FooVariantsArgs = {
  variant?: FooVariant
  size?: FooSize
  className?: string
}

const sizeClassName: Record<FooSize, string> = { /* layout only */ }
const variantClassName: Record<FooVariant, string> = { /* tokens */ }

export function fooVariants({ variant = 'a', size = 'md', className }: FooVariantsArgs = {}): string {
  return cn(/* base classes */, sizeClassName[size], variantClassName[variant], className)
}

export type FooProps = React.HTMLAttributes<HTMLElement> & FooVariantsArgs & {
  asChild?: boolean
}

export const Foo = React.forwardRef<HTMLElement, FooProps>(function Foo(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : 'div'
  return <Comp ref={ref as never} className={cn(fooVariants({ variant, size }), className)} {...props} />
})

Foo.displayName = 'Foo'
```

---

## 2. Hard rules (drift sentinel will fail your build)

These are not preferences. The drift greps in `.cursor/AGENTS.md` run after every primitive agent and will fail CI if violated.

1. **No raw hex colors.** Use `var(--token)` references only. The single allowed exception is `rgba(...)` literals where translucency is the whole point (see Button's `dark` variant). Prefer adding a token over reaching for `rgba`.
2. **No Tailwind color utilities.** `bg-amber-500`, `text-slate-700`, `border-stone-200`, etc. are all banned. Use `bg-[var(--color-action)]`, `text-[var(--color-text-secondary)]`, `border-[var(--color-border)]`.
3. **No `dark:` prefix.** Theming is done via `data-theme="dark"` on `<html>`, which switches the CSS variable values in `src/styles/themes/default.css`. Your primitive should look identical in both themes because it only reads tokens. If you need a variant-name that happens to contain "dark" (like Button's `dark` variant), use a computed property key:
   ```ts
   const VARIANT_DARK: ButtonVariant = 'dark'
   const variantClassName = { [VARIANT_DARK]: '...' }
   ```
4. **Tailwind is for layout only.** OK: `flex`, `grid`, `gap-2`, `px-4`, `h-10`, `rounded-[var(--radius-lg)]`, `shrink-0`, `whitespace-nowrap`, `inline-flex`, `items-center`. NOT OK: any color utility, `font-bold` (use weight token if available, else accept `font-semibold`/`font-medium`), `shadow-md` (use `shadow-[var(--shadow-card)]` or arbitrary).
5. **Font family must reference a token.** Use `[font-family:var(--font-body)]` or `[font-family:var(--font-display)]` — never bare `font-sans` or `font-serif`.
6. **No `'use client'` unless you genuinely need it.** Primitives must work in Server Components. If the design forces interactivity (e.g. a `<Toggle>` with state), wrap *only* the stateful piece in a small client child, keep the visual shell server-rendered. Button is server-safe; Toggle and Checkbox will need `'use client'` for state but should still keep `displayName` and `forwardRef`.
7. **`forwardRef` on every primitive.** Patterns layer needs to attach refs. No exceptions.
8. **`displayName` set explicitly.** `Foo.displayName = 'Foo'` — improves debugging in React DevTools.
9. **Export both the component AND the variants function.** `export const Foo` and `export function fooVariants` — patterns layer occasionally wants the className string without rendering the element (e.g. a `<Link>` styled like a Button).
10. **No inline `style={{ }}` for color/border/shadow.** Inline styles bypass Tailwind's arbitrary-value indirection and make tokens invisible to grep. Acceptable: `style={{ width }}` for genuinely dynamic numeric values.

---

## 3. Tokens you may use

Read `src/styles/tokens.css` and `src/styles/themes/default.css` for the full list. The semantic tokens — anything starting with `--color-`, `--surface-`, `--status-`, `--radius-`, `--shadow-`, `--font-` — are public API for primitives. Do **not** use palette tokens (anything starting with `--palette-`) directly; those are wiring for the theme files only.

If a token you need is missing, add a `Token requests` section at the bottom of your agent report. Do NOT add the token yourself — that's the Tokens agent's scope (see `.cursor/AGENTS.md`).

Outstanding token requests (open after Button BON, deferred to first repetition):
- `--shadow-action-glow` — primary's `0 0 20px rgba(245,158,11,0.25)`. Currently inline as an arbitrary shadow.
- `--surface-on-dark-frost` / `--border-on-dark-subtle` — for translucent overlays on dark surfaces. Currently inline `rgba(255,255,255,0.08)` / `rgba(255,255,255,0.12)`.

---

## 4. Required surface per primitive

Every primitive must support:

| Prop / behavior | Notes |
|---|---|
| `variant` | Even if you only have one to start — accept the prop, default it, narrow the type. Future-proofs the API. |
| `size` | If size matters (Badge does, Card might not). Skip for primitives where size truly doesn't apply. |
| `className` | Always forwarded to the root element, appended last so callers can override. |
| `asChild` (where it makes sense) | Use Radix `Slot`. Skip for primitives that own internal state (Toggle, Checkbox) or render multiple elements (Select). |
| `forwardRef` | Always. |
| `aria-*` | At minimum: `aria-disabled` and `aria-busy` if applicable; `aria-checked` for toggle/checkbox; `aria-invalid` for input. |
| `disabled` | Disabled state styling lives in the base class via `disabled:` and `aria-disabled:` selectors. Always pair them. |
| Focus ring | All interactive primitives use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)]`. Copy verbatim from Button. |

---

## 5. Per-primitive scope notes

These are the *only* specs you should infer for each primitive. Detailed visual specs live in `.claude/DESIGN_SYSTEM.md`. Read both before starting.

### Badge (`src/components/ui/badge.tsx`)
- Variants: `default | ok | warning | error | info` (matches `--status-ok-*` / `--status-warning-*` / `--status-error-*` / `--status-info-*` tokens in `tokens.css`). `default` uses `--surface-sunken` + `--color-text-secondary` + `--color-border`.
- No `size` (always one size — sm/h-6).
- Render as `<span>`. `asChild` supported.
- No `forwardRef` ref forwarding needed if you keep it simple — but include it anyway for consistency.

### Input (`src/components/ui/input.tsx`)
- Render as `<input>`. Forward all native props.
- Variants: just `default` for now (accept the prop for future error states).
- `size` is fine; consider mapping it to height + font-size.
- Include `aria-invalid` handling — when true, swap border to `var(--status-error-border)`.
- No `asChild` (the element is the `<input>`).

### Select (`src/components/ui/select.tsx`)
- For Phase 2, render a **native `<select>`** styled with tokens. We can swap to Radix Select later if the booking UX needs custom dropdowns. Do NOT install `@radix-ui/react-select` yet.
- Visually match Input.
- No `asChild`.

### Checkbox (`src/components/ui/checkbox.tsx`)
- Render the native `<input type="checkbox">` *visually hidden* and overlay a styled `<span>` showing checked/unchecked states. This pattern works in Server Components.
- `'use client'` only if you need state — if the component is fully uncontrolled, leave it server-safe.
- Wire `aria-checked` and `aria-disabled`.

### Toggle (`src/components/ui/toggle.tsx`)
- Same approach as Checkbox: hidden native `<input type="checkbox">` + visual switch.
- Render as a single component; no separate `Track` / `Thumb` exports.
- `'use client'` only if controlled state is built in. Prefer uncontrolled and let patterns add `useState`.

### Card (`src/components/ui/card.tsx`)
- Render as `<div>` with `bg-[var(--surface-card)]`, `border border-[var(--color-border)]`, `rounded-[var(--radius-xl)]`, `shadow-[var(--shadow-md)]`.
- Variants: `default` (above), `elevated` (uses `--shadow-lg` instead of `--shadow-md`), `flat` (no shadow, retains border).
- Optional subcomponents `CardHeader`, `CardBody`, `CardFooter` exported from the same file, each forwarding refs. Keep them dumb — just layout spacing.
- `asChild` supported on Card root only.

---

## 6. Verification steps every primitive agent must run

Before declaring done, run these from repo root and paste output in the agent report:

```bash
npm run verify
```

That single command runs `tsc --noEmit`, `eslint`, and the drift sentinel (`scripts/drift-check.mjs`) across both layers in one pass. It exits 0 on success and prints a per-check summary like:

```
scanned 13 file(s) across 2 pattern(s)
PASS: drift sentinel — all checks clean
  - raw hex colors: 0 violations
  - tailwind color utilities: 0 violations
  - dark: prefix: 0 violations
  - direct --palette-* token use: 0 violations
  - 'use client' in a primitive: 0 violations
  - inline lane-count math: 0 violations
  - inline price formatting: 0 violations
  - useState in a pattern (must be controlled): 0 violations
  - sticky/fixed positioning in a pattern: 0 violations
```

On failure it lists the file, line, and matched snippet for every violation along with the fix hint. If anything fails, fix the file and re-run before reporting.

(If you want to scope drift to just your file: `node scripts/drift-check.mjs --files src/components/ui/<your-primitive>.tsx`.)

---

## 7. What you do NOT do

- Do **not** touch `src/styles/tokens.css` or `src/styles/themes/default.css`. Open a token request instead.
- Do **not** create files outside `src/components/ui/`. Patterns, pages, business logic are out of scope.
- Do **not** change `package.json` dependencies. If you need a new dep, stop and ask. (We already have `@radix-ui/react-slot`. That's the only Radix package authorized for primitives.)
- Do **not** edit Button. It's canonical; treat it as read-only.
- Do **not** add comments narrating what the code does. Comments only for non-obvious intent (see Button's `loading + asChild` comment for an example).
