# This is the submodule from resume-website

# Dynamic LaTeX Resume Generator

This project dynamically generates a PDF resume from a YAML data file using Python and a LaTeX template.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.8+**
- **uv**: A fast Python package installer and resolver. Used for environment management.
- **A LaTeX Distribution**: You need a working LaTeX compiler.
  - **Windows**: [MiKTeX](https://miktex.org/)
  - **macOS**: [MacTeX](https://www.tug.org/mactex/)
  - **Linux**: TeX Live (e.g., `sudo apt-get install texlive-full` on Debian/Ubuntu).
  
  The build script specifically uses `latexmk`.

## Project Setup

1.  **Create the Virtual Environment**
    Create a dedicated virtual environment for the project using `uv`.
    ```bash
    uv venv
    ```

2.  **Activate the Environment**
    Activate the newly created environment.
    - On **Linux/macOS**:
      ```bash
      source .venv/bin/activate
      ```
    - On **Windows (Command Prompt)**:
      ```bash
      .venv\Scripts\activate.bat
      ```
    - On **Windows (PowerShell)**:
      ```powershell
      .venv\Scripts\Activate.ps1
      ```

3.  **Install Dependencies**
    Install the required Python packages.
    ```bash
    uv sync
    ```

## Usage

### Generating the Resume

To generate the PDF resume, simply run the build script:
```bash
python3 build.py
```
This will create `main.tex` and compile it into `main.pdf`. All temporary files will be cleaned up automatically.

### Running Tests

To run the unit tests and ensure everything is working correctly:
```bash
python3 -m unittest discover tests
```
