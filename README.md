# IronDome open-source developer hub

Static source for https://irondomedev.github.io/ — SDK installation links, Mail Canon package documentation, and a runnable Node.js signup screening example.

Product documentation, API reference, and articles remain canonical at https://irondome.dev/. This hub does not duplicate the product site or blog.

## Preview

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. No framework, bundler, analytics, third-party fonts, or JavaScript is required by the website. Typography uses the viewer's system monospace fonts; no commercial font binary is redistributed.

## Test the example

See [examples/node-signup/README.md](examples/node-signup/README.md). The demo/tests use offline mocks and require Node.js 22+.

## Publish

GitHub Pages: **Deploy from a branch → main → / (root)**. The `.nojekyll` file disables Jekyll processing. GitHub still runs its managed Pages deployment workflow. There is no custom build pipeline.

Before publishing, verify external destinations, review every tracked file for secrets, run the example tests/demo, and inspect desktop/mobile layout. Do not commit API keys, `.env` files, `node_modules`, or proprietary font files.

GitHub documentation: [Create a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [Configure publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
