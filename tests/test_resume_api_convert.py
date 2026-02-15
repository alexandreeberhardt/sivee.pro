"""Tests for _convert_section_items in api/resumes.py."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from api.resumes import _convert_section_items


class TestConvertSectionItemsAPI:
    """Test the resume API's section converter (dict-based, not Pydantic)."""

    def test_skills_dict(self):
        section = {
            "id": "s1",
            "type": "skills",
            "title": "Skills",
            "items": {"languages": "Python", "tools": "Git"},
        }
        result = _convert_section_items(section, "fr")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 2
        assert result["content"][0] == {"category": "Programming Languages", "skills": "Python"}
        assert result["content"][1] == {"category": "Tools", "skills": "Git"}

    def test_skills_non_dict(self):
        section = {"id": "s1", "type": "skills", "title": "Skills", "items": "not a dict"}
        result = _convert_section_items(section, "fr")
        assert result["content"] == []

    def test_skills_empty_dict(self):
        section = {"id": "s1", "type": "skills", "title": "Skills", "items": {}}
        result = _convert_section_items(section, "fr")
        assert result["content"] == []

    def test_skills_list_passthrough(self):
        items = [
            {"id": "sk-1", "category": "Programming Languages", "skills": "Python"},
            {"id": "sk-2", "category": "Tools", "skills": "Git"},
        ]
        section = {"id": "s1", "type": "skills", "title": "Skills", "items": items}
        result = _convert_section_items(section, "fr")
        assert result["content"] == items

    def test_summary_string(self):
        section = {"id": "s1", "type": "summary", "title": "Summary", "items": "My bio"}
        result = _convert_section_items(section, "en")
        assert result["content"] == "My bio"

    def test_summary_none(self):
        section = {"id": "s1", "type": "summary", "title": "Summary", "items": None}
        result = _convert_section_items(section, "en")
        assert result["content"] == ""

    def test_languages_string(self):
        section = {"id": "s1", "type": "languages", "title": "Languages", "items": "French"}
        result = _convert_section_items(section, "fr")
        assert result["content"] == "French"

    def test_education_list(self):
        items = [{"school": "MIT", "degree": "BSc", "dates": "2020-2024"}]
        section = {"id": "s1", "type": "education", "title": "Education", "items": items}
        result = _convert_section_items(section, "fr")
        assert len(result["content"]) == 1

    def test_education_non_list(self):
        section = {"id": "s1", "type": "education", "title": "Education", "items": "not a list"}
        result = _convert_section_items(section, "fr")
        assert result["content"] == []

    def test_experiences_list(self):
        items = [{"title": "SWE", "company": "Google", "dates": "2023", "highlights": ["Built X"]}]
        section = {"id": "s1", "type": "experiences", "title": "Experience", "items": items}
        result = _convert_section_items(section, "en")
        assert result["content"][0]["title"] == "SWE"

    def test_projects_empty(self):
        section = {"id": "s1", "type": "projects", "title": "Projects", "items": []}
        result = _convert_section_items(section, "fr")
        assert result["content"] == []

    def test_custom_section(self):
        items = [{"title": "Hobby", "highlights": ["Reading"]}]
        section = {"id": "s1", "type": "custom", "title": "Hobbies", "items": items}
        result = _convert_section_items(section, "fr")
        assert result["title"] == "Hobbies"

    def test_default_visibility(self):
        section = {"id": "s1", "type": "summary", "title": "Summary", "items": "text"}
        result = _convert_section_items(section, "fr")
        assert result["isVisible"] is True

    def test_hidden_visibility(self):
        section = {
            "id": "s1",
            "type": "summary",
            "title": "Summary",
            "isVisible": False,
            "items": "text",
        }
        result = _convert_section_items(section, "fr")
        assert result["isVisible"] is False

    def test_missing_items_key(self):
        section = {"id": "s1", "type": "education", "title": "Education"}
        result = _convert_section_items(section, "fr")
        assert result["content"] == []

    def test_missing_title_defaults_empty(self):
        section = {"id": "s1", "type": "custom", "items": []}
        result = _convert_section_items(section, "fr")
        assert "title" in result

    def test_leadership_items(self):
        items = [{"role": "President", "place": "Club", "dates": "2023", "highlights": []}]
        section = {"id": "s1", "type": "leadership", "title": "Leadership", "items": items}
        result = _convert_section_items(section, "fr")
        assert result["content"][0]["role"] == "President"
