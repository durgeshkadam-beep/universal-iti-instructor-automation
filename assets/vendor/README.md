# SheetJS fallback parser

`xlsx.mini.min.js` is the unmodified SheetJS Community Edition 0.20.3 mini browser build, downloaded from the official distribution. It supports the XLSX template; legacy XLS and other formats still require the existing full parser. The local fallback is loaded only when the full parser is unavailable.

- Script: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js
- Official archive: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
- Documentation: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
- SHA-256: `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`

The script bytes matched `package/dist/xlsx.mini.min.js` extracted from the official archive. The unmodified archive license is included in `SheetJS-LICENSE.txt`. No runtime dependency or paid service is added. This pinned third-party script is not covered by npm's dependency advisory scan; its hash and actual template parsing are checked by the regression suite.
