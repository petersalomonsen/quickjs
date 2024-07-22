import { playwrightLauncher } from '@web/test-runner-playwright';
import { readFileSync } from 'fs';

export default {
  files: [
    '**/*.spec.js', // include `.spec.ts` files
    '!./node_modules/**/*', // exclude any node modules
  ],
  concurrency: 1,
  watch: false,
  testRunnerHtml: testRunnerImport =>
    `
<html>
  <script type="importmap">
    ${readFileSync('./importmap.json')}
  </script>
  <body>
    <script type="module">
        import { expect, assert} from 'https://cdn.jsdelivr.net/npm/chai@5.0.0/+esm';
        globalThis.assert = assert;
        globalThis.expect = expect;
    </script>        
    <script type="module" src="${testRunnerImport}"></script>
  </body>
</html>`,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    //playwrightLauncher({ product: 'firefox' }),
    //playwrightLauncher({ product: 'webkit' })
  ]
};
