# SheetJS fallback parser

`xlsx.mini.min.js` is the unmodified SheetJS Community Edition 0.20.3 mini browser build, downloaded from the official distribution. It supports the XLSX template; legacy XLS and other formats still require the existing full parser. The local fallback is loaded only when the full parser is unavailable.

- Script: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js
- Official archive: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
- Documentation: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
- SHA-256: `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`

The script bytes matched `package/dist/xlsx.mini.min.js` extracted from the official archive. The unmodified archive license is included in `SheetJS-LICENSE.txt`. No runtime dependency or paid service is added. This pinned third-party script is not covered by npm's dependency advisory scan; its hash and actual template parsing are checked by the regression suite.

## Chart.js dashboard charts

`chart.umd.js` is the unmodified Chart.js 4.4.4 UMD distribution extracted from the official npm package (`package/dist/chart.umd.js`). Its MIT license is in `Chartjs-LICENSE.md`. The shell now loads it from the same origin, including both public build and offline-cache allowlists. The former cdnjs URL returned HTTP 404 during hosted desktop/mobile acceptance on 30 October 2026; silently skipping Chart did not prove a working dashboard.

- Source archive: https://registry.npmjs.org/chart.js/-/chart.js-4.4.4.tgz
- Official integration documentation: https://www.chartjs.org/docs/latest/getting-started/integration.html
- SHA-256: `fed6a739f8d0f0687174de6cd14745fc0fc7809144ab113d22908a26bf0d7fea`
- 205,475 bytes; no new paid service or configuration. This separately pinned vendor script is outside npm advisory scans. Regression tests check its hash, public build inclusion and actual dashboard canvas rendering with third-party network requests blocked.
