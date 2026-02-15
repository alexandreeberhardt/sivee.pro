"""Tests for translations.py - pure logic, no mocks needed."""

import pytest

from translations import PDF_TRANSLATIONS, get_section_title


class TestGetSectionTitle:
    """Tests for get_section_title()."""

    # --- Default titles (no custom_title) ---

    def test_default_french_education(self):
        assert get_section_title("education", "fr") == "Formation"

    def test_default_english_education(self):
        assert get_section_title("education", "en") == "Education"

    def test_default_french_experiences(self):
        assert get_section_title("experiences", "fr") == "Expérience Professionnelle"

    def test_default_english_experiences(self):
        assert get_section_title("experiences", "en") == "Professional Experience"

    @pytest.mark.parametrize(
        "section_type",
        [
            "summary",
            "education",
            "experiences",
            "projects",
            "skills",
            "leadership",
            "languages",
        ],
    )
    def test_all_section_types_have_french_translation(self, section_type):
        result = get_section_title(section_type, "fr")
        assert result == PDF_TRANSLATIONS["fr"][section_type]

    @pytest.mark.parametrize(
        "section_type",
        [
            "summary",
            "education",
            "experiences",
            "projects",
            "skills",
            "leadership",
            "languages",
        ],
    )
    def test_all_section_types_have_english_translation(self, section_type):
        result = get_section_title(section_type, "en")
        assert result == PDF_TRANSLATIONS["en"][section_type]

    # --- Default title passed explicitly (should still translate) ---

    def test_default_title_in_english_translates_to_french(self):
        result = get_section_title("education", "fr", custom_title="Education")
        assert result == "Formation"

    def test_default_title_in_french_translates_to_english(self):
        result = get_section_title("education", "en", custom_title="Formation")
        assert result == "Education"

    # --- Custom (user-personalized) titles ---

    def test_custom_title_is_preserved(self):
        result = get_section_title("education", "fr", custom_title="Parcours Académique")
        assert result == "Parcours Académique"

    def test_custom_title_is_preserved_in_english(self):
        result = get_section_title("experiences", "en", custom_title="Work History")
        assert result == "Work History"

    # --- Custom section type ---

    def test_custom_section_with_title(self):
        result = get_section_title("custom", "fr", custom_title="Certifications")
        assert result == "Certifications"

    def test_custom_section_without_title_french(self):
        result = get_section_title("custom", "fr")
        assert result == "Autre"

    def test_custom_section_without_title_english(self):
        result = get_section_title("custom", "en")
        assert result == "Other"

    # --- Unknown language fallback ---

    def test_unknown_lang_falls_back_to_french(self):
        result = get_section_title("education", "de")
        assert result == "Formation"

    # --- Unknown section type ---

    def test_unknown_section_type_returns_capitalized(self):
        result = get_section_title("hobbies", "fr")
        assert result == "Hobbies"
