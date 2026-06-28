#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

npx --yes clean-css-cli@5.6.3 \
  -o assets/css/geforce-os.min.css \
  assets/css/geforce-os.css

npx --yes terser@5.44.1 assets/js/hole-lightning.js \
  --compress --mangle --output assets/js/hole-lightning.min.js
npx --yes terser@5.44.1 assets/js/geforce-os.js \
  --compress --mangle --output assets/js/geforce-os.min.js
npx --yes terser@5.44.1 assets/js/portfolio-fx.js \
  --compress --mangle --output assets/js/portfolio-fx.min.js
