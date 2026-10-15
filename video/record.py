#!/usr/bin/env python3
"""Record the TrayMath demo video from the live app.

Real screen capture: Chromium's own screencast (CDP Page.startScreencast, JPEG q92) of a
1440x810 CSS viewport at device scale 4/3, so every frame is 1920x1080, while Playwright
drives the core journey on the live app. Narration is
edge-tts (gTTS fallback), placed at the moment each scene really started; subtitles
are generated from the same text and burned in.

Usage: python3 video/record.py [app_url]
Needs: ffmpeg/ffprobe (libass), python playwright + chromium, edge-tts at $EDGE_TTS.
Output: video/out/traymath-demo.mp4 (+ .srt)
"""
from __future__ import annotations

import base64
import json
import os
import pathlib
import re
import subprocess
import time

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
APP = os.environ.get("APP_URL") or (os.sys.argv[1] if len(os.sys.argv) > 1 else "https://traymath.pages.dev/")
REPO_URL = "https://github.com/ctmakc/traymath/tree/main/devpost"
EDGE_TTS = os.environ.get("EDGE_TTS", "/data/venvs/edge-tts/bin/edge-tts")
GTTS = os.environ.get("GTTS", "gtts-cli")
VOICE, RATE = "en-US-AndrewNeural", "+4%"
PAD = 0.8
SCENES = json.loads((HERE / "scenes.json").read_text(encoding="utf-8"))

CURSOR_JS = r"""
(() => {
  if (document.getElementById('tm-cursor')) return;
  const c = document.createElement('div');
  c.id = 'tm-cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2l18 9.5-8 1.8-3.6 7.7z" fill="#E8EDE9" stroke="#13191D" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, {position:'fixed', left:'0', top:'0', zIndex: 99999, pointerEvents:'none',
    transform:'translate(720px, 420px)', transition:'transform .55s cubic-bezier(.16,1,.3,1)'});
  document.documentElement.appendChild(c);
  window.__tmMove = (x, y) => { c.style.transform = `translate(${x}px, ${y}px)`; };
  window.__tmTap = () => {
    const r = document.createElement('div');
    const m = c.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
    Object.assign(r.style, {position:'fixed', left:(+m[1]-14)+'px', top:(+m[2]-14)+'px', width:'28px', height:'28px',
      borderRadius:'50%', border:'2px solid #F2B544', zIndex:99998, pointerEvents:'none', transition:'transform .4s, opacity .4s'});
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 450);
  };
})();
"""


def tts(text: str, mp3: pathlib.Path) -> str:
    if mp3.exists() and mp3.stat().st_size > 0:
        return "cached"
    for attempt in range(3):
        r = subprocess.run([EDGE_TTS, "--voice", VOICE, f"--rate={RATE}", "--text", text, "--write-media", str(mp3)],
                           capture_output=True, text=True)
        if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 0:
            return "edge-tts"
        time.sleep(2 + attempt)
    raw = mp3.with_suffix(".gtts.mp3")
    subprocess.run([GTTS, text, "-l", "en", "--tld", "com", "-o", str(raw)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "atempo=1.12", str(mp3)], check=True)
    return "gtts"


def duration(path: pathlib.Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def chunks(text: str, limit: int = 78) -> list[str]:
    """Split narration into caption-sized pieces at sentence/clause boundaries."""
    parts = re.split(r"(?<=[.:?!])\s+", text)
    out: list[str] = []
    for p in parts:
        while len(p) > limit:
            cut = p.rfind(", ", 0, limit)
            cut = cut + 1 if cut > 20 else p.rfind(" ", 0, limit)
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        if p:
            out.append(p)
    return out


class Director:
    def __init__(self, page):
        self.page = page

    def wait(self, sec: float):
        self.page.wait_for_timeout(sec * 1000)

    def cursor(self):
        self.page.evaluate(CURSOR_JS)

    def click(self, selector: str, pause: float = 0.6):
        loc = self.page.locator(selector).first
        loc.scroll_into_view_if_needed()
        box = loc.bounding_box()
        self.cursor()
        self.page.evaluate(f"window.__tmMove({box['x'] + box['width'] / 2:.0f}, {box['y'] + box['height'] / 2:.0f})")
        self.wait(pause)
        self.page.evaluate("window.__tmTap()")
        loc.click()
        self.wait(0.25)

    def click_loc(self, loc, pause: float = 0.6):
        loc.scroll_into_view_if_needed()
        box = loc.bounding_box()
        self.cursor()
        self.page.evaluate(f"window.__tmMove({box['x'] + 60:.0f}, {box['y'] + box['height'] / 2:.0f})")
        self.wait(pause)
        self.page.evaluate("window.__tmTap()")
        loc.click()
        self.wait(0.25)

    def scroll_to(self, y: float, ms: int = 900):
        self.page.evaluate(f"window.scrollTo({{top: {y}, behavior: 'smooth'}})")
        self.wait(ms / 1000)

    def scroll_el(self, selector: str, offset: int = 0, ms: int = 900):
        y = self.page.evaluate(f"document.querySelector('{selector}').getBoundingClientRect().top + scrollY - {offset}")
        self.scroll_to(y, ms)

    def type(self, selector: str, text: str):
        self.click(selector, 0.4)
        self.page.locator(selector).type(text, delay=38)


def run_scene(d: Director, sid: str, page):
    if sid == "s1-problem":
        d.wait(3.0)
        d.cursor()
    elif sid == "s2-party":
        d.scroll_el("#party", 24, 1200)
        d.wait(1.2)
        d.page.evaluate("window.__tmMove(300, 560)")
        d.wait(2.0)
        d.scroll_el("#groups", 24, 1200)
    elif sid == "s3-plan":
        d.scroll_el(".planner", 16, 700)
        d.click('[data-act="plan"]', 0.7)
        d.wait(1.8)
        d.page.evaluate("window.__tmMove(1180, 520)")
    elif sid == "s4-kernel":
        d.scroll_el("#trays", 16, 1000)
        d.click('[data-act="qty"][data-id="fruit-skewers"][data-d="-1"]', 0.8)
        d.wait(0.7)
        d.click('[data-act="qty"][data-id="falafel"][data-d="-1"]', 0.8)
        d.wait(0.5)
        d.click('[data-act="qty"][data-id="falafel"][data-d="-1"]', 0.5)
        d.wait(1.0)
        row = page.locator('.grow', has=page.locator('.grow-name', has_text="Vegan · Gluten-free")).first
        box = row.bounding_box()
        d.page.evaluate(f"window.__tmMove({box['x'] + box['width'] - 150:.0f}, {box['y'] + 22:.0f})")
        d.wait(2.5)
        d.page.evaluate(f"window.__tmMove({box['x'] + box['width'] - 20:.0f}, {box['y'] + 22:.0f})")
    elif sid == "s5-fix":
        d.wait(4.0)
        row = page.locator('.grow', has=page.locator('.grow-name', has_text="Vegan · Gluten-free")).first
        fix = row.locator('.fix').first
        box = fix.bounding_box()
        d.page.evaluate(f"window.__tmMove({box['x'] + 60:.0f}, {box['y'] + box['height'] / 2:.0f})")
        d.wait(1.4)
        d.page.evaluate("window.__tmTap()")
        fix.click()
        d.wait(0.8)
    elif sid == "s6-send":
        rest = page.locator('.grow', has=page.locator('.grow-name', has_text="No restrictions")).first
        d.click_loc(rest.locator('.fix').first, 0.8)
        d.wait(1.6)
        d.scroll_el("#send", 120, 900)
        d.type('[data-f="host"]', "Dana, office manager")
        d.page.fill('[data-f="date"]', "2026-11-06")
        d.type('[data-f="note"]', "Deliver by 4:30 pm, reception desk.")
        d.click('[data-part="go"]', 0.5)
        d.wait(0.8)
    elif sid == "s7-ticket":
        d.click('[data-part="open"]', 0.6)
        page.wait_for_selector(".ticket")
        d.wait(0.6)
        d.cursor()
        d.page.evaluate("window.__tmMove(1300, 700)")
        d.wait(1.6)
        d.scroll_to(260, 1600)
        d.wait(1.4)
        d.scroll_to(900, 2200)
    elif sid == "s8-labels":
        d.scroll_to(0, 600)
        page.emulate_media(media="print")
        page.evaluate("document.body.classList.add('print-labels')")
        page.evaluate("window.scrollTo(0,0)")
        d.wait(2.6)
        d.scroll_to(420, 2200)
    elif sid == "s9-built":
        page.emulate_media(media="screen")
        page.evaluate("document.body.classList.remove('print-labels')")
        page.goto(REPO_URL, wait_until="domcontentloaded")
        d.wait(4.5)
        d.scroll_to(380, 1800)
        d.wait(3.0)
        page.goto(APP, wait_until="networkidle")
        page.evaluate("""(() => {
          const card = document.createElement('div');
          card.innerHTML = '<div style="font:800 72px Recursive,sans-serif;font-variation-settings:\\'CASL\\' 1;color:#E8EDE9">Tray<span style=\\'color:#F2B544\\'>Math</span></div>'
            + '<div style="margin-top:18px;font:500 26px Recursive,sans-serif;color:#9DAAB0;font-variation-settings:\\'MONO\\' 1">traymath.pages.dev &nbsp;·&nbsp; github.com/ctmakc/traymath</div>';
          Object.assign(card.style, {position:'fixed', inset:'0', display:'grid', placeContent:'center', textAlign:'center', background:'rgba(19,25,29,.94)', zIndex: 9999, opacity: 0, transition: 'opacity .6s'});
          requestAnimationFrame(() => requestAnimationFrame(() => { card.style.opacity = 1; }));
          document.body.appendChild(card);
        })()""")


def main() -> int:
    OUT.mkdir(exist_ok=True)
    durs = {}
    for sc in SCENES:
        mp3 = OUT / f"{sc['id']}.mp3"
        print(sc["id"], tts(sc["say"], mp3), flush=True)
        durs[sc["id"]] = duration(mp3)

    raw = OUT / "screen.mp4"
    frames_dir = OUT / "frames-raw"
    if frames_dir.exists():
        for f in frames_dir.iterdir():
            f.unlink()
    frames_dir.mkdir(exist_ok=True)
    frames: list[tuple[float, pathlib.Path]] = []
    starts: dict[str, float] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--lang=en-US", "--disable-features=Translate"])
        ctx = browser.new_context(viewport={"width": 1440, "height": 810}, device_scale_factor=4 / 3,
                                  color_scheme="dark", locale="en-CA")
        page = ctx.new_page()
        page.goto(APP, wait_until="networkidle")
        page.wait_for_selector(".grow")
        cdp = ctx.new_cdp_session(page)

        def on_frame(ev):
            path = frames_dir / f"{len(frames):05d}.jpg"
            path.write_bytes(base64.b64decode(ev["data"]))
            frames.append((time.time(), path))
            try:
                cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
            except Exception:
                pass

        cdp.on("Page.screencastFrame", on_frame)
        cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": 1920, "maxHeight": 1080, "everyNthFrame": 1})
        page.wait_for_timeout(600)
        page.reload(wait_until="networkidle")  # replay the hero entrance on camera
        page.wait_for_selector(".grow")
        rec_t0 = time.time()
        d = Director(page)
        for sc in SCENES:
            t_start = time.time()
            starts[sc["id"]] = t_start - rec_t0
            run_scene(d, sc["id"], page)
            left = durs[sc["id"]] + PAD - (time.time() - t_start)
            if left > 0:
                d.wait(left)
        d.wait(1.5)
        end_t = time.time()
        cdp.send("Page.stopScreencast")
        browser.close()

    # frames arrive only when the screen changes: hold each one until the next
    usable = [(t, f) for t, f in frames if t >= rec_t0 - 0.2]
    before = [(t, f) for t, f in frames if t < rec_t0 - 0.2]
    if before:
        usable.insert(0, (rec_t0, before[-1][1]))
    lines = []
    for i, (t, f) in enumerate(usable):
        nxt = usable[i + 1][0] if i + 1 < len(usable) else end_t
        lines.append(f"file '{f}'\nduration {max(0.001, nxt - max(t, rec_t0)):.4f}")
    lines.append(f"file '{usable[-1][1]}'")
    concat = OUT / "frames.txt"
    concat.write_text("\n".join(lines) + "\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
                    "-vf", "scale=1920:1080:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "15",
                    "-pix_fmt", "yuv420p", str(raw)], check=True)
    print("frames", len(usable), flush=True)

    lead = max(0.0, starts[SCENES[0]["id"]] - 0.2)  # cut the reload before scene one
    starts = {k: v - lead for k, v in starts.items()}
    total = max(starts[s["id"]] + durs[s["id"]] + PAD for s in SCENES) + 1.2
    # narration track: each scene's voice at the moment the scene really started
    inputs, filters = [], []
    for i, sc in enumerate(SCENES):
        inputs += ["-i", str(OUT / f"{sc['id']}.mp3")]
        ms = int(starts[sc["id"]] * 1000)
        filters.append(f"[{i}:a]adelay={ms}|{ms},aresample=48000[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(SCENES))) + f"amix=inputs={len(SCENES)}:normalize=0,apad,atrim=0:{total:.2f}[aout]"
    voice = OUT / "voice.m4a"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters) + ";" + mix,
                    "-map", "[aout]", "-c:a", "aac", "-b:a", "160k", str(voice)], check=True)

    # captions: split each scene's text over its voice duration by character share
    srt, n = [], 1
    for sc in SCENES:
        parts = chunks(sc["say"])
        t, dur = starts[sc["id"]], durs[sc["id"]]
        total_chars = sum(len(x) for x in parts)
        for part in parts:
            seg = dur * len(part) / total_chars
            srt.append(f"{n}\n{srt_time(t)} --> {srt_time(t + seg - 0.05)}\n{part}\n")
            n += 1
            t += seg
    srt_path = OUT / "traymath-demo.srt"
    srt_path.write_text("\n".join(srt), encoding="utf-8")

    final = OUT / "traymath-demo.mp4"
    style = ("FontName=DejaVu Sans,FontSize=16,PrimaryColour=&H00E9EDE8,OutlineColour=&H001D1913,BackColour=&H80191513,"
             "BorderStyle=4,Outline=0,Shadow=0,MarginV=26,Alignment=2")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{lead:.3f}", "-i", str(raw), "-i", str(voice), "-t", f"{total:.2f}",
                    "-vf", f"subtitles={srt_path}:force_style='{style}'", "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                    "-movflags", "+faststart", str(final)], check=True)
    print("starts", json.dumps({k: round(v, 2) for k, v in starts.items()}))
    print("final", final, f"{duration(final):.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
