# Design rules

The identity of this site is: **quiet editorial website with a playful OS layer inside it.**
These rules keep the two layers from bleeding into each other. If a change seems to
violate one of these, either the change is wrong or this file is — update one deliberately.

## The two surfaces

| | Site layer | App layer (windows) |
|---|---|---|
| Where | Home, Writing, Notes, Projects, About, footer/header chrome | Collected (drawer + category windows), Ask composer, admin |
| Feel | Apple.com-like: editorial, monochrome, generous whitespace | macOS/iOS-like: traffic lights, title bars, pills, system blue |
| CTA style | Black pill (`brand` variant) | iOS blue pill (`primary` variant) |
| Content links | `#0066cc` (`text-link`, the default for all prose links) | `#007aff` inside window bodies only |

## Color

- Monochrome first: `text-ink`, `text-meta`, `border-hairline`, `bg-surface`, `bg-primary` (black).
- **`#007aff` is an action color, never decoration.** Buttons, menu highlight, chips that
  represent a live value, in-window links. Never headings, borders, badges, backgrounds.
- Pressed/hover state of `#007aff` is `#0056cc`.
- Content links in prose stay `#0066cc` — even inside windows (prose is content, not control).
- Traffic lights: `#ff5f57` / `#febc2e` / `#28c840`. Green `#28c840` doubles as the
  success color (Sent checkmark).

## Buttons — one component

All buttons go through `resources/js/Components/Button.tsx`. No hand-rolled CTA classes.

- Shape: **pill (`rounded-full`) always** — iOS-style.
- Variants:
  - `primary` — iOS blue `#007aff`, used for app-layer/admin actions (Send, ItemModal
    "Open", Save, Publish, dialog confirm).
  - `brand` — black, reserved for site-layer brand CTAs (Hero "Ask me anything").
  - `secondary` — white pill + hairline border (safe/cancel actions).
  - `ghost` — text only.
- Sizes: `sm` (toolbars), `md` (default), `lg` (Hero).
- Disabled renders at `opacity-60`.

## Window chrome

- Windows: `rounded-xl`, `border border-hairline`, **no shadow**, title bar `h-10` `bg-[#f6f6f6]`
  with `TrafficLights` (shared `WindowChrome.tsx`), centered title in `text-sm font-medium`.
- Shadows are for things that *float above* windows only: modals (`shadow-2xl`),
  popovers/menus (`shadow-lg`).
- **Windows size to their content** — a category with two items shows a short window.
  No minimum-height shells; the "N items" status line does the honest work.
- One window per page. Views render *inside* a window; they never draw their own
  fake title bar, dots, or border.

## Radius ladder

`rounded-sm` (6px, tags) → `rounded-md` (8px, inner controls) → `rounded-xl` (12px, windows/modals) → `rounded-full` (pills, chips, traffic-light dots).

## Mobile

- The hamburger opens a **macOS-style menu popover**: right-anchored, compact (`w-56`),
  `rounded-lg`, blur + `shadow-lg`, leading ✓ for the current page, separator groups,
  system-blue hover pill.
- **Touch targets ≥ 44px** (Apple HIG) — menu rows use `py-3`. This is an iOS-leaning
  site; failing Apple's own metric on our own nav is not acceptable.
- Dismiss popovers on outside click, `Escape`, and navigation.

## Don'ts

- Don't add new OS fiction (dock, Spotlight search, ⌘K, mission control) until the
  content catches up to the chrome. Metaphors multiply faster than content.
- Don't restyle Writing/Notes/About into windows. The tension between quiet editorial
  and playful OS *is* the identity.
- Don't use blue decoratively. The moment blue appears outside actions, the site stops
  feeling like software + print and starts feeling like every SaaS.
- Don't invent a second button component or inline CTA styles.
