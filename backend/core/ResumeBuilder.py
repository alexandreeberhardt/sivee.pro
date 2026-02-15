from core import DataManager, LatexRenderer, PdfCompiler, ResumeConfig


class ResumeBuilder:
    """Facade orchestrating the resume generation process."""

    def __init__(self, config: ResumeConfig):
        self.config = config
        self.data_manager = DataManager(config.yaml_path)
        self.renderer = LatexRenderer(config.template_dir, config.template_name)
        self.compiler = PdfCompiler(config.output_tex_path)

    def build(self):
        """Executes the full build pipeline."""
        try:
            print("--- Starting resume generation ---")

            data = self.data_manager.load()
            print(f"Data loaded from {self.config.yaml_path}")

            tex_content = self.renderer.render(data)

            with open(self.config.output_tex_path, "w", encoding="utf-8") as f:
                f.write(tex_content)
            print(f"📝 TeX file generated: {self.config.output_tex_path}")

            self.compiler.compile(clean=False)

        except Exception as e:
            print(f"\n❌ FAILURE: {e}")
            exit(1)
        finally:
            self.compiler._clean_auxiliary_files()
