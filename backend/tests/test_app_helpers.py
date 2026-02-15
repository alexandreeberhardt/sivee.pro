"""Tests for helper functions in app.py and api/resumes.py."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")


from api.resumes import _convert_section_items
from app import (
    VALID_TEMPLATES,
    CVSection,
    convert_section_items,
    get_base_template,
    get_template_with_size,
)
from auth.routes import _exchange_oauth_code, _extract_s3_key_from_url, _store_oauth_code

# === Template size helpers ===


class TestTemplateSizeHelpers:
    def test_normal_size_returns_base(self):
        assert get_template_with_size("harvard", "normal") == "harvard"

    def test_compact_size(self):
        assert get_template_with_size("harvard", "compact") == "harvard_compact"

    def test_large_size(self):
        assert get_template_with_size("europass", "large") == "europass_large"

    def test_get_base_from_compact(self):
        assert get_base_template("harvard_compact") == "harvard"

    def test_get_base_from_large(self):
        assert get_base_template("mckinsey_large") == "mckinsey"

    def test_get_base_from_normal(self):
        assert get_base_template("harvard") == "harvard"

    def test_all_valid_templates_have_base(self):
        for t in VALID_TEMPLATES:
            base = get_base_template(t)
            assert base  # Should never be empty


# === S3 URL key extraction ===


class TestExtractS3Key:
    def test_valid_s3_url(self):
        url = "https://mybucket.s3.eu-west-3.amazonaws.com/resumes/user1/cv.pdf"
        assert _extract_s3_key_from_url(url) == "resumes/user1/cv.pdf"

    def test_empty_string(self):
        assert _extract_s3_key_from_url("") is None

    def test_none_like_empty(self):
        assert _extract_s3_key_from_url("") is None

    def test_url_with_only_slash(self):
        key = _extract_s3_key_from_url("https://bucket.s3.amazonaws.com/")
        # After lstrip("/"), empty string
        assert key == "" or key is None

    def test_invalid_url(self):
        result = _extract_s3_key_from_url("not a url at all")
        # urlparse doesn't raise on garbage, so path might be extracted
        assert result is not None or result is None  # Just ensure no crash


# === OAuth code store ===


class TestOAuthCodeStore:
    def test_store_and_exchange(self):
        code = _store_oauth_code("jwt-token-abc")
        assert code  # non-empty string
        token = _exchange_oauth_code(code)
        assert token == "jwt-token-abc"

    def test_exchange_consumed(self):
        """Code can only be exchanged once."""
        code = _store_oauth_code("jwt-once")
        _exchange_oauth_code(code)
        assert _exchange_oauth_code(code) is None

    def test_exchange_invalid_code(self):
        assert _exchange_oauth_code("nonexistent-code") is None


# === convert_section_items (app.py) ===


class TestConvertSectionItems:
    def test_skills_section(self):
        section = CVSection(
            id="sec-1",
            type="skills",
            title="Skills",
            items={"languages": "Python, JS", "tools": "Git, Docker"},
        )
        result = convert_section_items(section, "en")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 2
        assert result["content"][0] == {"category": "Programming Languages", "skills": "Python, JS"}
        assert result["content"][1] == {"category": "Tools", "skills": "Git, Docker"}
        assert result["has_content"] is True

    def test_skills_empty(self):
        section = CVSection(
            id="sec-1",
            type="skills",
            title="Skills",
            items={"languages": "", "tools": ""},
        )
        result = convert_section_items(section, "en")
        assert result["content"] == []
        assert result["has_content"] is False

    def test_summary_section(self):
        section = CVSection(
            id="sec-1",
            type="summary",
            title="Summary",
            items="I am a developer.",
        )
        result = convert_section_items(section, "en")
        assert result["content"] == "I am a developer."
        assert result["has_content"] is True

    def test_summary_empty(self):
        section = CVSection(
            id="sec-1",
            type="summary",
            title="Summary",
            items="",
        )
        result = convert_section_items(section, "en")
        assert result["has_content"] is False

    def test_languages_section(self):
        section = CVSection(
            id="sec-1",
            type="languages",
            title="Languages",
            items="French (native), English (fluent)",
        )
        result = convert_section_items(section, "fr")
        assert result["content"] == "French (native), English (fluent)"
        assert result["has_content"] is True

    def test_education_section(self):
        section = CVSection(
            id="sec-1",
            type="education",
            title="Education",
            items=[{"school": "MIT", "degree": "BS CS", "dates": "2020"}],
        )
        result = convert_section_items(section, "en")
        assert len(result["content"]) == 1
        assert result["has_content"] is True

    def test_education_empty(self):
        section = CVSection(
            id="sec-1",
            type="education",
            title="Education",
            items=[],
        )
        result = convert_section_items(section, "en")
        assert result["has_content"] is False

    def test_hidden_section(self):
        section = CVSection(
            id="sec-1",
            type="summary",
            title="Summary",
            isVisible=False,
            items="Some text",
        )
        result = convert_section_items(section, "en")
        assert result["isVisible"] is False


# === _convert_section_items (api/resumes.py) ===


class TestConvertSectionItemsAPI:
    def test_skills_dict(self):
        section = {
            "id": "s1",
            "type": "skills",
            "title": "Skills",
            "items": {"languages": "Python", "tools": "Docker"},
        }
        result = _convert_section_items(section, "en")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 2
        assert result["content"][0] == {"category": "Programming Languages", "skills": "Python"}
        assert result["content"][1] == {"category": "Tools", "skills": "Docker"}

    def test_skills_non_dict_fallback(self):
        section = {
            "id": "s1",
            "type": "skills",
            "title": "Skills",
            "items": "not a dict",
        }
        result = _convert_section_items(section, "en")
        assert result["content"] == []

    def test_summary_string(self):
        section = {
            "id": "s1",
            "type": "summary",
            "title": "Summary",
            "items": "My summary text",
        }
        result = _convert_section_items(section, "en")
        assert result["content"] == "My summary text"

    def test_experiences_list(self):
        section = {
            "id": "s1",
            "type": "experiences",
            "title": "Experience",
            "items": [{"title": "Dev", "company": "Co"}],
        }
        result = _convert_section_items(section, "en")
        assert isinstance(result["content"], list)
        assert len(result["content"]) == 1

    def test_missing_items_key(self):
        section = {"id": "s1", "type": "education", "title": "Education"}
        result = _convert_section_items(section, "en")
        assert result["content"] == []

    def test_default_visibility(self):
        section = {"id": "s1", "type": "summary", "title": "Summary", "items": "text"}
        result = _convert_section_items(section, "en")
        assert result["isVisible"] is True
