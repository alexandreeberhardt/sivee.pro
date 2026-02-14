from pathlib import Path
from typing import Any

import yaml


class DataManager:
    """Responsible for loading and validating resume data."""

    def __init__(self, file_path: Path):
        self.file_path = file_path

    def load(self) -> dict[str, Any]:
        """Loads YAML data from the file system."""
        if not self.file_path.exists():
            raise FileNotFoundError(f"YAML file not found: {self.file_path}")

        with open(self.file_path, encoding="utf-8") as f:
            try:
                data = yaml.safe_load(f)
                if not isinstance(data, dict):
                    raise ValueError("The YAML file must contain a root object (dict).")
                return data
            except yaml.YAMLError as e:
                raise ValueError(f"YAML syntax error: {e}") from e
