# DESIGN.md

Written before UI code. Purple and white magazine, Solana-adjacent, not blue.

## Mark and wordmark
A caption bracket `[ ]` whose right side carries a coin notch, one SVG path, legible at 16 px (`components/Mark.tsx`). Wordmark `MERUIT` in the display serif, small caps, letter-spacing 0.08em.

## Colour tokens (`tailwind.config.ts`)
| Token | Hex | Role |
|---|---|---|
| Paper | `#FBF9FF` | page background, faint grain |
| Vellum | `#F3EEFF` | cards and panels |
| Ink | `#171128` | text |
| Amethyst | `#7B3FE4` | glow and fills; primary buttons use Amethyst Deep `#5F27C4` for extra margin |
| Ultraviolet | `#B57CFF` | glow, hover halos, focus rings |
| Receipt Mint | `#14F195` | money returned, settled; fills only, text on it is Ink; text-weight variant `#0B6B47` |
| Ember | `#FF6B4A` | refusals, failures, "check" cues; fills and strokes; text-weight variant `#B3361A` |
| Graphite | `#5B5470` | secondary text, hairlines |

Contrast, computed with the WCAG relative luminance formula (not estimated):

| Pair | Ratio | AA text (4.5) |
|---|---|---|
| White on Amethyst `#7B3FE4` | 5.72 | pass |
| White on Amethyst Deep `#5F27C4` (primary buttons) | 8.16 | pass |
| Amethyst on Paper | 5.47 | pass |
| Graphite on Paper | 6.82 | pass |
| Ember `#FF6B4A` on Paper | 2.70 | fail, so Ember is never used as text; Ember Ink `#B3361A` is | 
| Ember Ink on Paper | 5.81 | pass |
| Mint Ink `#0B6B47` on Paper | 6.26 | pass |
| Ink on Mint `#14F195` | 12.24 | pass |

Primary buttons use Amethyst Deep for extra margin, not because Amethyst fails. The axe-core WCAG 2.2 AA run over every page at seven viewports also passes (`tests/e2e/viewports.spec.ts`).

## Fonts (self-hosted, `public/fonts/LICENSES.md`)
Zodiak (display), Switzer (text), Martian Mono (meters, signatures, labels). Fontshare FFL for the first two, OFL for the third. No Inter, Roboto, Arial.

## Signature motion
"The meter settles" in the hero card: a ceiling bar fills, captions tick in, the unused part slides off as a mint "returned" chip. Framer Motion, 2.4 s. Static final frame under `prefers-reduced-motion`.

## Ornament
Hairline rules at 20% Graphite, numbered section labels in Martian Mono (`01 / THE MOMENT`), receipt perforation on the ceiling card, film sprocket holes on the caption strip, printed offset shadow `8px 10px 0`.

## Layout
Square capsule navbar (rounded 16 px, not a pill), floating, glass Vellum with an Ultraviolet halo. Connect becomes an address chip plus a power icon. Mobile: mark, compact connect, menu sheet. Hero scene never overlaps text; below 1024 px it sits under the copy with at least 32 px of space (asserted in the viewport test).
