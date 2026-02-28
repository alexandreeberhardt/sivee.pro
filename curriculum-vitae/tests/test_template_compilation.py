"""Integration tests: compile all LaTeX templates and report results.

Run with:
    cd curriculum-vitae && uv run pytest tests/test_template_compilation.py -v -m integration

Requires a working LaTeX installation (latexmk + pdflatex).
Generates a compilation report at tests/fixtures/compilation_report.txt.
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from core.LatexRenderer import LatexRenderer

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
REPORT_PATH = FIXTURES_DIR / "compilation_report.txt"
LATEXMK_PATH = shutil.which("latexmk")

pytestmark = pytest.mark.skipif(
    LATEXMK_PATH is None,
    reason="latexmk not installed; requires a LaTeX toolchain",
)


def load_fixture(name: str) -> dict:
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def count_overfull(log_text: str) -> int:
    return log_text.count("Overfull \\hbox")


def count_errors(log_text: str) -> int:
    return log_text.count("! ")


def compile_template(template_name: str, render_data: dict) -> dict:
    """Render and compile a template, returning a results dict."""
    template_filename = f"{template_name}.tex"
    template_path = TEMPLATES_DIR / template_filename
    if not template_path.exists():
        return {
            "template": template_name,
            "status": "MISSING",
            "exit_code": None,
            "overfull": 0,
            "errors": 0,
            "log": "",
        }

    with tempfile.TemporaryDirectory(prefix="cv_test_") as tmp:
        tmp_path = Path(tmp)

        # Copy template into temp dir
        shutil.copy(template_path, tmp_path / template_filename)

        # Render
        renderer = LatexRenderer(tmp_path, template_filename)
        try:
            tex_content = renderer.render(render_data)
        except Exception as e:
            return {
                "template": template_name,
                "status": "RENDER_ERROR",
                "exit_code": None,
                "overfull": 0,
                "errors": 0,
                "log": str(e),
            }

        tex_file = tmp_path / "main.tex"
        tex_file.write_text(tex_content, encoding="utf-8")

        # Compile
        result = subprocess.run(
            [
                "latexmk",
                "-pdf",
                "-no-shell-escape",
                "-interaction=nonstopmode",
                "-halt-on-error",
                str(tex_file),
            ],
            cwd=str(tmp_path),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )

        log_file = tmp_path / "main.log"
        log_text = log_file.read_text(encoding="utf-8", errors="replace") if log_file.exists() else ""

        status = "OK" if result.returncode == 0 else "FAIL"
        return {
            "template": template_name,
            "status": status,
            "exit_code": result.returncode,
            "overfull": count_overfull(log_text),
            "errors": count_errors(log_text),
            "log": log_text[-3000:] if status == "FAIL" else "",
        }


TEMPLATE_NAMES = [
    "harvard", "harvard_compact", "harvard_large",
    "mckinsey", "mckinsey_compact", "mckinsey_large",
    "europass", "europass_compact", "europass_large",
    "stephane", "stephane_compact", "stephane_large",
    "aurianne", "aurianne_compact", "aurianne_large",
    "michel", "michel_compact", "michel_large",
    "double", "double_compact", "double_large",
    "sidebar", "sidebar_compact", "sidebar_large",
    "banking", "banking_compact", "banking_large",
    "minimal", "minimal_compact", "minimal_large",
    "deedy", "deedy_compact", "deedy_large",
]


@pytest.fixture(scope="module")
def comprehensive_data():
    return load_fixture("test_resume_comprehensive.json")


@pytest.fixture(scope="module")
def no_optional_data():
    return load_fixture("test_resume_no_optional.json")


@pytest.mark.integration
@pytest.mark.parametrize("template_name", TEMPLATE_NAMES)
def test_template_compiles(template_name, comprehensive_data):
    """Each template must compile without errors using the comprehensive fixture."""
    result = compile_template(template_name, comprehensive_data)
    assert result["status"] != "MISSING", f"Template file missing: {template_name}.tex"
    assert result["status"] != "RENDER_ERROR", (
        f"Jinja2 render failed for {template_name}: {result['log']}"
    )
    assert result["exit_code"] == 0, (
        f"LaTeX compilation FAILED for {template_name} (exit={result['exit_code']}):\n"
        f"{result['log']}"
    )


@pytest.mark.integration
@pytest.mark.parametrize("template_name", TEMPLATE_NAMES)
def test_template_compiles_without_optional_fields(template_name, no_optional_data):
    """Each template must compile when optional fields (title, location, etc.) are absent."""
    result = compile_template(template_name, no_optional_data)
    assert result["status"] != "MISSING", f"Template file missing: {template_name}.tex"
    assert result["status"] != "RENDER_ERROR", (
        f"Jinja2 render failed for {template_name} (no-optional): {result['log']}"
    )
    assert result["exit_code"] == 0, (
        f"LaTeX compilation FAILED for {template_name} (no-optional, exit={result['exit_code']}):\n"
        f"{result['log']}"
    )


@pytest.mark.integration
def test_generate_compilation_report(comprehensive_data, no_optional_data):
    """Generate a full compilation report for all templates."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    lines = ["=" * 70, "COMPILATION REPORT", "=" * 70, ""]
    lines.append(f"{'Template':<30} {'Status':^8} {'Exit':^6} {'Overfull':^10} {'Errors':^8}")
    lines.append("-" * 70)

    total_ok = 0
    total_fail = 0

    for tpl in TEMPLATE_NAMES:
        res = compile_template(tpl, comprehensive_data)
        status = res["status"]
        if status == "OK":
            total_ok += 1
        else:
            total_fail += 1
        lines.append(
            f"{tpl:<30} {status:^8} {str(res['exit_code'] or ''):^6} "
            f"{res['overfull']:^10} {res['errors']:^8}"
        )
        if status == "FAIL" and res["log"]:
            lines.append(f"  ERROR LOG (last 500 chars): {res['log'][-500:]}")

    lines.append("-" * 70)
    lines.append(f"Total: {total_ok} OK, {total_fail} FAILED out of {len(TEMPLATE_NAMES)}")
    lines.append("")

    report = "\n".join(lines)
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"\nReport written to: {REPORT_PATH}")
    print(report)
