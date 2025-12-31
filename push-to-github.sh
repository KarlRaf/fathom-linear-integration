#!/bin/bash

# Script to push the project to GitHub
# Make sure you've configured git user.name and user.email first

echo "Checking git configuration..."
if ! git config user.name > /dev/null 2>&1; then
    echo "❌ Git user.name not configured"
    echo "Run: git config --global user.name 'Your Name'"
    exit 1
fi

if ! git config user.email > /dev/null 2>&1; then
    echo "❌ Git user.email not configured"
    echo "Run: git config --global user.email 'your.email@example.com'"
    exit 1
fi

echo "✅ Git configuration looks good"
echo ""
echo "📝 Creating initial commit..."

git add .
git commit -m "Initial commit: Fathom to Linear integration with Slack review

- Complete implementation with webhook receiver
- AI-powered action item extraction (OpenAI)
- Slack review workflow with approve/reject buttons
- Linear issue creation after approval
- GitHub transcript logging
- Full TypeScript implementation"

echo ""
echo "✅ Commit created!"
echo ""
echo "📤 Next steps:"
echo "1. Create a new repository on GitHub: https://github.com/new"
echo "2. Then run one of these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Or if you have GitHub CLI installed:"
echo "   gh repo create YOUR_REPO_NAME --public --source=. --remote=origin --push"

