# Contributing to AppRankly

First off, thank you for considering contributing to **AppRankly**! Contributions from the community help make AppRankly a better self-hosted analytics dashboard for everyone.

Please take a moment to review this document before submitting your contribution.

---

## Code of Conduct

We aim to foster an open, welcoming, and inclusive community. Please treat all contributors and maintainers with respect and courtesy in all interactions (issues, pull requests, and discussions).

---

## How Can I Contribute?

### 1. Reporting Bugs

Before creating a bug report, please check existing issues to see if the problem has already been reported.

When creating a bug report using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md), please include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs. actual behavior.
- Environment details (Node.js version, Docker vs. local setup, OS, browser).
- Relevant log output (be sure to **sanitize any secret credentials** or private tokens).

> [!CAUTION]
> **Security Notice**: Do **NOT** submit bug reports containing private API keys, service account `.json` keys, Apple `.p8` key contents, or your `JWT_SECRET`. For security vulnerabilities, please refer to [SECURITY.md](SECURITY.md).

---

### 2. Suggesting Enhancements

Feature requests and enhancement suggestions are very welcome! Please use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md) and include:
- A clear, descriptive title.
- The problem your request solves or the feature you'd like to see.
- Any alternative solutions or workarounds considered.
- Context on how this feature aligns with AppRankly's goal of self-hosted, private app store analytics.

---

### 3. Submitting Pull Requests

Follow these steps to propose changes:

#### Step 1: Fork & Clone
1. Fork the repository on GitHub: `https://github.com/zmsp/AppRankly/fork`
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/AppRankly.git
   cd AppRankly
   ```

#### Step 2: Set Up Development Environment
AppRankly consists of an **Express backend** and a **React + Vite frontend** located in `app/`.

- **Prerequisites**: Node.js **20+** (Node **22.5+** recommended for full SQLite caching support).

- **Install dependencies and start development server**:
  ```bash
  # From project root
  cd app
  npm install
  npm --prefix frontend install
  npm run dev
  ```

- **Set up local config**:
  ```bash
  # Create data/config directory and sample config
  mkdir -p data/config/keys
  cp example.config.json data/config/config.json
  ```

#### Step 3: Create a Feature Branch
Create a branch with a descriptive name off `main`:
```bash
git checkout -b feature/amazing-feature
# or for bug fixes:
git checkout -b fix/issue-description
```

#### Step 4: Make Your Changes & Commit
- Write clear, concise code following existing patterns.
- Ensure sensitive files (`config.json`, `*.p8`, `*.json` keys) are **never** tracked by Git.
- Commit your changes with a descriptive commit message:
  ```bash
  git commit -m "feat(aso): add support for custom prompt templates"
  ```

#### Step 5: Verify Changes
- Ensure the frontend builds cleanly without errors:
  ```bash
  npm run build
  ```
- Test functionality locally on both mobile and desktop screen sizes if editing the UI.

#### Step 6: Push & Open a PR
1. Push your branch to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```
2. Open a Pull Request on GitHub against the `main` branch.
3. Fill out the PR template/description explaining what changes were made and why.

---

## Development Guidelines & Architecture

AppRankly relies on a clean architecture split:
- **`app/`**: Node.js Express server, CLI tools (`cli.js`), SQLite data resolver, background schedulers, and store API integrations.
- **`app/frontend/`**: React 18 frontend built with Vite, Tailwind CSS (dark glassmorphic theme), and Chart.js.
- **`unraid/`**: Unraid template definitions.

Key project rules to remember:
- **Privacy First**: Credentials, metrics, and logs must stay 100% local to the user's deployment. Never introduce analytics tracking, remote telemetry, or un-authenticated external network calls.
- **Clean Commits**: Keep pull requests focused on a single logical change or feature.

---

## Need Help?

If you have questions about contributing or need guidance, feel free to open an issue or start a discussion on GitHub. Thank you for contributing to AppRankly!
