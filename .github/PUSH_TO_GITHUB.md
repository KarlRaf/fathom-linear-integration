# Pushing to GitHub

This repository is ready to be pushed to GitHub. Follow these steps:

## Option 1: Create Repository on GitHub Website

1. Go to https://github.com/new
2. Create a new repository (choose a name like `fathom-linear-integration`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL (e.g., `https://github.com/yourusername/fathom-linear-integration.git`)

Then run:
```bash
git remote add origin https://github.com/yourusername/fathom-linear-integration.git
git branch -M main
git push -u origin main
```

## Option 2: Use GitHub CLI (if installed)

```bash
gh repo create fathom-linear-integration --public --source=. --remote=origin --push
```

## Important Notes

- ⚠️ **Never commit your `.env` file** - it contains sensitive API keys
- The `.gitignore` file is already configured to exclude:
  - `node_modules/`
  - `dist/`
  - `.env`
  - `*.log`
  - `.DS_Store`

## After Pushing

Remember to:
1. Add environment variables in your deployment platform (Railway, Render, etc.)
2. Never share your `.env` file or API keys publicly
3. Set up webhook URLs in Fathom and Slack to point to your deployed server

