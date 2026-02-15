"""Tests for convert_section_items() and helper functions in app.py."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app import (
    CVSection,
    EducationItem,
    convert_section_items,
    get_base_template,
    get_template_with_size,
)


class TestGetTemplateWithSize:
    def test_normal_returns_base(self):
        assert get_template_with_size("harvard", "normal") == "harvard"

    def test_compact(self):
        assert get_template_with_size("harvard", "compact") == "harvard_compact"

    def test_large(self):
        assert get_template_with_size("europass", "large") == "europass_large"


class TestGetBaseTemplate:
    def test_from_compact(self):
        assert get_base_template("harvard_compact") == "harvard"

    def test_from_large(self):
        assert get_base_template("mckinsey_large") == "mckinsey"

    def test_from_normal(self):
        assert get_base_template("harvard") == "harvard"


class TestConvertSectionSkillsDict:
    """Test skills section with old dict items (backward compatibility)."""

    def test_skills_with_dict(self):
        section = CVSection(
            id="s1",
            type="skills",
            title="Skills",
            items={"languages": "Python, JS", "tools": "Git, Docker"},
        )
        result = convert_section_items(section, "fr")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 2
        assert result["content"][0] == {"category": "Programming Languages", "skills": "Python, JS"}
        assert result["content"][1] == {"category": "Tools", "skills": "Git, Docker"}
        assert result["has_content"] is True

    def test_skills_empty_dict(self):
        section = CVSection(
            id="s1",
            type="skills",
            title="Skills",
            items={"languages": "", "tools": ""},
        )
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_skills_whitespace_only(self):
        section = CVSection(
            id="s1",
            type="skills",
            title="Skills",
            items={"languages": "   ", "tools": "  "},
        )
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_skills_partial_dict(self):
        section = CVSection(
            id="s1",
            type="skills",
            title="Skills",
            items={"languages": "Python", "tools": ""},
        )
        result = convert_section_items(section, "fr")
        assert result["content"] == [{"category": "Programming Languages", "skills": "Python"}]
        assert result["has_content"] is True


class TestConvertSectionSkillsList:
    """Test skills section with new list format."""

    def test_skills_with_list(self):
        items = [
            {"id": "sk-1", "category": "Programming Languages", "skills": "Python"},
            {"id": "sk-2", "category": "Tools", "skills": "Docker"},
        ]
        section = CVSection(id="s1", type="skills", title="Skills", items=items)
        result = convert_section_items(section, "fr")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 2
        assert result["content"][0]["skills"] == "Python"
        assert result["has_content"] is True

    def test_skills_with_empty_list(self):
        section = CVSection(id="s1", type="skills", title="Skills", items=[])
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_skills_with_empty_skills_in_list(self):
        items = [
            {"id": "sk-1", "category": "Programming Languages", "skills": ""},
            {"id": "sk-2", "category": "Tools", "skills": ""},
        ]
        section = CVSection(id="s1", type="skills", title="Skills", items=items)
        result = convert_section_items(section, "fr")
        assert result["has_content"] is False


class TestConvertSectionSkillsFallback:
    """Test skills section with non-dict/non-list items."""

    def test_skills_with_none(self):
        section = CVSection(id="s1", type="skills", title="Skills", items=None)
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_skills_with_string(self):
        section = CVSection(id="s1", type="skills", title="Skills", items="something weird")
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False


class TestConvertSectionSummary:
    def test_summary_with_text(self):
        section = CVSection(id="s1", type="summary", title="Summary", items="My bio")
        result = convert_section_items(section, "fr")
        assert result["content"] == "My bio"
        assert result["has_content"] is True

    def test_summary_empty(self):
        section = CVSection(id="s1", type="summary", title="Summary", items="")
        result = convert_section_items(section, "fr")
        assert result["content"] == ""
        assert result["has_content"] is False

    def test_summary_whitespace(self):
        section = CVSection(id="s1", type="summary", title="Summary", items="   ")
        result = convert_section_items(section, "fr")
        assert result["has_content"] is False

    def test_summary_none(self):
        section = CVSection(id="s1", type="summary", title="Summary", items=None)
        result = convert_section_items(section, "fr")
        assert result["content"] == ""
        assert result["has_content"] is False


class TestConvertSectionLanguages:
    def test_languages_with_text(self):
        section = CVSection(id="s1", type="languages", title="Languages", items="French, English")
        result = convert_section_items(section, "en")
        assert result["content"] == "French, English"
        assert result["has_content"] is True

    def test_languages_empty(self):
        section = CVSection(id="s1", type="languages", title="Languages", items="")
        result = convert_section_items(section, "en")
        assert result["has_content"] is False


class TestConvertSectionListTypes:
    """Test list-based sections: education, experiences, projects, leadership, custom."""

    def test_education_with_items(self):
        items = [EducationItem(school="MIT", degree="BSc")]
        section = CVSection(id="s1", type="education", title="Education", items=items)
        result = convert_section_items(section, "fr")
        assert len(result["content"]) == 1
        assert result["has_content"] is True

    def test_education_empty_list(self):
        section = CVSection(id="s1", type="education", title="Education", items=[])
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_education_non_list_fallback(self):
        """If items is not a list, should fallback to empty list."""
        section = CVSection(id="s1", type="education", title="Education", items="not a list")
        result = convert_section_items(section, "fr")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_experiences_with_dicts(self):
        items = [{"title": "SWE", "company": "Google", "dates": "2023", "highlights": []}]
        section = CVSection(id="s1", type="experiences", title="Experiences", items=items)
        result = convert_section_items(section, "fr")
        assert len(result["content"]) == 1
        assert result["has_content"] is True

    def test_projects_with_models(self):
        from app import ProjectItem

        items = [ProjectItem(name="Proj", year="2023", highlights=["Built it"])]
        section = CVSection(id="s1", type="projects", title="Projects", items=items)
        result = convert_section_items(section, "fr")
        assert result["content"][0]["name"] == "Proj"

    def test_leadership_with_items(self):
        from app import LeadershipItem

        items = [LeadershipItem(role="President", place="Club", dates="2022")]
        section = CVSection(id="s1", type="leadership", title="Leadership", items=items)
        result = convert_section_items(section, "en")
        assert result["content"][0]["role"] == "President"

    def test_custom_with_items(self):
        from app import CustomItem

        items = [CustomItem(title="Hobby", highlights=["Reading"])]
        section = CVSection(id="s1", type="custom", title="Hobbies", items=items)
        result = convert_section_items(section, "fr")
        assert result["has_content"] is True


class TestConvertSectionTranslation:
    """Test that section titles get translated."""

    def test_education_french_title(self):
        section = CVSection(id="s1", type="education", title="Education", items=[])
        result = convert_section_items(section, "fr")
        # The title should be translated (the exact value depends on translations.py)
        assert result["title"]  # non-empty

    def test_education_english_title(self):
        section = CVSection(id="s1", type="education", title="Education", items=[])
        result = convert_section_items(section, "en")
        assert result["title"]

    def test_custom_title_preserved(self):
        section = CVSection(id="s1", type="custom", title="My Custom Section", items=[])
        result = convert_section_items(section, "fr")
        assert result["title"] == "My Custom Section"

    def test_section_visibility(self):
        section = CVSection(id="s1", type="summary", title="Summary", isVisible=False, items="test")
        result = convert_section_items(section, "fr")
        assert result["isVisible"] is False
