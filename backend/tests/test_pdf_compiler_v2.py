"""Comprehensive tests for PdfCompiler — subprocess mocking, cleanup, security."""

import subprocess
from unittest.mock import MagicMock, patch

import pytest

from core.PdfCompiler import PdfCompiler


@pytest.fixture()
def tmp_dir(tmp_path):
    return tmp_path


@pytest.fixture()
def tex_file(tmp_dir):
    """Create a dummy .tex file."""
    p = tmp_dir / "main.tex"
    p.write_text(r"\documentclass{article}\begin{document}Hello\end{document}")
    return p


class TestPdfCompilerInit:
    def test_stores_tex_path(self, tex_file):
        compiler = PdfCompiler(tex_file)
        assert compiler.tex_file == tex_file


class TestCompile:
    def test_missing_tex_file_raises(self, tmp_dir):
        compiler = PdfCompiler(tmp_dir / "nonexistent.tex")
        with pytest.raises(FileNotFoundError, match="TeX file not found"):
            compiler.compile()

    @patch("core.PdfCompiler.subprocess.run")
    def test_calls_latexmk_with_correct_args(self, mock_run, tex_file):
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=False)

        args = mock_run.call_args
        cmd = args[0][0]
        assert cmd[0] == "latexmk"
        assert "-pdf" in cmd
        assert "-no-shell-escape" in cmd
        assert "-interaction=nonstopmode" in cmd
        assert f"-outdir={tex_file.parent}" in cmd
        assert str(tex_file) in cmd

    @patch("core.PdfCompiler.subprocess.run")
    def test_no_shell_escape_flag_present(self, mock_run, tex_file):
        """Security: -no-shell-escape must always be in the command."""
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=False)

        cmd = mock_run.call_args[0][0]
        assert "-no-shell-escape" in cmd

    @patch("core.PdfCompiler.subprocess.run")
    def test_subprocess_called_with_check_true(self, mock_run, tex_file):
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=False)

        kwargs = mock_run.call_args[1]
        assert kwargs["check"] is True

    @patch("core.PdfCompiler.subprocess.run")
    def test_stdout_suppressed(self, mock_run, tex_file):
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=False)

        kwargs = mock_run.call_args[1]
        assert kwargs["stdout"] == subprocess.DEVNULL

    @patch("core.PdfCompiler.subprocess.run")
    def test_stderr_captured(self, mock_run, tex_file):
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)
        compiler.compile(clean=False)

        kwargs = mock_run.call_args[1]
        assert kwargs["stderr"] == subprocess.PIPE

    @patch("core.PdfCompiler.subprocess.run")
    def test_compilation_failure_raises_runtime_error(self, mock_run, tex_file):
        mock_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd="latexmk", stderr=b"! LaTeX Error: File not found"
        )
        compiler = PdfCompiler(tex_file)
        with pytest.raises(RuntimeError, match="LaTeX compilation failed"):
            compiler.compile()

    @patch("core.PdfCompiler.subprocess.run")
    def test_compilation_failure_with_no_stderr(self, mock_run, tex_file):
        mock_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd="latexmk", stderr=None
        )
        compiler = PdfCompiler(tex_file)
        with pytest.raises(RuntimeError):
            compiler.compile()

    @patch("core.PdfCompiler.subprocess.run")
    def test_compile_with_clean_true_calls_cleanup(self, mock_run, tex_file):
        mock_run.return_value = MagicMock()
        compiler = PdfCompiler(tex_file)

        # Create aux files
        for ext in [".aux", ".log", ".out"]:
            (tex_file.parent / f"main{ext}").touch()

        compiler.compile(clean=True)

        # Aux files should be cleaned
        for ext in [".aux", ".log", ".out"]:
            assert not (tex_file.parent / f"main{ext}").exists()


class TestCleanAuxiliaryFiles:
    def test_removes_all_aux_extensions(self, tex_file):
        extensions = [".aux", ".log", ".out", ".fls", ".fdb_latexmk", ".synctex.gz"]
        for ext in extensions:
            (tex_file.parent / f"main{ext}").touch()

        compiler = PdfCompiler(tex_file)
        compiler._clean_auxiliary_files()

        for ext in extensions:
            assert not (tex_file.parent / f"main{ext}").exists()

    def test_does_not_fail_on_missing_aux_files(self, tex_file):
        """Cleanup should not raise if aux files don't exist."""
        compiler = PdfCompiler(tex_file)
        compiler._clean_auxiliary_files()  # Should not raise

    def test_preserves_pdf(self, tex_file):
        """The PDF output should NOT be deleted."""
        pdf = tex_file.parent / "main.pdf"
        pdf.touch()
        compiler = PdfCompiler(tex_file)
        compiler._clean_auxiliary_files()
        assert pdf.exists()

    def test_preserves_other_files(self, tex_file):
        """Non-aux files with different stems should be preserved."""
        other = tex_file.parent / "other.aux"
        other.touch()
        compiler = PdfCompiler(tex_file)
        compiler._clean_auxiliary_files()
        assert other.exists()


class TestCleanMainTex:
    def test_removes_main_tex(self, tex_file):
        main_tex = tex_file.parent / "main.tex"
        main_tex.touch()
        compiler = PdfCompiler(tex_file)
        compiler._clean_main_tex()
        assert not main_tex.exists()

    def test_no_error_if_main_tex_missing(self, tmp_dir):
        compiler = PdfCompiler(tmp_dir / "other.tex")
        compiler._clean_main_tex()  # Should not raise

    def test_only_removes_main_tex_not_other_tex(self, tex_file):
        other_tex = tex_file.parent / "other.tex"
        other_tex.touch()
        compiler = PdfCompiler(tex_file)
        compiler._clean_main_tex()
        assert other_tex.exists()
