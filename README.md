# CV Generator SaaS

A web application to generate professional PDF resumes from a dynamic form interface. Built with FastAPI (Python) and React, with LaTeX-based PDF generation.

## Live demo:  [sivee.pro](https://sivee.pro)

## Examples

Here are examples of professional resumes generated with the application using different templates:

<p align="center">
  <img src="docs/AE1.png" width="45%" alt="Classic Template Example" style="margin-right: 10px;">
  <img src="docs/AE2.png" width="43.5%" alt="Modern Template Example">
</p>

## Features

### PDF Generation & Templates
- **LaTeX Engine**: High-quality typographic PDF generation (superior to standard HTML-to-PDF).
- **Professional Templates**: Varied choices including Harvard, McKinsey, and Europass styles.
- **Smart Sizing**: Automatic content fitting to a single page.
- **PDF Import**: (Experimental) Import existing CVs via AI extraction.

### Editor & Customization
- **Real-time Editing**: Visualize changes instantly as you type.
- **Drag and Drop**: Easily reorganize your CV sections.
- **Dynamic Sections**: Add, rename, hide, or remove any section (Experience, Education, etc.).
- **Dark/Light Mode**: Interface adapted to your visual preferences.
- **Multi-language**: Interface available in French and English.

### Accounts & Security
- **Guest Mode**: Test the application immediately without creating an account (limited to 3 CVs).
- **Seamless Upgrade**: Convert guest account to permanent without data loss.
- **Google OAuth**: Fast and secure sign-in with Google.
- **Privacy (GDPR)**: Export all data or permanently delete account in one click.
- **Secure Architecture**: Hashed passwords and secure JWT session management.

## Quick Install (Docker)

Recommended method to start the project quickly.

1. Clone the repository
```bash
git clone --recursive <repository-url> site-CV
cd site-CV

```

2. Copy environment variables

```bash
cp .env.example .env

```

3. Start development environment

```bash
docker compose -f docker-compose.dev.yml up --build

```

The application will be accessible at:

* **Frontend**: http://localhost:5173
* **Backend**: http://localhost:8000
* **Database**: localhost:5432

## Documentation

Detailed documentation is available in the `docs/` folder:

* [Development Guide](docs/DEVELOPMENT.md)
* [Database](docs/DATABASE.md)
* [Deployment](docs/DEPLOYMENT.md)
* [API](docs/API.md)

## License

MIT License