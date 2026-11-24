---
layout: post
title: "Dockerizing Chromium: What Changes Inside a Container?"
excerpt: "Running Chromium in Docker seems simple until tabs crash with out-of-memory errors on a machine with 32GB of free RAM. Here is the engineering breakdown of /dev/shm shared memory, seccomp sandbox jails, dumb-init PID 1 reaping, and how to build a production container."
tags:
- docker
- chromium
- devops
- linux
- puppeteer
- playwright
categories:
- DevOps
- Chromium
author: Naimur Hasan
mermaid: false
header:
  image: "assets/images/blog/dockerizing-chromium-hero.jpg"
  teaser: "assets/images/blog/dockerizing-chromium-hero.jpg"
  og_image: "assets/images/blog/dockerizing-chromium-hero.jpg"
---

<div class="spec-badge-bar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
  <span class="badge" style="background: #24292e; color: #58a6ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Platform: Linux / Docker OCI</span>
  <span class="badge" style="background: #24292e; color: #7ee787; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Shared Memory: /dev/shm</span>
  <span class="badge" style="background: #24292e; color: #ffa657; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Process Init: dumb-init (PID 1)</span>
  <span class="badge" style="background: #24292e; color: #d2a8ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #30363d;">Security: seccomp-bpf & User Namespaces</span>
</div>

> #### ⚡ 30-Second Field Reference
> * **The 64MB Crash Trap:** Docker defaults `/dev/shm` to a tiny 64MB partition. Chromium uses `/dev/shm` for renderer-to-compositor shared memory. Loading a complex website exhausts 64MB and crashes tabs with `SIGSEGV` or `Target closed`.
> * **The Fix:** Mount a larger shared memory volume: `--shm-size=1gb` or pass `--disable-dev-shm-usage` to fall back to disk memory.
> * **The Zombie Process Apocalypse:** Chromium spawns dozens of helper processes. Without a real init system (`PID 1`), orphaned zombie processes accumulate until the container's PID limit is exhausted. Always run `dumb-init` or Docker's `--init` flag.
> * **Never Use `--no-sandbox` in Production:** Disabling the sandbox strips away process isolation, allowing any malicious JavaScript zero-day on a crawled website to take over the container.

---

## 1. The Two Fatal Docker Traps

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   THE TWO CONTAINER FATAL TRAPS                        │
├───────────────────────────────────┬────────────────────────────────────┤
│ TRAP 1: 64MB /dev/shm EXHAUSTION  │ TRAP 2: ZOMBIE PROCESS ACCUMULATION│
│ Default Docker shm is 64MB.       │ Docker starts node/python as PID 1.│
│ Renderers crash with out-of-memory│ Orphaned renderers are never reaped│
│ even with 64GB of host RAM free!  │ Container hits max PID and dies.   │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Trap 1: Why `/dev/shm` Crashes Chromium Tabs
Chromium's multi-process architecture does not serialize pixel buffers over network sockets or pipes. The renderer process writes raw uncompressed bitmap frames directly into a shared RAM partition: `/dev/shm`.

* A single 1920x1080 32-bit frame buffer consumes **8.3 megabytes** of RAM.
* Multiple tabs, render layers, and CSS animations exhaust Docker's default 64MB `/dev/shm` partition in seconds.
* When `/dev/shm` runs out of space, Chromium cannot allocate the next frame buffer and crashes immediately with `Target.detachedFromTarget`.

**The Solution:**
```bash
# Option A: Expand shared memory size in Docker run
docker run --shm-size=1gb my-crawler-image

# Option B: In docker-compose.yml
services:
  crawler:
    shm_size: '1gb'
```

---

## 2. Production Dockerfile: The Bulletproof Blueprint

Here is a hardened, production-tested Dockerfile for running Chromium scrapers without root privileges or memory crashes:

```dockerfile
FROM node:20-bookworm-slim

# Install Chromium, fonts, and dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    dumb-init \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium

# Run as non-root user for security
USER node
WORKDIR /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

# dumb-init reaps zombie processes as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "crawler.js"]
```

---

## 3. Production Launch Flags Cheat Sheet

When initializing Chromium inside your scraper script, use these production-tested flags:

```javascript
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  args: [
    '--disable-dev-shm-usage',          // Fallback if --shm-size cannot be configured
    '--disable-gpu',                     // Disable GPU hardware acceleration in headless Linux
    '--no-first-run',                    // Skip welcome and sync screens
    '--no-default-browser-check',        // Skip default browser check
    '--disable-background-networking',   // Disable Google telemetry & updates
    '--disable-features=IsolateOrigins,site-per-process' // Optimize RAM for scrapers
  ]
});
```

---

## Hands-On Terminal Toolkit

### 1. Test Shared Memory Allocation in a Running Container
Inspect the real size of `/dev/shm` inside your container:

```bash
# Check shared memory mount size
docker run --rm --shm-size=1gb alpine df -h /dev/shm
```

Expected output:
```text
Filesystem                Size      Used Available Use% Mounted on
shm                       1.0G         0      1.0G   0% /dev/shm
```

### 2. Verify Zombie Process Reaping with dumb-init
Run your container and check process IDs:

```bash
# Ensure dumb-init is running as PID 1
docker exec -it <container_id> ps -ef
```

You should see:
```text
UID   PID  PPID  C STIME TTY      TIME CMD
node    1     0  0 12:00 ?    00:00:00 /usr/bin/dumb-init -- node crawler.js
node    7     1  0 12:00 ?    00:00:01 node crawler.js
node   18     7  2 12:00 ?    00:00:05 /usr/bin/chromium ...
```
When a tab closes, `dumb-init` immediately receives the `SIGCHLD` signal and reaps the dead process.
