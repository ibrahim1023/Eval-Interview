# EvalInterview — Living Spec Design Contract

> The spec writes itself as you talk: an editorial document drafting itself live
> on warm paper, with the conversation as stage directions in the margin.

**Theme:** light only. Dark mode is a non-goal.

EvalInterview's UI treats the behavior specification as the protagonist: a
serif document on a warm paper canvas, with numbered sections (§), stamped
statuses, and conflicts called out in the margin. Everything around the
document — nav, conversation rail, voice bar — is quiet sans-serif UI that
defers to it. Structure comes from 1px hairline borders, never shadows or
filled panels. There is exactly one chromatic voice (Signal indigo) reserved
for live state and the single most important action on a screen; rule-status
colors are the only other chromatic elements, and they belong to the stamps
and conflict notes, not to chrome.

Canonical source: `mockups/` (approved designs: `interview-v3.html`,
`results-v3.html`). This document is the binding contract for all UI work;
tokens live in `app/globals.css`.

## Tokens — Colors

Defined in `:root` / `@theme` in `app/globals.css`. Use the Tailwind classes —
never hardcode these hex values in components.

| Name | Value | Class | Role |
|------|-------|-------|------|
| Paper | `#fdfcf9` | `bg-paper` | Page background on every screen — warm off-white that reads as paper, not screen-white |
| Paper Rail | `#f7f5ef` | `bg-paper-rail` | The conversation rail on the interview screen — one step deeper than Paper |
| Hairline | `#e8e4da` | `border-hairline` | All structural borders: nav, rail, section separators, secondary buttons. The primary structural device |
| Shimmer | `#eeebe2` | `bg-shimmer` | Drafting shimmer bars while the engine works |
| Signal | `#2b4acb` | `bg-signal` / `text-signal` | Live state (waveform bars, "heard, processing") and the primary conversion action (Export). Max one filled Signal element per screen |

Neutral text and surfaces stay on the Tailwind neutral scale:

| Role | Class |
|------|-------|
| Headings, expert utterances, strong values | `text-neutral-900` |
| Body copy | `text-neutral-500` / `text-neutral-600` |
| Captions, eyebrow labels, provenance, interviewer utterances | `text-neutral-400` |
| Cards, inputs, secondary buttons | `bg-white` with `border-hairline` |
| Primary buttons (non-conversion) | `bg-neutral-900 text-white` |

Rule-status palette (stamps, conflict notes — never chrome):

| Status | Text/border | Wash |
|--------|-------------|------|
| Confirmed | `green-700` | — |
| Provisional | `neutral-400` | — |
| Conflict | `orange-700` / `orange-900` text | `orange-50` + `border-orange-200` |
| Unresolved | `violet-700` / `violet-900` text | `violet-50` + `border-violet-200` |

## Typography

Three voices, no others:

- **Serif — the document.** `font-serif` (Charter → Georgia stack, set in
  `@theme`). Bold, tight-tracked. Used only for spec content: the agent name
  as document title (3xl/34px), section headings (lg–xl), and § numerals
  (15–17px, `text-neutral-400`). Never for UI chrome.
- **Sans — the interface.** Geist Sans (default). Eyebrow labels at 11px,
  600-weight, `tracking-[0.08em]` uppercase, `text-neutral-400`. Body/UI at
  13–15px. Nav brand at 15px 600.
- **Mono — provenance.** `font-mono` (Geist Mono) at 11.5–12.5px,
  `text-neutral-400`. Source references and spec metadata only.

## Shape, Spacing & Motion

- Radius: `rounded-lg` buttons/inputs, `rounded-[10px]` callout cards,
  `rounded` status stamps. No pills, no rounded-2xl hero cards (the New
  Interview form's `rounded-2xl` is the one legacy exception).
- No drop shadows anywhere. Elevation is communicated by Paper vs. white.
- The interview screen is a fixed two-pane grid (`380px` rail + document
  column, `max-w-[620px]`, generous `px-14 pt-12`); the document scrolls, the
  chrome doesn't.
- Status stamps rotate `-2deg` and use a 1.5px border — the one playful
  gesture, like a rubber stamp on paper.
- Motion is functional only: `animate-pulse` on the waveform bars (staggered
  0.15s delays) and the drafting shimmer. Smooth-scroll follows new content.
  No entrances, no transitions for their own sake.

## Guidelines

**Do**

- Put `bg-paper` on every screen's root; white is for cards and inputs only.
- Use `border-hairline` for every structural separator.
- Keep the serif/mono voices inside the document; UI chrome stays sans.
- Use `bg-signal` for at most one action per screen (currently: Export).
- Show provenance (`turn_n · source`) in mono under every spec section.

**Don't**

- Don't hardcode hex values in components — extend the tokens in
  `globals.css` instead, and record the addition here.
- Don't add shadows, gradients, or new accent colors.
- Don't use the serif face for buttons, nav, or form labels.
- Don't introduce dark-mode variants of these tokens.
- Don't add screens beyond the four spec'd ones (Landing, New Interview,
  Interview, Results).
