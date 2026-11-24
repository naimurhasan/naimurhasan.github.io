---
layout: post
title: "IP Reputation Explained: Why an IP Address Has a History"
excerpt: "Why do some clean IP addresses get blocked on the first request? A deep dive into Autonomous System Numbers (ASNs), BGP announcements, reverse DNS PTR records, fraud scoring engines, and how IP history is tracked across the internet."
tags:
- web-scraping
- networking
- proxies
- security
- devops
- bot-detection
categories:
- Web-Scraping
- Networking
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/ip-reputation-history-hero.jpg"
  teaser: "assets/images/blog/ip-reputation-history-hero.jpg"
  og_image: "assets/images/blog/ip-reputation-history-hero.jpg"
---

<div class="spec-badge-bar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
  <span class="badge" style="background: #24292e; color: #58a6ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Layer: Network (L3 / BGP)</span>
  <span class="badge" style="background: #24292e; color: #7ee787; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Databases: MaxMind / Spur / IPQS</span>
  <span class="badge" style="background: #24292e; color: #ffa657; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Protocols: BGP / WHOIS / rDNS</span>
  <span class="badge" style="background: #24292e; color: #d2a8ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Metrics: Fraud Score / ASN Type</span>
</div>

> #### ⚡ 30-Second Field Reference
> * **An IP is not a blank slate:** When you buy a "clean" proxy or spin up an AWS EC2 instance, that IP address has likely been routed, reused, and scanned thousands of times over the past 20 years.
> * **ASN Classification is Instant:** Websites immediately categorize your IP using its Autonomous System Number (ASN). Datacenter ASNs (AWS, DigitalOcean, Hetzner) start with an elevated risk baseline.
> * **Reverse DNS (PTR) Leaks Hostnames:** If your IP resolves to `mail-scanner.relay.datacenter.net` or has no PTR record at all, anti-bot firewalls detect non-residential traffic instantly.
> * **Fraud Scoring Engines:** Services like IPQS, Spur.us, and MaxMind maintain rolling 90-day blacklists, port-scan logs, and connection-frequency metrics on every `/24` subnet.

---

## 1. The 4 IP Categories: Risk & Reputation Matrix

Every IP address routed across public internet exchanges falls into four major operational categories:

| IP Classification | ASN Examples | PTR Record Signature | Anti-Bot Trust Score | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Residential (Fixed ISP)** | Comcast (AS7922), AT&T (AS7018) | `cpe-74-12-14.hfc.comcastbiz.net` | **Highest (95 – 100)** | Home broadband, high-value consumer checkouts. |
| **Mobile Cellular (CGNAT)** | T-Mobile (AS21928), Verizon (AS6167) | Often empty or `mobile.att.net` | **High (80 – 90)** | Thousands of mobile devices sharing 1 IP; hard to block. |
| **Commercial Datacenter** | AWS (AS16509), DigitalOcean (AS14061) | `ec2-54-21-.compute-1.amazonaws.com` | **Low (10 – 35)** | APIs, microservices, cheap unblocked scraping. |
| **Public VPN / TOR Exit** | NordVPN, Mullvad, TOR nodes | `mullvad-node-4.net`, TOR directory | **Zero (0 – 5)** | Anonymity; blocked by default on financial & protected sites. |

---

## 2. Why "New" Cloud IPs Are Born With Bad Reputation

When an engineer spins up a new VPS on DigitalOcean or AWS, they often wonder: *"Why did Cloudflare block this IP on its very first curl request?"*

```text
The Lifecycle of a Recycled Datacenter IP:
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Month 1: Spammer A      │     │ Month 2: Subnet Blacklist│     │ Month 3: Your New VPS   │
│ Sends 50,000 spam emails│ ──> │ Spamhaus & AbuseIPDB log│ ──> │ You provision IP;       │
│ or credential stuffing  │     │ subnet 192.0.2.0/24     │     │ Cloudflare blocks you!  │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

1. **Subnet Contamination:** Anti-bot systems do not score individual `/32` IPs in isolation. If neighboring addresses in your `/24` subnet engage in brute-force attacks, the entire subnet's reputation score is demoted.
2. **Missing Residential Signals:** Residential ISPs assign dynamic DHCP blocks to real homes that generate organic multi-device traffic: iPhone push notifications, Netflix streaming, Smart TV telemetry. A server emitting 1,000 requests per minute with zero background OS traffic stands out like a beacon.

---

## 3. The 3 Technical Signals Risk Engines Query

### 1. Reverse DNS (PTR Record) Lookups
A mail server or WAF performs a reverse DNS lookup (`dig -x IP`):
* `74.125.200.10` &rarr; `mail-wm1-f10.google.com` (Legitimate Google mail host)
* `198.51.100.22` &rarr; `NXDOMAIN` (No PTR record &rarr; Classic unconfigured cloud proxy)

### 2. TCP/IP Fingerprinting (p0f / MTU Matching)
Real Windows and macOS devices send specific TCP Window Sizes and Maximum Segment Sizes (MSS):
* **Desktop Windows 11:** `MTU 1500`, `TCP Window: 64240`
* **Linux Cloud Kernel:** `MTU 1500`, `TCP Window: 29200`

If your HTTP header claims to be Windows 11, but the underlying TCP SYN packet contains Linux kernel window flags, the IP is flagged for OS spoofing.

---

## Hands-On Terminal Toolkit

### 1. Query ASN and Network Owner via WHOIS
Run this in terminal to inspect any IP's Autonomous System Number and network boundary:

```bash
# Query the ASN of a target IP
whois -h whois.radb.net 1.1.1.1 | grep -E "origin|descr|route"
```

Expected output:
```text
route:      1.1.1.0/24
descr:      Cloudflare, Inc.
origin:     AS13335
```

### 2. Inspect Reverse DNS (PTR)
```bash
# Perform a reverse DNS lookup
dig +short -x 8.8.8.8
# Returns: dns.google.
```

### 3. Check Real-Time Threat Score via CLI
You can test your current public IP's threat score using open diagnostic APIs:

```bash
# Inspect your public IP and ISP metadata
curl -s https://ipinfo.io/json | grep -E "ip|org|city|region"
```
