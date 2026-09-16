# Production build requirement

Production/release builds require `esbuild` from `devDependencies`.

On a networked development machine (for example Machine C), run once:

    npm install --save-dev esbuild

Then verify:

    node -e "console.log(require('esbuild').version)"

For a release, run only through the canonical pipeline:

    npm run release:preflight

Do not edit `?v=` values or Service Worker cache versions manually. `scripts/build.js`
reads the highest active version and updates source constants, HTML and `sw.js` together.
`--require-minify` makes production builds fail instead of silently shipping an
unminified bundle when esbuild is unavailable.
