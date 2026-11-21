# tools

Small tools and games at **[tools.zvondis.dev](https://tools.zvondis.dev)**, a sister site of [zvondis.dev](https://zvondis.dev). Plain static files on GitHub Pages: no build step, no framework, no dependencies.

| Path                | What                                                           |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | Index of all tools (`index.html`, strings in `index.js`)       |
| `/job-pay/`         | Net pay from a Czech DPP / DPČ student job                     |
| `/injection-check/` | Finds hidden AI instructions in text files                     |
| `/qr/`              | QR code from text or a link, as PNG or SVG                     |
| `/decode/`          | JSON format and check, Base64, JWT reading                     |
| `/subnet/`          | IPv4 and IPv6 subnet calculator                                |
| `/invoice/`         | Invoice to save as PDF, with a template kept in the browser    |
| `/battleships/`     | Client of the Battleships game; published from a separate repo |
| `/assets/`          | Shared stylesheet, `lang.js`, `theme.js`, Archivo font, favicon |
| `/search.json`      | Search index, copied from zvondis.dev (see Search below)       |

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
4. Add the tool to `tools` in `src/_data/site.js` of the zvondis.dev repo and run `npm run search` there (see Search).
5. Check it at phone width (390px) and desktop, in both languages, in light and dark, with the keyboard only.

### Rules

- **Nothing leaves the browser.** No fetch to third parties, no analytics, no CDNs, no external fonts or images. Each page carries the CSP meta tag from the template; don't loosen it.
- **No inline scripts or styles**: `<script>` with `src` only, no `style=""`, no `onclick=""`. The CSP blocks them anyway.
- **Treat input as hostile.** Put user text into the page with `textContent`, never `innerHTML`.
- **Both languages.** Czech and English for every string; Battleships is the one English-only exception.
- **Colours are tokens only.** Dark mode follows the OS setting by swapping the token values in `assets/style.css`, so a hard-coded colour breaks it. The one exception is output that must stay dark on light, like the QR code image.
- **Use the design system** ([DESIGN.md](DESIGN.md)) instead of writing new CSS. If a tool truly needs its own rules, add a short section at the end of `assets/style.css` with classes prefixed by the tool's name (like `.ic-` for injection check).

### Search

The Search button in the rail (also Ctrl+K or `/`) searches zvondis.dev and every tool. `assets/search.js` and `search.json` are copies made by `npm run search` in the zvondis.dev repo, where the tool list lives (`src/_data/site.js`); don't edit them here. The index is served from this site so the CSP can keep `connect-src 'self'`.

### Theme

The rail's theme switch (Tmavý / Světlý, Dark / Light) overrides the OS light or dark setting and remembers the choice in local storage. `assets/theme.js` is a copy made by `npm run search` in the zvondis.dev repo; don't edit it here. Load it as in the template below: a plain `<script>` (no `defer`, no `type="module"`) right before the stylesheet, so the stored theme is set before the first paint.

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
    <meta name="color-scheme" content="light dark" />
    <title>My Tool | Tools</title>
    <meta name="description" content="One sentence about the tool." />
    <link rel="canonical" href="https://tools.zvondis.dev/my-tool/" />
    <link
      rel="preload"
      href="/assets/fonts/archivo-latin-wght-normal.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <script src="/assets/theme.js"></script>
    <link rel="stylesheet" href="/assets/style.css" />
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg" />
    <script src="/assets/search.js" defer></script>
    <script type="module" src="/my-tool/my-tool.js"></script>
  </head>
  <body>
    <a class="skip" href="#main" data-t="skip">Skip to content</a>
    <div class="frame frame-fit">
      <header class="rail">
        <a class="mark" href="https://zvondis.dev/" data-main="home">Zvondis</a>
        <nav class="rail-nav" aria-label="Pages" data-t-aria="navAria">
          <ul>
            <li><a href="https://zvondis.dev/" class="nav-link" data-main="home" data-t="navHome">Home</a></li>
            <li><a href="https://zvondis.dev/cv" class="nav-link" data-main="cv" data-t="navCv">CV</a></li>
            <li><a href="https://zvondis.dev/semestr" class="nav-link" data-main="semester" data-t="navSemester">Semester</a></li>
            <li><a href="https://zvondis.dev/vybaveni" class="nav-link" data-main="uses" data-t="navUses">Uses</a></li>
            <li><a href="https://zvondis.dev/soukromi" class="nav-link" data-main="privacy" data-t="navPrivacy">Privacy</a></li>
            <li><a href="/" class="nav-link" data-t="navTools">Tools</a></li>
            <li><a href="/battleships/" class="nav-link" data-t="navShips">Battleships</a></li>
          </ul>
          <div class="rail-switches">
            <button type="button" class="theme-switch" data-theme-toggle hidden>Dark</button>
            <button type="button" class="lang-switch" id="lang" lang="cs">CZ</button>
          </div>
        </nav>
      </header>
      <main id="main" class="main">
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
            <h2 id="resultHeading" data-t="resultHeading">Result</h2>
            <section id="result" class="panel" aria-labelledby="resultHeading" tabindex="0" aria-live="polite"></section>
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

`lang.js` picks the language from `?lang=cs|en` (links from zvondis.dev), then the visitor's saved choice, then the browser. The rail strings (`navTools`, `navShips`, `navAria`, `skip`) come from `lang.js` itself. Only the Tools index sets `aria-current="page"` in the rail.

## Design

The look is the zvondis.dev design system. **[DESIGN.md](DESIGN.md)** describes it and lists every class you may use; **[`assets/style.css`](assets/style.css)** implements it, in the same order (tokens, base, layout, nav, type, components, then one section per tool). Use the existing classes before writing new CSS.

## License

No license is chosen yet, so all rights are reserved by default. Archivo is under the SIL Open Font License (`assets/fonts/archivo-OFL.txt`).
