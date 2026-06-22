const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
const viewport =
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no" />';

if (!fs.existsSync(indexPath)) {
  throw new Error(`Cannot find ${indexPath}. Run the web export before patching the viewport.`);
}

const html = fs.readFileSync(indexPath, 'utf8');
const nextHtml = html.replace(/<meta name="viewport"[^>]*\/>/, viewport);

fs.writeFileSync(indexPath, nextHtml);
