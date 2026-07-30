"""Renders a qBook notebook document (Mongo shape, see models/notebook.py) into a
branded PDF. Pure-Python end to end (markdown, Pygments, xhtml2pdf) — no native
system libraries — since this runs inside backend/, which deploys to FastAPI
Cloud (a managed platform with no apt/system-package access), unlike
notebook_service/ and video_service/ which ship their own Docker images and can
afford heavier tools like Playwright.
"""

import base64
import html
import re
from io import BytesIO
from pathlib import Path

# markdown/pygments/xhtml2pdf (plus xhtml2pdf's own reportlab/Pillow/lxml/pyHanko
# transitive imports) are ~35-40MB of import-time memory on top of Python itself —
# measured directly via psutil RSS deltas while diagnosing a FastAPI Cloud OOM.
# backend/ already runs a heavy stack (qiskit, the full langchain family, chromadb),
# so this module is imported unconditionally at app startup via qbook_router.py —
# deferring these imports to first actual use (matching the same lazy pattern
# services/chroma_service.py already uses for its own heavy/optional
# dependencies) means a server that never serves a PDF export never pays for it.
_PYGMENTS_FORMATTER = None


def _pygments_formatter():
    global _PYGMENTS_FORMATTER
    if _PYGMENTS_FORMATTER is None:
        from pygments.formatters import HtmlFormatter
        _PYGMENTS_FORMATTER = HtmlFormatter(noclasses=True, style="friendly")
    return _PYGMENTS_FORMATTER


_LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "qrious_logo.png"
_LOGO_DATA_URI = "data:image/png;base64," + base64.b64encode(_LOGO_PATH.read_bytes()).decode("ascii")

_ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;]*m")

PURPLE = "#a855f7"
INK = "#18181b"
MUTED = "#71717a"
BORDER = "#e4e4e7"
CODE_BG = "#fafafa"
ERROR_BG = "#fef2f2"
ERROR_BORDER = "#fecaca"
ERROR_TEXT = "#7f1d1d"


def _strip_ansi(text: str) -> str:
    return _ANSI_ESCAPE_RE.sub("", text)


def _pdf_safe(text: str) -> str:
    """xhtml2pdf's built-in fonts (Helvetica/Courier) only cover Latin-1 — emoji,
    CJK, and other characters outside that range render as a solid black tofu
    box rather than failing loudly, so they're dropped here instead of left
    broken on the page."""
    return text.encode("latin-1", "ignore").decode("latin-1")


def _as_text(value) -> str:
    """Output text fields are a plain string per how notebook_service/main.py's
    _to_output builds them, but nbformat's spec also allows a list of lines —
    handled here since these outputs are ultimately student-triggered Jupyter
    messages, not something this code fully controls the shape of."""
    if isinstance(value, list):
        return "".join(value)
    return str(value) if value is not None else ""


def _text_to_html(text: str) -> str:
    """xhtml2pdf doesn't reliably honor `white-space: pre` inside <pre> — literal
    newlines get collapsed like normal HTML text — so line breaks are made
    explicit with <br/> instead of relying on CSS whitespace handling. Trailing
    newlines (e.g. every print() call leaves one) are dropped first — a trailing
    <br/> as the last child of a bordered block makes xhtml2pdf draw the
    block's border a second time around the now-empty trailing line.
    """
    return html.escape(_pdf_safe(text).rstrip("\n")).replace("\n", "<br/>")


def _render_markdown_cell(source: str) -> str:
    import markdown as md
    body = md.markdown(_pdf_safe(source or ""), extensions=["fenced_code", "tables"])
    return f'<div class="cell markdown-cell">{body}</div>'


def _render_code_source(source: str, execution_count) -> str:
    from pygments import highlight
    from pygments.lexers import PythonLexer

    prompt = f"In [{execution_count}]:" if execution_count is not None else "In [ ]:"
    highlighted = highlight(_pdf_safe(source or ""), PythonLexer(), _pygments_formatter())
    # Pygments always appends a trailing blank line before </pre> (and thus a
    # trailing newline after </div>) — same trailing-<br/> border-duplication
    # issue _text_to_html works around, so it's stripped the same way here.
    highlighted = highlighted.replace("\n</pre>", "</pre>").rstrip("\n").replace("\n", "<br/>")
    return f'<div class="prompt">{prompt}</div><div class="code-block">{highlighted}</div>'


def _render_stream_output(output: dict) -> str:
    name = output.get("name", "stdout")
    text = _text_to_html(_as_text(output.get("text")))
    css_class = "stream-stderr" if name == "stderr" else "stream-stdout"
    return f'<pre class="output {css_class}">{text}</pre>'


def _render_rich_output(output: dict) -> str:
    data = output.get("data") or {}
    if "image/png" in data:
        return f'<img class="output-image" src="data:image/png;base64,{data["image/png"]}" />'
    if "text/plain" in data:
        return f'<pre class="output">{_text_to_html(_as_text(data["text/plain"]))}</pre>'
    return ""


def _render_error_output(output: dict) -> str:
    ename = html.escape(_pdf_safe(str(output.get("ename", "Error"))))
    evalue = html.escape(_pdf_safe(str(output.get("evalue", ""))))
    traceback_lines = output.get("traceback") or []
    traceback_text = _strip_ansi("\n".join(traceback_lines))
    return (
        '<div class="error-block">'
        f'<div class="error-title">{ename}: {evalue}</div>'
        f'<pre class="error-traceback">{_text_to_html(traceback_text)}</pre>'
        "</div>"
    )


def _render_output(output: dict) -> str:
    output_type = output.get("output_type")
    if output_type == "stream":
        return _render_stream_output(output)
    if output_type in ("execute_result", "display_data"):
        return _render_rich_output(output)
    if output_type == "error":
        return _render_error_output(output)
    return ""


def _render_code_cell(cell: dict) -> str:
    parts = [_render_code_source(cell.get("source", ""), cell.get("execution_count"))]
    outputs = cell.get("outputs") or []
    if outputs:
        parts.append('<div class="outputs">' + "".join(_render_output(o) for o in outputs) + "</div>")
    return f'<div class="cell code-cell">{"".join(parts)}</div>'


def _render_cell(cell: dict) -> str:
    if cell.get("cell_type") == "markdown":
        return _render_markdown_cell(cell.get("source", ""))
    return _render_code_cell(cell)


def _build_html(title: str, cells: list[dict]) -> str:
    safe_title = html.escape(_pdf_safe(title or "Untitled Notebook") or "Untitled Notebook")
    cells_html = "".join(_render_cell(cell) for cell in cells) or '<p style="color:#71717a;">This notebook has no cells yet.</p>'

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
    @page {{
        size: letter;
        margin: 2.2cm 1.6cm 2cm 1.6cm;
        @frame footer_frame {{
            -pdf-frame-content: footer_content;
            bottom: 0.7cm; margin-left: 1.6cm; margin-right: 1.6cm; height: 1cm;
        }}
    }}
    body {{ font-family: Helvetica, Arial, sans-serif; color: {INK}; font-size: 10.5pt; line-height: 1.5; }}
    .header {{ border-bottom: 2px solid {PURPLE}; padding-bottom: 10px; margin-bottom: 22px; }}
    .brand-row {{ width: 100%; }}
    .brand-logo {{ width: 26px; height: 26px; }}
    .brand {{ font-size: 15pt; font-weight: bold; color: {INK}; }}
    .brand-sub {{ font-size: 9pt; color: {MUTED}; letter-spacing: 0.5px; text-transform: uppercase; }}
    .notebook-title {{ font-size: 19pt; font-weight: bold; margin: 14px 0 0 0; color: {INK}; }}
    .cell {{ margin-bottom: 16px; page-break-inside: avoid; }}
    .markdown-cell h1, .markdown-cell h2, .markdown-cell h3 {{ color: {INK}; }}
    .markdown-cell code {{ background: {CODE_BG}; padding: 1px 4px; font-family: Courier, monospace; }}
    .prompt {{ font-family: Courier, monospace; font-size: 8pt; color: {PURPLE}; margin-bottom: 2px; }}
    .code-block {{ border: 1px solid {BORDER}; border-left: 3px solid {PURPLE}; padding: 4px 8px; }}
    .code-block pre {{ font-size: 9pt; margin: 4px 0; white-space: pre-wrap; }}
    .outputs {{ margin-top: 6px; }}
    .output {{ font-family: Courier, monospace; font-size: 9pt; background: #ffffff; border: 1px solid {BORDER}; padding: 6px 10px; white-space: pre-wrap; margin: 4px 0; }}
    .stream-stderr {{ color: #b91c1c; }}
    .output-image {{ max-width: 100%; max-height: 320px; margin: 6px auto; display: block; }}
    .error-block {{ background: {ERROR_BG}; border: 1px solid {ERROR_BORDER}; padding: 8px 10px; margin-top: 6px; }}
    .error-title {{ font-family: Courier, monospace; font-size: 9pt; font-weight: bold; color: #b91c1c; }}
    .error-traceback {{ font-family: Courier, monospace; font-size: 8.5pt; white-space: pre-wrap; margin: 4px 0 0 0; color: {ERROR_TEXT}; }}
    #footer_content {{ font-size: 8pt; color: {MUTED}; text-align: center; }}
</style>
</head>
<body>
    <div class="header">
        <table class="brand-row"><tr>
            <td style="width: 34px; vertical-align: middle;"><img class="brand-logo" src="{_LOGO_DATA_URI}" /></td>
            <td style="vertical-align: middle;">
                <span class="brand">Qrious</span><span class="brand-sub"> &middot; qBook</span>
            </td>
        </tr></table>
        <div class="notebook-title">{safe_title}</div>
    </div>
    {cells_html}
    <div id="footer_content">Generated by Qrious qBook &mdash; page <pdf:pagenumber /> of <pdf:pagecount /></div>
</body>
</html>"""


def render_notebook_pdf(doc: dict) -> bytes:
    from xhtml2pdf import pisa

    html_doc = _build_html(doc.get("title", ""), doc.get("cells", []))
    buffer = BytesIO()
    result = pisa.CreatePDF(html_doc, dest=buffer)
    if result.err:
        raise RuntimeError(f"Failed to render notebook PDF (xhtml2pdf error code {result.err})")
    return buffer.getvalue()
