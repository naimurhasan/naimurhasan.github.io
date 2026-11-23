---
layout: project
title: "ReplyMitro"
permalink: /work/replymitro/
status: "Private source"
years: "2026"
stack: "Node.js, Postgres + pgvector, Redis, Docker"
standfirst: "A multi-tenant AI support bot for Facebook Pages. It answers in Bangla from a knowledge base, quotes live prices through a tool call, and hands anything it should not answer to a human on Telegram."
sitemap: true
---

The source for this one is private, so here is the write-up instead.

## The problem

A Facebook Page selling an app gets the same questions all day. What does it cost. Does it work offline. Is there an iPhone version. Most arrive in Bangla, many in Banglish, a few in English.

A human answering those is expensive and slow at night. A plain chatbot is worse, because it invents prices.

## What it does

- Receives Messenger webhooks and replies with AI answers. **Bangla by default**, with English and Banglish handled in the same thread.
- Answers from a Bangla knowledge base rather than from the model's memory, and nudges app downloads where it fits naturally.
- Fetches the **current price from the client's own price API** at the moment of asking, as a tool call. The model never states a price from memory.
- Escalates anything out of scope or urgent to a Telegram admin group, and logs it in Postgres so nothing is lost in a chat window.
- Stays up under a flood: instant HTTP 200 on the webhook, message dedupe, stale message drop, and one reply per user to their latest message only.

## How it is built

| Piece | Job |
|---|---|
| Node.js + Express | The service itself, Dockerized |
| Postgres + pgvector | Knowledge embeddings, few-shot examples, editable config, escalation log |
| Redis | Conversation history, dedupe, rate limiting |
| Telegram bot | Send-only channel for human escalation |
| LLM layer | Provider-agnostic: Gemini Flash, GPT-4o-mini or Claude Haiku |

Retrieval runs in two modes. The default injects the knowledge directly and needs no embedding model at all. Switch to vector mode and it embeds chunks with Jina, OpenAI or Gemini, with the dimension kept in sync across the config, the schema and the model.

## Multi-tenant from the start

One shared Meta app serves every tenant. Each tenant connects its own Page through a Facebook Login popup, so **nobody copies page tokens by hand** — which is where this kind of integration usually breaks.

A super admin creates tenants. Each tenant edits its own system prompt, few-shot pairs and knowledge chunks from an admin panel, with backup and restore as a JSON bundle. Rate limits are per tenant API key.

## What I would tell you before you build one

The price tool call is the whole trick. Everything else about this bot is replaceable, but a support bot that guesses a number will eventually quote a price that does not exist, and that is a refund conversation rather than a sale.

The second thing is the escalation path. A bot that cannot say "I am getting a person" is not finished. Knowing which questions it handed over is also the best list of what to add to the knowledge base next.

Happy to talk through the architecture if you are building something similar.
