---
layout: post
title: "Python HTTP Clients Benchmarked: wreq (rnet), primp, curl_cffi, httpmorph, and pycurl"
excerpt: "A short, data-visualized benchmark of modern Python HTTP and TLS-impersonation clients across 1,000-request local HTTP/1.1 & HTTP/2 runs, JA4/Akamai fingerprinting, header leaks, US residential proxy overhead, and real-world failures."
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
---

<style>
.bench-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.9rem; margin: 1.25rem 0; }
.bench-card { border: 1px solid rgba(128,128,128,0.25); border-radius: 10px; padding: 0.9rem 1rem; background: rgba(128,128,128,0.04); }
.bench-card.win { border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.06); }
.bench-card.fail { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.05); }
.bench-card h4 { margin: 0 0 0.35rem 0; font-size: 0.95rem; }
.bench-metric { font-size: 1.35rem; font-weight: 700; margin: 0.15rem 0; }
.bench-sub { font-size: 0.82rem; opacity: 0.8; margin: 0; }
.badge-ok { color: #16a34a; font-weight: 600; }
.badge-warn { color: #d97706; font-weight: 600; }
.badge-fail { color: #dc2626; font-weight: 600; }
</style>

> **TL;DR:** Rust-backed BoringSSL clients (**`primp`** at **19,194 req/s** and **`rnet`/`wreq-python`** at **14,818 req/s** on local HTTP/2+TLS) dominate concurrent throughput while matching Chrome's JA4 and Akamai HTTP/2 fingerprints. Meanwhile, **`pycurl`** still leads raw HTTP/1.1 throughput (**20,851 req/s**), **`curl_cffi`** balances speed with rock-solid proxy rotation, and **`httpmorph`** hit real TLS/proxy rough edges in our tests.

<div class="bench-grid">
  <div class="bench-card win">
    <h4>🏆 Fastest HTTP/2 + Stealth</h4>
    <div class="bench-metric">primp — 19,194 req/s</div>
    <p class="bench-sub">0.88ms p50 · 5/5 US proxy OK</p>
  </div>
  <div class="bench-card win">
    <h4>⚡ Fastest Sequential & wreq</h4>
    <div class="bench-metric">rnet — 8,234 req/s</div>
    <p class="bench-sub">0.12ms p50 · 14,818 req/s conc H2</p>
  </div>
  <div class="bench-card win">
    <h4>🚀 Fastest Raw HTTP/1.1</h4>
    <div class="bench-metric">pycurl — 20,851 req/s</div>
    <p class="bench-sub">0.72ms p50 · No browser impersonation</p>
  </div>
  <div class="bench-card fail">
    <h4>⚠️ Biggest Gotchas</h4>
    <div class="bench-metric">httpmorph &amp; wreq</div>
    <p class="bench-sub">httpmorph 0/5 proxy &amp; H2 TLS err · Rust wreq needs cmake</p>
  </div>
</div>

---

## 1. Feature & Reliability Checklist

Before looking at raw speed, here is how every client scored across **HTTP/2**, **Chrome TLS/JA4**, **browser headers**, **1,000-request local stress**, and **authenticated US proxy** checks:

| Client | Version | Engine / TLS | H2 | Chrome JA4 | Full Headers | 1k Local H2 | US Proxy (5 req) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`rnet`** (`wreq-py`) | `2.4.2` | Rust (`wreq`) / BoringSSL | ✅ | ✅ | ✅ (12) | ✅ 1000/1000 | ✅ 5/5 |
| **`primp`** | `2.0.1` | Rust (`rquest`) / BoringSSL | ✅ | ✅ | ✅ (14) | ✅ 1000/1000 | ✅ 5/5 |
| **`curl_cffi`** | `0.17.0` | C (`libcurl-imp`) / BoringSSL | ✅ | ✅ | ✅ (15) | ✅ 1000/1000 | ✅ 5/5 |
| **`httpmorph`** | `0.2.8` | C ext / BoringSSL | ✅ | ⚠️ Partial | ❌ (2 only) | ❌ TLS Error | ❌ 0/5 (`CONNECT`) |
| **`pycurl`** | `7.49.0` | C (`libcurl`) / OpenSSL | ✅ | ❌ | ❌ (libcurl) | ✅ 1000/1000 | ⚠️ 4/5 (`502`) |
| **`aiohttp`** | `3.14.5` | Python async / OpenSSL | ❌ | ❌ | ❌ | ✅ 1000/1000 | — |
| **`httpx`** | `0.28.1` | Pure Python / OpenSSL | ✅ | ❌ | ❌ (4) | ✅ 1000/1000 | ✅ 5/5 |
| **`urllib3`** | `2.8.0` | Pure Python / OpenSSL | ❌ | ❌ | ❌ (4) | ✅ 1000/1000 | ❌ 0/5 (`407` auth) |
| **`requests`** | `2.34.2` | Pure Python / OpenSSL | ❌ | ❌ | ❌ (4) | ✅ 1000/1000 | ⚠️ 4/5 (drop) |

> **Note on Native Rust `wreq` (`6.0.0-rc.31`):** Building `0x676e67/wreq` directly with `cargo` failed on a clean macOS setup because `btls-sys` compiles BoringSSL from source and requires `cmake`. Prebuilt Python wheels (`rnet`, `primp`, `curl_cffi`, `httpmorph`) avoid this toolchain friction entirely.

---

## 2. Speed & Throughput (Local Docker Nginx)

We ran **100 sequential** (10 warmup) and **1,000 concurrent** (`concurrency=20`) requests against a local Docker `nginx:alpine` container serving both **HTTP/1.1** and **HTTP/2 + TLS 1.3**.

{% include chart.html type="grouped" title="Concurrent Throughput — 1,000 Requests, 20 Workers (req/s, Higher is Better)" series="HTTP/1.1|HTTP/2 + TLS" labels="primp|pycurl|rnet (wreq-py)|aiohttp|curl_cffi|urllib3|requests|httpmorph|httpx" values="18130,19194|20851,8456|13272,14818|13819,6463|6268,7397|6388,5335|2719,2359|2627,0|559,1665" suffix=" req/s" scale="22000" note="httpmorph AsyncClient scored 0 req/s on local HTTP/2+TLS due to a TLS verification failure (see Failures below)." %}

{% include chart.html type="grouped" title="Sequential Latency — 100 Reused-Session Requests (p50 ms, Lower is Better)" series="HTTP/1.1 p50|HTTP/2+TLS p50" labels="rnet (wreq-py)|pycurl|primp|curl_cffi|urllib3|httpx|requests|httpmorph" values="0.12,0.19|0.16,0.15|0.16,0.19|0.25,0.24|0.27,0.29|0.37,0.37|0.76,0.54|0.44,1.63" suffix="ms" scale="1.8" note="In sequential reused-session mode, Rust (rnet/primp) and C (pycurl) stay under 0.20ms per request." %}

### Full Local Benchmark Numbers

| Library | Seq H1 (req/s / p95) | Seq H2 (req/s / p95) | Conc 1k H1 (req/s / p95) | Conc 1k H2 (req/s / p95) |
| :--- | :--- | :--- | :--- | :--- |
| **`primp`** | 5,929.5 / 0.21ms | 5,289.6 / 0.22ms | 18,129.6 / 1.77ms | **19,194.0 / 1.44ms** |
| **`rnet` (`wreq-py`)** | **8,233.6 / 0.15ms** | 5,253.6 / 0.22ms | 13,272.1 / 1.99ms | 14,817.7 / 2.15ms |
| **`pycurl`** | 4,839.8 / 0.33ms | **6,405.1 / 0.19ms** | **20,850.5 / 1.64ms** | 8,456.0 / 6.32ms |
| **`aiohttp`** | — (async) | — (async) | 13,819.2 / 1.83ms | 6,463.0 / 3.00ms |
| **`curl_cffi`** | 3,668.6 / 0.37ms | 3,903.5 / 0.33ms | 6,267.9 / 5.63ms | 7,396.5 / 5.14ms |
| **`urllib3`** | 3,326.9 / 0.45ms | 3,336.1 / 0.36ms | 6,388.1 / 5.44ms | 5,335.0 / 6.41ms |
| **`requests`** | 1,384.9 / 1.00ms | 1,831.0 / 0.63ms | 2,718.7 / 12.76ms | 2,358.8 / 13.57ms |
| **`httpx`** | 2,637.4 / 0.46ms | 2,477.7 / 0.52ms | 558.6 / 86.16ms | 1,665.3 / 13.71ms |
| **`httpmorph`** | 2,176.1 / 0.70ms | 583.0 / 2.13ms | 2,627.2 / 9.89ms | ❌ **FAILED** (TLS error) |

---

## 3. Anonymity, Fingerprints & Header Leaks

We audited every client against **`tls.peet.ws/api/all`** (JA3/JA4 & Akamai HTTP/2 hash), **`httpbin.org/headers`** (default wire headers), and **`cloudflare.com/cdn-cgi/trace`** (10 direct requests for real-world ALPN & TLS 1.3).

{% include chart.html type="columns" title="Direct Cloudflare Edge Mean Latency — 10 Requests (ms, Lower is Better)" labels="httpx (h2)|urllib3|curl_cffi|primp|requests|rnet|httpmorph|pycurl" values="15.8|16.4|19.1|20.3|22.7|24.0|34.1|36.9" suffix="ms" scale="40" highlight="curl_cffi" note="All 8 clients succeeded 10/10 on Cloudflare edge with TLSv1.3; requests and urllib3 fell back to http/1.1 while the others negotiated http/2." %}

| Client | CF Proto / TLS | JA4 Fingerprint (`tls.peet.ws`) | Akamai H2 Hash | Default Headers (`httpbin.org`) |
| :--- | :--- | :--- | :--- | :--- |
| **`rnet` (`wreq-py`)** | `http/2` / `TLSv1.3` | `t13d1516h2_8daaf6152771_d8a2da3f94cd` | `52d84b11737d980aef856699f885ca86` | ✅ **12** (`Sec-Ch-Ua`, `Sec-Fetch-*`, `Priority`) |
| **`primp`** | `http/2` / `TLSv1.3` | `t13d1516h2_8daaf6152771_d8a2da3f94cd` | `52d84b11737d980aef856699f885ca86` | ✅ **14** (Full Chrome nav headers) |
| **`curl_cffi`** | `http/2` / `TLSv1.3` | `t13d1517h2_8daaf6152771_cb7bf5808d99` | `52d84b11737d980aef856699f885ca86` | ✅ **15** (Full Chrome nav headers + `Cache-Control`) |
| **`httpmorph`** | `http/2` / `TLSv1.3` | `t13d1714h2_5b57614c22b0_1f8ea98b2e19` | `52d84b11737d980aef856699f885ca86` | ❌ **2 only** (`Host`, `User-Agent`) |
| **`pycurl`** | `http/2` / `TLSv1.3` | `t13d3012h2_1d37bd780c83_882d495ac381` | `55cb2bd667724e6d46cc3c8dd15d50de` | ❌ `PycURL/7.49.0 libcurl/8.23.0...` |
| **`httpx`** | `http/2` / `TLSv1.3` | `t13d1712h1_ab0a1bf427ad_8e6e362c5eac` | `29e6a0e9b360185223ec1278a845fdb1` | ❌ **4** (`python-httpx/0.28.1`) |
| **`requests` / `urllib3`** | `http/1.1` / `TLSv1.3` | `t13d1712h1_ab0a1bf427ad_882d495ac381` | `null` (H1 only) | ❌ **4** (`python-requests/2.34.2`) |

**Key Takeaway:** All four impersonators (`rnet`, `primp`, `curl_cffi`, `httpmorph`) produced the **exact same Chrome Akamai HTTP/2 hash** (`52d84b11737d980aef856699f885ca86`). However, **`httpmorph` only sent `Host` and `User-Agent` by default**—omitting `Accept`, `Accept-Encoding`, `Sec-Ch-Ua`, and `Sec-Fetch-*`, which creates an obvious mismatch between its Chrome TLS fingerprint and its bare HTTP headers unless you supply them manually.

---

## 4. US Residential Proxy Performance & Real Failures

We ran a lightweight, budget-safe check (**5 requests per library** to `api.ipify.org?format=json`) through a US residential `CONNECT` proxy to measure tunneling speed, connection reuse, and auth handling.

{% include chart.html type="bars" title="US Residential Proxy Mean Latency — 5 Requests (ms, Lower is Better)" labels="primp (5/5 ✅)|rnet (5/5 ✅)|httpx (5/5 ✅)|curl_cffi (5/5 ✅)|requests (4/5 ⚠️)|pycurl (4/5 ⚠️)" values="729|766|877|2213|2709|2937" suffix="ms" scale="3200" note="Pooled clients (primp, rnet, httpx) reused 1 tunnel (~730-880ms). Non-session calls opened 4-5 fresh tunnels (~2.2-2.9s). urllib3 and httpmorph failed 5/5." %}

<div class="bench-grid">
  <div class="bench-card fail">
    <h4>❌ httpmorph (0.2.8)</h4>
    <p class="bench-sub"><strong>1)</strong> <code>AsyncClient</code> failed on local HTTPS+H2 with <code>CERTIFICATE_VERIFY_FAILED</code> even with <code>verify_ssl=False</code>.<br><strong>2)</strong> Failed <strong>0/5</strong> on authenticated proxy (<code>Proxy CONNECT failed</code>).</p>
  </div>
  <div class="bench-card fail">
    <h4>❌ urllib3 (2.8.0)</h4>
    <p class="bench-sub"><code>ProxyManager("http://user:pass@host:port")</code> failed <strong>0/5</strong> with <code>407 Proxy Authentication Required</code>—requires explicit <code>make_headers(proxy_basic_auth=...)</code>.</p>
  </div>
  <div class="bench-card">
    <h4>⚠️ requests &amp; pycurl</h4>
    <p class="bench-sub">Each hit <strong>1/5</strong> transient residential tunnel drops (<code>RemoteDisconnected</code> and <code>502 CONNECT tunnel failed</code>). Always wrap residential proxy calls in retries.</p>
  </div>
  <div class="bench-card">
    <h4>⚠️ primp (2.0.1)</h4>
    <p class="bench-sub"><code>impersonate="chrome_133"</code> raised <code>Invalid impersonate</code>—<code>2.0.1</code> expects <code>"chrome"</code> or <code>"random"</code>, while <code>rnet</code> uses typed enums (<code>Impersonate.Chrome137</code>).</p>
  </div>
</div>

---

## 5. Verdict: Which One Should You Pick?

| Use Case | Winner | Why |
| :--- | :--- | :--- |
| **Max HTTP/2 + Stealth Throughput** | **`primp`** or **`rnet` (`wreq-py`)** | ✅ 14.8k–19.2k req/s in Python, native BoringSSL, exact Chrome JA4 + Akamai H2 + `Sec-Ch-Ua` headers. |
| **Raw HTTP/1.1 Speed (No Anti-Bot)** | **`pycurl`** or **`aiohttp`** | ✅ 20.8k / 13.8k req/s; mature C/async stacks for internal microservices. |
| **Battle-Tested Anti-Bot + Proxies** | **`curl_cffi`** | ✅ 7.4k req/s HTTP/2, full Chrome headers out of the box, and reliable `libcurl` proxy tunneling. |
| **Pure-Python Simplicity** | **`httpx`** (H2) or **`requests`** | ✅ Easy APIs and proxy auth, ❌ never use against TLS/JA4-fingerprinted targets. |
