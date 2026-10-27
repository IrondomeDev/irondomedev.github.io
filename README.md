# IronDome open-source developer hub

Static source for https://irondomedev.github.io/ — SDK installation links, Mail Canon package documentation, and a runnable Node.js signup screening example.

Product documentation, API reference, and articles remain canonical at https://irondome.dev/. This hub does not duplicate the product site or blog.

## Signup screening tutorial

[Block disposable email signups in Node.js](https://irondome.dev/blogs/block-disposable-email-signups-nodejs)
explains where to put server-side screening, how to handle API failures, and how
to test account-creation and verification-email side effects. Run the companion
[offline example and tests](examples/node-signup/README.md) without an API key.

## Preview

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. The website reuses IronDome’s shared theme, public header, landing-page layout, and footer styles. No framework, bundler, analytics, or JavaScript is required. The existing IronDome hashed WOFF2 webfont is reused unchanged at its original asset path. No font package, new license grant, or license-clearance claim is included.

## Test the example

See [examples/node-signup/README.md](examples/node-signup/README.md). The demo/tests use offline mocks and require Node.js 22+.

## Publish

GitHub Pages: **Deploy from a branch → main → / (root)**. The `.nojekyll` file disables Jekyll processing. GitHub still runs its managed Pages deployment workflow. There is no custom build pipeline.

Before publishing, verify external destinations, review every tracked file for secrets, run the example tests/demo, and inspect desktop/mobile layout. Do not commit API keys, `.env` files, `node_modules`, or additional font packages.

GitHub documentation: [Create a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [Configure publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
