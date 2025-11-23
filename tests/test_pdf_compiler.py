import unittest
from unittest.mock import patch, MagicMock
import tempfile
from pathlib import Path
import subprocess
from core import PdfCompiler

class PdfCompilerTest(unittest.TestCase):

    def setUp(self):
        """Sets up a temporary directory for tests."""
        self.test_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.test_dir.name)

    def tearDown(self):
        """Cleans up the temporary directory."""
        self.test_dir.cleanup()

    def test_given_non_existent_tex_file_when_compile_then_raises_file_not_found_error(self):
        tex_path = self.root / "main.tex"
        compiler = PdfCompiler(tex_path)

        with self.assertRaises(FileNotFoundError):
            compiler.compile()

    @patch('subprocess.run')
    def test_given_valid_tex_file_when_compile_then_calls_subprocess_run(self, mock_subprocess_run):
        tex_path = self.root / "main.tex"
        tex_path.touch()
        mock_subprocess_run.return_value = MagicMock(check=True)
        compiler = PdfCompiler(tex_path)
        expected_cmd = [
            "latexmk",
            "-pdf",
            "-interaction=nonstopmode",
            f"-outdir={self.root}",
            str(tex_path)
        ]

        compiler.compile(clean=False)

        mock_subprocess_run.assert_called_once_with(
            expected_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )

    @patch('subprocess.run')
    def test_given_latex_compilation_fails_when_compile_then_raises_runtime_error(self, mock_subprocess_run):
        tex_path = self.root / "main.tex"
        tex_path.touch()
        mock_subprocess_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd="latexmk", stderr=b"Test LaTeX Error"
        )
        compiler = PdfCompiler(tex_path)

        with self.assertRaises(RuntimeError):
            compiler.compile()

    def test_given_auxiliary_files_exist_when_clean_auxiliary_files_then_removes_files(self):
        tex_path = self.root / "main.tex"
        compiler = PdfCompiler(tex_path)
        extensions = ['.aux', '.log', '.out', '.fls', '.fdb_latexmk', '.synctex.gz']
        for ext in extensions:
            (self.root / f"main{ext}").touch()

        compiler._clean_auxiliary_files()

        for ext in extensions:
            self.assertFalse((self.root / f"main{ext}").exists(), f"File with ext {ext} was not removed.")

if __name__ == '__main__':
    unittest.main()
