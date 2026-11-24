#!/bin/sh
# Bundle the app's fortune engine for the push function. The bundle is published with the site
# (public/push/fortune.js) and imported by index.ts from GitHub Pages at deploy time.
cd "$(dirname "$0")/../../.."
npx -y esbuild@0.24.0 src/lib/fortune/alerts.js --bundle --format=esm --minify --external:lunar-javascript --outfile=public/push/fortune.js
sed -i 's#"lunar-javascript"#"npm:lunar-javascript@1.7.8"#' public/push/fortune.js
