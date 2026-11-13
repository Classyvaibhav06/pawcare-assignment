#!/usr/bin/env python3
"""
carousel_pipeline.py — Idea → research → structure → copy → design spec → render → export.

Stages map 1:1 to the founder workflow in the brief. Each LLM stage returns strict JSON so the
next stage (or an n8n/Make node in production) can consume it without parsing prose.

Usage:  python3 carousel_pipeline.py "raw idea text" [--brand brand.json] [--out ./out]
Outputs: out/carousel.json (editable source of truth), out/slides/*.png (1080x1350), out/carousel.pdf
"""
import json, os, re, sys, time, argparse, pathlib, urllib.request, html

API = os.environ.get("LLM_BASE", "http://127.0.0.1:20128/v1") + "/chat/completions"
KEY = os.environ.get("LLM_KEY") or open("/tmp/.9k").read().strip()
MODEL = os.environ.get("LLM_MODEL", "ag/gemini-3-flash")

def llm(system, user, temp=0.6):
    body = json.dumps({"model": MODEL, "stream": False, "temperature": temp,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(API, body, {"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
            raw = urllib.request.urlopen(req, timeout=120).read().decode()
            if raw.startswith("data:"):  # some routes stream regardless
                txt = "".join(json.loads(l[5:]).get("choices", [{}])[0].get("delta", {}).get("content") or ""
                              for l in raw.splitlines() if l.startswith("data:") and l[5:].strip() not in ("", "[DONE]"))
            else:
                txt = json.loads(raw)["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", txt, re.S)
            return json.loads(m.group(0))
        except Exception as e:
            print(f"  ! retry {attempt+1}: {e}", file=sys.stderr); time.sleep(3)
    raise SystemExit("LLM stage failed")

def stage(name, fn):
    t = time.time(); print(f"▸ {name}…", flush=True); r = fn(); print(f"  ✓ {name} ({time.time()-t:.1f}s)"); return r

def run(idea, brand, out):
    out = pathlib.Path(out); (out / "slides").mkdir(parents=True, exist_ok=True)
    log = {"idea": idea, "model": MODEL, "brand": brand}

    # 1. Research — angle, audience pain, credible facts (flagged if they need a citation)
    log["research"] = stage("1/5 research", lambda: llm(
        "You are a content strategist for an Indian founder. Return ONLY JSON.",
        f"""Raw idea: "{idea}"
Audience: {brand['audience']}. Platforms: Instagram + LinkedIn carousel.
Return JSON: {{"audience_pain": str, "angle": str, "key_points": [str x6], "facts": [{{"claim": str, "needs_citation": bool}}] (max 3, only widely-known, no invented numbers), "cta_goal": str}}"""))

    # 2. Structure + 3. Copy — hook, slide-by-slide copy with hard character limits
    log["copy"] = stage("2/5 structure + copy", lambda: llm(
        "You write scroll-stopping, plain-English carousel copy. No emojis, no hashtags in slides, no clichés like 'game-changer' or 'unlock'. Return ONLY JSON.",
        f"""Research: {json.dumps(log['research'])}
Brand voice: {brand['voice']}
Write a 7-slide carousel. Slide 1 = hook, slides 2-6 = one idea each, slide 7 = CTA ({brand['cta']}).
Return JSON: {{"hook_options": [str x3], "slides": [{{"n": int, "kicker": str (<=24 chars), "headline": str (<=48 chars), "body": str (<=150 chars), "visual": str (one concrete visual idea)}}], "caption_linkedin": str (<=900 chars), "caption_instagram": str (<=400 chars, end with 5 hashtags)}}"""))

    # 4. Visual direction — layout template per slide from a fixed brand system (keeps output on-brand)
    log["design"] = stage("3/5 visual direction", lambda: llm(
        "You are an art director. Choose layouts ONLY from the allowed list. Return ONLY JSON.",
        f"""Slides: {json.dumps(log['copy']['slides'])}
Allowed layouts: "cover" (big hook, slide 1 only), "statement" (headline + body), "list" (headline + 3 short bullets), "contrast" (before/after columns), "prompt" (headline + an example prompt shown as a chat bubble), "cta" (last slide only).
RULES: slide 1 = cover, last = cta. Middle slides MUST mix layouts: at least one list, one contrast, one prompt; no two adjacent slides share a layout.
Return JSON: {{"slides": [{{"n": int, "layout": str, "accent_word": str (one word from headline to highlight), "bullets": [str] (list only, 3 items, each <=38 chars), "before": str, "after": str (contrast only, each <=70 chars), "prompt": str (prompt only: the exact prompt a student would type, <=140 chars), "reply": str (prompt only: 1-line gist of the AI reply, <=80 chars)}}]}}"""))

    merged = []
    d = {s["n"]: s for s in log["design"]["slides"]}
    for s in log["copy"]["slides"]:
        merged.append({**s, **d.get(s["n"], {"layout": "statement"})})
    # guardrail: LLMs ignore layout rules sometimes — enforce cover/cta + variety deterministically
    merged[0]["layout"], merged[-1]["layout"] = "cover", "cta"
    rot = ["list", "contrast", "prompt", "statement"]
    for i in range(1, len(merged) - 1):
        L = merged[i].get("layout")
        if L in ("cover", "cta") or L == merged[i-1]["layout"] or (L == "list" and not merged[i].get("bullets")) \
           or (L == "contrast" and not merged[i].get("after")) or (L == "prompt" and not merged[i].get("prompt")):
            merged[i]["layout"] = next((r for r in rot if r != merged[i-1]["layout"] and (r == "statement" or merged[i].get({"list":"bullets","contrast":"after","prompt":"prompt"}[r]))), "statement")
        merged[i]["tip"] = f"{i:02d}/{len(merged)-2:02d}"
    log["slides"] = merged
    (out / "carousel.json").write_text(json.dumps(log, indent=2, ensure_ascii=False))
    print("  ✓ 4/5 editable source → carousel.json")

    # 5. Render — deterministic HTML template → PNG + PDF (Canva/Figma API swap-in in production)
    stage("5/5 render PNG + PDF", lambda: render(log, brand, out))
    return log

def smart(t):
    t = re.sub(r"(^|[\s(\[])'", "\\1\u2018", str(t)); t = t.replace("'", "\u2019")
    t = re.sub(r'(^|[\s(\[])"', "\\1\u201c", t); return t.replace('"', "\u201d")
def esc(s): return html.escape(smart(s or ""), quote=False)

def accent(text, word):
    t = esc(text)
    if word and word.lower() in text.lower():
        i = text.lower().index(word.lower()); w = text[i:i+len(word)]
        t = t.replace(esc(w), f'<em>{esc(w)}</em>', 1)
    return t

def slide_html(s, total, brand):
    L = s.get("layout", "statement"); n = s["n"]
    head = accent(s.get("headline", ""), s.get("accent_word", ""))
    if L == "cover":
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1 class="xl">{head}</h1><p class="body">{esc(s.get("body"))}</p><div class="swipe">swipe →</div>'
    elif L == "list":
        bl = "".join(f'<li><span>{i+1:02d}</span>{esc(b)}</li>' for i, b in enumerate(s.get("bullets") or [s.get("body")]))
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1>{head}</h1><ul>{bl}</ul>'
    elif L == "contrast":
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1>{head}</h1><div class="vs"><div><b>Before</b><p>{esc(s.get("before"))}</p></div><div class="aft"><b>After</b><p>{esc(s.get("after"))}</p></div></div>'
    elif L == "prompt":
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1>{head}</h1><div class="chat"><div class="me"><b>you</b>{esc(s.get("prompt"))}</div><div class="ai"><b>ai</b>{esc(s.get("reply"))}</div></div>'
    elif L == "cta":
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1 class="xl">{head}</h1><p class="body">{esc(s.get("body"))}</p><div class="btn">{esc(brand["cta"])} →</div>'
    else:
        inner = f'<div class="kick">{esc(s.get("kicker"))}</div><h1>{head}</h1><p class="body">{esc(s.get("body"))}</p>'
    return f'''<section class="slide {L}"><div class="top"><span class="mark">{esc(brand["mark"])}</span><span>{esc(brand["handle"])}</span><span class="pg">{n:02d}/{total:02d}</span></div>
<div class="content">{('<div class="tip">tip ' + s["tip"] + '</div>') if s.get("tip") else ''}{inner}</div>
<div class="bar"><i style="width:{n/total*100:.1f}%"></i></div></section>'''

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@500;600&family=Caveat:wght@700&display=swap');
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px;overflow:hidden;background:#100e0e}
.slide{width:1080px;height:1350px;background:#100e0e;color:#fff;font-family:Geist,system-ui,sans-serif;position:relative;padding:92px 96px 140px;overflow:hidden;display:flex;flex-direction:column;
 background-image:linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px);background-size:54px 54px}
.slide::after{content:'';position:absolute;inset:30px;border:2px dashed #ffffff22;border-radius:40px;pointer-events:none}
.top{display:flex;align-items:center;gap:20px;font-family:'Geist Mono';font-size:32px;color:#d4d4d4;position:relative;z-index:2}
.mark{width:72px;height:72px;border-radius:20px;background:#fcd34d;color:#171717;display:grid;place-items:center;font-weight:800;font-size:28px;font-family:'Geist Mono'}
.pg{margin-left:auto;color:#a3a3a3}
.ghost{position:absolute;right:56px;bottom:96px;font-size:420px;font-weight:900;font-style:italic;letter-spacing:-.06em;line-height:.8;color:#fff;opacity:.045;z-index:1}
.content{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:40px;gap:40px;position:relative;z-index:2}
.tip{font-family:Caveat;font-size:58px;color:#fcd34d;transform:rotate(-2deg);align-self:flex-start;margin-bottom:-18px}
.kick{font-family:'Geist Mono';font-size:32px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7cb4ff}
h1{text-wrap:balance;font-size:84px;line-height:1.16;letter-spacing:-.04em;font-weight:750;max-width:880px}
h1.xl{font-size:108px;line-height:1.08}
h1 em{font-style:normal;background:#fcd34d;color:#171717;padding:0 .14em;border-radius:14px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.body{text-wrap:pretty;font-size:42px;line-height:1.42;color:#e5e5e5;max-width:860px}
ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:22px;max-width:888px}
li{font-size:44px;display:flex;gap:28px;align-items:center;background:#181616;border:2px solid #404040;border-radius:28px;padding:30px 36px;box-shadow:0 8px 0 #000}
li span{font-family:'Geist Mono';font-size:34px;color:#fcd34d}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:24px}.vs div{border:2px solid #404040;border-radius:30px;padding:40px;font-size:40px;line-height:1.35;color:#d4d4d4;background:#181616}
.vs b{display:block;font-family:'Geist Mono';font-size:32px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;color:#f87171}
.vs .aft{border-color:#fcd34d;background:#211d0f;color:#fff}.vs .aft b{color:#fcd34d}
.chat{display:flex;flex-direction:column;gap:22px;max-width:888px}
.chat div{font-size:38px;line-height:1.38;padding:30px 36px;border-radius:30px;border:2px solid #404040}
.chat b{display:block;font-family:'Geist Mono';font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:#a3a3a3;margin-bottom:8px}
.chat .me{background:#262626;align-self:flex-end;border-bottom-right-radius:8px;font-family:'Geist Mono';font-size:38px}
.chat .ai{background:#181616;border-color:#3b82f6;align-self:flex-start;border-bottom-left-radius:8px;color:#d4d4d4}.chat .ai b{color:#7cb4ff}
.btn{align-self:flex-start;background:#171717;color:#fcd34d;font-weight:700;font-size:40px;padding:30px 50px;border-radius:999px;box-shadow:0 10px 0 #00000055}
.swipe{font-family:Caveat;font-size:72px;color:#fcd34d;transform:rotate(-3deg);align-self:flex-start;margin-top:20px}
.cover .content{justify-content:center}
.cta{background-color:#fcd34d;color:#171717;background-image:linear-gradient(#0000000d 1px,transparent 1px),linear-gradient(90deg,#0000000d 1px,transparent 1px)}
.cta::after{border-color:#17171740}.cta .top,.cta .pg{color:#171717}.cta .mark{background:#171717;color:#fcd34d}.cta .kick{color:#78350f}.cta .body{color:#3f3f3f}
.cta h1 em{background:#171717;color:#fcd34d}.cta .ghost{color:#171717;opacity:.07}.cta .bar{background:#17171720}.cta .bar i{background:#171717}
.bar{position:absolute;left:96px;right:96px;bottom:76px;height:10px;border-radius:10px;background:#ffffff1c;z-index:2}.bar i{display:block;height:100%;border-radius:10px;background:#fcd34d}
"""

def render(log, brand, out):
    from playwright.sync_api import sync_playwright
    slides = log["slides"]; total = len(slides)
    doc = f"<!doctype html><html><head><meta charset=utf-8><style>{CSS}</style></head><body>" + \
          "".join(slide_html(s, total, brand) for s in slides) + "</body></html>"
    (out / "carousel.html").write_text(doc)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--disable-dev-shm-usage"])
        pg = b.new_page(viewport={"width": 1080, "height": 1350})
        for i, s in enumerate(slides, 1):
            one = out / f".slide-{i:02d}.html"
            one.write_text(f"<!doctype html><html><head><meta charset=utf-8><style>{CSS}</style></head><body>{slide_html(s, total, brand)}</body></html>")
            pg.goto(one.resolve().as_uri()); pg.wait_for_load_state("networkidle"); pg.evaluate("document.fonts.ready")
            pg.screenshot(path=str(out / "slides" / f"slide-{i:02d}.png"), clip={"x": 0, "y": 0, "width": 1080, "height": 1350})
            over = pg.evaluate("(()=>{const c=document.querySelector('.content'),b=document.querySelector('.bar');return c.scrollHeight>c.clientHeight+2||[...c.children].some(e=>e.getBoundingClientRect().bottom>b.getBoundingClientRect().top-10)})()")
            if over: print(f"  ⚠ slide {i}: text overflows — shorten copy in carousel.json and re-run with --render-only")
            one.unlink()
        pg.goto((out / "carousel.html").resolve().as_uri()); pg.wait_for_load_state("networkidle")
        pg.add_style_tag(content="html,body{height:auto;overflow:visible}.slide{page-break-after:always}")
        pg.pdf(path=str(out / "carousel.pdf"), width="1080px", height="1350px", print_background=True)
        b.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("idea"); ap.add_argument("--out", default="out")
    ap.add_argument("--brand", default=None); ap.add_argument("--render-only", action="store_true")
    a = ap.parse_args()
    brand = json.load(open(a.brand)) if a.brand else {
        "handle": "@appliedailab", "mark": "ai/", "audience": "Indian college students & young professionals (18-28)",
        "voice": "direct, practical, slightly witty, founder-to-student, zero hype", "cta": "Apply for Cohort 01 — link in bio"}
    if a.render_only:  # founder edited carousel.json by hand → re-render only, no LLM cost
        log = json.load(open(pathlib.Path(a.out) / "carousel.json")); render(log, brand, pathlib.Path(a.out))
    else:
        run(a.idea, brand, a.out)
