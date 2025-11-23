from pathlib import Path


class ResumeConfig:
    """Configuration settings for the resume builder."""
    def __init__(self, yaml_path: str, template_path: str, output_tex_path: str):
        self.yaml_path = Path(yaml_path)
        self.template_path = Path(template_path)
        self.output_tex_path = Path(output_tex_path)
        self.template_dir = self.template_path.parent
        self.template_name = self.template_path.name