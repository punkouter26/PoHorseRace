# Quickstart: PoHorseRace — Roll-A-Ball Derby

**Branch**: `001-arcade-derby` | **Plan**: [plan.md](plan.md)

This guide gets a developer from zero to a running local instance in under five
minutes, and documents the production deployment requirements.

---

## Prerequisites

| Tool | Required Version | Check |
|------|-----------------|-------|
| Node.js | 20 LTS or later | `node --version` |
| npm | 10+ (bundled with Node 20) | `npm --version` |
| Modern browser | Chrome 120+ / Firefox 121+ / Safari 17+ / Edge 120+ | — |

> **GPU note**: WebGL 2 is required. Integrated graphics are sufficient;
> no discrete GPU needed for development.

---

## 1. Clone & Install

```bash
git clone <repo-url> PoHorseRace
cd PoHorseRace
npm install
```

`npm install` will automatically download the Rapier WASM binary via
`@react-three/rapier`. No extra steps are needed.

---

## 2. Local Development

```bash
npm run dev
```

Open **http://localhost:5173** in the browser.

> **Important — WASM isolation headers**:
> The Vite dev server is pre-configured in `vite.config.ts` to send:
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```
> These are **required** for Rapier's SharedArrayBuffer. If you see
> `SharedArrayBuffer is not defined` in the console, verify your browser has
> not disabled site isolation (check `chrome://flags/#enable-site-per-process`).

### Key routes

| URL | What you see |
|-----|-------------|
| `http://localhost:5173/` | PoMidway — full 3D game |
| `http://localhost:5173/diag` | PoDiag — JSON telemetry vault |

---

## 3. Running Tests

```bash
# All tests (unit + integration)
npm test

# Watch mode (TDD cycle)
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests use **Vitest** + **@testing-library/react**. The integration tests in
`tests/integration/` exercise the full race FSM and three-ball economy without
a browser; R3F is mocked at the canvas level.

> **Constitution gate**: All tests must pass (`npm test` exits 0) before any
> PR can be merged to `master`.

---

## 4. Linting & Formatting

```bash
# Lint (zero warnings = zero errors in CI)
npm run lint

# Format in-place
npm run format

# Format check (CI mode)
npm run format:check
```

ESLint is configured with `noUnusedLocals` and `noUnusedParameters` mirroring
the TypeScript strict settings. Prettier enforces 2-space indentation and single
quotes.

---

## 5. Production Build

```bash
npm run build
```

Output is in `dist/`. Preview locally:

```bash
npm run preview
```

The preview server also sends the required COOP/COEP headers (configured in
`vite.config.ts` → `preview.headers`).

---

## 6. Production Hosting Requirements

Because Rapier requires `SharedArrayBuffer`, the production host **must** send
these two headers on **every response** (including sub-resources):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Netlify (`netlify.toml`)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### nginx
```nginx
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
```

### SPA fallback
All three hosts also need an SPA fallback rule so `/diag` deep-links work:
- Netlify: add `[[redirects]] from = "/*" to = "/index.html" status = 200`
- Vercel: add `{ "source": "/(.*)", "destination": "/index.html" }` in `rewrites`
- nginx: add `try_files $uri $uri/ /index.html;`

---

## 7. Playing the Game (Manual Smoke-Test)

1. Open `http://localhost:5173/` in portrait orientation (or resize browser
   to a tall narrow window, e.g. 390 × 844).
2. Press the **[RESET]** 3D button. Watch the 3-2-1 countdown on the top LEDs.
3. Touch/click a ball in the trough and swipe upward to roll it.
   - **Soft swipe**: ball falls short of the target triangle.
   - **Moderate upward swipe**: ball reaches the scoring holes.
   - **Aggressive swipe**: ball may overshoot and bounce off the back wall.
4. Score enough points for the Red (lane 1) horse to reach the 60-inch mark.
5. Confirm: gold glow on lane 1, orbit camera engages, Summary Card appears.
6. Press **[RESET]** to watch horses reverse-slide to zero.
7. Navigate to `http://localhost:5173/diag` and confirm:
   - JSON telemetry is visible.
   - `poSessionId` is in masked format (e.g. `"P***2"`).
   - `poHorsePositions[0].positionInches` reflects the horse's final position.

---

## 8. Validating This Quickstart

After completing all implementation tasks, run through the smoke-test in step 7
above and verify every bullet point passes. Record any failures in
`checklists/requirements.md`.
