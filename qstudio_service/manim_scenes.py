"""Static, hand-written Manim block library — checked into the repo, never
generated per-request. See PLANS/qstudio-animation.md §2.

`pipeline_manim.py` never imports this module directly — it's rendered by
invoking the `manim` CLI as a subprocess (`manim render manim_scenes.py
StoryboardScene ...`), reading the storyboard to animate from a JSON file
whose path is passed via the `STORYBOARD_PATH` environment variable. That
JSON is DATA the Multi-AI Gateway produced (a sequence of typed blocks +
text fields, validated against `models/qstudio.py`'s `AnimationStoryboard`
before being written to disk) — never Python source. Every block a
generation can choose maps to exactly one hand-written builder function
below; there is no way for a generation to make this module do anything it
doesn't already know how to do safely.

Render-verified against a real Manim CE 0.20.1 install, all 7 blocks
individually and combined (frame-level PNG renders — this environment has no
ffmpeg, so full video encoding still isn't independently verified). Two real
issues were found and fixed by that testing, not just guessed at:
1. Content overflowing the canvas — a fixed character-wrap width alone isn't
   enough (e.g. `process_flow` with 5 boxes can exceed the frame width even
   with short per-box labels, just from box padding + arrow gaps adding up).
   `_fit()` below is the actual fix: it scales each block's assembled
   content down by a single uniform factor if it exceeds a safe max
   width/height, applied to real content, not estimated from character
   counts.
2. Wrapped bullet points misaligning — a bullet's 2nd+ line has no marker,
   so it read as flush against the left edge instead of indented under the
   first line's text. `_wrap_bullet()` fixes this with `textwrap`'s
   `subsequent_indent`, confirmed by rendering (see manim_scenes.py history/
   PLANS/qstudio-animation.md) rather than assumed to work.
"""
from __future__ import annotations

import ast
import json
import math
import os
import textwrap
from typing import Callable

from manim import (
    BOLD,
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Arrow,
    Axes,
    Create,
    Dot,
    FadeIn,
    Line,
    Mobject,
    Rectangle,
    Scene,
    Text,
    VGroup,
    Write,
    config,
)

# --------------------------------------------------------------------------
# Theme — three visual palettes, same names/labels qStudio's Video Overview
# and Slides already offer (see pipeline_slides.py's THEME_FILES), so the
# choice is familiar across every qStudio output type. Unlike Slides/Video
# (HTML/Playwright screenshots), there's no template file to swap here —
# every block builder below is threaded a `palette` dict and reads its
# colors from it instead of the constants (BLUE, GREEN, ...) it used to
# import directly, so the same hand-written Manim scene works under any of
# the three themes.
# --------------------------------------------------------------------------

THEME_PALETTES: dict[str, dict[str, object]] = {
    "minimal_dark": {
        "background": "#000000",  # Manim's own default — unchanged look for renders made before theming existed
        "text": "#FFFFFF",
        "muted": "#9CA3AF",
        "accent": "#4C6FFF",
        "accent2": "#3DDC84",
        "highlight": "#FFD23F",
    },
    "academic_light": {
        "background": "#F7F5EF",
        "text": "#1C1B18",
        "muted": "#6B675E",
        "accent": "#1F4E8C",
        "accent2": "#2E7D4F",
        "highlight": "#B5541A",
    },
    "bold_gradient": {
        "background": "#170B33",  # dark base beneath the gradient rect — also the fallback if the rect somehow doesn't cover a frame edge
        "background_gradient": ("#7B2FF7", "#F72585"),
        "text": "#FFFFFF",
        "muted": "#D7C7FF",
        "accent": "#F72585",
        "accent2": "#7B2FF7",
        "highlight": "#FFD23F",
    },
}
DEFAULT_THEME = "minimal_dark"


def _resolve_theme() -> dict[str, object]:
    """QSTUDIO_ANIMATION_THEME is set by pipeline_manim.py's subprocess env —
    same STORYBOARD_PATH-style handoff, since this module always renders as
    a `manim` CLI subprocess, never a direct import (see module docstring)."""
    key = os.environ.get("QSTUDIO_ANIMATION_THEME", DEFAULT_THEME)
    return THEME_PALETTES.get(key, THEME_PALETTES[DEFAULT_THEME])


# --------------------------------------------------------------------------
# Timing
# --------------------------------------------------------------------------

MIN_TAIL_WAIT = 0.15
DEFAULT_STEP_SECONDS = 4.0  # used only if a step is somehow missing wait_seconds


def _finish(scene: Scene, step: dict, used_seconds: float) -> None:
    """Pads the remainder of the step's allotted on-screen time (set by
    pipeline_manim.py from the step's narration-clip duration, §3) with a
    plain wait — every builder calls this once, after its own entrance
    animation(s), so total step duration always matches the narration."""
    target = step.get("wait_seconds") or DEFAULT_STEP_SECONDS
    remaining = max(MIN_TAIL_WAIT, target - used_seconds)
    scene.wait(remaining)


# --------------------------------------------------------------------------
# Text layout — wrapping, hanging-indent bullets, and a frame-fit safety net.
# --------------------------------------------------------------------------

def _wrap(text: str, width: int = 46) -> str:
    """Manim's `Text` does not auto-wrap — confirmed by rendering a real
    overflowing definition and watching it run off both edges of the frame.
    `textwrap.wrap` + `\\n` is a real fix (also confirmed by rendering):
    `Text` respects embedded newlines as line breaks. `width` is in
    characters, not pixels — tuned per call site below for how much of the
    frame that particular font_size/column actually has. `_fit()` below is
    the backstop for when this per-line estimate still isn't enough."""
    if not text:
        return text
    return "\n".join(textwrap.wrap(text, width=width))


def _wrap_bullet(text: str, width: int = 46, marker: str = "•  ") -> str:
    """Same as `_wrap`, but for bulleted lines: wrapped continuation lines
    get `subsequent_indent` matching the marker's width instead of starting
    flush left, so a 2-line bullet reads as one indented block instead of
    the 2nd line looking like its own unrelated bullet. Confirmed by
    rendering — plain `_wrap` with the marker only prepended to the first
    line left continuation lines visibly misaligned."""
    if not text:
        return text
    indent = " " * len(marker)
    return "\n".join(textwrap.wrap(text, width=width, initial_indent=marker, subsequent_indent=indent))


# Leaves a real margin inside Manim's actual frame (config.frame_width/
# frame_height, not a guessed pixel budget) — confirmed live: Manim's
# default 16:9 frame is 14.22 x 8.0 units.
_FRAME_MAX_WIDTH = config.frame_width - 1.4
_FRAME_MAX_HEIGHT = config.frame_height - 1.2


def _fit(mobject: Mobject, max_width: float = _FRAME_MAX_WIDTH, max_height: float = _FRAME_MAX_HEIGHT) -> Mobject:
    """Scales `mobject` down by one uniform factor if it exceeds the given
    bounds — never up, never non-uniformly (that would distort text). This
    is the real fix for content running off the canvas: character-count
    wrapping (`_wrap`/`_wrap_bullet`) only bounds individual LINE width; a
    block with several long bulleted lines, or several side-by-side boxes
    each padded a bit, can still exceed the frame in the dimension wrapping
    doesn't control. MUST be called before final positioning
    (`.to_edge`/`.next_to`) — scaling happens around the mobject's own
    center, so scaling after positioning would shift it off its intended
    spot."""
    if mobject.width <= 0 or mobject.height <= 0:
        return mobject
    scale_factor = min(max_width / mobject.width, max_height / mobject.height, 1.0)
    if scale_factor < 1.0:
        mobject.scale(scale_factor)
    return mobject


# --------------------------------------------------------------------------
# graph_expression — narrow AST allowlist, never eval() of raw text.
# See PLANS/qstudio-animation.md §5.
# --------------------------------------------------------------------------

_ALLOWED_NODE_TYPES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Constant, ast.Load,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod, ast.USub, ast.UAdd,
)
_ALLOWED_FUNCTIONS = {
    "sin": math.sin, "cos": math.cos, "exp": math.exp,
    "sqrt": math.sqrt, "log": math.log, "abs": abs,
}


class UnsafeExpressionError(ValueError):
    pass


def _validate_ast(node: ast.AST) -> None:
    if not isinstance(node, _ALLOWED_NODE_TYPES):
        raise UnsafeExpressionError(f"disallowed syntax: {type(node).__name__}")
    if isinstance(node, ast.Name) and node.id not in ("x", *_ALLOWED_FUNCTIONS):
        raise UnsafeExpressionError(f"disallowed name: {node.id!r}")
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_FUNCTIONS:
            raise UnsafeExpressionError("disallowed function call")
        if node.keywords:
            raise UnsafeExpressionError("keyword arguments not allowed")
    for child in ast.iter_child_nodes(node):
        _validate_ast(child)


def compile_safe_expression(expression: str) -> Callable[[float], float]:
    """Parses `expression` (e.g. "sin(x)", "x**2 - 1") into a plain Python
    callable, after verifying its AST contains nothing but arithmetic, a
    handful of whitelisted math functions, and the single variable `x`.
    Raises UnsafeExpressionError for anything else — callers (build_graph_plot)
    catch this and fall back to a text-only rendering instead of failing the
    whole render."""
    try:
        parsed = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise UnsafeExpressionError(f"not a valid expression: {exc}") from exc
    _validate_ast(parsed)
    code = compile(parsed, "<graph_expression>", "eval")

    def f(x: float) -> float:
        return eval(code, {"__builtins__": {}}, {"x": x, **_ALLOWED_FUNCTIONS})  # noqa: S307 — vetted AST, not raw eval

    return f


# --------------------------------------------------------------------------
# Block builders — one per Literal value in AnimationStep.block. Every
# builder follows the same order: build content -> internal .arrange() ->
# _fit() -> final positioning (.to_edge/.next_to) -> play. See _fit()'s
# docstring for why that order matters.
# --------------------------------------------------------------------------

def build_title_card(scene: Scene, step: dict, palette: dict) -> None:
    title = Text(_wrap(step.get("title") or "", 34), font_size=56, weight=BOLD, color=palette["text"])
    subtitle = Text(_wrap(step.get("subtitle") or "", 50), font_size=30, color=palette["muted"])
    group = VGroup(title, subtitle).arrange(DOWN, buff=0.4)
    _fit(group)
    scene.play(FadeIn(group, shift=UP * 0.3), run_time=0.6)
    _finish(scene, step, 0.6)


def build_define_term(scene: Scene, step: dict, palette: dict) -> None:
    term = Text(_wrap(step.get("term") or "", 40), font_size=48, weight=BOLD, color=palette["accent"])
    definition = Text(_wrap(step.get("definition") or "", 56), font_size=28, color=palette["text"])
    group = VGroup(term, definition).arrange(DOWN, buff=0.6)
    _fit(group)
    scene.play(Write(term), run_time=0.8)
    scene.play(FadeIn(definition, shift=DOWN * 0.2), run_time=0.6)
    _finish(scene, step, 1.4)


def build_bullet_reveal(scene: Scene, step: dict, palette: dict) -> None:
    title = Text(_wrap(step.get("title") or "", 40), font_size=40, weight=BOLD, color=palette["text"])
    _fit(title)
    title.to_edge(UP)

    bullets = step.get("bullets") or []
    bullet_texts = VGroup(*[Text(_wrap_bullet(b, 52), font_size=28, color=palette["text"]) for b in bullets]).arrange(DOWN, buff=0.35, aligned_edge=LEFT)
    _fit(bullet_texts, max_height=_FRAME_MAX_HEIGHT - 1.8)  # leave room below the title
    bullet_texts.next_to(title, DOWN, buff=0.7)

    scene.play(FadeIn(title, shift=UP * 0.2), run_time=0.5)
    used = 0.5
    for bullet in bullet_texts:
        scene.play(FadeIn(bullet, shift=LEFT * 0.2), run_time=0.4)
        used += 0.4
    _finish(scene, step, used)


def build_compare_two(scene: Scene, step: dict, palette: dict) -> None:
    def column(label: str, points: list[str]) -> VGroup:
        header = Text(_wrap(label, 20), font_size=32, weight=BOLD, color=palette["highlight"])
        items = VGroup(*[Text(_wrap_bullet(p, 24), font_size=24, color=palette["text"]) for p in points]).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        group = VGroup(header, items).arrange(DOWN, buff=0.4, aligned_edge=LEFT)
        # Half the frame each, minus the divider's own gap — fit per column,
        # not the pair together, so one long column can't shrink the short one.
        return _fit(group, max_width=(_FRAME_MAX_WIDTH / 2) - 1.0)

    left = column(step.get("left_label") or "", step.get("left_points") or [])
    right = column(step.get("right_label") or "", step.get("right_points") or [])
    divider = Line(UP * 2.5, DOWN * 2.5, color=palette["muted"])
    left.next_to(divider, LEFT, buff=0.8)
    right.next_to(divider, RIGHT, buff=0.8)

    scene.play(Create(divider), run_time=0.4)
    scene.play(FadeIn(left, shift=RIGHT * 0.2), FadeIn(right, shift=LEFT * 0.2), run_time=0.6)
    _finish(scene, step, 1.0)


def build_process_flow(scene: Scene, step: dict, palette: dict) -> None:
    title = Text(_wrap(step.get("title") or "", 40), font_size=36, weight=BOLD, color=palette["text"])
    _fit(title)
    title.to_edge(UP)
    scene.play(FadeIn(title, shift=UP * 0.2), run_time=0.4)
    used = 0.4

    labels = step.get("flow_steps") or []
    # Text alone has no visible border; wrap each label with a thin frame so
    # "process_flow" reads as connected boxes, not floating text.
    framed = VGroup()
    for label in labels:
        text = Text(_wrap(label, 16), font_size=20, color=palette["text"])
        box = Rectangle(width=text.width + 0.6, height=text.height + 0.5, color=palette["accent"])
        box.move_to(text.get_center())
        framed.add(VGroup(box, text))
    framed.arrange(RIGHT, buff=0.8)
    # With up to 5 boxes, padding + arrow gaps can exceed the frame width
    # even with short per-box text (confirmed: 5 short-label boxes alone run
    # ~14 units wide, past the ~12.8 budget) — this is the real fit, not the
    # per-label character wrap above.
    _fit(framed, max_height=_FRAME_MAX_HEIGHT - 2.0)
    framed.next_to(title, DOWN, buff=1.0)

    arrows = VGroup(*[
        Arrow(framed[i].get_right(), framed[i + 1].get_left(), buff=0.1, color=palette["muted"])
        for i in range(len(framed) - 1)
    ])

    scene.play(FadeIn(framed[0]), run_time=0.5)
    used += 0.5
    for i in range(1, len(framed)):
        scene.play(Create(arrows[i - 1]), FadeIn(framed[i]), run_time=0.5)
        used += 0.5
    _finish(scene, step, used)


def build_timeline(scene: Scene, step: dict, palette: dict) -> None:
    title = Text(_wrap(step.get("title") or "", 40), font_size=36, weight=BOLD, color=palette["text"])
    _fit(title)
    title.to_edge(UP)
    scene.play(FadeIn(title, shift=UP * 0.2), run_time=0.4)
    used = 0.4

    events = step.get("timeline_events") or []
    line = Line(LEFT * 5, RIGHT * 5, color=palette["muted"])
    n = max(len(events), 1)
    markers = VGroup()
    for i, event in enumerate(events):
        x = -5 + (10 * i / max(n - 1, 1)) if n > 1 else 0
        dot = Dot(point=[x, 0, 0], color=palette["highlight"])
        label = Text(_wrap(event, 18), font_size=20, color=palette["text"])
        _fit(label, max_width=2.2, max_height=1.6)  # each label only has its own slot along the line
        label.next_to(dot, UP if i % 2 == 0 else DOWN, buff=0.4)
        markers.add(VGroup(dot, label))

    scene.play(Create(line), run_time=0.5)
    used += 0.5
    for marker in markers:
        scene.play(FadeIn(marker, scale=0.8), run_time=0.4)
        used += 0.4
    _finish(scene, step, used)


def build_graph_plot(scene: Scene, step: dict, palette: dict) -> None:
    expression = step.get("graph_expression") or ""
    try:
        fn = compile_safe_expression(expression)
    except UnsafeExpressionError:
        # Reject silently at render time (the expression was already meant to
        # be validated before this ever reaches Manim — see pipeline_manim.py)
        # and fall back to a text-only rendering rather than crashing the job.
        fallback_step = {
            **step, "block": "bullet_reveal",
            "title": step.get("graph_label") or "",
            "bullets": [step.get("narration", "")[:140]],
        }
        build_bullet_reveal(scene, fallback_step, palette)
        return

    # axis_config color: the default axis color is invisible against a light
    # (academic_light) background, unlike Manim's own black default.
    axes = Axes(
        x_range=[-5, 5, 1], y_range=[-5, 5, 1], x_length=8, y_length=5,
        axis_config={"color": palette["muted"]},
    )
    label = Text(_wrap(step.get("graph_label") or "", 40), font_size=28, color=palette["text"])
    _fit(label)
    label.to_edge(UP)
    try:
        graph = axes.plot(fn, color=palette["accent2"])
    except Exception:
        build_bullet_reveal(scene, {**step, "block": "bullet_reveal", "bullets": [step.get("narration", "")[:140]]}, palette)
        return

    scene.play(FadeIn(label), Create(axes), run_time=0.8)
    scene.play(Create(graph), run_time=1.2)
    _finish(scene, step, 2.0)


BLOCK_BUILDERS: dict[str, Callable[[Scene, dict, dict], None]] = {
    "title_card": build_title_card,
    "define_term": build_define_term,
    "bullet_reveal": build_bullet_reveal,
    "compare_two": build_compare_two,
    "process_flow": build_process_flow,
    "timeline": build_timeline,
    "graph_plot": build_graph_plot,
}


class StoryboardScene(Scene):
    """Reads the storyboard JSON at STORYBOARD_PATH and animates each step in
    order, clearing the scene between steps. This is the only Scene subclass
    in this file — pipeline_manim.py always renders this exact class, never a
    per-request generated one (see this module's docstring)."""

    def construct(self):
        storyboard_path = os.environ["STORYBOARD_PATH"]
        with open(storyboard_path, "r", encoding="utf-8") as f:
            storyboard = json.load(f)

        palette = _resolve_theme()
        config.background_color = palette["background"]
        gradient = palette.get("background_gradient")

        for i, step in enumerate(storyboard["steps"]):
            builder = BLOCK_BUILDERS.get(step["block"])
            if builder is None:
                continue  # unknown block (shouldn't happen — AnimationStep.block is a Literal); skip rather than crash the whole render
            if gradient:
                # config.background_color is a single flat color — Manim has no
                # native "gradient background" config, so bold_gradient paints
                # its own full-frame rectangle behind each step's content
                # instead. Added (not played) so it appears instantly, re-added
                # after every self.clear() below since clear() removes it too.
                bg = Rectangle(width=config.frame_width, height=config.frame_height, stroke_width=0, fill_opacity=1)
                bg.set_color_by_gradient(*gradient)
                self.add(bg)
            builder(self, step, palette)
            if i < len(storyboard["steps"]) - 1:
                self.clear()
