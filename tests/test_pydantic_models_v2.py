"""Comprehensive tests for Pydantic models in app.py."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from pydantic import ValidationError

from app import (
    CustomItem,
    CVSection,
    EducationItem,
    ExperienceItem,
    LeadershipItem,
    OptimalSizeResponse,
    PersonalInfo,
    ProfessionalLink,
    ProjectItem,
    ResumeData,
)


class TestProfessionalLink:
    def test_defaults(self):
        link = ProfessionalLink()
        assert link.platform == "linkedin"
        assert link.username == ""
        assert link.url == ""

    def test_valid_url(self):
        link = ProfessionalLink(url="https://github.com/user")
        assert link.url == "https://github.com/user"

    def test_http_url_accepted(self):
        link = ProfessionalLink(url="http://example.com")
        assert link.url == "http://example.com"

    def test_invalid_url_rejected(self):
        with pytest.raises(ValidationError, match="URL must start with"):
            ProfessionalLink(url="ftp://example.com")

    def test_empty_url_accepted(self):
        link = ProfessionalLink(url="")
        assert link.url == ""

    def test_max_length_platform(self):
        link = ProfessionalLink(platform="a" * 50)
        assert len(link.platform) == 50

    def test_platform_too_long(self):
        with pytest.raises(ValidationError):
            ProfessionalLink(platform="a" * 51)


class TestPersonalInfo:
    def test_defaults(self):
        info = PersonalInfo()
        assert info.name == ""
        assert info.links == []

    def test_github_migration(self):
        """Legacy github fields should migrate to links."""
        info = PersonalInfo(github="user", github_url="https://github.com/user")
        assert len(info.links) == 1
        assert info.links[0].platform == "github"
        assert info.links[0].username == "user"
        assert info.github is None
        assert info.github_url is None

    def test_no_migration_when_links_present(self):
        """If links are already set, github fields should not add duplicates."""
        existing_link = ProfessionalLink(
            platform="linkedin", username="me", url="https://linkedin.com/in/me"
        )
        info = PersonalInfo(
            links=[existing_link], github="user", github_url="https://github.com/user"
        )
        assert len(info.links) == 1
        assert info.links[0].platform == "linkedin"

    def test_max_links(self):
        links = [ProfessionalLink() for _ in range(20)]
        info = PersonalInfo(links=links)
        assert len(info.links) == 20

    def test_too_many_links(self):
        with pytest.raises(ValidationError):
            PersonalInfo(links=[ProfessionalLink() for _ in range(21)])

    def test_email_max_length(self):
        info = PersonalInfo(email="a" * 254)
        assert len(info.email) == 254


class TestProjectItem:
    def test_year_string(self):
        item = ProjectItem(name="Test", year="2023")
        assert item.year == "2023"

    def test_year_int_converted(self):
        item = ProjectItem(name="Test", year=2023)
        assert item.year == "2023"

    def test_year_none_converted(self):
        item = ProjectItem(name="Test", year=None)
        assert item.year == ""

    def test_defaults(self):
        item = ProjectItem()
        assert item.name == ""
        assert item.highlights == []


class TestCVSection:
    def test_summary_section(self):
        section = CVSection(id="s1", type="summary", title="Summary", items="My bio text")
        assert section.items == "My bio text"

    def test_skills_section_list(self):
        section = CVSection(
            id="s2",
            type="skills",
            title="Skills",
            items=[
                {"id": "sk-1", "category": "Programming Languages", "skills": "Python"},
                {"id": "sk-2", "category": "Tools", "skills": "Git"},
            ],
        )
        assert isinstance(section.items, list)
        assert len(section.items) == 2
        assert section.items[0]["skills"] == "Python"

    def test_education_section_list(self):
        section = CVSection(id="s3", type="education", title="Education", items=[])
        assert section.items == []

    def test_visible_default(self):
        section = CVSection(id="s1", type="summary", title="Test", items="")
        assert section.isVisible is True

    def test_hidden_section(self):
        section = CVSection(id="s1", type="summary", title="Test", isVisible=False, items="")
        assert section.isVisible is False

    def test_id_required(self):
        with pytest.raises(ValidationError):
            CVSection(type="summary", title="Test", items="")


class TestResumeData:
    def test_defaults(self):
        data = ResumeData(personal=PersonalInfo())
        assert data.template_id == "harvard"
        assert data.lang == "fr"
        assert data.sections == []

    def test_with_sections(self):
        section = CVSection(id="s1", type="summary", title="Summary", items="Hello")
        data = ResumeData(personal=PersonalInfo(), sections=[section])
        assert len(data.sections) == 1

    def test_custom_template_and_lang(self):
        data = ResumeData(personal=PersonalInfo(), template_id="europass", lang="en")
        assert data.template_id == "europass"
        assert data.lang == "en"


class TestOptimalSizeResponse:
    def test_basic(self):
        resp = OptimalSizeResponse(
            optimal_size="normal",
            template_id="harvard",
            tested_sizes=[{"size": "normal", "template_id": "harvard", "page_count": 1}],
        )
        assert resp.optimal_size == "normal"

    def test_with_errors(self):
        resp = OptimalSizeResponse(
            optimal_size="compact",
            template_id="harvard_compact",
            tested_sizes=[
                {"size": "large", "template_id": "harvard_large", "error": "Failed"},
                {"size": "compact", "template_id": "harvard_compact", "page_count": 2},
            ],
        )
        assert len(resp.tested_sizes) == 2


class TestEducationItem:
    def test_defaults(self):
        item = EducationItem()
        assert item.school == ""
        assert item.description is None or item.description == ""

    def test_full_item(self):
        item = EducationItem(
            school="MIT",
            degree="BSc CS",
            dates="2020-2024",
            subtitle="GPA 3.9",
            description="Thesis on AI",
        )
        assert item.school == "MIT"


class TestExperienceItem:
    def test_defaults(self):
        item = ExperienceItem()
        assert item.highlights == []

    def test_with_highlights(self):
        item = ExperienceItem(
            title="SWE", company="Google", dates="2023", highlights=["Built X", "Led Y"]
        )
        assert len(item.highlights) == 2



class TestLeadershipItem:
    def test_defaults(self):
        item = LeadershipItem()
        assert item.role == ""
        assert item.highlights == []


class TestCustomItem:
    def test_defaults(self):
        item = CustomItem()
        assert item.title == ""
        assert item.highlights == []
