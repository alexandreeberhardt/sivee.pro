"""
Traductions pour les titres de sections du PDF.
Les titres sont utilisés dans le rendu LaTeX.
"""

PDF_TRANSLATIONS = {
    "fr": {
        "summary": "Résumé",
        "education": "Formation",
        "experiences": "Expérience Professionnelle",
        "projects": "Projets",
        "skills": "Compétences Techniques",
        "leadership": "Leadership & Engagement",
        "languages": "Langues",
        "custom": "Autre",
    },
    "en": {
        "summary": "Summary",
        "education": "Education",
        "experiences": "Professional Experience",
        "projects": "Projects",
        "skills": "Technical Skills",
        "leadership": "Leadership & Community",
        "languages": "Languages",
        "custom": "Other",
    },
}

# Titres par défaut du frontend (pour détecter si le titre a été personnalisé)
DEFAULT_TITLES = {
    "summary": ["Summary", "Résumé"],
    "education": ["Education", "Formation"],
    "experiences": [
        "Experiences",
        "Experience",
        "Expérience",
        "Expérience Professionnelle",
        "Professional Experience",
    ],
    "projects": ["Projects", "Projets"],
    "skills": ["Technical Skills", "Skills", "Compétences", "Compétences Techniques"],
    "leadership": [
        "Leadership",
        "Leadership & Community Involvement",
        "Leadership & Community",
        "Leadership & Engagement",
    ],
    "languages": ["Languages", "Langues"],
    "custom": ["Custom Section", "Custom", "Autre"],
}


def get_section_title(section_type: str, lang: str = "fr", custom_title: str = "") -> str:
    """
    Retourne le titre traduit pour un type de section.

    Si le titre fourni est un titre par défaut (en anglais ou français),
    on retourne la traduction dans la langue demandée.
    Si le titre a été personnalisé par l'utilisateur, on le garde tel quel.

    Args:
        section_type: Type de section (education, experiences, etc.)
        lang: Code langue (fr, en)
        custom_title: Titre de la section (peut être personnalisé)

    Returns:
        Le titre traduit ou le titre personnalisé.
    """
    # Pour les sections custom, toujours utiliser le titre fourni
    if section_type == "custom":
        return custom_title or PDF_TRANSLATIONS.get(lang, PDF_TRANSLATIONS["fr"]).get(
            "custom", "Other"
        )

    # Vérifier si le titre est un titre par défaut
    default_titles = DEFAULT_TITLES.get(section_type, [])
    is_default_title = not custom_title or custom_title in default_titles

    # Si c'est un titre par défaut, utiliser la traduction
    if is_default_title:
        translations = PDF_TRANSLATIONS.get(lang, PDF_TRANSLATIONS["fr"])
        return translations.get(section_type, custom_title or section_type.capitalize())

    # Sinon, garder le titre personnalisé
    return custom_title
