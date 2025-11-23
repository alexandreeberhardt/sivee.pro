from core import ResumeBuilder, ResumeConfig

if __name__ == "__main__":
    config = ResumeConfig(
        yaml_path="data.yml",
        template_path="template.tex",
        output_tex_path="main.tex"
    )
    
    builder = ResumeBuilder(config)
    builder.build()
