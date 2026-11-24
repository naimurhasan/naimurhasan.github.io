---
layout: post
title: "HTTP/2 SETTINGS: The Hidden Configuration of Every Connection"
excerpt: "Before an HTTP/2 connection sends a single request, it exchanges a SETTINGS frame. Here is the deep engineering breakdown of initial window sizes, header table limits, and why anti-bot engines use SETTINGS frames to fingerprint Python, Node, and Chrome."
tags:
- networking
- http2
- protocols
- browser-fingerprinting
- bot-detection
- security
categories:
- Networking
- Protocols
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/http2-settings-frames-hero.jpg"
  teaser: "assets/images/blog/http2-settings-frames-hero.jpg"
  og_image: "assets/images/blog/http2-settings-frames-hero.jpg"
---

<div class="spec-badge-bar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
  <span class="badge" style="background: #24292e; color: #58a6ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">RFC 9113 §6.5</span>
  <span class="badge" style="background: #24292e; color: #7ee787; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Frame Type: SETTINGS (0x04)</span>
  <span class="badge" style="background: #24292e; color: #ffa657; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Payload Unit: 6-byte Tuples (ID:Value)</span>
  <span class="badge" style="background: #24292e; color: #d2a8ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Stream ID: 0x00 (Connection-Level)</span>
</div>

> #### ⚡ TL;DR in 30 Seconds
> * **The First Words of HTTP/2:** Immediately after the TLS handshake and the 24-byte client preface (`PRI * HTTP/2.0...`), the client sends a `SETTINGS` frame.
> * **What It Configures:** Buffer sizes, flow control windows, and maximum frame limits. Both endpoints must acknowledge receipt via an empty `SETTINGS` frame with the `ACK` flag (`0x01`).
> * **The Wire Anatomy:** Each setting is a strict **6-byte payload**: a 2-byte 16-bit Identifier followed by a 4-byte 32-bit Value.
> * **The Anti-Bot Fingerprint:** Browser engines (Chrome, Firefox, Safari) hardcode distinct parameter values and emission orders in their networking stacks. Comparing the advertised SETTINGS frame against the `User-Agent` exposes spoofed scrapers within milliseconds.

---

## 1. The 6 Standard HTTP/2 SETTINGS Parameters

RFC 9113 defines six standard parameters that govern connection limits:

| ID | Parameter Name | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| **0x01** | `SETTINGS_HEADER_TABLE_SIZE` | `4096` bytes | Maximum memory size allocated for the HPACK dynamic decoding table. |
| **0x02** | `SETTINGS_ENABLE_PUSH` | `1` (Enabled) | Whether the client accepts server push streams (`0` disables it). |
| **0x03** | `SETTINGS_MAX_CONCURRENT_STREAMS` | Unlimited | Maximum simultaneous active data streams allowed on this connection. |
| **0x04** | `SETTINGS_INITIAL_WINDOW_SIZE` | `65535` bytes | Initial stream-level flow control credit buffer for inbound payloads. |
| **0x05** | `SETTINGS_MAX_FRAME_SIZE` | `16384` bytes | Maximum size of an individual HTTP/2 frame payload (16KB to 16MB). |
| **0x06** | `SETTINGS_MAX_HEADER_LIST_SIZE` | Unlimited | Advisory maximum size of uncompressed header metadata the sender accepts. |

---

## 2. Wire Anatomy of a SETTINGS Frame

A SETTINGS frame consists of a standard 9-byte HTTP/2 frame header followed by multiples of 6-byte identifier-value tuples:

```text
┌─────────────────────────────────────────────────────────────┐
│                 9-BYTE HTTP/2 FRAME HEADER                  │
├──────────────────────────────┬──────────────┬───────────────┤
│ Length (3 bytes): 0x000012   │ Type (1 byte): 0x04 (SETTINGS)│
├──────────────────────────────┼──────────────┴───────────────┤
│ Flags (1 byte): 0x00 (No ACK)│ Stream ID (4 bytes): 0x00000000│
└──────────────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 SETTINGS PAYLOAD (18 BYTES)                 │
├──────────────────────────────┬──────────────────────────────┤
│ Setting ID (2 bytes): 0x0001 │ Setting Value (4 bytes): 65536│
├──────────────────────────────┼──────────────────────────────┤
│ Setting ID (2 bytes): 0x0002 │ Setting Value (4 bytes): 0    │
├──────────────────────────────┼──────────────────────────────┤
│ Setting ID (2 bytes): 0x0004 │ Setting Value (4 bytes): 6291456│
└──────────────────────────────┴──────────────────────────────┘
```

Notice that the **Stream ID is always `0`**. SETTINGS frames apply to the entire physical TCP connection, never to individual request streams.

---

## 3. The Akamai HTTP/2 Fingerprint Breakdown

Edge security firewalls (Akamai, Cloudflare, DataDome) concatenate the client's initial SETTINGS frame parameters into a canonical string:

```text
Format: 1:Value;2:Value;3:Value;4:Value;...|WINDOW_UPDATE_VALUE|PRIORITY_STREAMS
```

### The Fingerprint Comparison Matrix:

| Client Engine | Advertised SETTINGS Sequence | Distinctive Markers |
| :--- | :--- | :--- |
| **Google Chrome / Edge** | `1:65536, 2:0, 4:6291456, 6:262144` | Huge window (`6.29MB`), disables push (`2:0`), omits `MAX_CONCURRENT_STREAMS`. |
| **Mozilla Firefox** | `1:65536, 4:131072, 5:16384` | Smaller window (`128KB`), explicitly sets `MAX_FRAME_SIZE (5:16384)`. |
| **Apple Safari** | `2:0, 3:100, 4:2097152, 1:4096` | Starts with `ENABLE_PUSH: 0`, sets `MAX_CONCURRENT_STREAMS: 100`. |
| **Python httpx / hyper-h2** | `1:4096, 2:1, 4:65535` | Default RFC values; enables push (`2:1`); tiny default window (`64KB`). |
| **Node.js (http2 module)** | `1:4096, 2:0, 3:100, 4:65535, 5:16384` | Classic Node.js signature (`3:100` + `5:16384`). |

If your Python scraper advertises `1:4096, 2:1, 4:65535` while sending a Chrome 124 `User-Agent`, Akamai's risk engine flags your connection with near 100% certainty before inspecting your application payload.

---

## Hands-On Terminal Toolkit

### 1. Inspect Live HTTP/2 SETTINGS Frames with nghttp
Run this command to watch the exact SETTINGS frame exchange during connection setup:

```bash
# Watch the client-to-server SETTINGS frame exchange
nghttp -nv https://www.google.com | grep -A 6 "recv SETTINGS frame"
```

Expected output:
```text
[  0.038] recv SETTINGS frame <length=18, flags=0x00, stream_id=0>
          (niv=3)
          [SETTINGS_MAX_CONCURRENT_STREAMS(0x03):100]
          [SETTINGS_INITIAL_WINDOW_SIZE(0x04):1048576]
          [SETTINGS_MAX_HEADER_LIST_SIZE(0x06):32768]
```

### 2. Verify Your Python Client's Real Fingerprint
Test what the server sees when your scraper connects:

```python
from curl_cffi import requests

# Genuine Chrome TLS and HTTP/2 stack emulation
resp = requests.get("https://tls.peet.ws/api/all", impersonate="chrome124")
h2_info = resp.json().get("http2", {})

print("Reported Akamai HTTP/2 Fingerprint:")
print(h2_info.get("akamai_fingerprint"))
```
