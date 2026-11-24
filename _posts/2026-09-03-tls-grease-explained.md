---
layout: post
title: "TLS GREASE Explained: Why Browsers Send Values They Don't Need"
excerpt: "If you inspect Chrome's TLS handshake in Wireshark, you will find bizarre hex values like 0x2A2A in its cipher lists. Here is why Google invented GREASE (RFC 8701) to break fragile network middleboxes—and how anti-bot systems use it to catch scrapers."
tags:
- networking
- tls
- cryptography
- browser-fingerprinting
- bot-detection
- web-scraping
categories:
- Networking
- TLS
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/tls-grease-explained-hero.jpg"
  teaser: "assets/images/blog/tls-grease-explained-hero.jpg"
  og_image: "assets/images/blog/tls-grease-explained-hero.jpg"
---

<div class="terminal-callout" style="background: #161b22; border-left: 4px solid #f85149; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px;">
  <span style="color: #f85149; font-weight: bold;">[!] FORENSIC MYSTERY:</span> Chrome ClientHello Packet Dump<br/>
  <span style="color: #8b949e;">&gt; Cipher Suite: </span><span style="color: #58a6ff;">Reserved (GREASE) (0x2a2a)</span><br/>
  <span style="color: #8b949e;">&gt; Extension:    </span><span style="color: #58a6ff;">Reserved (GREASE) (0x1a1a)</span><br/>
  <span style="color: #8b949e;">&gt; Curve Group:  </span><span style="color: #58a6ff;">Reserved (GREASE) (0x4a4a)</span>
</div>

> **TL;DR:** GREASE (RFC 8701) injects randomized dummy values into TLS handshakes to prevent middlebox protocol ossification. Because real browsers always send GREASE values, anti-bot filters instantly detect scrapers that fail to generate them.

---

## 1. The Catastrophe That Created GREASE: Protocol Ossification

In 2016, the IETF was preparing to finalize TLS 1.3. When Google and Cloudflare enabled preliminary TLS 1.3 handshakes in Chrome, **connections failed for over 8% of internet users worldwide**.

The problem was not Chrome, and it was not the destination web servers. The culprits were enterprise middleboxes, school content filters, and home router inspection software.

```text
The Middlebox Parsing Bug:
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Chrome Browser          │     │ Faulty Middlebox / WAF  │     │ Web Server              │
│ Sends new TLS 1.3       │ ──> │ "Unknown TLS version?!" │ ──> │ (Never receives packet; │
│ ClientHello packet      │     │ DROP PACKET OR SEND RST │     │  connection times out!) │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

The middlebox developers had violated RFC specifications: instead of ignoring unknown TLS extensions or version numbers, their code assumed TLS would remain version `0x0303` (TLS 1.2) forever. If an unknown byte sequence appeared, they crashed or dropped the connection.

Google realized: **If you don't use protocol extensibility continuously, middlebox vendors will break it.**

---

## 2. The Anatomy of RFC 8701 GREASE Values

The IETF permanently reserved 16 specific 16-bit values that will **never** be assigned to a real TLS cipher, extension, or elliptic curve:

```text
0x0a0a, 0x1a1a, 0x2a2a, 0x3a3a, 0x4a4a, 0x5a5a, 0x6a6a, 0x7a7a,
0x8a8a, 0x9a9a, 0xaaaa, 0xbaba, 0xcaca, 0xdada, 0xeaea, 0xfafa
```

Notice the pattern: in hexadecimal, the first byte matches the second byte, and the low nibble is always `0xA` (`{0x?a, 0x?a}`).

### Where Chrome Injects GREASE:
On every single TLS connection, Chromium's BoringSSL engine picks one random GREASE value from this table and injects it into four distinct TLS parameters:
1. **Cipher Suites:** Injected at a random index in the cipher list.
2. **Extensions:** Added to the TLS extension list.
3. **Supported Groups:** Added to the elliptic curve list.
4. **ALPN Protocols:** Randomly placed among application protocols.

If a server understands RFC 8701, it silently ignores the GREASE values and negotiates genuine ciphers.

---

## 3. The Forensic Footprint: How Anti-Bot Systems Detect Scrapers

Because GREASE is implemented natively in Chromium's BoringSSL and Apple's SecureTransport, every real Chrome and Safari browser emits GREASE.

Standard scraping libraries built on OpenSSL do not:

```text
REAL CHROME 124 (ClientHello):
├── Ciphers: [0x2a2a (GREASE), 0x1301, 0x1302, 0x1303, ...]
└── Extensions: [0x3a3a (GREASE), server_name, supported_groups, ...]

NAIVE PYTHON SCRAPER (ClientHello):
├── Ciphers: [0xc030, 0xc02f, 0xc028, ...]  <-- ZERO GREASE!
└── Extensions: [server_name, status_request, ...]  <-- ZERO GREASE!
```

### The JA3 / JA4 Detection Rule
The JA3 fingerprinting standard explicitly ignores GREASE values by filtering them out during hashing. 

However, modern risk engines (Cloudflare, Akamai) execute an explicit boolean check:
```python
# Pseudo-code of an edge firewall inspection rule
has_chrome_user_agent = "Chrome/" in headers.get("User-Agent", "")
has_grease_in_client_hello = any(c in GREASE_TABLE for c in client_hello.ciphers)

if has_chrome_user_agent and not has_grease_in_client_hello:
    block_request(reason="SPOOFED_USER_AGENT_MISSING_GREASE")
```

---

## Hands-On Verification: Inspect GREASE in Your Packets

### 1. Wireshark Display Filter
To find GREASE in your live traffic, open Wireshark on your network adapter and filter for TLS handshakes:

```text
tls.handshake.type == 1 && (tls.handshake.ciphersuite == 0x2a2a || tls.handshake.ciphersuite == 0x1a1a)
```

### 2. Verify with Python curl_cffi
Ensure your scraping tool correctly injects GREASE into BoringSSL:

```python
from curl_cffi import requests

# curl_cffi automatically includes RFC 8701 GREASE seeds
resp = requests.get("https://tls.peet.ws/api/all", impersonate="chrome124")
tls_data = resp.json().get("tls", {})

print("TLS Version: ", tls_data.get("version"))
print("GREASE Present:", "Yes" if "grease" in str(tls_data).lower() else "No")
```
