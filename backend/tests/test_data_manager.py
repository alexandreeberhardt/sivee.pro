import tempfile
import unittest
from pathlib import Path

import yaml

from core import DataManager


class DataManagerTest(unittest.TestCase):
    def setUp(self):
        """Sets up a temporary directory for tests."""
        self.test_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.test_dir.name)

    def tearDown(self):
        """Cleans up the temporary directory."""
        self.test_dir.cleanup()

    def test_given_valid_yaml_file_when_load_then_returns_data_dict(self):
        yaml_path = self.root / "data.yml"
        expected_data = {"key": "value"}
        with open(yaml_path, "w") as f:
            yaml.dump(expected_data, f)
        data_manager = DataManager(yaml_path)

        data = data_manager.load()

        self.assertEqual(data, expected_data)

    def test_given_non_existent_file_when_load_then_raises_file_not_found_error(self):
        non_existent_path = self.root / "non_existent.yml"
        data_manager = DataManager(non_existent_path)

        with self.assertRaises(FileNotFoundError):
            data_manager.load()

    def test_given_malformed_yaml_file_when_load_then_raises_value_error(self):
        yaml_path = self.root / "malformed.yml"
        with open(yaml_path, "w") as f:
            f.write("key: value: another_value")
        data_manager = DataManager(yaml_path)

        with self.assertRaises(ValueError) as context:
            data_manager.load()
        self.assertIn("YAML syntax error", str(context.exception))

    def test_given_yaml_file_with_non_dict_root_when_load_then_raises_value_error(self):
        yaml_path = self.root / "list_root.yml"
        with open(yaml_path, "w") as f:
            yaml.dump(["item1", "item2"], f)
        data_manager = DataManager(yaml_path)

        with self.assertRaises(ValueError) as context:
            data_manager.load()
        self.assertIn("must contain a root object (dict)", str(context.exception))


if __name__ == "__main__":
    unittest.main()
