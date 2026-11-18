---
name: Zvondis Tools
description: The tools.zvondis.dev pages, set in the zvondis.dev system. One grotesque, ink on paper, hairline rules; the accent is only the focus ring.
colors:
  paper: "#fafaf9"
  ink: "#0c0c0d"
  mute: "#595c62"
  rule: "#d9dadc"
  field: "#7a7d83"
  accent: "#1637e0"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 4.6vw + 0.5rem, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  lede:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
  title:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.4
  meta:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "2px"
spacing:
  gutter-phone: "16px"
  gutter-tablet: "32px"
  gutter-desktop: "56px"
  column-gap: "24px"
  band-phone: "64px"
  band: "88px"
  target: "44px"
components:
  button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
    height: "44px"
  button-hover:
    backgroundColor: "{colors.mute}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "44px"
  nav-link:
    textColor: "{colors.mute}"
    typography: "{typography.meta}"
    height: "44px"
  nav-link-current:
    textColor: "{colors.ink}"
---

# Design System: Zvondis Tools

## Overview

**Creative North Star: "The Same Page, Put to Work"**

tools.zvondis.dev inherits the zvondis.dev design system and changes nothing in it. Where the main site's DESIGN.md and its real style.css disagree (CZ / EN at the top right of the rail, nav links at 400 15px, Meta at 15px), this file follows the stylesheet. A tools page should be indistinguishable from an inner page of the main site, such as Uses or Semester: the same rail, the same grid, the same type. The difference is the mode. The main site persuades and is read; a tool is operated. Labels sit above fields, controls are native, numbers are tabular.

`assets/style.css` holds every rule below. Its rules mirror the zvondis.dev stylesheet, so keep them in step with the main site rather than inventing new ones. Buttons and choices are body size at weight 700; `.button-outline` adds a 1px ink border; inputs have a 1px field border; the focus ring is a 2px accent outline 3px out (0 on inputs, whose border turns ink).

**Key Characteristics:**

- One family (Archivo, variable, self-hosted), contrast by weight: an 800 headline against a 400 mute subtitle, 700 for labels and anything current.
- No accent colour in the content. The blue appears only as the keyboard focus ring.
- A rail in columns 1 to 3 on desktop with the Zvondis mark, the nav and the theme and CZ / EN switches; on phones the mark and the switches share a line and the links wrap below.
- Bands opened by a 1px ink rule, rows split by 1px hairlines.
- 2px corners on buttons and inputs only.

## Colors

Near-white paper, near-black ink, one grey for secondary text, one grey for input borders and one hairline grey. In dark mode the same five tokens and the accent swap to inverted values (see Dark).

### Primary

- **Accent** (`--accent`, #1637E0): the focus ring, and nothing else on this site. On zvondis.dev it is also the price phrase and the Call button; tools have neither.

### Neutral

- **Paper** (`--paper`, #FAFAF9): the page and every input background.
- **Ink** (`--ink`, #0C0C0D): text, band rules, the current nav item, buttons, total rows. 18.72:1 on paper.
- **Mute** (`--mute`, #595C62): subtitles, notes, row details, inactive nav, button hover. 6.42:1 on paper.
- **Field** (`--field`, #7A7D83): input borders. 3.95:1 on paper, above the 3:1 a component boundary needs.
- **Rule** (`--rule`, #D9DADC): hairlines between rows. Decorative only; it never carries text.

### Dark

The pages follow the OS setting (`prefers-color-scheme: dark`) until the visitor picks a theme with the rail switch, which stores `theme` (`light` or `dark`) in this site's local storage and puts it on `<html data-theme>`. Dark is the same page inverted, with the same values as zvondis.dev: the tokens keep their names and roles, only their values change, so no component or tool has its own dark rule. Pages declare `<meta name="color-scheme" content="light dark">` so native controls and scrollbars follow. The favicon mark keeps following the OS. The dark values sit in two identical blocks, `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and `:root[data-theme="dark"]`; keep them in step.

`assets/theme.js` (a copy from zvondis.dev, made by `npm run search` there; don't edit it here) is a classic blocking script in `<head>`, before the stylesheet, so a stored choice is applied before the first paint. Every page loads it there. Battleships has its own stylesheet and does not load it, so it keeps following the OS.

| Token  | Light   | Dark    | Dark ratio on paper |
| ------ | ------- | ------- | ------------------- |
| paper  | #FAFAF9 | #0C0C0D | page, inputs        |
| ink    | #0C0C0D | #FAFAF9 | 18.72:1             |
| mute   | #595C62 | #A0A3A9 | 7.73:1              |
| field  | #7A7D83 | #7D8087 | 4.94:1 (non-text)   |
| rule   | #D9DADC | #2B2D31 | decorative only     |
| accent | #1637E0 | #8C9EFF | 7.87:1              |

Tool CSS and scripts use the tokens, never a fixed colour, or they break in dark. The exception is output meant to leave the page: the QR code image and its PNG and SVG downloads are always black on white with a white border, because scanners need dark modules on a light ground.

### Named Rules

**The One Blue Rule.** On tools the accent is the focus ring. Not a button, not a link, not a highlight, not a chart series.

**No Colour Alone.** States are carried by weight and words: the bold current nav item, a bold verdict, a bold over-the-limit line, written error text. A red or green dot is never enough on its own.

## Typography

**Family:** Archivo variable, two woff2 files (latin, latin-ext) in `assets/fonts/` with the OFL text beside them. Helvetica Neue, Helvetica and Arial are fallbacks only.

### Hierarchy

- **Display** (`h1`, 800, clamp 40 to 72px, -0.04em): the page title, one per page.
- **Lede** (`.subtitle`, 400, 20px, mute): the line under the title.
- **Title** (`h3`, 700, 18px, -0.01em): a heading inside a band, such as one checked file.
- **Body** (400, 17px, line-height 1.55): everything people read and type.
- **Label** (700, 15px): band names (`.band > h2`), field labels, legends. Buttons and choices are body size at 700.
- **Meta** (400, 15px, mute): notes, row details, nav links.

### Named Rules

**The Weight Clash Rule.** Emphasis is weight. No second family, no italics, no all-caps labels (the search switcher's small site tag is the one exception), no colour.

**Tabular Figures.** Money, counts and inputs use tabular-nums; `.result-row` values and every text input already do.

## Layout

Below 960px everything is one column with a 16px gutter (32px from 600px). From 960px the `.frame` is a 12-column grid with 24px gaps and 56px gutters across the full viewport width. The rail takes columns 1 to 3; the lead and every band's content take columns 4 to 12. `.main` is a subgrid in both axes so the lead shares row 1 with the rail and each band can return its `h2` to the rail columns. Bands are 88px apart on desktop, 64px below.

| Class        | What                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| `.skip`      | "Skip to content" link, first in `body`, visible only on keyboard focus            |
| `.frame`     | Page wrapper: gutters, and the 12-column grid from 960px                          |
| `.rail`      | Columns 1 to 3: `.mark`, `.rail-nav`                                              |
| `.mark`      | The "Zvondis" wordmark, a link home to zvondis.dev (`data-home` sets the language) |
| `.main`      | `<main id="main">`, the content area                                              |
| `.lead`      | Page header: `h1` and `.subtitle`, from column 4                                  |
| `.bands`     | Wrapper for the sections under the lead                                           |
| `.band`      | One section: ink rule on top, its `h2` in the rail columns, content from column 4 |

## Elevation & Depth

Flat. No shadows, no blur. The one layered surface is the search switcher, a flat panel with a 1px ink frame over a `--scrim` dim. Hierarchy comes from scale, weight and the ink band rules.

## Shapes

Square by default. Buttons, inputs and the file picker take a 2px radius; nothing else is rounded.

## Components

### Navigation

| Class / element          | What                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `.rail-nav`              | `<nav>` holding a `ul` of links and the language switch                               |
| `.nav-link`              | One link: 15px mute, ink and underlined on hover                                      |
| `.nav-link[aria-current="page"]` | The page you are on: ink and bold. Set it on the exact page only, as zvondis.dev does |
| `.rail-switches`         | Top right of the rail: the theme switch, then the language switch                     |
| `.theme-switch`          | `<button data-theme-toggle hidden>`. `theme.js` shows it and names the theme it switches to ("Tmavý" / "Dark" on a light page, "Světlý" / "Light" on a dark one), relabelling when the language changes |
| `.lang-switch`           | The CZ / EN `<button id="lang">`. `lang.js` sets its text and label |

On desktop the links stack at a 30px rhythm for mouse users and 44px on touch. On phones they sit in a row under the mark, each 44px tall.

**Search** (`assets/search.js`, same file as on zvondis.dev, where its full description lives in DESIGN.md): the script adds a `.search-open` button to the nav list. It, Ctrl+K / Cmd+K and `/` open `.switcher`, a modal `<dialog>` quick switcher near the top of the page: a 1px ink framed paper panel over a `--scrim` dim (no shadow), a large field (the only rounded shape) with "Kam chceš jít?" / "Where to?", results grouped under "Stránky" / "Pages" and "Nástroje" / "Tools" (everything when the query is empty), each row a name, a one-line mute description and the site ("zvondis.dev" or "tools") right-aligned in small uppercase, the one all-caps label here. The active row is an ink-tinted band with an ink bar and a bold name, never a colour alone. Arrows or hover choose, Enter opens; Ctrl+K again, Esc or a backdrop click close and focus returns. A footer shows the keys in square boxes. `--scrim` is set with the tokens in both themes.

### Fields

| Class / element                         | What                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `.fields`                               | Vertical stack of fields (or of a `fieldset` and a nested `.fields`), 20px apart |
| `.fields-2`                             | With `.fields`: two columns from 600px                                    |
| `label.field`                           | Bold 15px label above its control; wrap the text in `<span data-t>`       |
| `input` (text, email, url, search, password, tel, date, time, number), `select`, `textarea` | 44px tall, 1px field border, paper fill; border turns ink on hover and focus |
| `input[type=file]`                      | The picker button is drawn like `.button-outline`                         |
| `fieldset.choices`                      | A group of radios or checkboxes in a row, with a bold `legend`            |
| `label.choice`                          | One radio or checkbox and its text, 44px tall; controls are tinted ink    |

### Buttons and actions

| Class           | What                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| `.button`       | The main action: ink fill, paper text, 44px. Hover turns mute            |
| `.button-outline` | With `.button`: the second action, outlined in ink. Hover fills ink    |
| `.text-link`    | Bold underlined text action with a 44px hit area, an `<a>` or a `<button>` |
| `.actions`      | A wrapping row of buttons and text links                                 |

### Messages

| Class    | What                                                                   |
| -------- | ---------------------------------------------------------------------- |
| `.note`  | Mute 15px caveat or privacy line; 24px above it when it is a band child |
| `.error` | A problem in bold ink words; hidden while empty                        |

### Lists and results

| Class / element              | What                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `.items`                     | A list of links. Each `a` is a row: bold underlined title in `b`, mute detail in `span`; side by side (5 : 4) from 600px, stacked below |
| `.result-row`                | A result line: label left, value right in tabular figures, hairline under it            |
| `.result-total`              | With `.result-row`: a total, bold with a larger value and an ink rule under it          |

Announce results that change with `aria-live="polite"` on their container.

### Tool sections

A tool that truly needs its own rules adds a section at the end of `assets/style.css`, titled with the tool's name, with every class prefixed by it.

- **Injection check** (`.ic-*`, built by `injection-check/inject-check.js`): `.ic-file` one checked file with an `h3` name, `.ic-verdict` its bold verdict, `.ic-list` its findings as hairline rows, the evidence in a mute `code` line.
- **Job Pay** (`.pay-*`): `.pay-threshold-text` the DPP / DPČ limit line, mute; `job-pay.js` adds `.pay-threshold-over`, which turns it bold ink.
- **Subnet calculator** (`.subnet-*`): `.subnet-out` wraps the results; its rows let long values (binary, IPv6, big counts) drop under the label and break anywhere, its `h3` opens a group with 32px above.

### Motion

Colour transitions of 150ms on links, `.button` and the file picker button, a 1px press on `.button`, and a plain cross-document view transition between tools pages. All of it is switched off under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- Start a page from the template in README.md, with the rail exactly as it is there.
- Hang every block from column 4 and give each band an `h2` name.
- Use weight for emphasis and tabular figures for numbers.
- Keep every interactive target at least 44px tall on touch.
- Use native controls with a visible label, and the existing classes before new CSS.
- Check 390px and 1280px, both languages, light and dark, keyboard only.

### Don't:

- Don't use the accent for anything but the focus ring.
- Don't add cards, shadows, icons, gradients, eyebrows or decorative dots.
- Don't introduce a second typeface or italics for emphasis.
- Don't colour states; say them in words and weight.
- Don't write inline styles or new global selectors; prefix a tool's own classes with its name.
- Don't use em or en dashes in copy; use a hyphen or restructure.
