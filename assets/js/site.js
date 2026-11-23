/* Four independent features, each a no-op when its markup is absent.
   No storage of any kind, so the site needs no consent banner. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverable = window.matchMedia("(hover: hover)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function copyEmail(btn, email, label) {
    function fallback() { btn.textContent = email; btn.classList.add("done"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () {
        btn.textContent = (label || "Copied") + " — " + email;
        btn.classList.add("done");
      }).catch(fallback);
    } else { fallback(); }
  }

  /* ========================= hero: parallax depth ========================= */

  function hero() {
    var stage = $("#heroStage");
    if (!stage || reduce) return;

    var arch = $("#heroArch", stage);
    var slab = $("#heroSlab", stage);

    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      arch.style.transform =
        "translate3d(" + (x * -22).toFixed(1) + "px," + (y * -14).toFixed(1) + "px,0)" +
        " rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg)";
      slab.style.transform =
        "translate3d(" + (x * 14).toFixed(1) + "px," + (y * 9).toFixed(1) + "px,0)";
    });

    stage.addEventListener("pointerleave", function () {
      arch.style.transform = "";
      slab.style.transform = "";
    });
  }

  /* ========================= the crawler ========================= */

  function crawler() {
    var rail = $("#rail");
    if (!rail) return;

    var hit = $("#crawlHit", rail);
    var rope = $("#crawlRope", rail);
    var panicEl = $("#crawlPanic", rail);
    var strand = $("#crawlStrand", rail);
    var spill = $("#crawlSpill", rail);
    var heartsEl = $("#crawlHearts", rail);
    var trail = $("#crawlTrail", rail);
    var says = $("#crawlSays", rail);
    var pct = $("#crawlPct", rail);
    var panel = $("#crawlPanel", rail);
    var panelTitle = $("#crawlPanelTitle", rail);
    var panelMsg = $("#crawlPanelMsg", rail);
    var petCount = $("#crawlPets", rail);
    var acts = $("#crawlActs", rail);
    var copyBtn = $("#crawlCopy", rail);
    var coffeeBtn = $("#crawlCoffee", rail);
    var closex = $("#crawlClose", rail);
    var EMAIL = rail.dataset.email;

    var PAGES = [
      { url: "search/?q=residential+proxy",
        html: '<div class="q"><span>residential proxy providers</span></div>' +
              '<div class="lnk">Top 10 Residential Proxy Providers</div>' +
              '<div class="green">naimurhasan.github.io › blog</div>' +
              '<div class="ln" style="width:92%"></div><div class="ln" style="width:70%"></div>' +
              '<div class="lnk" style="margin-top:3px">Rotating vs sticky sessions</div>' +
              '<div class="ln" style="width:84%"></div>' },
      { url: "news.daily/tech/scraping",
        html: '<div class="thumb"></div>' +
              '<div class="h">Firms turn to automated data collection</div>' +
              '<div class="ln" style="width:100%"></div><div class="ln" style="width:94%"></div>' +
              '<div class="ln" style="width:76%"></div>' },
      { url: "shop.market/p/4821-B",
        html: '<div class="row"><div class="thumb"></div><div>' +
              '<div class="h" style="margin-bottom:2px">Wireless Earbuds Pro</div>' +
              '<div class="price">$18.40</div><div class="green">in stock · 37</div></div></div>' +
              '<div class="ln" style="width:88%"></div><div class="ln" style="width:62%"></div>' },
      { url: "forum.dev/t/rate-limits/12",
        html: '<div class="h">Getting 429 after 200 requests?</div>' +
              '<div class="row" style="margin-bottom:3px"><div class="thumb" style="width:10px;height:10px;border-radius:50%"></div>' +
              '<div><div class="ln" style="width:100%"></div><div class="ln" style="width:72%"></div></div></div>' +
              '<div class="row"><div class="thumb" style="width:10px;height:10px;border-radius:50%"></div>' +
              '<div><div class="ln" style="width:92%"></div><div class="ln" style="width:58%"></div></div></div>' }
    ];

    var LINES = [
      "oi. i'm working here.",
      "dropped my haul, thanks.",
      "429 — slow down, you.",
      "three hours of crawling. gone.",
      "found 1 human. depth: 1.",
      "that was the good data.",
      "i've read this whole page. twice."
    ];

    var PETS = [
      { t: "thank you", m: "First pet of my career. Nobody pets the crawler. Two things I can do for you:" },
      { t: "thank you again", m: "Two pets. I am <em>legally</em> your spider now. Still only two tricks:" },
      { t: "ok this is a lot", m: "Three pets and <strong>zero</strong> job offers. Reading the room, I'd say:" },
      { t: "we're friends now", m: "You have petted me more than my own developer has. He is <em>right there</em>:" }
    ];

    var COFFEE = [
      { t: "coffee declined", m: "Thank you, but keep your money. <strong>Hire Naimur for a paid project</strong> instead. Then he can buy his own coffee — and one for me." },
      { t: "402 payment required", m: "The tip jar is not plugged in. <strong>Send him paid work</strong> instead — that buys a lot more coffee than you just tried to." },
      { t: "order received", m: "Your coffee is waiting behind <strong>0 projects</strong>. Give him some paid work and we can fix that today." }
    ];

    var spoken = -1, pageAt = Math.floor(Math.random() * PAGES.length);
    var pets = 0, coffeeSeen = 0;
    var lastY = window.scrollY, facing = 1, walkTimer = null, sayTimer = null, climbTimer = null;

    function nextLine() {
      spoken = (spoken + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length;
      return LINES[spoken];
    }

    function place() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var top = 46 + p * (window.innerHeight - 120);
      hit.style.top = top + "px";
      hit.style.rotate = facing > 0 ? "0deg" : "180deg";
      trail.style.height = top + "px";
      strand.style.top = top + "px";
      spill.style.top = top + "px";
      heartsEl.style.top = top + "px";
      says.style.top = (top + 26) + "px";
      panel.style.top = Math.min(Math.max(top, 100), window.innerHeight - 130) + "px";
      pct.style.top = top + "px";
      pct.textContent = Math.round(p * 100) + "%";
    }

    function dropHaul(count) {
      for (var i = 0; i < count; i++) {
        setTimeout(function () {
          var p = PAGES[pageAt++ % PAGES.length];
          var el = document.createElement("span");
          el.className = "sheet";
          el.innerHTML = '<span class="bar"><span class="dot"></span><span class="url">' + p.url + "</span></span>" +
                         '<span class="page">' + p.html + "</span>";
          var dur = 1900 + Math.random() * 900;
          el.style.setProperty("--dx", (16 + Math.random() * 70).toFixed(0) + "px");
          el.style.setProperty("--dy", (120 + Math.random() * 150).toFixed(0) + "px");
          el.style.setProperty("--rot", (Math.random() * 46 - 12).toFixed(0) + "deg");
          el.style.setProperty("--dur", dur + "ms");
          spill.appendChild(el);
          setTimeout(function () { el.remove(); }, dur + 80);
        }, i * 150);
      }
    }

    function dropHearts(count) {
      for (var i = 0; i < count; i++) {
        setTimeout(function () {
          var el = document.createElement("span");
          el.className = "heart";
          el.textContent = "♥";
          var dur = 950 + Math.random() * 500;
          el.style.setProperty("--dx", (Math.random() * 30 - 6).toFixed(0) + "px");
          el.style.setProperty("--dy", (-34 - Math.random() * 26).toFixed(0) + "px");
          el.style.setProperty("--dur", dur + "ms");
          heartsEl.appendChild(el);
          setTimeout(function () { el.remove(); }, dur + 60);
        }, i * 110);
      }
    }

    function speak(line, hint) {
      says.innerHTML = "";
      var a = document.createElement("span");
      a.className = "l1";
      a.textContent = line;
      says.appendChild(a);
      if (hint) {
        var b = document.createElement("span");
        b.className = "hint";
        b.textContent = hint;
        says.appendChild(b);
      }
    }

    function freak() {
      if (panel.classList.contains("on") || hit.classList.contains("freaking")) return;
      clearTimeout(climbTimer);
      hit.classList.remove("walking", "climbing", "petted");
      rope.getAnimations().forEach(function (a) { a.cancel(); });
      void hit.offsetWidth;
      hit.classList.add("freaking");
      strand.style.height = "26px";
      dropHaul(pets > 0 ? 3 : 4);
      speak(nextLine(), pets > 0 ? "click to pet me" : "click to pet me · or back away slowly");
      clearTimeout(sayTimer);
      /* held back until the dropped pages have landed, so it reads as the punchline */
      sayTimer = setTimeout(function () { says.classList.add("on"); }, 1250);
    }

    function climbBack() {
      clearTimeout(sayTimer);
      says.classList.remove("on");
      hit.classList.remove("freaking");
      strand.style.height = "0px";
      hit.classList.add("climbing");
      climbTimer = setTimeout(function () { hit.classList.remove("climbing"); }, 460);
    }

    function resetActs() {
      acts.innerHTML = "";
      copyBtn.textContent = "Copy his email";
      copyBtn.classList.remove("done");
      acts.appendChild(copyBtn);
      acts.appendChild(coffeeBtn);
    }

    function pet() {
      pets++;
      hit.classList.add("met");
      climbBack();
      hit.classList.remove("petted");
      panicEl.getAnimations().forEach(function (a) { a.cancel(); });
      void hit.offsetWidth;
      hit.classList.add("petted");
      dropHearts(pets > 2 ? 4 : 3);
      setTimeout(function () { hit.classList.remove("petted"); }, 760);

      var p = PETS[Math.min(pets, PETS.length) - 1];
      panelTitle.textContent = p.t;
      panelMsg.innerHTML = p.m;
      petCount.textContent = "pets: " + pets;
      resetActs();
      panel.classList.add("on");
      hit.setAttribute("aria-expanded", "true");
      place();
    }

    function closePanel() {
      panel.classList.remove("on");
      hit.setAttribute("aria-expanded", "false");
    }

    window.addEventListener("scroll", function () {
      facing = window.scrollY >= lastY ? 1 : -1;
      lastY = window.scrollY;
      place();
      if (reduce || hit.classList.contains("freaking")) return;
      hit.classList.add("walking");
      clearTimeout(walkTimer);
      walkTimer = setTimeout(function () { hit.classList.remove("walking"); }, 180);
    }, { passive: true });

    window.addEventListener("resize", place);

    if (hoverable && !reduce) {
      hit.addEventListener("pointerenter", freak);
      hit.addEventListener("pointerleave", climbBack);
      hit.addEventListener("focus", freak);
      hit.addEventListener("blur", climbBack);
    }

    hit.addEventListener("click", function () {
      panel.classList.contains("on") ? closePanel() : pet();
    });
    closex.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("on")) closePanel();
    });

    copyBtn.addEventListener("click", function () { copyEmail(copyBtn, EMAIL); });

    coffeeBtn.addEventListener("click", function () {
      var c = COFFEE[coffeeSeen % COFFEE.length];
      coffeeSeen++;
      panelTitle.textContent = c.t;
      panelMsg.innerHTML = c.m;
      acts.innerHTML = "";
      var mail = document.createElement("a");
      mail.href = "mailto:" + EMAIL + "?subject=Project%20enquiry";
      mail.textContent = "Hire him for a project →";
      var copy2 = document.createElement("button");
      copy2.type = "button";
      copy2.textContent = "Copy his email";
      copy2.addEventListener("click", function () { copyEmail(copy2, EMAIL); });
      acts.appendChild(mail);
      acts.appendChild(copy2);
    });

    place();
  }

  /* ========================= work: pills + expand ========================= */

  function workFilter() {
    var root = $("#work");
    if (!root) return;

    var pillsEl = $("#workPills", root);
    var items = $$("li", $("#workList", root));
    var moreEl = $("#workMore", root);
    var emptyEl = $("#workEmpty", root);
    var CAP = parseInt(root.dataset.cap || "6", 10);
    var active = "all";
    var expanded = false;

    function render() {
      var shown = 0, matched = 0;
      items.forEach(function (li) {
        var tags = (li.dataset.tags || "").split(" ");
        if (active !== "all" && tags.indexOf(active) < 0) { li.hidden = true; return; }
        matched++;
        var visible = expanded || shown < CAP;
        li.hidden = !visible;
        if (visible) shown++;
      });
      if (emptyEl) emptyEl.hidden = matched > 0;
      if (matched > CAP) {
        moreEl.hidden = false;
        moreEl.textContent = expanded ? "Show fewer ↑" : "Show all " + matched + " →";
      } else {
        moreEl.hidden = true;
      }
    }

    $$(".pill", pillsEl).forEach(function (b) {
      b.addEventListener("click", function () {
        active = active === b.dataset.tag ? "all" : b.dataset.tag;
        expanded = false;
        $$(".pill", pillsEl).forEach(function (o) {
          o.setAttribute("aria-pressed", o.dataset.tag === active ? "true" : "false");
        });
        render();
      });
    });

    moreEl.addEventListener("click", function () {
      expanded = !expanded;
      render();
      if (!expanded) moreEl.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    });

    render();
  }

  /* ========================= blog: search + tags ========================= */

  function blogIndex() {
    var root = $("#blogIndex");
    if (!root) return;

    var qEl = $("#blogQ", root);
    var clearEl = $("#blogClear", root);
    var pillsEl = $("#blogPills", root);
    var statusEl = $("#blogStatus", root);
    var emptyEl = $("#blogEmpty", root);
    var emptyQEl = $("#blogEmptyQ", root);
    var items = $$("li", root).filter(function (li) { return li.dataset.tags !== undefined; });

    var active = "all";
    var query = "";

    function render() {
      var matched = 0;
      items.forEach(function (li) {
        var tags = (li.dataset.tags || "").split(" ");
        var ok = active === "all" || tags.indexOf(active) > -1;
        if (ok && query) ok = (li.dataset.search || "").indexOf(query) > -1;
        li.hidden = !ok;
        if (ok) matched++;
      });

      /* a year heading with nothing left under it should go too */
      $$(".year-group", root).forEach(function (g) {
        var any = $$("li", g).some(function (li) { return !li.hidden; });
        g.hidden = !any;
      });

      statusEl.textContent =
        (matched === 1 ? "1 post" : matched + " posts") +
        (active !== "all" ? " tagged " + active : "") +
        (query ? ' matching "' + query + '"' : "");

      emptyEl.hidden = matched > 0;
      emptyQEl.textContent = query ? '"' + query + '"' : "those filters";
    }

    $$(".pill", pillsEl).forEach(function (b) {
      b.addEventListener("click", function () {
        active = active === b.dataset.tag ? "all" : b.dataset.tag;
        $$(".pill", pillsEl).forEach(function (o) {
          o.setAttribute("aria-pressed", o.dataset.tag === active ? "true" : "false");
        });
        render();
      });
    });

    qEl.addEventListener("input", function () {
      query = qEl.value.trim().toLowerCase();
      clearEl.hidden = !qEl.value;
      render();
    });

    clearEl.addEventListener("click", function () {
      qEl.value = ""; query = ""; clearEl.hidden = true; render(); qEl.focus();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== qEl) { e.preventDefault(); qEl.focus(); }
      else if (e.key === "Escape" && document.activeElement === qEl) { clearEl.click(); }
    });

    render();
  }

  /* ========================= contact: copy address ========================= */

  function contactCopy() {
    $$("[data-copy-email]").forEach(function (btn) {
      btn.addEventListener("click", function () { copyEmail(btn, btn.dataset.copyEmail, "Copied"); });
    });
  }

  /* ========================= comments on demand ========================= */

  function comments() {
    var btn = $("#loadComments");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var shortname = btn.dataset.disqus;
      var identifier = btn.dataset.identifier;
      var url = btn.dataset.url;
      window.disqus_config = function () {
        this.page.identifier = identifier;
        this.page.url = url;
      };
      var s = document.createElement("script");
      s.src = "https://" + shortname + ".disqus.com/embed.js";
      s.setAttribute("data-timestamp", String(+new Date()));
      document.head.appendChild(s);
      btn.remove();
    });
  }

  /* ========================= external links ========================= */

  /* ========================= day / night ========================= */

  function themeToggle() {
    var btn = $("#themeToggle");
    if (!btn) return;
    var root = document.documentElement;

    btn.addEventListener("click", function () {
      /* day is the default and nothing is stored, so every new page starts light */
      var dark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", dark ? "light" : "dark");
      btn.setAttribute("aria-label", dark ? "Switch to night" : "Switch to day");
    });
  }

  function externalLinks() {
    $$('a[href^="http"]').forEach(function (a) {
      if (a.hostname === window.location.hostname) return;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
  }

  hero();
  crawler();
  workFilter();
  blogIndex();
  contactCopy();
  comments();
  externalLinks();
  themeToggle();
})();
