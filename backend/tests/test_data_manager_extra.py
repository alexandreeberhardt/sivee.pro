"""Additional edge-case tests for core/DataManager.py."""

import pytest

from core.DataManager import DataManager


@pytest.fixture()
def yaml_file(tmp_path):
    def _create(content: str, name: str = "data.yml"):
        p = tmp_path / name
        p.write_text(content, encoding="utf-8")
        return p

    return _create


class TestDataManagerEdgeCases:
    def test_empty_file_raises_value_error(self, yaml_file):
        path = yaml_file("")
        dm = DataManager(path)
        with pytest.raises(ValueError, match="root object"):
            dm.load()

    def test_null_root_raises(self, yaml_file):
        path = yaml_file("null")
        dm = DataManager(path)
        with pytest.raises(ValueError, match="root object"):
            dm.load()

    def test_string_root_raises(self, yaml_file):
        path = yaml_file("just a string")
        dm = DataManager(path)
        with pytest.raises(ValueError, match="root object"):
            dm.load()

    def test_integer_root_raises(self, yaml_file):
        path = yaml_file("42")
        dm = DataManager(path)
        with pytest.raises(ValueError, match="root object"):
            dm.load()

    def test_empty_dict_is_valid(self, yaml_file):
        path = yaml_file("{}")
        dm = DataManager(path)
        assert dm.load() == {}

    def test_unicode_content(self, yaml_file):
        path = yaml_file("nom: François\nville: Zürich\nemoji: 🎓")
        dm = DataManager(path)
        data = dm.load()
        assert data["nom"] == "François"
        assert data["emoji"] == "🎓"

    def test_nested_structure(self, yaml_file):
        content = """
sections:
  - type: education
    items:
      - school: MIT
        degree: BS
  - type: skills
    items:
      languages: Python
"""
        path = yaml_file(content)
        dm = DataManager(path)
        data = dm.load()
        assert len(data["sections"]) == 2

    def test_stores_file_path(self, yaml_file):
        path = yaml_file("key: val")
        dm = DataManager(path)
        assert dm.file_path == path

    def test_boolean_values(self, yaml_file):
        path = yaml_file("active: true\ndraft: false")
        dm = DataManager(path)
        data = dm.load()
        assert data["active"] is True
        assert data["draft"] is False

    def test_multiline_string(self, yaml_file):
        content = "summary: |\n  Line one.\n  Line two.\n  Line three."
        path = yaml_file(content)
        dm = DataManager(path)
        data = dm.load()
        assert "Line one." in data["summary"]
        assert "Line two." in data["summary"]
