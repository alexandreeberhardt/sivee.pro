"""Additional edge-case tests for translations.py."""

from translations import DEFAULT_TITLES, PDF_TRANSLATIONS, get_section_title


class TestTranslationConsistency:
    def test_fr_en_have_same_keys(self):
        assert set(PDF_TRANSLATIONS["fr"].keys()) == set(PDF_TRANSLATIONS["en"].keys())

    def test_all_default_titles_types_match_translations(self):
        assert set(DEFAULT_TITLES.keys()) == set(PDF_TRANSLATIONS["fr"].keys())

    def test_each_type_has_multiple_defaults(self):
        for section_type, titles in DEFAULT_TITLES.items():
            assert len(titles) >= 1, f"{section_type} has no default titles"

    def test_pdf_translation_values_not_empty(self):
        for lang in ("fr", "en"):
            for key, val in PDF_TRANSLATIONS[lang].items():
                assert val, f"{lang}.{key} is empty"


class TestGetSectionTitleEdgeCases:
    def test_empty_string_custom_title_uses_translation(self):
        result = get_section_title("education", "en", "")
        assert result == "Education"

    def test_whitespace_custom_title_preserved(self):
        """A title with only spaces is not in DEFAULT_TITLES, so it's 'custom'."""
        result = get_section_title("education", "fr", "   ")
        assert result == "   "

    def test_all_default_titles_resolve_correctly(self):
        """Every title in DEFAULT_TITLES should resolve to the translated version."""
        for section_type, titles in DEFAULT_TITLES.items():
            if section_type == "custom":
                continue
            for title in titles:
                result_fr = get_section_title(section_type, "fr", title)
                assert result_fr == PDF_TRANSLATIONS["fr"][section_type], (
                    f"'{title}' for {section_type}/fr → '{result_fr}'"
                )

    def test_custom_with_default_title_string(self):
        """custom + 'Custom Section' title → 'Custom Section' preserved."""
        result = get_section_title("custom", "fr", "Custom Section")
        assert result == "Custom Section"

    def test_custom_with_autre(self):
        result = get_section_title("custom", "en", "Autre")
        assert result == "Autre"

    def test_skills_with_user_title_preserved(self):
        result = get_section_title("skills", "en", "My Technical Stack")
        assert result == "My Technical Stack"

    def test_leadership_default_variants(self):
        for title in DEFAULT_TITLES["leadership"]:
            result = get_section_title("leadership", "en", title)
            assert result == "Leadership & Community"
