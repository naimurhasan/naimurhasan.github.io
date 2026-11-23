---
layout: post
title: "Google vs. Google: Its Own AI Passes the Anti-AI Test for Pennies"
excerpt: "Google's own model clears Google's image captcha 83% of the time it is allowed to try, for a fraction of a cent. The pictures were never the hard part."
tags:
- web-scraping
- automation
- playwright
- nodejs
- web-data
categories:
- Web Scraping
author: Naimur Hasan
---

No human help. Green checkbox. A fraction of a cent.

![CaptchaLens solving a live reCAPTCHA v2 challenge end to end](/assets/images/blog/2026-11-23-recaptcha-solved.gif)

I put Google's own Gemini inside a Chrome extension. Then I pointed it at Google's live reCAPTCHA demo.

It passes the image test **83% of the time**.

## First, what this test is

**reCAPTCHA v2** is the "I'm not a robot" checkbox.

You tick it. Google then decides in the background if you look human. If it is not sure, it shows you a grid of photos. Pick every square with a bus, a traffic light, a tractor.

That grid is the test most people picture when they hear "captcha".

A **solver** is a program that reads that grid and picks the right squares. Mine is called CaptchaLens.

The surprise was not that it works. The surprise was where it fails.

**My solver almost never gets the pictures wrong. It gets stopped before the pictures arrive.**

More on that below, because it changes what you should work on.

---

## The picture problem is already solved

Here is a real 4x4 round. It asks for tractors.

Two models look at it. They come up all through this post, so here is who they are.

- **`jev-1.14`** does the image work. You give it a picture and a yes-or-no question. It gives you back a probability. <!-- TODO Naimur: one line on what jev actually is — your own model, a fine-tune, which base? Readers will ask. -->
- **`gemini-decision-1`** is Google's model. It answers the same way. It is also the only one of the two that can listen to the audio version of a challenge.

Neither model sees the grid as a whole. Both score **one square at a time**. Neither knows what the square next to it scored.

![A reCAPTCHA 4x4 image grid asking the user to select all squares with tractors](/assets/images/blog/2026-11-23-tractor-grid.png)

The tractor covers two squares. First number is jev. Second is Gemini.

| row | col 1 | col 2 | col 3 | col 4 |
|---|---|---|---|---|
| 1 | 0.01 / 0.13 | 0.01 / 0.18 | 0.02 / 0.14 | 0.02 / 0.15 |
| 2 | 0.02 / 0.17 | 0.04 / 0.17 | 0.06 / 0.19 | 0.04 / 0.16 |
| 3 | 0.14 / 0.23 | **0.98 / 0.81** | **0.87 / 0.82** | 0.36 / 0.22 |
| 4 | 0.02 / 0.21 | 0.06 / 0.20 | 0.04 / 0.20 | 0.04 / 0.13 |

Two squares picked. Verify pressed. Checkbox green. 26 seconds.

Look at the square scoring 0.36. That one holds a small part of the tractor. The model was right to leave it alone.

---

## I never ask the model to write a sentence

Most people use an AI by asking a question in English and reading an English answer back.

That is a bad fit here. A sentence has to be parsed. Models also add markdown, apologies and extra text you did not ask for.

So I use a **decisions API** instead. I declare the question. I declare the shape of the answer I will accept. I get a number back, not a sentence.

How one round works:

1. Take a screenshot of the challenge frame.
2. Ask one question per square: does any part of a tractor appear in row 3, column 2?
3. Tell the model that one object often covers several squares, so a small part still counts.
4. Pick every square above that model's cut-off.
5. Click them, press verify, read the result.

The answer comes back shaped:

```json
{
  "model": "google/gemini-decision-1",
  ...
  "answers": {
    "r3c2": { "type": "noul", "noul": 0.81, "confidence": 0.81 },
    "r3c3": { "type": "noul", "noul": 0.82, "confidence": 0.82 },
    "r3c4": { "type": "noul", "noul": 0.22, "confidence": 0.22 }
  },
  ...
}
```

`0.81` means the model thinks there is an 81% chance of a tractor in that square.

Nothing to parse. No markdown fences to strip. No retry because a model wrapped its JSON in an apology.

One small thing cost me a morning. Every question needs an `instructions` field. Leave it out and both models reject the call.

The same screenshot always gives the same numbers. That matters, and the next section shows why.

---

## How I decided what counts as a yes

Every square comes back as a number between 0 and 1.

At some point I must turn that into click or no click. So I need a **cut-off**, also called a threshold. Click everything above 0.5? Above 0.8?

Pick it too low and I click empty squares. Pick it too high and I miss half the tractor.

So I measured it. For each model I looked at two averages:

- the score it gives squares that **do** hold the object
- the score it gives squares that **do not**

| | jev-1.14 | gemini-decision-1 |
|---|---|---|
| Average score, squares with the object | 0.86 | 0.75 |
| Average score, empty squares | 0.08 | 0.23 |
| **Gap between the two** | **0.79** | **0.53** |
| Typical score on an empty square | 0.05 | 0.21 |

{% include chart.html type="grouped" title="How far apart yes and no sit" series="jev-1.14|gemini-decision-1" labels="Gap between yes and no|Typical empty square" values="0.79,0.53|0.05,0.21" scale="1" %}

**That gap is the whole story.**

A wide gap means the yes squares and the no squares sit far apart. Almost any cut-off between them works.

A narrow gap means they sit close together. Move the cut-off a little and you start clicking empty squares, or skipping real ones.

jev says no clearly: 0.08 on average. Gemini says no with a shrug: 0.23.

So a square at 0.4 means nothing from Gemini. The same 0.4 from jev would be unusual.

Each model gets its own bar. **0.45 for jev. 0.55 for Gemini.** Not taste. Just where the gap is.

I run both models and keep every square either one picks. Two reasons:

- **23% of the squares I click are picked by only one of the two models.** Drop either model and I lose real targets.
- On reading *what the challenge asks for*, the two agreed **100% of the time**. So the instruction is never the problem. Only the pictures are.

That makes the routing simple. Images go to jev. Audio goes to Gemini. Squares go to both.

---

## The one that broke everything: click in order

The image grid is the famous captcha. It is not the only one. This next type nearly stopped the project.

You get one photo with a few small objects in it. Above it sits a strip of thumbnails: `Select in this order`.

You must click the objects **in the order the thumbnails show**. That order has nothing to do with where they sit in the photo.

So there are two problems. Work out the order. Then click the right spot for each object.

![The ClickCaptcha demo passed, with ordered click markers on the bicycle, key and axe](/assets/images/blog/2026-11-23-clickcaptcha-result.png)

Look at the markers. 1 at the top. 2 at the bottom. 3 in the middle. The order came from the thumbnails, not from the layout.

Reading the order worked right away, at about 90% confidence.

**Clicking failed 100% of the time.**

My first idea was the obvious one. Ask a model where each object is: "give me the centre of the key, as a percentage across and a percentage down". Then turn those percentages into pixels and click.

Every part of that was wrong, in three ways:

1. **The box I measured was taller than the photo.** It secretly includes the instruction banner above it, which is 13% of the height. So "50% down" meant two different things to me and to the model.
2. **My screenshot had padding.** I added 60 pixels on every side. The frame I sent was 120 pixels too tall and too wide.
3. **The model used a different shape than the photo.** It works on a canvas of about 2:3. The real photo was 0.91 wide to tall.

The third one is the killer. Here is why.

The first two are fixed errors. Everything shifts by the same amount, so one offset fixes both.

The third is a stretch. The error is almost zero at the top of the photo. It grows as you go down.

| object | model said | truth | how far off |
|---|---|---|---|
| bicycle | y 30% | y 30% | 0% |
| axe | y 47% | y 59% | 12% |
| key | y 65% | y 91% | 26% |

{% include chart.html type="bars" title="How far off, by position in the photo" labels="bicycle, near top|axe, middle|key, near bottom" values="0|12|26" suffix="%" scale="30" %}

The bicycle sat near the top, so it landed. The key sat near the bottom and missed by 26% of the height.

No single offset fixes an error that grows.

I then tried a **box localizer**. That is a model that draws a box around a named object instead of returning one point.

It was honest about itself, which helped. It found the bicycle at 0.92 confidence. Then it returned 0.30 and 0.49 on the other two objects.

A model telling you it is lost beats a model guessing with confidence. But it still gave me no usable clicks.

---

## The fix: stop asking where, start asking whether

Here is the idea that saved it.

These models are bad at *"where is the key"*. They are very good at *"is the key in this square"*.

That second question is exactly what my image grid pipeline already did well.

So I stopped asking for a position. I turned it into a **grid search**:

1. Crop the banner off the top, so the photo I measure is the photo the model sees.
2. Make the photo bigger until it passes the API's minimum size.
3. Lay a 4x4 grid over it. Ask the easy question sixteen times: *is the key in this square?*
4. Take the winning square. Crop a window around it. Lay another 4x4 grid over **that** and ask again.
5. Average the strong squares from the second pass, weighted by confidence. That gives one point.

![CaptchaLens solving the ClickCaptcha demo with ordered clicks](/assets/images/blog/2026-11-23-clickcaptcha-solved.gif)

Two rounds of sixteen cheap yes-or-no questions. Instead of one expensive question that was never going to be accurate.

Every click now lands within about ten pixels. Since the fix it has passed **100% of attempts**, in 23 seconds, with barely a second and a half of spread.

> When a model is better at saying whether something is inside a region than at saying where it is, a grid search turns the weak skill into the strong one.

That lesson has nothing to do with captchas. Any time you need a model to point at something in a picture, try asking it a grid of yes-or-no questions instead.

---

## Most failures never reached the model

This part changed how I think about the whole problem.

When a run fails, I can put it in one of two buckets.

{% include chart.html type="split" title="What my failed runs were" labels="Google refused to show a challenge|Models missed the targets" values="70|30" suffix="%" %}

Read that carefully. **It is 70% of my failures, not 70% of my attempts.** Most runs pass.

The 70% cost nothing. No model was ever called. Google looked at my browser, decided it was not human, and never opened a challenge.

The 30% is the only part the AI could have got wrong.

Now split the pass rate by whether Google actually showed the test:

{% include chart.html type="bars" title="Pass rate, by whether the test was shown" labels="Challenge shown|Browser judged first" values="83|0" suffix="%" scale="100" highlight="Challenge shown" %}

**So the vision work is finished. The gate sits in front of it.**

That is the real result here, and it is worth saying plainly: a better model would not help me. You cannot answer a test you were never offered.

---

## What actually gets you past that gate

Before Google shows you any picture, it scores your browser.

It looks at how the browser reports its own version. The exact order of its **TLS handshake**, which is the greeting your browser sends before any encrypted request. Whether a mouse ever moved. How fast you arrived on the page.

That is **fingerprinting**. It all happens before a single photo is drawn.

A browser started by automation tools gives itself away in dozens of small ways. Plain automated Chromium gets flagged no matter how good its answers would have been.

What moved the number for me:

- **Run inside a real browser.** CaptchaLens is a Chrome extension. It lives in a normal browser with a real profile, real history and a real person moving the mouse. There is no automation flag to find, because there is no automation. **The 70% is a headless crawler problem. In extension mode the gate mostly disappears.**
- **Use patchright if you must automate.** It is a fork of **Playwright**, the browser automation library, and it patches the obvious tells. This is what moved my own rate into usable territory.
- **Keep the profile warm.** A browser with history, cookies and some age looks less suspicious than a fresh one on every run.
- **Stay headful.** A **headless** browser runs with no visible window, which is easy to spot.
- **Move before you click.** Real pointer movement and a short pause read very differently from an instant click.
- **Mind your IP.** **Datacentre** ranges carry a bad reputation before you send a single request. **Residential** addresses, the kind a home connection uses, do not.

None of this is about pictures. That is the point.

> The test is no longer about whether you can see. It is about whether your browser looks bored enough.

---

## What it costs

You would struggle to spend a dollar here.

{% include chart.html type="bars" title="Price per 1000 solves" labels="2Captcha|Anti-Captcha|CaptchaLens, all in|CapSolver|CaptchaLens, per solve" values="2.99|2.00|1.56|0.80|0.52" unit="$" highlight="CaptchaLens, all in" note="Service prices from public rate cards. CaptchaLens figures are my own token costs. The all-in number includes attempts that failed." %}

$1.56 is the honest number, because it counts the failed attempts too.

That is level with the cheapest human tiers. It is also about twice CapSolver's list price.

So I am not the cheapest. Services are still faster. Human farms are still more consistent, because a person is never refused the test for having the wrong TLS fingerprint.

Price is not the win. The win is this: no account, no deposit, no screenshot leaving the machine, a probability on every decision, and no extra cost per solve against a local model.

---

## What to watch out for

Two honest limits.

The ordered-click demo serves one fixed photo. So that 100% shows my pipeline is reliable. It does not show that it generalises.

The order reading still works from a fixed set of orders, not by naming objects freely.

And the main lesson, if you run crawlers: stop treating captchas as a vision problem.

The image grid is close to solved and costs almost nothing. Your blocks come from the browser score, not the pictures.

Spend your time on how your browser presents itself. Not on reading traffic lights faster.

That is also why CaptchaLens ships as a detector, with no automatic bypass. Knowing which vendor gated your test run, and why, is what makes a CI failure debuggable.

Code, handlers and the end-to-end tests are on [the CaptchaLens repository](https://github.com/naimurhasan/CaptchaLens) under MIT. Geetest, Arkose and DataDome have no handler yet. Each one is a single file.
