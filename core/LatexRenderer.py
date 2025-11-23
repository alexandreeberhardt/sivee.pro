from pathlib import Path
from typing import Any, Dict
from jinja2 import Environment, FileSystemLoader, TemplateNotFound


class LatexRenderer:
    """Responsible for rendering the Jinja2 template into LaTeX code."""
    def __init__(self, template_dir: Path, template_name: str):
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            block_start_string=r'\BLOCK{',
            block_end_string=r'}',
            variable_start_string=r'\VAR{',
            variable_end_string=r'}',
            comment_start_string=r'\#{',
            comment_end_string=r'}',
            trim_blocks=True,
            lstrip_blocks=True
        )
        self.env.filters['escape_latex'] = self.escape_latex
        self.template_name = template_name

    @staticmethod
    def escape_latex(text: str) -> str:
        """Escapes special LaTeX characters in a string."""
        if not isinstance(text, str):
            return text
        # Backslash is not escaped to allow for LaTeX commands in the YAML file.
        replacements = {
            '&': r'\&',
            '%': r'\%',
            '$': r'\$',
            '#': r'\#',
            '_': r'\_',
            '~': r'\textasciitilde{}',
            '^': r'\textasciicircum{}',
        }
        for char, replacement in replacements.items():
            text = text.replace(char, replacement)
        return text

    def render(self, data: Dict[str, Any]) -> str:
        """Renders the template with provided data."""
        try:
            template = self.env.get_template(self.template_name)
            return template.render(**data)
        except TemplateNotFound:
            raise FileNotFoundError(f"Template not found: {self.template_name}")
        except Exception as e:
            raise RuntimeError(f"Jinja2 rendering error: {e}")