"""Tests for core/ResumeConfig.py."""

from pathlib import Path

from core.ResumeConfig import ResumeConfig


class TestResumeConfig:
    def test_init_sets_paths(self):
        config = ResumeConfig(
            yaml_path="/data/cv.yml",
            template_path="/templates/harvard.tex",
            output_tex_path="/output/main.tex",
        )
        assert config.yaml_path == Path("/data/cv.yml")
        assert config.template_path == Path("/templates/harvard.tex")
        assert config.output_tex_path == Path("/output/main.tex")

    def test_template_dir_extracted(self):
        config = ResumeConfig(
            yaml_path="data.yml",
            template_path="/templates/folder/harvard.tex",
            output_tex_path="out.tex",
        )
        assert config.template_dir == Path("/templates/folder")

    def test_template_name_extracted(self):
        config = ResumeConfig(
            yaml_path="data.yml",
            template_path="/templates/europass.tex",
            output_tex_path="out.tex",
        )
        assert config.template_name == "europass.tex"

    def test_relative_paths(self):
        config = ResumeConfig(
            yaml_path="data.yml",
            template_path="templates/cv.tex",
            output_tex_path="output/main.tex",
        )
        assert config.yaml_path == Path("data.yml")
        assert config.template_name == "cv.tex"
