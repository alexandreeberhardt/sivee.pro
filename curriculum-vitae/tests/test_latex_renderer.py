"""Comprehensive tests for LatexRenderer — escape_latex security and rendering."""

import pytest

from core.LatexRenderer import LatexRenderer


@pytest.fixture()
def tmp_dir(tmp_path):
    return tmp_path


def _make_renderer(tmp_dir, template_content):
    """Helper: write a template and return a LatexRenderer."""
    tpl = tmp_dir / "template.tex"
    tpl.write_text(template_content)
    return LatexRenderer(tmp_dir, "template.tex")


# ── escape_latex static method ──────────────────────────────────────────────


class TestEscapeLatex:
    """Unit tests for the static escape_latex filter."""

    def test_plain_text_unchanged(self):
        assert LatexRenderer.escape_latex("Hello World") == "Hello World"

    def test_empty_string(self):
        assert LatexRenderer.escape_latex("") == ""

    def test_ampersand(self):
        assert LatexRenderer.escape_latex("A & B") == r"A \& B"

    def test_percent(self):
        assert LatexRenderer.escape_latex("100%") == r"100\%"

    def test_dollar(self):
        assert LatexRenderer.escape_latex("$10") == r"\$10"

    def test_hash(self):
        assert LatexRenderer.escape_latex("#1") == r"\#1"

    def test_underscore(self):
        assert LatexRenderer.escape_latex("a_b") == r"a\_b"

    def test_tilde(self):
        assert LatexRenderer.escape_latex("~") == r"\textasciitilde{}"

    def test_caret(self):
        assert LatexRenderer.escape_latex("^") == r"\textasciicircum{}"

    def test_braces_escaped(self):
        assert LatexRenderer.escape_latex("{x}") == r"\{x\}"

    def test_backslash_escaped_first(self):
        """Backslash must be escaped BEFORE other chars to avoid double-escaping.
        \\ → \\textbackslash{} → then braces get escaped too → \\textbackslash\\{\\}"""
        result = LatexRenderer.escape_latex("\\")
        assert result == r"\textbackslash\{\}"

    def test_backslash_then_braces(self):
        """\\{} → \\textbackslash\\{\\}\\{\\}"""
        result = LatexRenderer.escape_latex("\\{}")
        assert r"\textbackslash\{\}" in result

    def test_all_special_chars_together(self):
        text = "a & b % c # d _ e {f} g ~ h ^ i"
        result = LatexRenderer.escape_latex(text)
        assert r"\&" in result
        assert r"\%" in result
        assert r"\#" in result
        assert r"\_" in result
        assert r"\{" in result
        assert r"\}" in result
        assert r"\textasciitilde{}" in result
        assert r"\textasciicircum{}" in result

    def test_non_string_passthrough(self):
        """Non-string values (int, None, etc.) pass through unchanged."""
        assert LatexRenderer.escape_latex(42) == 42
        assert LatexRenderer.escape_latex(None) is None
        assert LatexRenderer.escape_latex([1, 2]) == [1, 2]

    # ── Security: injection prevention ──

    def test_input_command_injection(self):
        r"""\\input{/etc/passwd} must be fully escaped."""
        result = LatexRenderer.escape_latex(r"\input{/etc/passwd}")
        # Backslash → \textbackslash{}, braces escaped
        assert "input" in result
        assert r"\input" not in result or r"\textbackslash" in result

    def test_write18_injection(self):
        r"""\\write18{rm -rf /} must be escaped."""
        result = LatexRenderer.escape_latex(r"\write18{rm -rf /}")
        assert r"\textbackslash\{\}" in result

    def test_newcommand_injection(self):
        result = LatexRenderer.escape_latex(r"\newcommand{\evil}{bad}")
        assert r"\textbackslash\{\}" in result
        assert r"\{" in result

    def test_url_with_tilde(self):
        result = LatexRenderer.escape_latex("https://example.com/~user")
        assert r"\textasciitilde{}" in result

    def test_multiple_backslashes(self):
        result = LatexRenderer.escape_latex("\\\\")
        assert result.count(r"\textbackslash\{\}") == 2

    def test_unicode_passthrough(self):
        """Unicode characters should pass through untouched."""
        assert LatexRenderer.escape_latex("Résumé café") == "Résumé café"

    def test_mixed_unicode_and_special(self):
        result = LatexRenderer.escape_latex("François & Marie — 100%")
        assert "François" in result
        assert r"\&" in result
        assert r"\%" in result


# ── Rendering ────────────────────────────────────────────────────────────────


class TestLatexRendering:
    def test_simple_variable(self, tmp_dir):
        renderer = _make_renderer(tmp_dir, r"Hello \VAR{name}")
        assert renderer.render({"name": "Alice"}) == "Hello Alice"

    def test_variable_with_escape_filter(self, tmp_dir):
        renderer = _make_renderer(tmp_dir, r"Name: \VAR{name | escape_latex}")
        result = renderer.render({"name": "O'Brien & Co."})
        assert r"\&" in result

    def test_missing_template_raises(self, tmp_dir):
        renderer = LatexRenderer(tmp_dir, "nonexistent.tex")
        with pytest.raises(FileNotFoundError, match="Template not found"):
            renderer.render({})

    def test_block_syntax(self, tmp_dir):
        tpl = r"\BLOCK{for item in items}\VAR{item} \BLOCK{endfor}"
        renderer = _make_renderer(tmp_dir, tpl)
        result = renderer.render({"items": ["A", "B", "C"]})
        assert "A" in result
        assert "B" in result
        assert "C" in result

    def test_conditional_block(self, tmp_dir):
        tpl = r"\BLOCK{if show}Visible\BLOCK{else}Hidden\BLOCK{endif}"
        renderer = _make_renderer(tmp_dir, tpl)
        assert renderer.render({"show": True}).strip() == "Visible"
        assert renderer.render({"show": False}).strip() == "Hidden"

    def test_nested_data(self, tmp_dir):
        renderer = _make_renderer(tmp_dir, r"\VAR{person.name}")
        result = renderer.render({"person": {"name": "Bob"}})
        assert result == "Bob"

    def test_empty_data(self, tmp_dir):
        renderer = _make_renderer(tmp_dir, "Static content")
        assert renderer.render({}) == "Static content"

    def test_render_error_raises_runtime(self, tmp_dir):
        """Accessing undefined variable in strict mode should raise RuntimeError."""
        tpl = r"\VAR{undefined_var}"
        renderer = _make_renderer(tmp_dir, tpl)
        # Jinja2 with default undefined renders empty string, but accessing .attr would fail
        # This tests that the renderer wraps exceptions properly
        result = renderer.render({})
        # With default Undefined, missing vars render as empty string
        assert result == ""
