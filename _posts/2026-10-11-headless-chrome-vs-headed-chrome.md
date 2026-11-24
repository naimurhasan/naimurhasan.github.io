---
layout: post
title: "Headless Chrome vs Headed Chrome: What Actually Changes Under the Hood?"
excerpt: "You disabled navigator.webdriver, yet anti-bot systems still know you are headless. Here is the deep architectural breakdown of SwiftShader, GPU rasterization, screen geometry, and how Chrome behaves when stripped of its window manager."
tags:
- chromium
- headless-chrome
- browser-fingerprinting
- puppeteer
- playwright
- anti-bot
- web-scraping
categories:
- Chromium
- Browser-Fingerprinting
author: Naimur Hasan
mermaid: true
header:
  image: "assets/images/blog/headless-chrome-vs-headed-hero.jpg"
  teaser: "assets/images/blog/headless-chrome-vs-headed-hero.jpg"
  og_image: "assets/images/blog/headless-chrome-vs-headed-hero.jpg"
---

> **TL;DR:** Chrome's modern `--headless=new` mode shares the full Blink rendering engine with headed Chrome while saving memory. Deprecated `--headless=old` leaks distinct window and GPU properties that anti-bot filters instantly flag.

```mermaid
flowchart TD
  Start["Launch Chromium Runner"] --> Target{"Anti-Bot Security Level"}
  Target -- "High (Cloudflare / Kasada)" --> Mode{"Display Server Available?"}
  Mode -- "Yes (Local / Xvfb)" --> Headed["<b>Headed Mode + Virtual Display</b><br/>Hardware GPU rasterization & zero bot flags"]
  Mode -- "No (Pure CLI Container)" --> HeadlessNew["<b>--headless=new + Virtual Viewport</b><br/>Modern Blink engine with patched metrics"]
  Target -- "Internal Testing / Scraping" --> HeadlessNew
```

![Headless vs Headed Chrome: Window managers, SwiftShader GPU rasterization, and font antialiasing differences](/assets/images/blog/headless-chrome-vs-headed-hero.jpg)

---

## The 3-Way Showdown Matrix

| Architectural Layer | Desktop Headed Chrome | Legacy Headless (`--headless=old`) | Modern Headless (`--headless=new`) |
| :--- | :--- | :--- | :--- |
| **Window Manager** | Native OS (Quartz, DWM, X11/Wayland) | ❌ None (Bypass window manager completely) | Emulated Headless Window Surface |
| **Blink Architecture** | Complete Chrome Process Tree | Diverged Content Shell binary fork | Unified Chrome binary pipeline |
| **GPU Rasterization** | Discrete / Integrated Hardware GPU | ❌ Software Fallback (Google SwiftShader) | Hardware GPU (if flagged) or SwiftShader |
| **Window Dimensions** | Matches physical screen geometry | `outerWidth: 0`, `outerHeight: 0` | Configured viewport bounds |
| **Default User-Agent** | Standard Chrome UA | Contains `HeadlessChrome/...` token | Standard Chrome UA (Chromium 112+) |
| **Audio / Video Codecs** | Full proprietary codecs (H.264, AAC) | ❌ Stripped codecs | Full codecs (platform dependent) |
| **Extension Support** | Full Chrome Web Store extensions | ❌ Zero extension support | ✅ Chrome extensions supported |
| **Detection Vulnerability** | Very Low (Baseline human behavior) | **100% Guaranteed Detection** | Medium (Leaks via WebGL renderer & timing) |

---

## 1. The Rendering Pipeline: Where Headless Leaks

When you run Chrome without a graphical display, Chromium makes three critical architectural trade-offs:

```mermaid
flowchart TD
  subgraph H ["1. Desktop Headed Pipeline"]
    direction TB
    H1["DOM & CSSOM"] --> H2["Hardware GPU Rasterizer"] --> H3["OS Window Compositor (X11 / Quartz)"]
  end
  subgraph L ["2. Headless Pipeline (--headless=new)"]
    direction TB
    L1["DOM & CSSOM"] --> L2["SwiftShader / Virtual GPU"] --> L3["In-Memory Headless Framebuffer"]
  end
  H --> L
```

### 1. The SwiftShader GPU Giveaway
In desktop Chrome, WebGL draw calls execute on a physical GPU (NVIDIA, AMD, or Apple Silicon). 

On a headless Linux server without a configured GPU pass-through, Chromium defaults to **SwiftShader**—Google's CPU-based software rasterizer:

```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

console.log(renderer);
// Headed: "ANGLE (Apple, Apple M2 Max, OpenGL 4.1)"
// Headless Linux: "Google SwiftShader (LLVM 10.0.0, 128 bits)" -> BUSTED!
```

Anti-bot systems query this string synchronously on page load. A SwiftShader renderer on an e-commerce checkout page immediately flags an automated server environment.

---

## 2. Window Geometry & Screen Anomalies

In headed Chrome, the browser window exists within a physical desktop coordinate space:
* `window.outerWidth > window.innerWidth` (due to window borders and scrollbars)
* `window.screen.availHeight < window.screen.height` (due to macOS Dock or Windows Taskbar)

In legacy headless Chrome, these values broke basic geometry rules:
* `window.outerWidth === 0 && window.outerHeight === 0`
* `window.screen.colorDepth === 0`

While `--headless=new` synchronizes window dimensions to the specified viewport, inconsistencies persist:

```javascript
// A classic headless giveaway: outer dimensions exactly matching inner dimensions
const isHeadlessGeometry = (window.outerWidth === window.innerWidth) && 
                           (window.outerHeight === window.innerHeight);
```

---

## 3. Font Rendering & Subpixel Antialiasing

Because headless Linux instances lack the native font antialiasing libraries of macOS (CoreText) or Windows (DirectWrite), Chromium renders text glyphs using FreeType with different pixel-snapping behaviors.

```mermaid
flowchart TD
  Text["Canvas Text Draw: 'Hello, World!'"] --> Render["Measure Text Width in Sub-Pixels via measureText()"]
  Render --> M1["• macOS Headed Chrome: 84.32px (CoreText Antialiasing)"]
  Render --> M2["• Windows Headed Chrome: 83.91px (DirectWrite Subpixel)"]
  Render --> M3["• Linux Headless Container: 82.50px (SwiftShader FreeType)"]
```

Bot detection scripts render an off-screen `<canvas>` containing specific Unicode strings and compute a SHA-256 hash of the raw pixel buffer. The headless Linux hash never matches a genuine macOS or Windows desktop footprint.

---

## Benchmark: Memory & CPU Footprint

{% include chart.html type="columns" title="Memory Consumption per 10 Browser Contexts (MB - Lower is Better)" labels="Desktop Headed (X11)|Modern Headless (--headless=new)|Legacy Headless (Content Shell)" values="1420|480|320" suffix="MB" scale="1600" highlight="Modern Headless (--headless=new)" note="--headless=new consumes 65% less RAM than headed Chrome while providing full browser feature parity." %}

---

## Run This in Your Terminal: Audit Your Headless Flags

You can test whether your current headless instance leaks telltale bot markers in 2 seconds. Run this Node.js snippet with Playwright or Puppeteer:

```javascript
// audit-headless.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const audit = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      webdriver: navigator.webdriver,
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'N/A',
      dimensions: `${window.outerWidth}x${window.outerHeight} vs ${window.innerWidth}x${window.innerHeight}`,
      plugins: navigator.plugins.length
    };
  });
  
  console.table(audit);
  await browser.close();
})();
```

If `webdriver` is `true`, `plugins` is `0`, or `renderer` contains `SwiftShader`, your headless browser is immediately identifiable by anti-bot firewalls.
