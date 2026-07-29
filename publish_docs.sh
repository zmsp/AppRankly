#!/bin/bash

# 1. Generate static data
echo "Generating static data..."
cd app && npm run build:static && cd ..

# 2. Ensure we are on main and everything is committed
# git add .
# git commit -m "Update docs and static data"

# 3. Create/update gh-pages branch
echo "Updating gh-pages branch..."
git branch -D gh-pages 2>/dev/null
git checkout -b gh-pages

# 4. Remove all files except docs/
# We want the content of docs/ to be at the root of gh-pages
mv docs/* .
rm -rf docs app config keys tests Dockerfile docker-compose*.yml README.md .gitignore .dockerignore package.json package-lock.json publish_docs.sh

# 5. Commit and push
git add .
git commit -m "Publish to GitHub Pages"
# git push origin gh-pages --force

# 6. Switch back to main
# git checkout main

echo "Done! If you are happy with the changes in gh-pages branch, push it to origin."
