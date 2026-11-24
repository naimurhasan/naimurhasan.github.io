---
layout: post
title: "HTTP/2 Headers: HPACK Compression, Binary Framing, and Why Ordering Matters"
excerpt: "HTTP/1.1 sent ASCII text headers with every single image and CSS file. HTTP/2 introduced HPACK, turning megabytes of redundant text into single-byte indexes. Here is how static tables, dynamic tables, and Huffman trees compress headers on the wire."
tags:
- networking
- http2
- hpack
- performance
- browser-fingerprinting
- anti-bot
categories:
- Networking
- Protocols
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/http2-hpack-headers-hero.jpg"
  teaser: "assets/images/blog/http2-hpack-headers-hero.jpg"
  og_image: "assets/images/blog/http2-hpack-headers-hero.jpg"
---

<div class="spec-badge-bar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
  <span class="badge" style="background: #24292e; color: #58a6ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">RFC 7541 (HPACK)</span>
  <span class="badge" style="background: #24292e; color: #7ee787; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">RFC 9113 (HTTP/2)</span>
  <span class="badge" style="background: #24292e; color: #ffa657; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Frame Type: HEADERS (0x01)</span>
  <span class="badge" style="background: #24292e; color: #d2a8ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Transport: TLS ALPN 'h2'</span>
</div>

> #### ⚡ TL;DR in 30 Seconds
> * **The Problem HPACK Solved:** In HTTP/1.1, browsers sent 1,000+ bytes of repetitive ASCII headers (Cookies, User-Agents, Cache-Control) with *every single subresource request*.
> * **Why GZIP wasn't used:** General-purpose GZIP compression on headers enabled the **CRIME vulnerability**, allowing attackers to decrypt sensitive cookies by observing ciphertext lengths.
> * **HPACK's 3-Layer Compression:** (1) A predefined **Static Table** of 61 common headers, (2) A stateful **Dynamic Table** that caches session headers in a sliding FIFO buffer, and (3) A static **Canonical Huffman Code**.
> * **The Anti-Bot Fingerprint:** Real browsers send pseudo-headers (`:method`, `:authority`, `:scheme`, `:path`) in an exact, unvarying sequence. Emitting pseudo-headers out of order flags your request instantly.

---

## 1. The Wire Transformation: Compressing Headers to 1 Byte

In HTTP/1.1, sending a GET request sent 12 raw ASCII bytes across the wire:
```http
GET / HTTP/1.1\r\n
```

In HTTP/2, HPACK replaces that entire line with a **single byte**: `0x82`.

```text
Binary Representation: 10000010
                       │ └───── Index 2 in HPACK Static Table
                       └─────── Bit 7 = 1 (Indexed Header Field Representation)
```

Because Index 2 in the HPACK Static Table is permanently defined as `:method: GET`, the server reads `0x82` and reconstructs the full header without receiving a single ASCII character.

---

## 2. The HPACK Architecture: 3 Compression Tiers

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HPACK COMPRESSION ENGINE                        │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. STATIC TABLE (RFC 7541)        │ 61 Pre-defined Common Headers      │
│    Indices 1 to 61                │ Immutable, zero network overhead   │
├───────────────────────────────────┼────────────────────────────────────┤
│ 2. DYNAMIC TABLE                  │ Stateful Sliding FIFO Window       │
│    Indices 62+                    │ Remembers cookies & custom headers │
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. HUFFMAN ENCODING               │ Canonical Huffman Tree             │
│    Literal String Compression     │ Shorter bitstrings for frequent ASCII│
└───────────────────────────────────┴────────────────────────────────────┘
```

### 1. The Static Table (Sample Entries)
The IETF predefined 61 entries for the most universal HTTP attributes:

| Index | Header Name | Header Value | Compressed Byte |
| :--- | :--- | :--- | :--- |
| **2** | `:method` | `GET` | `0x82` (1 byte) |
| **3** | `:method` | `POST` | `0x83` (1 byte) |
| **4** | `:path` | `/` | `0x84` (1 byte) |
| **6** | `:scheme` | `http` | `0x86` (1 byte) |
| **7** | `:scheme` | `https` | `0x87` (1 byte) |
| **8** | `:status` | `200` | `0x88` (1 byte) |

### 2. The Dynamic Table: Eliminating Cookie Retransmission
The first time your browser sends a 500-byte session cookie, it transmits the literal string.

The HPACK encoder inserts that cookie into its **Dynamic Table at Index 62**. When the browser requests `logo.png` 10 milliseconds later, it does not send the 500-byte cookie again. It sends the single byte `0xBE` (Index 62 with high bit set).

---

## 3. The Anti-Bot Dimension: Pseudo-Header Ordering

In HTTP/2, headers starting with a colon (`:`) are **pseudo-headers** that replace the HTTP/1.1 request line.

Every browser engine formats and encodes pseudo-headers in a rigid internal order determined by its C++ source code:

```text
Google Chrome / Edge (Chromium / Blink):
1. :method: GET
2. :authority: example.com
3. :scheme: https
4. :path: /

Mozilla Firefox (Gecko):
1. :method: GET
2. :path: /
3. :authority: example.com
4. :scheme: https
```

### The Giveaway: Python & Go Scrapers
Default Python `httpx` or Go `net/http` implementations often sort pseudo-headers alphabetically or iterate over native unordered hash maps:

```text
Unordered Bot Fingerprint:
1. :authority: example.com  <-- ILLEGAL FIRST HEADER FOR CHROME!
2. :method: GET
3. :path: /
4. :scheme: https
```

Anti-bot systems (Cloudflare, Akamai) compare the pseudo-header sequence against the reported `User-Agent`. If the `User-Agent` claims to be Chrome but the pseudo-headers follow Firefox or Go sequencing, the request is flagged with 100% confidence.

---

## Hands-On Terminal Toolkit

### 1. Inspect Raw HTTP/2 Binary Frames
Use `nghttp` (from the `nghttp2` package) to watch HPACK compression in real time:

```bash
# Install nghttp2 if needed: brew install nghttp2
nghttp -nv https://nghttp2.org
```

Watch the terminal output: you will see individual `[HEADERS]` frames and dynamic table insertions (`inflate: [ 62] (s=...)`).

### 2. Verify HTTP/2 Frame Support with cURL
```bash
# Query an edge endpoint and print HTTP/2 protocol handshake details
curl -I --http2 -v https://www.google.com 2>&1 | grep -E "< HTTP/2|Using HTTP2"
```

### 3. Check for Trailing Header Injection Bugs in Python
When using Python clients like `curl_cffi`, ensure pseudo-headers are handled natively by the underlying C engine:

```python
from curl_cffi import requests

# curl_cffi delegates HPACK encoding to genuine Chromium C++ routines
resp = requests.get("https://tls.peet.ws/api/all", impersonate="chrome124")
print("Reported HTTP/2 Fingerprint:", resp.json().get("http2", {}).get("akamai_fingerprint"))
```
