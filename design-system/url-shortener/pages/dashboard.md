# Dashboard override

This page intentionally departs from the generated SaaS-mobile treatment while
keeping its accessibility, density, spacing, and typography recommendations.

## Direction

- Technical editorial workspace, not a conventional admin template.
- Warm paper canvas, ink surfaces, safety-orange signal accents.
- Fira Sans for readable interface copy; Fira Code only for slugs, labels, and data.
- One strong dark creation panel instead of a grid of interchangeable cards.
- Metrics use dividers and typographic hierarchy rather than floating KPI cards.
- Tables become stacked records below 720px with no horizontal page scrolling.

## Tokens

| Role | Value |
|---|---|
| Canvas | `#F2EFE6` |
| Surface | `#FFFDF7` |
| Ink | `#171816` |
| Muted ink | `#62645D` |
| Border | `#D5D0C3` |
| Signal | `#F05A28` |
| Signal soft | `#FFD7C8` |
| Success | `#147A5B` |
| Danger | `#B42318` |

## Interaction rules

- All controls are at least 44px tall and have visible focus rings.
- Validate the URL on submit; keep backend messages close to the field.
- Disable the submit button while the request is pending.
- Copy success uses an `aria-live` message and does not rely on color alone.
- Motion is limited to 160-220ms opacity/transform transitions and respects
  `prefers-reduced-motion`.

## Avoid

- Purple or blue gradients, glass panels, decorative blobs, and excessive pills.
- A permanent sidebar before the product has enough destinations to justify one.
- Placeholder-only labels, icon-only actions without accessible names, and fake
  metrics that the API cannot support.
