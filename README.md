# tools

Small tools and games at **[tools.zvondis.dev](https://tools.zvondis.dev)**, a sister site of [zvondis.dev](https://zvondis.dev). Plain static files on GitHub Pages: no build step, no framework, no dependencies.

| Path                | What                                                           |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | Index of all tools (`index.html`, strings in `index.js`)       |
| `/job-pay/`         | Net pay from a Czech DPP / DPČ student job                     |
| `/injection-check/` | Finds hidden AI instructions in text files                     |
| `/battleships/`     | Client of the Battleships game; published from a separate repo |
| `/assets/`          | Shared stylesheet, `lang.js`, Archivo font                     |

## Contributing

Friends are welcome to add a tool. Fork the repo, make a branch, open a pull request.

- Every pull request needs an approving review from [@Zv0ndis](https://github.com/Zv0ndis) (code owner) before it can merge. Pushing new commits after the approval asks for a new one.
- `main` is what is live: a merge deploys to tools.zvondis.dev within a minute or two.
- Keep a tool in its own folder and don't change other tools in the same PR.
- Don't edit `battleships/`: it is overwritten from the game's own repo.

### Preview locally

```sh
npx serve .        # then open http://localhost:3000
```

Any static server works; open pages through it, not as `file://`, because the scripts are ES modules.

### Add a tool

1. Create `my-tool/index.html` from the page template below and `my-tool/my-tool.js` next to it.
2. Put every visible string in a `copy` object with `cs` and `en` and mark the elements with `data-t="key"`. `initLang(copy, onChange)` from `/assets/lang.js` fills them, sets the title and wires the CZ/EN button.
3. Add a row to the list in `index.html` and its two strings to `index.js`.
4. Check it at phone width (390px) and desktop, in both languages, with the keyboard only.

### Rules

- **Nothing leaves the browser.** No fetch to third parties, no analytics, no CDNs, no external fonts or images. Each page carries the CSP meta tag from the template; don't loosen it.
- **No inline scripts or styles**: `<script>` with `src` only, no `style=""`, no `onclick=""`. The CSP blocks them anyway.
- **Treat input as hostile.** Put user text into the page with `textContent`, never `innerHTML`.
- **Both languages.** Czech and English for every string; Battleships is the one English-only exception.
- **Use the stylesheet below** instead of writing new CSS. If a tool truly needs its own rules, add a short section at the end of `assets/style.css` with classes prefixed by the tool's name (like `.ic-` for injection check).

### Page template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>My Tool | Tools</title>
    <meta name="description" content="One sentence about the tool." />
    <link rel="canonical" href="https://tools.zvondis.dev/my-tool/" />
    <link rel="stylesheet" href="/assets/style.css" />
    <script type="module" src="/my-tool/my-tool.js"></script>
  </head>
  <body>
    <div class="frame">
      <header class="rail">
        <nav class="rail-nav" aria-label="Sites" data-t-aria="navAria">
          <a class="mark" href="https://zvondis.dev/" data-home>Zvondis</a>
          <a href="/" data-t="navTools">Tools</a>
          <a href="/battleships/" data-t="navShips">Battleships</a>
        </nav>
        <button type="button" class="quiet" id="lang" lang="cs">CZ</button>
      </header>
      <main class="main">
        <header class="lead">
          <h1 data-t="h1">My Tool</h1>
          <p class="subtitle" data-t="subtitle">What it does, in one line.</p>
        </header>
        <div class="bands">
          <section class="band">
            <h2 data-t="inputHeading">Input</h2>
            <form id="form" class="fields">…</form>
          </section>
          <section class="band">
            <h2 data-t="resultHeading">Result</h2>
            <div id="result" aria-live="polite"></div>
            <p class="note" data-t="note">Limits and caveats.</p>
          </section>
        </div>
      </main>
    </div>
  </body>
</html>
```

```js
// my-tool/my-tool.js
import { initLang } from "/assets/lang.js";

const copy = {
  cs: { title: "Můj nástroj | Nástroje", h1: "Můj nástroj", subtitle: "…" },
  en: { title: "My Tool | Tools", h1: "My Tool", subtitle: "…" },
};

initLang(copy, (lang) => {
  // re-render anything built from strings in JS
});
```

`lang.js` picks the language from `?lang=cs|en` (links from zvondis.dev), then the visitor's saved choice, then the browser. The rail strings (`navTools`, `navShips`, `navAria`) come from `lang.js` itself.

## Stylesheet

`assets/style.css` is the zvondis.dev design system cut down for tools. Link it, use its classes, and avoid new CSS where you can.

### Look

A minimal Swiss style. One typeface, **Archivo** (self-hosted variable font), carries everything through weight: 800 headlines, 700 labels and emphasis, 400 body, 300 for a quiet second line. Ink on warm paper, thin rules between sections, no cards, no shadows, no gradients, no icons for decoration. Square corners except buttons and inputs (2px).

### Tokens

| Token          | Value                   | Use                                                   |
| -------------- | ----------------------- | ----------------------------------------------------- |
| `--paper`      | `#fafaf9`               | Page and input background                             |
| `--ink`        | `#0c0c0d`               | Text, section rules, buttons                          |
| `--mute`       | `#595c62`               | Secondary text, notes, inactive nav (6.42:1 on paper) |
| `--field`      | `#7a7d83`               | Input borders (3.95:1, enough for a control boundary) |
| `--rule`       | `#d9dadc`               | Hairlines between rows, decoration only               |
| `--accent`     | `#1637e0`               | **Focus ring only** on this site                      |
| `--font`       | Archivo, then Helvetica | Everything                                            |
| `--gutter`     | 16 / 32 / 56px          | Side padding: phone / from 600px / from 960px         |
| `--space-band` | 64 / 88px               | Gap between sections; 88px from 960px                 |
| `--col-gap`    | 24px                    | Grid gap                                              |
| `--radius`     | 2px                     | Buttons and inputs only                               |
| `--target`     | 44px                    | Minimum height of anything you can click or tap       |

### Layout

From 960px the page is a 12-column grid. The rail spans the top; the headline and every section's content start at **column 4**, and each section's `h2` sits in columns 1–3 as a label. Below 960px everything stacks in one column.

| Class                 | What                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `.frame`              | Page wrapper (max 1440px, gutters, grid from 960px)                    |
| `.rail` / `.rail-nav` | Top bar: Zvondis mark, site links, language button (`.quiet`)          |
| `.main`               | Content area                                                           |
| `.lead`               | Page header: `h1` + `.subtitle`                                        |
| `.bands` / `.band`    | Sections, each opened by a 1px ink rule; first child is its `h2` label |

### Components

| Class / element               | What                                                                |
| ----------------------------- | ------------------------------------------------------------------- |
| `.fields`                     | Vertical stack of fields, 20px apart                                |
| `label.field`                 | Bold 15px label above its control; wrap the text in `<span data-t>` |
| `input`, `select`, `textarea` | 44px tall, 1px `--field` border, ink border on hover/focus          |
| `input[type=file]`            | Picker button drawn as an outlined button                           |
| `.contract` + `.radio`        | A `fieldset` of native radios (or checkboxes) in a row              |
| `.button`                     | Main action: ink fill, paper text, 44px                             |
| `.button.button-outline`      | Second action next to it                                            |
| `.actions`                    | Row of buttons                                                      |
| `.text-link`                  | Bold underlined text action (looks like a link, can be a `button`)  |
| `.note`                       | Mute 15px caveat or privacy line                                    |
| `.error`                      | Bold message for a problem                                          |
| `.items`                      | Link list with a bold title (`b`) and mute description (`span`)     |
| `.pay-row`, `.pay-row-total`  | Label left, number right in tabular figures; total rows bold        |

### Design rules

- **One blue.** The accent is only the keyboard focus ring here. Don't colour buttons, links, highlights or charts with it.
- **No colour alone.** States are carried by words and weight: bold for the current item or a warning, written error text. A red/green dot is not enough on its own.
- **Weight, not more typefaces.** No second font, no italics for emphasis, no all-caps labels.
- **44px targets.** Every button, link and control is at least 44px tall.
- **Native controls.** Use real `<button>`, `<input>`, `<select>`, `<label>` and `<fieldset>`; announce live results with `aria-live="polite"`.
- **Phone first.** Check 390px width: no horizontal scroll, 16px side gutter.

## License

No license is chosen yet, so all rights are reserved by default. Archivo is under the SIL Open Font License (`assets/fonts/archivo-OFL.txt`).
