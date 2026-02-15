"""Tests for Pydantic models in app.py — input validation for CV data."""

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
    PersonalInfo,
    ProfessionalLink,
    ProjectItem,
    ResumeData,
)


class TestProfessionalLink:
    def test_valid_link(self):
        link = ProfessionalLink(
            platform="github", username="johndoe", url="https://github.com/johndoe"
        )
        assert link.platform == "github"

    def test_empty_url_is_valid(self):
        link = ProfessionalLink(platform="linkedin", username="john", url="")
        assert link.url == ""

    def test_invalid_url_rejected(self):
        with pytest.raises(ValidationError, match="URL must start with"):
            ProfessionalLink(platform="github", username="johndoe", url="ftp://bad.com")

    def test_http_url_accepted(self):
        link = ProfessionalLink(platform="other", username="test", url="http://example.com")
        assert link.url == "http://example.com"

    def test_defaults(self):
        link = ProfessionalLink()
        assert link.platform == "linkedin"
        assert link.username == ""
        assert link.url == ""


class TestPersonalInfo:
    def test_valid_info(self):
        info = PersonalInfo(
            name="John Doe",
            title="Dev",
            location="Paris",
            email="john@test.com",
            phone="+33612345678",
        )
        assert info.name == "John Doe"

    def test_defaults(self):
        info = PersonalInfo()
        assert info.name == ""
        assert info.links == []

    def test_with_links(self):
        info = PersonalInfo(
            links=[
                ProfessionalLink(platform="github", username="j", url="https://github.com/j"),
                ProfessionalLink(
                    platform="linkedin", username="j", url="https://linkedin.com/in/j"
                ),
            ]
        )
        assert len(info.links) == 2

    def test_legacy_github_migration(self):
        """Old github/github_url fields should migrate to links."""
        info = PersonalInfo(github="johndoe", github_url="https://github.com/johndoe")
        assert len(info.links) == 1
        assert info.links[0].platform == "github"
        assert info.links[0].username == "johndoe"
        # Legacy fields cleared after migration
        assert info.github is None
        assert info.github_url is None

    def test_legacy_not_migrated_if_links_exist(self):
        info = PersonalInfo(
            github="old",
            links=[
                ProfessionalLink(platform="linkedin", username="j", url="https://linkedin.com/in/j")
            ],
        )
        # links already exist, so github is NOT migrated
        assert len(info.links) == 1
        assert info.links[0].platform == "linkedin"


class TestEducationItem:
    def test_valid(self):
        item = EducationItem(school="MIT", degree="BS", dates="2020")
        assert item.school == "MIT"

    def test_defaults(self):
        item = EducationItem()
        assert item.school == ""
        assert item.subtitle == ""
        assert item.description == ""


class TestExperienceItem:
    def test_valid(self):
        item = ExperienceItem(title="Dev", company="Co", dates="2020", highlights=["Built stuff"])
        assert len(item.highlights) == 1

    def test_defaults(self):
        item = ExperienceItem()
        assert item.highlights == []


class TestProjectItem:
    def test_valid(self):
        item = ProjectItem(name="My Project", year="2024", highlights=["Did stuff"])
        assert item.name == "My Project"

    def test_year_as_int(self):
        """Year can be provided as int and gets converted to string."""
        item = ProjectItem(name="Proj", year=2024)
        assert item.year == "2024"

    def test_year_as_none(self):
        item = ProjectItem(name="Proj", year=None)
        assert item.year == ""



class TestLeadershipItem:
    def test_valid(self):
        item = LeadershipItem(role="Lead", place="Org", dates="2020", highlights=["Led team"])
        assert item.role == "Lead"

    def test_defaults(self):
        item = LeadershipItem()
        assert item.role == ""
        assert item.place == ""


class TestCustomItem:
    def test_valid(self):
        item = CustomItem(title="Hobbies", subtitle="Sports", dates="", highlights=["Football"])
        assert item.title == "Hobbies"

    def test_defaults(self):
        item = CustomItem()
        assert item.title == ""
        assert item.highlights == []


class TestCVSection:
    def test_valid_education_section(self):
        section = CVSection(
            id="sec-1",
            type="education",
            title="Education",
            items=[{"school": "MIT", "degree": "BS", "dates": "2020"}],
        )
        assert section.type == "education"

    def test_valid_skills_section(self):
        section = CVSection(
            id="sec-2",
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

    def test_valid_summary_section(self):
        section = CVSection(
            id="sec-3",
            type="summary",
            title="Summary",
            items="I am a developer",
        )
        assert section.items == "I am a developer"

    def test_hidden_section(self):
        section = CVSection(
            id="sec-4",
            type="education",
            title="Edu",
            isVisible=False,
            items=[],
        )
        assert section.isVisible is False

    def test_invalid_type(self):
        with pytest.raises(ValidationError):
            CVSection(id="sec-5", type="invalid_type", title="Bad", items=[])


class TestResumeData:
    def test_valid_resume(self):
        data = ResumeData(
            personal=PersonalInfo(name="John"),
            sections=[
                CVSection(id="sec-1", type="education", title="Edu", items=[]),
            ],
            template_id="harvard",
            lang="fr",
        )
        assert data.template_id == "harvard"
        assert len(data.sections) == 1

    def test_defaults(self):
        data = ResumeData(personal=PersonalInfo())
        assert data.template_id == "harvard"
        assert data.lang == "fr"
        assert data.sections == []

    def test_with_all_section_types(self):
        data = ResumeData(
            personal=PersonalInfo(name="Test"),
            sections=[
                CVSection(id="sec-1", type="summary", title="Summary", items="Text"),
                CVSection(id="sec-2", type="education", title="Edu", items=[]),
                CVSection(id="sec-3", type="experiences", title="Exp", items=[]),
                CVSection(id="sec-4", type="projects", title="Proj", items=[]),
                CVSection(
                    id="sec-5", type="skills", title="Skills", items=[]
                ),
                CVSection(id="sec-6", type="leadership", title="Lead", items=[]),
                CVSection(id="sec-7", type="languages", title="Lang", items="French"),
                CVSection(id="sec-8", type="custom", title="Custom", items=[]),
            ],
        )
        assert len(data.sections) == 8
