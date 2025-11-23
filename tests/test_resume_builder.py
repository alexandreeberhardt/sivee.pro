import unittest
from unittest.mock import patch, MagicMock, mock_open
from pathlib import Path
from core import ResumeBuilder, ResumeConfig

class ResumeBuilderTest(unittest.TestCase):

    def setUp(self):
        """Creates a mock ResumeConfig for the builder."""
        self.mock_config = ResumeConfig(
            yaml_path="dummy.yml",
            template_path="dummy.tex",
            output_tex_path="dummy_out.tex"
        )

    @patch('core.ResumeBuilder.PdfCompiler')
    @patch('core.ResumeBuilder.LatexRenderer')
    @patch('core.ResumeBuilder.DataManager')
    def test_given_successful_build_when_build_then_calls_all_components_in_order(
        self, MockDataManager, MockLatexRenderer, MockPdfCompiler
    ):
        mock_data_manager = MockDataManager.return_value
        mock_data_manager.load.return_value = {"key": "value"}
        mock_renderer = MockLatexRenderer.return_value
        mock_renderer.render.return_value = "tex content"
        mock_compiler = MockPdfCompiler.return_value
        builder = ResumeBuilder(self.mock_config)
        
        m = mock_open()
        with patch('builtins.open', m):
            builder.build()

        mock_data_manager.load.assert_called_once()
        mock_renderer.render.assert_called_once_with({"key": "value"})
        m.assert_called_once_with(self.mock_config.output_tex_path, "w", encoding="utf-8")
        m().write.assert_called_once_with("tex content")
        mock_compiler.compile.assert_called_once_with(clean=False)
        mock_compiler._clean_auxiliary_files.assert_called_once()

    @patch('core.ResumeBuilder.PdfCompiler')
    @patch('core.ResumeBuilder.LatexRenderer')
    @patch('core.ResumeBuilder.DataManager')
    def test_given_failing_renderer_when_build_then_calls_cleanup_in_finally_block(
        self, MockDataManager, MockLatexRenderer, MockPdfCompiler
    ):
        mock_data_manager = MockDataManager.return_value
        mock_data_manager.load.return_value = {"key": "value"}
        mock_renderer = MockLatexRenderer.return_value
        mock_renderer.render.side_effect = RuntimeError("Rendering failed")
        mock_compiler = MockPdfCompiler.return_value
        builder = ResumeBuilder(self.mock_config)
        
        with self.assertRaises(SystemExit):
            builder.build()
        
        mock_compiler._clean_auxiliary_files.assert_called_once()
        mock_compiler.compile.assert_not_called()

if __name__ == '__main__':
    unittest.main()
