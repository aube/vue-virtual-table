#!/bin/sh

COMMIT_MESSAGE="gh-pages: $(git log -1 --pretty=%s)"

git checkout master
npm run build
git checkout gh-pages
rm -rf ./assets
cp -r ./dist/* ./
sed -i -e 's/="\//=".\//g' index.html
git add index.html
git add assets/
git commit -m "$COMMIT_MESSAGE"
git push origin gh-pages
git checkout -
