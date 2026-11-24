---
layout: post
title: "Python HTTP Clients Benchmarked: wreq (rnet), primp, curl_cffi, and pycurl"
excerpt: "A data-visualized benchmark of modern Python HTTP and TLS-impersonation clients across 1,000-request local HTTP/1.1 & HTTP/2 runs, HTTP/3 (UDP), impersonation perfection (JA4, Akamai H2, Sec-Ch-Ua), US residential proxy overhead, and real-world failures."
tags:
- python
- rust
- networking
- web-scraping
- tls
- performance
- benchmarks
categories:
- Engineering
- Networking
author: Naimur Hasan
header:
  image: "assets/images/blog/python-http-clients-benchmark-hero.jpg"
  teaser: "assets/images/blog/python-http-clients-benchmark-hero.jpg"
  og_image: "assets/images/blog/python-http-clients-benchmark-hero.jpg"
---

<style>
.content p, .post-content p {
  text-align: justify;
  hyphens: auto;
}
.viz-note, .kpi-sub, .fp-hdrs { text-align: left !important; }
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 1.5rem 0 1.75rem;
}
@media (max-width: 520px) {
  .kpi-strip { grid-template-columns: 1fr; }
}
.kpi-card {
  background: var(--paper-sunk);
  border: 1px solid var(--rule);
  border-top: 2px solid var(--accent);
  border-radius: 6px;
  padding: 12px 14px;
}
.kpi-card.warn { border-top-color: var(--heart); }
.kpi-label {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 6px;
}
.kpi-val {
  font-family: var(--mono);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px;
}
.kpi-sub {
  font-size: 0.78rem;
  color: var(--ink-soft);
  margin: 0;
  line-height: 1.35;
}
.viz-box {
  background: var(--paper-sunk);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 18px 18px 14px;
  margin: 1.75rem 0;
}
.viz-title {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 10px;
}
.viz-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.viz-legend span { display: inline-flex; align-items: center; gap: 6px; }
.viz-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.viz-note {
  font-size: 0.8rem;
  color: var(--ink-faint);
  margin: 10px 0 0;
  line-height: 1.45;
}
.viz-box svg { width: 100%; height: auto; display: block; }
.sdot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.sdot.ok { background: var(--good); }
.sdot.warn { background: #d97706; }
.sdot.fail { background: var(--heart); }
.sdot.muted { background: var(--ink-faint); opacity: 0.45; }
.fp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 1.25rem 0 1.5rem;
}
@media (max-width: 560px) {
  .fp-grid { grid-template-columns: 1fr; }
}
.fp-card {
  background: var(--paper-sunk);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 12px 14px;
}
.fp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.fp-head strong { font-size: 0.9rem; color: var(--ink); }
.fp-edge {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--ink-soft);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 2px 6px;
}
.fp-kv {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--ink-soft);
  margin: 4px 0;
  word-break: break-all;
  line-height: 1.4;
}
.fp-kv b { color: var(--ink-faint); font-weight: 500; margin-right: 4px; }
.fp-hdrs {
  font-size: 0.76rem;
  color: var(--ink-soft);
  margin: 8px 0 0;
  padding-top: 7px;
  border-top: 1px solid var(--rule);
  line-height: 1.4;
}
.cap-table { width: 100%; font-size: 0.78rem; }
.cap-table th, .cap-table td { padding: 7px 6px; white-space: nowrap; vertical-align: middle; }
.audit-table { width: 100%; font-size: 0.78rem; }
.audit-table th, .audit-table td { padding: 7px 6px; white-space: nowrap; vertical-align: middle; }
.fail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin: 1.25rem 0 1.75rem;
}
.fail-card {
  background: var(--paper-sunk);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--heart);
  border-radius: 6px;
  padding: 12px 14px;
}
.fail-card.caution { border-left-color: #d97706; }
.fail-card h4 {
  font-family: var(--mono);
  font-size: 0.82rem;
  margin: 0 0 6px;
  color: var(--ink);
}
.fail-card p {
  font-size: 0.82rem;
  color: var(--ink-soft);
  margin: 0;
  line-height: 1.45;
}
</style>

> **TL;DR:** Rust-backed BoringSSL clients (**`primp`** at **19,194 req/s** and **`rnet`/`wreq-python`** at **14,818 req/s** on local HTTP/2+TLS) dominate concurrent throughput while matching Chrome's TLS GREASE, JA4, and Akamai HTTP/2 `SETTINGS`. **`pycurl`** leads raw HTTP/1.1 (**20,851 req/s**) and HTTP/3 over UDP (**12.0ms**), while **`curl_cffi`** delivers the most complete out-of-the-box Chrome navigation headers plus working HTTP/3.

![Python and Rust HTTP Client Benchmarks Hero](/assets/images/blog/python-http-clients-benchmark-hero.jpg)

<div class="kpi-strip">
  <div class="kpi-card">
    <div class="kpi-label">HTTP/2 + Stealth Peak</div>
    <div class="kpi-val">19,194 req/s</div>
    <p class="kpi-sub"><code>primp</code> (0.88ms p50 · 5/5 proxy OK)</p>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Sequential &amp; wreq-py</div>
    <div class="kpi-val">8,234 req/s</div>
    <p class="kpi-sub"><code>rnet</code> (0.12ms p50 · 14.8k conc H2)</p>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Raw H1 &amp; HTTP/3 (UDP)</div>
    <div class="kpi-val">20,851 req/s</div>
    <p class="kpi-sub"><code>pycurl</code> (12.0ms H3 · <code>curl_cffi</code> 14.9ms H3)</p>
  </div>
  <div class="kpi-card warn">
    <div class="kpi-label">Build &amp; Proxy Gotchas</div>
    <div class="kpi-val">2 Hard Fails</div>
    <p class="kpi-sub">Rust <code>wreq</code> (needs cmake) · <code>urllib3</code> (407 auth)</p>
  </div>
</div>

---

## 1. Contenders & Capability Matrix

Modern anti-bot systems inspect **TLS `ClientHello` (JA3/JA4)**, **HTTP/2 `SETTINGS` frames (Akamai hash)**, and **default header parity** before inspecting your payload.

<table class="cap-table">
  <thead>
    <tr>
      <th>Client</th>
      <th>Stack</th>
      <th>Protocols</th>
      <th>Stealth</th>
      <th>H2 Stress</th>
      <th>US Proxy</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong><code>wreq</code></strong> (Rust)</td>
      <td>Rust · BoringSSL</td>
      <td>H1 · H2</td>
      <td><span class="sdot ok"></span>Chrome 137</td>
      <td><span class="sdot muted"></span>Needs cmake</td>
      <td><span class="sdot muted"></span>Via <code>rnet</code></td>
    </tr>
    <tr>
      <td><strong><code>rnet</code></strong></td>
      <td>Rust · BoringSSL</td>
      <td>H1 · H2</td>
      <td><span class="sdot ok"></span>Chrome 137</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot ok"></span>100%</td>
    </tr>
    <tr>
      <td><strong><code>primp</code></strong></td>
      <td>Rust · BoringSSL</td>
      <td>H1 · H2</td>
      <td><span class="sdot ok"></span>Chrome 146</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot ok"></span>100%</td>
    </tr>
    <tr>
      <td><strong><code>curl_cffi</code></strong></td>
      <td>C · BoringSSL</td>
      <td><span class="sdot ok"></span>H1 · H2 · H3</td>
      <td><span class="sdot ok"></span>Chrome 152</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot ok"></span>100%</td>
    </tr>
    <tr>
      <td><strong><code>pycurl</code></strong></td>
      <td>C · OpenSSL</td>
      <td><span class="sdot ok"></span>H1 · H2 · H3</td>
      <td><span class="sdot muted"></span>libcurl</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot warn"></span>80%</td>
    </tr>
    <tr>
      <td><strong><code>aiohttp</code></strong></td>
      <td>Async · OpenSSL</td>
      <td>H1</td>
      <td><span class="sdot muted"></span>Python</td>
      <td><span class="sdot ok"></span>100%</td>
      <td>—</td>
    </tr>
    <tr>
      <td><strong><code>httpx</code></strong></td>
      <td>Python · OpenSSL</td>
      <td>H1 · H2</td>
      <td><span class="sdot muted"></span>Python</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot ok"></span>100%</td>
    </tr>
    <tr>
      <td><strong><code>urllib3</code></strong></td>
      <td>Python · OpenSSL</td>
      <td>H1</td>
      <td><span class="sdot muted"></span>Python</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot fail"></span>0% (407)</td>
    </tr>
    <tr>
      <td><strong><code>requests</code></strong></td>
      <td>Python · OpenSSL</td>
      <td>H1</td>
      <td><span class="sdot muted"></span>Python</td>
      <td><span class="sdot ok"></span>100%</td>
      <td><span class="sdot warn"></span>80%</td>
    </tr>
  </tbody>
</table>

<p class="viz-note"><strong>What is H2 Stress?</strong> 1,000 concurrent requests (20 workers) over HTTPS + HTTP/2 (with TLS 1.3) against a local Docker <code>nginx:alpine</code> server, measuring connection-pool stability and completion rate under load.</p>

---

## 2. Speed & Tail Latency (Local Docker Nginx)

To eliminate internet jitter and rate limits, we ran **100 sequential** (10 warmup) and **1,000 concurrent** (`concurrency=20`) requests against a local Docker `nginx:alpine` server supporting both **HTTP/1.1** and **HTTP/2 + TLS 1.3**.

<figure class="viz-box">
  <figcaption class="viz-title">Concurrent Throughput — 1,000 Requests, 20 Workers (req/s, Higher is Better)</figcaption>
  <div class="viz-legend">
    <span><i class="viz-swatch" style="background: var(--accent);"></i>HTTP/1.1</span>
    <span><i class="viz-swatch" style="background: var(--good);"></i>HTTP/2 + TLS 1.3</span>
  </div>
  <svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Concurrent throughput bar chart">
    <g stroke="var(--rule)" stroke-width="1" stroke-dasharray="3,3">
      <line x1="138" y1="8" x2="138" y2="288"/>
      <line x1="265" y1="8" x2="265" y2="288"/>
      <line x1="392" y1="8" x2="392" y2="288"/>
      <line x1="519" y1="8" x2="519" y2="288"/>
      <line x1="646" y1="8" x2="646" y2="288"/>
    </g>
    <g fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">
      <text x="138" y="306">0</text>
      <text x="265" y="306">5k</text>
      <text x="392" y="306">10k</text>
      <text x="519" y="306">15k</text>
      <text x="646" y="306">20k req/s</text>
    </g>
    <!-- Scale: 508px = 20,000 req/s => 0.0254 px per req/s -->
    <!-- primp: 18130 / 19194 -->
    <text x="128" y="25" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">primp</text>
    <rect x="138" y="10" width="460.5" height="11" rx="2" fill="var(--accent)"/>
    <text x="605" y="19" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">18,130</text>
    <rect x="138" y="23" width="487.5" height="11" rx="2" fill="var(--good)"/>
    <text x="632" y="32" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">19,194</text>

    <!-- pycurl: 20851 / 8456 -->
    <text x="128" y="60" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">pycurl</text>
    <rect x="138" y="45" width="529.6" height="11" rx="2" fill="var(--accent)"/>
    <text x="673" y="54" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">20,851</text>
    <rect x="138" y="58" width="214.8" height="11" rx="2" fill="var(--good)"/>
    <text x="359" y="67" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">8,456</text>

    <!-- rnet: 13272 / 14818 -->
    <text x="128" y="95" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">rnet (wreq-py)</text>
    <rect x="138" y="80" width="337.1" height="11" rx="2" fill="var(--accent)"/>
    <text x="481" y="89" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">13,272</text>
    <rect x="138" y="93" width="376.4" height="11" rx="2" fill="var(--good)"/>
    <text x="520" y="102" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">14,818</text>

    <!-- aiohttp: 13819 / 6463 -->
    <text x="128" y="130" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">aiohttp</text>
    <rect x="138" y="115" width="351.0" height="11" rx="2" fill="var(--accent)"/>
    <text x="495" y="124" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">13,819</text>
    <rect x="138" y="128" width="164.2" height="11" rx="2" fill="var(--good)"/>
    <text x="308" y="137" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">6,463</text>

    <!-- curl_cffi: 6268 / 7397 -->
    <text x="128" y="165" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">curl_cffi</text>
    <rect x="138" y="150" width="159.2" height="11" rx="2" fill="var(--accent)"/>
    <text x="303" y="159" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">6,268</text>
    <rect x="138" y="163" width="187.9" height="11" rx="2" fill="var(--good)"/>
    <text x="332" y="172" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">7,397</text>

    <!-- urllib3: 6388 / 5335 -->
    <text x="128" y="200" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">urllib3</text>
    <rect x="138" y="185" width="162.3" height="11" rx="2" fill="var(--accent)"/>
    <text x="306" y="194" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">6,388</text>
    <rect x="138" y="198" width="135.5" height="11" rx="2" fill="var(--good)"/>
    <text x="280" y="207" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">5,335</text>

    <!-- requests: 2719 / 2359 -->
    <text x="128" y="235" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">requests</text>
    <rect x="138" y="220" width="69.1" height="11" rx="2" fill="var(--accent)"/>
    <text x="213" y="229" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">2,719</text>
    <rect x="138" y="233" width="59.9" height="11" rx="2" fill="var(--good)"/>
    <text x="204" y="242" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">2,359</text>

    <!-- httpx: 559 / 1665 -->
    <text x="128" y="270" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">httpx</text>
    <rect x="138" y="255" width="14.2" height="11" rx="2" fill="var(--accent)"/>
    <text x="158" y="264" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">559</text>
    <rect x="138" y="268" width="42.3" height="11" rx="2" fill="var(--good)"/>
    <text x="186" y="277" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">1,665</text>
  </svg>
  <p class="viz-note">Rust-backed <code>primp</code> and <code>rnet</code> scale cleanly into HTTP/2+TLS, whereas C/Python OpenSSL stacks pay an HTTP/2 framing penalty.</p>
</figure>

<figure class="viz-box">
  <figcaption class="viz-title">Sequential Tail Latency — 100 Reused-Session Requests, HTTP/2 + TLS (ms, Lower is Better)</figcaption>
  <div class="viz-legend">
    <span><i class="viz-swatch" style="background: var(--accent); border-radius: 50%;"></i>Median (p50)</span>
    <span><i class="viz-swatch" style="background: transparent; border: 2px solid var(--ink-soft); border-radius: 50%;"></i>95th Percentile (p95)</span>
  </div>
  <svg viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequential p50 vs p95 latency range chart">
    <g stroke="var(--rule)" stroke-width="1" stroke-dasharray="3,3">
      <line x1="138" y1="10" x2="138" y2="185"/>
      <line x1="258" y1="10" x2="258" y2="185"/>
      <line x1="378" y1="10" x2="378" y2="185"/>
      <line x1="498" y1="10" x2="498" y2="185"/>
      <line x1="618" y1="10" x2="618" y2="185"/>
    </g>
    <g fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">
      <text x="138" y="205">0.0ms</text>
      <text x="258" y="205">0.25ms</text>
      <text x="378" y="205">0.50ms</text>
      <text x="498" y="205">0.75ms</text>
      <text x="618" y="205">1.00ms</text>
    </g>
    <!-- Scale: 480px per 1.0ms (0.25ms = 120px) -->
    <!-- pycurl: 0.15 -> 0.19 -->
    <text x="128" y="26" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">pycurl</text>
    <line x1="210.0" y1="22" x2="229.2" y2="22" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="210.0" cy="22" r="4.5" fill="var(--accent)"/>
    <circle cx="229.2" cy="22" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="242" y="26" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.15 / 0.19 ms</text>

    <!-- primp: 0.19 -> 0.22 -->
    <text x="128" y="51" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">primp</text>
    <line x1="229.2" y1="47" x2="243.6" y2="47" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="229.2" cy="47" r="4.5" fill="var(--accent)"/>
    <circle cx="243.6" cy="47" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="256" y="51" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.19 / 0.22 ms</text>

    <!-- rnet: 0.19 -> 0.22 -->
    <text x="128" y="76" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">rnet (wreq-py)</text>
    <line x1="229.2" y1="72" x2="243.6" y2="72" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="229.2" cy="72" r="4.5" fill="var(--accent)"/>
    <circle cx="243.6" cy="72" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="256" y="76" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.19 / 0.22 ms</text>

    <!-- curl_cffi: 0.24 -> 0.33 -->
    <text x="128" y="101" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">curl_cffi</text>
    <line x1="253.2" y1="97" x2="296.4" y2="97" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="253.2" cy="97" r="4.5" fill="var(--accent)"/>
    <circle cx="296.4" cy="97" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="309" y="101" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.24 / 0.33 ms</text>

    <!-- urllib3: 0.29 -> 0.36 -->
    <text x="128" y="126" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">urllib3</text>
    <line x1="277.2" y1="122" x2="310.8" y2="122" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="277.2" cy="122" r="4.5" fill="var(--accent)"/>
    <circle cx="310.8" cy="122" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="323" y="126" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.29 / 0.36 ms</text>

    <!-- httpx: 0.37 -> 0.52 -->
    <text x="128" y="151" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">httpx</text>
    <line x1="315.6" y1="147" x2="387.6" y2="147" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="315.6" cy="147" r="4.5" fill="var(--accent)"/>
    <circle cx="387.6" cy="147" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="400" y="151" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.37 / 0.52 ms</text>

    <!-- requests: 0.54 -> 0.63 -->
    <text x="128" y="176" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">requests</text>
    <line x1="397.2" y1="172" x2="440.4" y2="172" stroke="var(--ink-soft)" stroke-width="2.5"/>
    <circle cx="397.2" cy="172" r="4.5" fill="var(--accent)"/>
    <circle cx="440.4" cy="172" r="4.5" fill="var(--paper-sunk)" stroke="var(--ink-soft)" stroke-width="2"/>
    <text x="453" y="176" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">0.54 / 0.63 ms</text>
  </svg>
  <p class="viz-note">On HTTP/1.1 sequential runs, <code>rnet</code> took #1 at <strong>8,233.6 req/s</strong> (0.12ms p50), ahead of <code>primp</code> (5,929.5 req/s) and <code>pycurl</code> (4,839.8 req/s).</p>
</figure>

---

## 3. Impersonation Perfection & Fingerprints

Sending a Chrome `User-Agent` is easy; matching Chrome's **TLS `ClientHello`**, **HTTP/2 frame settings**, and **Client Hints (`Sec-Ch-Ua`)** simultaneously is where impersonators live or die. We audited all clients against `tls.peet.ws/api/all`, `httpbin.org/headers`, and `cloudflare.com/cdn-cgi/trace`.

### Wire-Level Impersonation Audit

<table class="audit-table">
  <thead>
    <tr>
      <th>Signal</th>
      <th><code>rnet</code> (Chrome 137)</th>
      <th><code>primp</code> (Chrome)</th>
      <th><code>curl_cffi</code> (Chrome)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>TLS GREASE &amp; Ciphers</strong></td>
      <td><span class="sdot ok"></span>Yes · 16 ciphers</td>
      <td><span class="sdot ok"></span>Yes · 16 ciphers</td>
      <td><span class="sdot ok"></span>Yes · 16 ciphers</td>
    </tr>
    <tr>
      <td><strong>TLS Extensions / JA4</strong></td>
      <td>18 exts (<code>1516h2</code>)</td>
      <td>18 exts (<code>1516h2</code>)</td>
      <td>19 exts (<code>1517h2</code>)</td>
    </tr>
    <tr>
      <td><strong>H2 <code>SETTINGS</code> Frame</strong></td>
      <td><span class="sdot ok"></span>Chrome exact</td>
      <td><span class="sdot ok"></span>Chrome exact</td>
      <td><span class="sdot ok"></span>Chrome exact</td>
    </tr>
    <tr>
      <td><strong>H2 Window &amp; Order</strong></td>
      <td><span class="sdot ok"></span>15.66M · <code>m,a,s,p</code></td>
      <td><span class="sdot ok"></span>15.66M · <code>m,a,s,p</code></td>
      <td><span class="sdot ok"></span>15.66M · <code>m,a,s,p</code></td>
    </tr>
    <tr>
      <td><strong>UA ↔ <code>Sec-Ch-Ua</code></strong></td>
      <td><span class="sdot ok"></span>Chrome <code>v="137"</code></td>
      <td><span class="sdot warn"></span>Chromium <code>v="146"</code></td>
      <td><span class="sdot ok"></span>Chrome <code>v="152"</code></td>
    </tr>
    <tr>
      <td><strong><code>Sec-Fetch-User: ?1</code></strong></td>
      <td><span class="sdot warn"></span>Omitted</td>
      <td><span class="sdot ok"></span>Present</td>
      <td><span class="sdot ok"></span>Present</td>
    </tr>
  </tbody>
</table>

<figure class="viz-box">
  <figcaption class="viz-title">Impersonation Perfection Score — 6-Point Wire Parity Audit (TLS + H2 + Headers)</figcaption>
  <svg viewBox="0 0 720 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Impersonation perfection scorecard">
    <g stroke="var(--rule)" stroke-width="1" stroke-dasharray="3,3">
      <line x1="138" y1="8" x2="138" y2="92"/>
      <line x1="304" y1="8" x2="304" y2="92"/>
      <line x1="470" y1="8" x2="470" y2="92"/>
      <line x1="636" y1="8" x2="636" y2="92"/>
    </g>
    <g fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">
      <text x="138" y="110">0 / 6</text>
      <text x="304" y="110">2 / 6</text>
      <text x="470" y="110">4 / 6</text>
      <text x="636" y="110">6 / 6</text>
    </g>
    <!-- curl_cffi: 6/6 (498px) -->
    <text x="128" y="25" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">curl_cffi</text>
    <rect x="138" y="13" width="498" height="14" rx="2" fill="var(--good)"/>
    <text x="644" y="24" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">6/6</text>

    <!-- rnet: 5.5/6 (456px) -->
    <text x="128" y="53" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">rnet (wreq-py)</text>
    <rect x="138" y="41" width="456" height="14" rx="2" fill="var(--accent)"/>
    <text x="602" y="52" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">5.5/6</text>

    <!-- primp: 5.5/6 (456px) -->
    <text x="128" y="81" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">primp</text>
    <rect x="138" y="69" width="456" height="14" rx="2" fill="var(--accent)"/>
    <text x="602" y="80" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">5.5/6</text>
  </svg>
  <p class="viz-note">All three match Chrome's exact HTTP/2 Akamai fingerprint (<code>1:65536;2:0;4:6291456;6:262144|15663105|0|m,a,s,p</code>). <code>curl_cffi</code> edges ahead on default navigation headers, while <code>primp</code> omits <code>"Google Chrome"</code> in <code>Sec-Ch-Ua</code> and <code>rnet</code> omits <code>Sec-Fetch-User: ?1</code>.</p>
</figure>

### JA4, Akamai H2 &amp; Default Wire Headers

<div class="fp-grid">
  <div class="fp-card">
    <div class="fp-head"><strong><code>rnet</code> (<code>wreq-py</code>)</strong><span class="fp-edge">h2 · 24.0ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d1516h2_8daaf6152771_d8a2da3f94cd</code></div>
    <div class="fp-kv"><b>H2:</b><code>52d84b11737d980aef856699f885ca86</code></div>
    <p class="fp-hdrs"><strong>12 headers:</strong> <code>Accept*</code>, <code>Host</code>, <code>Priority</code>, <code>Sec-Ch-Ua*</code> (3), <code>Sec-Fetch-Dest/Mode/Site</code>, <code>User-Agent</code>.</p>
  </div>
  <div class="fp-card">
    <div class="fp-head"><strong><code>primp</code></strong><span class="fp-edge">h2 · 20.3ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d1516h2_8daaf6152771_d8a2da3f94cd</code></div>
    <div class="fp-kv"><b>H2:</b><code>52d84b11737d980aef856699f885ca86</code></div>
    <p class="fp-hdrs"><strong>14 headers:</strong> Same as <code>rnet</code> + <code>Sec-Fetch-User: ?1</code> and <code>Upgrade-Insecure-Requests</code>.</p>
  </div>
  <div class="fp-card">
    <div class="fp-head"><strong><code>curl_cffi</code></strong><span class="fp-edge">h2 · 19.1ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d1517h2_8daaf6152771_cb7bf5808d99</code></div>
    <div class="fp-kv"><b>H2:</b><code>52d84b11737d980aef856699f885ca86</code></div>
    <p class="fp-hdrs"><strong>15 headers:</strong> Same as <code>primp</code> + <code>Cache-Control</code> (full Chrome Windows profile).</p>
  </div>
  <div class="fp-card">
    <div class="fp-head"><strong><code>pycurl</code></strong><span class="fp-edge">h2 · 36.9ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d3012h2_1d37bd780c83_882d495ac381</code></div>
    <div class="fp-kv"><b>H2:</b><code>55cb2bd667724e6d46cc3c8dd15d50de</code></div>
    <p class="fp-hdrs"><strong>libcurl default:</strong> Exposes <code>PycURL/7.49.0 libcurl/8.23.0...</code> User-Agent; no <code>Sec-*</code> headers.</p>
  </div>
  <div class="fp-card">
    <div class="fp-head"><strong><code>httpx</code></strong><span class="fp-edge">h2 · 15.8ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d1712h1_ab0a1bf427ad_8e6e362c5eac</code></div>
    <div class="fp-kv"><b>H2:</b><code>29e6a0e9b360185223ec1278a845fdb1</code></div>
    <p class="fp-hdrs"><strong>4 headers:</strong> <code>Accept</code>, <code>Accept-Encoding</code>, <code>Host</code>, <code>User-Agent</code> (<code>python-httpx/0.28.1</code>).</p>
  </div>
  <div class="fp-card">
    <div class="fp-head"><strong><code>requests</code> / <code>urllib3</code></strong><span class="fp-edge">h1 · 22.7/16.4ms</span></div>
    <div class="fp-kv"><b>JA4:</b><code>t13d1712h1_ab0a1bf427ad_882d495ac381</code></div>
    <div class="fp-kv"><b>H2:</b><code>null</code> (HTTP/1.1 only)</div>
    <p class="fp-hdrs"><strong>4 headers:</strong> <code>Accept</code>, <code>Accept-Encoding</code>, <code>Host</code>, <code>User-Agent</code> (<code>python-requests/2.34.2</code>).</p>
  </div>
</div>

### HTTP/3 (QUIC over UDP) Check

We also tested **HTTP/3 over UDP** against `cloudflare.com/cdn-cgi/trace` (10 pooled requests):
- **`pycurl` (`7.49.0`)** negotiated `http/3` via `ngtcp2/1.25.0` at **12.0ms mean** (`6.9ms` min)—3× faster than its HTTP/2 run (`36.9ms`).
- **`curl_cffi` (`0.17.0`)** negotiated `http/3` (`CurlHttpVersion.V3ONLY`) at **14.9ms mean** (`8.3ms` min).
- **`rnet` (`2.4.2`)** accepted `Version.HTTP_3` without error, **but silently fell back to `http/2`** on Cloudflare.
- **`primp`**, **`httpx`**, **`aiohttp`**, **`requests`**, **`urllib3`**, and macOS system **`curl 8.7.1`** do not support HTTP/3 (UDP).

---

## 4. US Residential Proxy Speed & Real Failures

We ran a minimal **5-request check per library** against `api.ipify.org?format=json` via a US residential `CONNECT` proxy to measure tunnel reuse, rotation, and failure modes.

<figure class="viz-box">
  <figcaption class="viz-title">Animated Flow — Pooled Tunnel Reuse (primp / rnet) vs. Per-Request IP Rotation (curl_cffi)</figcaption>
  <div class="viz-legend">
    <span><i class="viz-swatch" style="background: var(--accent); border-radius: 50%;"></i>Pooled Session (1 warm tunnel · ~729ms)</span>
    <span><i class="viz-swatch" style="background: var(--good); border-radius: 50%;"></i>Fresh Tunnel / Call (5 rotated IPs · ~2,213ms)</span>
  </div>
  <svg viewBox="0 0 720 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated 3D isometric proxy tunnel routing diagram">
    <defs>
      <pattern id="iso-grid" width="36" height="20.78" patternUnits="userSpaceOnUse">
        <path d="M 18 0 L 36 10.39 L 18 20.78 L 0 10.39 Z" fill="none" stroke="var(--rule)" stroke-width="0.65" opacity="0.6"/>
      </pattern>
      <filter id="iso-shadow" x="-15%" y="-15%" width="130%" height="135%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.12"/>
      </filter>
    </defs>

    <!-- Isometric Grid Backdrop -->
    <rect x="0" y="0" width="720" height="330" rx="6" fill="url(#iso-grid)"/>

    <!-- Clean Isometric Elbow Routing Paths -->
    <g fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.72">
      <!-- Client -> US Proxy -->
      <path d="M 185 215 L 285 162"/>
      <!-- US Proxy -> Exit IP #1 (top-left elbow) -->
      <path d="M 332 118 L 280 90 Q 272 86 280 81 L 352 44"/>
      <!-- US Proxy -> Exit IP #2 (center) -->
      <path d="M 392 142 L 456 112"/>
      <!-- US Proxy -> Exit IP #3 (bottom-right elbow) -->
      <path d="M 342 178 L 415 218 Q 423 222 431 218 L 525 170"/>
    </g>

    <!-- Animated Packets: Pooled (Cyan dot -> Exit IP #1) -->
    <circle r="5" fill="#0077B6" stroke="#ffffff" stroke-width="1.5">
      <animateMotion dur="1.7s" repeatCount="indefinite" path="M 185 215 L 285 162 L 332 118 L 280 90 L 352 44"/>
    </circle>
    <circle r="4.5" fill="#0077B6" stroke="#ffffff" stroke-width="1.5" opacity="0.85">
      <animateMotion dur="1.7s" begin="0.85s" repeatCount="indefinite" path="M 185 215 L 285 162 L 332 118 L 280 90 L 352 44"/>
    </circle>

    <!-- Animated Packets: Rotating Fresh Tunnels (Emerald dots -> Exit IP #2 & #3) -->
    <circle r="4.5" fill="#2F6B4F" stroke="#ffffff" stroke-width="1.5">
      <animateMotion dur="2.5s" repeatCount="indefinite" path="M 185 215 L 285 162 L 392 142 L 456 112"/>
    </circle>
    <circle r="4.5" fill="#2F6B4F" stroke="#ffffff" stroke-width="1.5">
      <animateMotion dur="2.8s" begin="1.0s" repeatCount="indefinite" path="M 185 215 L 285 162 L 342 178 L 423 220 L 525 170"/>
    </circle>

    <!-- 3D Isometric Laptop Platform (Left) -->
    <g filter="url(#iso-shadow)">
      <!-- Platform Base -->
      <polygon points="135,175 212,216 135,257 58,216" fill="#ece8df" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="58,216 135,257 135,270 58,229" fill="#d8d2c5" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="135,257 212,216 212,229 135,270" fill="#c4bdb0" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <!-- Laptop Base / Keyboard -->
      <polygon points="132,195 178,219 134,242 88,218" fill="#f5f5f5" stroke="#2d2d2d" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="130,202 162,219 134,233 102,216" fill="#dcdcdc" stroke="#888" stroke-width="0.8"/>
      <!-- Laptop Screen -->
      <polygon points="88,218 88,168 132,145 132,195" fill="#3a3f47" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="93,211 93,172 127,154 127,193" fill="#ffffff"/>
      <polygon points="95,180 125,164 125,175 95,191" fill="#c7d2fe"/>
      <line x1="97" y1="196" x2="122" y2="183" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
    </g>
    <!-- Client Pill -->
    <rect x="75" y="282" width="120" height="24" rx="12" fill="var(--paper-sunk)" stroke="#2d2d2d" stroke-width="1.3"/>
    <text x="135" y="298" text-anchor="middle" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">Python Client</text>

    <!-- 3D Isometric Proxy Router Cube (Center - Warm Amber) -->
    <g filter="url(#iso-shadow)">
      <polygon points="340,104 396,134 340,164 284,134" fill="#fbd3a4" stroke="#2d2d2d" stroke-width="1.7" stroke-linejoin="round"/>
      <polygon points="284,134 340,164 340,192 284,162" fill="#f6be80" stroke="#2d2d2d" stroke-width="1.7" stroke-linejoin="round"/>
      <polygon points="340,164 396,134 396,162 340,192" fill="#e6a35c" stroke="#2d2d2d" stroke-width="1.7" stroke-linejoin="round"/>
      <!-- Branching Icon -->
      <g stroke="#2d2d2d" stroke-width="1.5" fill="none" stroke-linecap="round">
        <line x1="327" y1="126" x2="352" y2="126"/>
        <path d="M 336 126 L 344 120 L 351 120"/>
        <path d="M 336 126 L 344 132 L 351 132"/>
      </g>
      <text x="340" y="145" text-anchor="middle" fill="#1a1a1a" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700">US Proxy</text>
    </g>

    <!-- 3D Isometric Server Cube A: Exit IP #1 (Warm Pooled) -->
    <g filter="url(#iso-shadow)">
      <polygon points="395,12 455,44 395,76 335,44" fill="#c7dbf9" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="335,44 395,76 395,100 335,68" fill="#a8c7f5" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="395,76 455,44 455,68 395,100" fill="#8bb2ed" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="383" y="24" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <rect x="383" y="33" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <text x="395" y="54" text-anchor="middle" fill="#1a1a1a" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700">Exit IP #1</text>
    </g>
    <rect x="466" y="36" width="128" height="22" rx="11" fill="var(--paper-sunk)" stroke="#0077B6" stroke-width="1.2"/>
    <text x="530" y="51" text-anchor="middle" fill="#0077B6" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="600">primp · rnet (729ms)</text>

    <!-- 3D Isometric Server Cube B: Exit IP #2 (Fresh) -->
    <g filter="url(#iso-shadow)">
      <polygon points="500,76 560,108 500,140 440,108" fill="#c7dbf9" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="440,108 500,140 500,164 440,132" fill="#a8c7f5" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="500,140 560,108 560,132 500,164" fill="#8bb2ed" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="488" y="88" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <rect x="488" y="97" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <text x="500" y="118" text-anchor="middle" fill="#1a1a1a" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700">Exit IP #2</text>
    </g>
    <rect x="572" y="100" width="128" height="22" rx="11" fill="var(--paper-sunk)" stroke="#2F6B4F" stroke-width="1.2"/>
    <text x="636" y="115" text-anchor="middle" fill="#2F6B4F" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="600">curl_cffi (2,213ms)</text>

    <!-- 3D Isometric Server Cube C: Exit IP #3-#5 -->
    <g filter="url(#iso-shadow)">
      <polygon points="580,144 640,176 580,208 520,176" fill="#c7dbf9" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="520,176 580,208 580,232 520,200" fill="#a8c7f5" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="580,208 640,176 640,200 580,232" fill="#8bb2ed" stroke="#2d2d2d" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="568" y="156" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <rect x="568" y="165" width="24" height="6" rx="1.5" fill="none" stroke="#1e293b" stroke-width="1.3"/>
      <text x="580" y="186" text-anchor="middle" fill="#1a1a1a" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700">Exit IP #3–5</text>
    </g>
    <rect x="516" y="246" width="128" height="22" rx="11" fill="var(--paper-sunk)" stroke="#2F6B4F" stroke-width="1.2"/>
    <text x="580" y="261" text-anchor="middle" fill="#2F6B4F" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="600">Fresh tunnel / req</text>
  </svg>
  <p class="viz-note">Session-pooled clients (<code>primp</code>, <code>rnet</code>, <code>httpx</code>) reuse a single warm <code>CONNECT</code> tunnel (~730–880ms), while non-session calls open a fresh exit IP on every request (~2.2–2.9s).</p>
</figure>

<figure class="viz-box">
  <figcaption class="viz-title">US Residential Proxy Mean Latency — 5 Requests per Client (ms, Lower is Better)</figcaption>
  <div class="viz-legend">
    <span><i class="viz-swatch" style="background: var(--accent);"></i>Pooled Tunnel (1 IP)</span>
    <span><i class="viz-swatch" style="background: var(--good);"></i>Fresh Tunnel / Call (4–5 IPs)</span>
    <span><i class="viz-swatch" style="background: var(--heart);"></i>0/5 Failed</span>
  </div>
  <svg viewBox="0 0 720 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="US Residential Proxy mean latency chart">
    <g stroke="var(--rule)" stroke-width="1" stroke-dasharray="3,3">
      <line x1="138" y1="8" x2="138" y2="172"/>
      <line x1="263" y1="8" x2="263" y2="172"/>
      <line x1="388" y1="8" x2="388" y2="172"/>
      <line x1="513" y1="8" x2="513" y2="172"/>
    </g>
    <g fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">
      <text x="138" y="190">0ms</text>
      <text x="263" y="190">1,000ms</text>
      <text x="388" y="190">2,000ms</text>
      <text x="513" y="190">3,000ms</text>
    </g>
    <!-- Scale: 375px = 3000ms => 0.125 px/ms -->
    <!-- primp: 728.8 -->
    <text x="128" y="25" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">primp</text>
    <rect x="138" y="13" width="91.1" height="14" rx="2" fill="var(--accent)"/>
    <text x="236" y="24" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">729ms · 100% (1 IP)</text>

    <!-- rnet: 766.3 -->
    <text x="128" y="49" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">rnet (wreq-py)</text>
    <rect x="138" y="37" width="95.8" height="14" rx="2" fill="var(--accent)"/>
    <text x="241" y="48" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">766ms · 100% (1 IP)</text>

    <!-- httpx: 877.3 -->
    <text x="128" y="73" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">httpx</text>
    <rect x="138" y="61" width="109.7" height="14" rx="2" fill="var(--accent)"/>
    <text x="255" y="72" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">877ms · 100% (1 IP)</text>

    <!-- curl_cffi: 2213.4 -->
    <text x="128" y="97" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">curl_cffi</text>
    <rect x="138" y="85" width="276.7" height="14" rx="2" fill="var(--good)"/>
    <text x="422" y="96" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">2,213ms · 100% (5 IPs)</text>

    <!-- requests: 2709.3 -->
    <text x="128" y="121" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">requests</text>
    <rect x="138" y="109" width="338.7" height="14" rx="2" fill="var(--good)"/>
    <text x="484" y="120" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">2,709ms · 80% (1 drop)</text>

    <!-- pycurl: 2936.7 -->
    <text x="128" y="145" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">pycurl</text>
    <rect x="138" y="133" width="367.1" height="14" rx="2" fill="var(--good)"/>
    <text x="512" y="144" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">2,937ms · 80% (1 502)</text>

    <!-- urllib3: FAIL -->
    <text x="128" y="169" text-anchor="end" fill="var(--heart)" font-family="IBM Plex Mono, monospace" font-size="11.5">urllib3</text>
    <rect x="138" y="157" width="6" height="14" rx="1" fill="var(--heart)"/>
    <text x="151" y="168" fill="var(--heart)" font-family="IBM Plex Mono, monospace" font-size="10.5">0% — 407 Proxy Auth Required</text>
  </svg>
  <p class="viz-note">Client sessions (<code>primp</code>, <code>rnet</code>, <code>httpx</code>) kept the proxy <code>CONNECT</code> tunnel warm (~730–880ms). Non-session calls negotiated a new residential exit IP per request (~2.2–2.9s).</p>
</figure>

### Real Failures & Rough Edges Observed

<div class="fail-grid">
  <div class="fail-card caution">
    <h4>Native Rust wreq (6.0.0-rc.31)</h4>
    <p><code>btls-sys</code> compiles BoringSSL from source and requires <code>cmake</code> on the host. Using <code>rnet</code> (its official Python wheel) avoids local build-toolchain setup.</p>
  </div>
  <div class="fail-card">
    <h4>urllib3 (2.8.0) — 407 Proxy Auth</h4>
    <p><code>ProxyManager("http://user:pass@host:port")</code> failed <strong>0%</strong> with <code>407 Proxy Authentication Required</code>. Unlike peers, it requires explicit <code>make_headers(proxy_basic_auth=...)</code>.</p>
  </div>
  <div class="fail-card caution">
    <h4>rnet H3 Fallback &amp; primp Names</h4>
    <p><code>rnet.Version.HTTP_3</code> silently fell back to <code>http/2</code> on Cloudflare. <code>primp 2.0.1</code> rejected <code>"chrome_133"</code>, requiring <code>"chrome"</code> or <code>"random"</code>.</p>
  </div>
  <div class="fail-card caution">
    <h4>Residential Tunnel Flakes</h4>
    <p><code>requests</code> (<code>RemoteDisconnected</code>) and <code>pycurl</code> (<code>502 CONNECT</code>) each dropped 1/5 fresh tunnels—always wrap residential proxy calls in retries.</p>
  </div>
</div>

---

## 5. GitHub Stars &amp; Ecosystem Adoption

Raw speed doesn't always match popularity. Legacy Python giants dominate star counts, while newer Rust-backed BoringSSL clients (`primp`, `rnet`) punch far above their star weight in throughput:

<figure class="viz-box">
  <figcaption class="viz-title">GitHub Stars — Stealth &amp; Low-Level Contenders vs. Python Baselines</figcaption>
  <div class="viz-legend">
    <span><i class="viz-swatch" style="background: var(--good);"></i>TLS Impersonation</span>
    <span><i class="viz-swatch" style="background: var(--accent);"></i>Rust Core / C Binding</span>
    <span><i class="viz-swatch" style="background: var(--ink-faint);"></i>Standard Python (shown at bottom)</span>
  </div>
  <svg viewBox="0 0 720 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub stars comparison chart">
    <g stroke="var(--rule)" stroke-width="1" stroke-dasharray="3,3">
      <line x1="158" y1="8" x2="158" y2="146"/>
      <line x1="278" y1="8" x2="278" y2="146"/>
      <line x1="398" y1="8" x2="398" y2="146"/>
      <line x1="518" y1="8" x2="518" y2="146"/>
      <line x1="638" y1="8" x2="638" y2="146"/>
    </g>
    <g fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">
      <text x="158" y="164">0</text>
      <text x="278" y="164">2,000</text>
      <text x="398" y="164">4,000</text>
      <text x="518" y="164">6,000</text>
      <text x="638" y="164">8,000 stars</text>
    </g>
    <!-- Scale: 480px = 8,000 stars => 0.06 px/star -->
    <!-- curl_cffi: 6,920 -->
    <text x="148" y="25" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">lexiforest/curl_cffi</text>
    <rect x="158" y="13" width="415.2" height="14" rx="2" fill="var(--good)"/>
    <text x="580" y="24" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600">6,920 ★</text>

    <!-- rnet / wreq-python: 1,530 -->
    <text x="148" y="51" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">0x676e67/wreq-python</text>
    <rect x="158" y="39" width="91.8" height="14" rx="2" fill="var(--good)"/>
    <text x="257" y="50" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">1,530 ★</text>

    <!-- pycurl: 1,170 -->
    <text x="148" y="77" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">pycurl/pycurl</text>
    <rect x="158" y="65" width="70.2" height="14" rx="2" fill="var(--accent)"/>
    <text x="235" y="76" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">1,170 ★</text>

    <!-- wreq (Rust): 1,130 -->
    <text x="148" y="103" text-anchor="end" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="11.5">0x676e67/wreq (Rust)</text>
    <rect x="158" y="91" width="67.8" height="14" rx="2" fill="var(--accent)"/>
    <text x="233" y="102" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" font-size="10.5">1,130 ★</text>

    <!-- primp: 636 -->
    <text x="148" y="129" text-anchor="end" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="600">deedy5/primp</text>
    <rect x="158" y="117" width="38.2" height="14" rx="2" fill="var(--good)"/>
    <text x="203" y="128" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">636 ★</text>

    <!-- Baseline Giants Footer Strip -->
    <line x1="12" y1="178" x2="708" y2="178" stroke="var(--rule)" stroke-width="1"/>
    <text x="14" y="198" fill="var(--ink-faint)" font-family="IBM Plex Mono, monospace" font-size="10.5">STANDARD PYTHON BASELINES:</text>
    <text x="205" y="198" fill="var(--ink)" font-family="IBM Plex Mono, monospace" font-size="10.5">requests <tspan fill="var(--ink-soft)">54,752★</tspan> · aiohttp <tspan fill="var(--ink-soft)">16,620★</tspan> · httpx <tspan fill="var(--ink-soft)">15,850★</tspan> · urllib3 <tspan fill="var(--ink-soft)">4,087★</tspan></text>
  </svg>
  <p class="viz-note"><code>primp</code> has only 636 GitHub stars yet topped our 1,000-request HTTP/2 throughput benchmark (19,194 req/s), while <code>curl_cffi</code> leads the stealth category in community adoption (6,920 stars).</p>
</figure>

---

## 6. Verdict: Which Client Fits Your Workload?

| Workload | Pick | Why |
| :--- | :--- | :--- |
| **High-Concurrency Stealth Scraping** | **`primp`** or **`rnet` (`wreq-py`)** | 14.8k–19.2k req/s HTTP/2, BoringSSL, exact Chrome JA4 + Akamai H2 + `Sec-Ch-Ua` headers. |
| **6/6 Browser Parity + HTTP/3 (UDP)** | **`curl_cffi`** | 7.4k req/s HTTP/2, full Chrome navigation headers, working HTTP/3 (14.9ms), and reliable proxy rotation. |
| **Maximum Raw HTTP/1.1 &amp; H3 Speed** | **`pycurl`** or **`aiohttp`** | 20.8k H1 / 12.0ms H3 for internal or non-fingerprinted endpoints. |
| **Quick Internal Scripts** | **`httpx`** (H2) or **`requests`** | Ergonomic APIs, but trivially flagged by JA4/HTTP2 fingerprinting on protected sites. |
