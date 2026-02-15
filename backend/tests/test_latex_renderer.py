import tempfile
import unittest
from pathlib import Path

from core import LatexRenderer


class LatexRendererTest(unittest.TestCase):
    def setUp(self):
        """Sets up a temporary directory for tests."""
        self.test_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.test_dir.name)

    def tearDown(self):
        """Cleans up the temporary directory."""
        self.test_dir.cleanup()

    def test_given_valid_template_and_data_when_render_then_returns_rendered_string(self):
        template_path = self.root / "template.tex"
        template_content = r"Hello \VAR{name}"
        with open(template_path, "w") as f:
            f.write(template_content)
        renderer = LatexRenderer(self.root, "template.tex")
        data = {"name": "World"}

        result = renderer.render(data)

        self.assertEqual(result, "Hello World")

    def test_given_missing_template_when_render_then_raises_file_not_found_error(self):
        renderer = LatexRenderer(self.root, "missing.tex")
        data = {}

        with self.assertRaises(FileNotFoundError):
            renderer.render(data)

    def test_given_data_with_special_chars_when_render_then_returns_escaped_string(self):
        template_path = self.root / "template.tex"
        template_content = r"Special chars: \VAR{text | escape_latex}"
        with open(template_path, "w") as f:
            f.write(template_content)
        renderer = LatexRenderer(self.root, "template.tex")
        data = {"text": "a & b % c # d _ e {f} g ~ h ^ i"}
        # Braces are now escaped too (security: prevents LaTeX injection)
        expected_output = (
            r"Special chars: a \& b \% c \# d \_ e \{f\} g \textasciitilde{} h \textasciicircum{} i"
        )

        result = renderer.render(data)

        self.assertEqual(result, expected_output)

    def test_given_data_with_latex_command_when_render_then_escapes_it(self):
        """User input containing LaTeX commands is escaped for security."""
        template_path = self.root / "template.tex"
        template_content = r"Latex: \VAR{text | escape_latex}"
        with open(template_path, "w") as f:
            f.write(template_content)
        renderer = LatexRenderer(self.root, "template.tex")
        data = {"text": r"\textbf{Bold}"}
        # Backslash → \textbackslash{}, then its {} are escaped too → \textbackslash\{\}
        expected_output = r"Latex: \textbackslash\{\}textbf\{Bold\}"

        result = renderer.render(data)

        self.assertEqual(result, expected_output)


if __name__ == "__main__":
    unittest.main()
