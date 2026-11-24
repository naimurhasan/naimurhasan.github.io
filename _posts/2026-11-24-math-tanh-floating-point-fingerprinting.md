---
layout: post
title: "Why Math.tanh() Is Different Across Platforms: Floating-Point Math and Browser Fingerprinting"
excerpt: "Execute Math.tanh(1) on an Apple M2 and an Intel Windows PC, and the 16th decimal place will not match. Here is the deep engineering breakdown of IEEE-754 mantissa rounding, FMA CPU instructions, and how anti-bot engines use math to expose VMs and spoofed User-Agents."
tags:
- browser-fingerprinting
- javascript
- hardware
- anti-bot
- security
- chromium
categories:
- Browser-Fingerprinting
- Hardware
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/math-tanh-floating-point-fingerprinting-hero.jpg"
  teaser: "assets/images/blog/math-tanh-floating-point-fingerprinting-hero.jpg"
  og_image: "assets/images/blog/math-tanh-floating-point-fingerprinting-hero.jpg"
---

> **TL;DR:** Math.tanh() produces different 53-bit mantissa values on ARM64 versus x86_64 because ARM hardware uses Fused Multiply-Add (FMA) with single rounding. Anti-bot engines use these trailing floating-point bits to catch Linux cloud servers spoofing macOS User-Agents.

---

<div class="terminal-callout" style="background: #161b22; border-left: 4px solid #f85149; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px;">
  <span style="color: #f85149; font-weight: bold;">[!] FLOATING-POINT MANTISSA DEVIATION:</span> Math.tanh(1) IEEE-754 64-bit Float<br/>
  <span style="color: #8b949e;">&gt; Apple M2 (macOS ARM64): </span><span style="color: #7ee787;">0.7615941559557649</span> (Bits: <span style="color: #7ee787;">...011001</span>)<br/>
  <span style="color: #8b949e;">&gt; Intel Xeon (Linux glibc): </span><span style="color: #ffa657;">0.7615941559557648</span> (Bits: <span style="color: #ffa657;">...011000</span>)<br/>
  <span style="color: #8b949e;">&gt; WAF VERDICT:             </span><span style="color: #f85149;">HARDWARE_MISMATCH (Spoofed macOS UA on Linux VPS)</span>
</div>

---

## 1. Why Math in JavaScript Is Not Deterministic

Most software engineers assume that simple arithmetic in JavaScript is mathematically universal across all computers: `1 + 1` is always `2`, and `Math.sqrt(4)` is always `2`.

However, for complex transcendental mathematical functions—such as hyperbolic tangent (`Math.tanh`), hyperbolic sine (`Math.sinh`), and exponential minus one (`Math.expm1`)—the ECMAScript specification ([ECMA-262 §21.2.2.33](https://tc39.es/ecma262/#sec-math.tanh)) explicitly acknowledges:

> *"The return value is an implementation-dependent approximation to the hyperbolic tangent of x."*

The specification does not mandate bit-for-bit identity across platforms. Instead, it permits an error margin of up to **1 ULP (Unit in the Last Place)**. 

Because of this permitted tolerance, the underlying JavaScript engine (V8 in Chrome, JavaScriptCore in Safari, SpiderMonkey in Firefox) delegates transcendental calculations to the host operating system's native mathematics library (`libm`) and hardware Floating-Point Units (FPUs).

---

## 2. The Silicon Architecture: FMA vs Double Rounding

The core divergence between platforms originates in the physical silicon of modern CPU registers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   HOW CPU SILICON EVALUATES (a * b) + c                │
├───────────────────────────────────┬────────────────────────────────────┤
│ TRADITIONAL x86 / SSE2 PIPELINE   │ ARM64 / APPLE SILICON FMA PIPELINE │
│ Step 1: Multiply a * b            │ Single Step: Multiply & Add fused  │
│ Step 2: Round intermediate result │ Only ONE final rounding step       │
│ Step 3: Add c                     │ Eliminates intermediate error      │
│ Step 4: Round final result        │ Result differs in the 53rd bit!    │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 1. Fused Multiply-Add (FMA) on ARM64
Modern ARM processors (including Apple Silicon M-series, AWS Graviton, and Qualcomm Snapdragon) feature native hardware **Fused Multiply-Add (FMA)** instructions. 

When computing the polynomial expansions or Chebyshev approximations that drive `tanh(x) = (e^x - e^-x) / (e^x + e^-x)`, the ARM processor executes `(a * b) + c` in a single combined instruction without intermediate rounding.

### 2. Double Rounding on Legacy x86
On x86 architectures without AVX-FMA extensions, the CPU multiplies `a * b`, rounds the product to a 64-bit IEEE-754 double, adds `c`, and rounds a second time. 

This **double-rounding artifact** flips the least-significant bit (the 53rd bit of the mantissa), producing `...7648` instead of `...7649`.

![Silicon Arithmetic Architecture: ARM64 FMA Single Rounding vs x86 Double Rounding](/assets/images/blog/math-tanh-fma-silicon-comparison.jpg)

---

## 3. The 4-Way Hardware & OS Matrix

The table below demonstrates how the exact same JavaScript expression evaluates across four distinct computing environments running Chromium:

| Operating System | CPU Architecture | Native Math Library | `Math.tanh(1)` Evaluation | IEEE-754 Hex Representation |
| :--- | :--- | :--- | :--- | :--- |
| **macOS 14 (Sonoma)** | Apple Silicon (ARM64) | Apple `libsystem_m` (FMA) | `0.7615941559557649` | `0x3FE85EFEC5E26E77` |
| **Windows 11** | Intel Core i9 (x86_64) | Microsoft `ucrtbase.dll` | `0.7615941559557648` | `0x3FE85EFEC5E26E76` |
| **Ubuntu Linux 24.04** | AMD EPYC (x86_64) | GNU C Library (`glibc libm`) | `0.7615941559557648` | `0x3FE85EFEC5E26E76` |
| **Android 14** | ARM Cortex-X4 (ARM64) | Google Bionic `libm` | `0.7615941559557649` | `0x3FE85EFEC5E26E77` |

Notice that the variation is not random noise. It is **deterministic by CPU architecture and OS runtime**.

---

## 4. How Anti-Bot Engines Exploit the Math Fingerprint

Security engines like **CreepJS**, **FingerprintJS**, and enterprise bot mitigation firewalls don't just inspect `Math.tanh(1)`. They compute a vector of high-sensitivity mathematical operations:

```javascript
// A typical mathematical entropy extraction battery
const mathFingerprint = [
  Math.tanh(1),
  Math.sinh(1),
  Math.cosh(1),
  Math.expm1(1),
  Math.log1p(1),
  Math.atanh(0.5),
  Math.cbrt(Math.PI)
];
```

### The Catch: Catching Linux Scrapers Spoofing macOS
Consider an automated scraping bot running on a \$5/month DigitalOcean Linux droplet:
1. The developer configures the scraper to send:
   `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0`
2. The page loads an anti-bot challenge script.
3. The script executes `Math.tanh(1)`.
4. The result arrives as `0.7615941559557648` (Linux glibc signature) rather than `0.7615941559557649` (macOS signature).
5. **Verdict:** The scraper is running on a Linux server while claiming to be a MacBook. The request is immediately flagged with `100% CONFIDENCE_OS_IMPOSTER`.

---

## 5. The Monkey-Patching Trap: Why `Object.defineProperty` Fails

Desperate scrapers often try to hide this leak by overriding the native math functions in Puppeteer or Playwright:

```javascript
// THE NAIVE BYPASS (INSTANTLY DETECTED):
Math.tanh = function(x) {
  if (x === 1) return 0.7615941559557649;
  return origTanh(x);
};
```

Anti-bot systems detect this tampering instantly via three property probes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   HOW MATH MONKEY-PATCHES GET CAUGHT                   │
├───────────────────────────────────┬────────────────────────────────────┤
│ TEST 1: Function toString() Leak  │ Real Chrome: "function tanh()      │
│ Math.tanh.toString()              │ { [native code] }"                 │
│                                   │ Tampered script: leaks JS source!  │
├───────────────────────────────────┼────────────────────────────────────┤
│ TEST 2: In Web Workers            │ Injected scripts fail to patch Web │
│ WorkerGlobalScope.Math.tanh(1)    │ Workers. Probing a Web Worker      │
│                                   │ exposes the real underlying host!  │
├───────────────────────────────────┼────────────────────────────────────┤
│ TEST 3: Math Descriptor Check     │ Object.getOwnPropertyDescriptor    │
│ Math.hasOwnProperty('tanh')       │ Math properties are non-enumerable │
│                                   │ and configurable in strict ways.   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## Hands-On Verification: Inspect Your Machine's Math Vector

Open your Developer Console (`F12`) and run this diagnostic snippet to inspect your machine's exact floating-point signature:

```javascript
(() => {
  const tests = {
    tanh_1: Math.tanh(1),
    sinh_1: Math.sinh(1),
    cosh_1: Math.cosh(1),
    expm1_1: Math.expm1(1),
    atanh_half: Math.atanh(0.5)
  };

  const getBits = (num) => {
    const buf = new ArrayBuffer(8);
    new Float64Array(buf)[0] = num;
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .reverse()
      .join('');
  };

  const report = {};
  for (const [key, val] of Object.entries(tests)) {
    report[key] = {
      decimal: val,
      hex: "0x" + getBits(val),
      lastDigit: String(val).slice(-1)
    };
  }

  console.table(report);
})();
```

If your scraper operates on a cloud Linux host, match your `User-Agent` to an environment that genuinely shares that architecture, or deploy physical ARM runners if you need to mimic genuine Apple Silicon hardware.
