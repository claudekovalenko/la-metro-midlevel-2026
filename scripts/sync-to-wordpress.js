#!/usr/bin/env node
/**
 * Transforms docs/gospel-workers-application.html (the GitHub Pages / iOS app
 * source of truth) into the wp:html block content used on the WordPress
 * "Gospel Workers Application" page (post id 91 on noplaceleft-la.org), and
 * pushes it via the WordPress REST API.
 *
 * WordPress-specific differences from the GitHub source, applied here:
 *  - Every CSS selector is namespaced under .npl-app-page (the WP theme's
 *    global styles would otherwise leak in, or this form's styles would leak
 *    into the rest of the theme).
 *  - No <nav> -- the WordPress page already has the site's own nav via the
 *    theme.
 *  - No service-worker registration script -- that's PWA-only, meaningless
 *    inside a WP page fragment.
 *  - The submit script is wrapped in an IIFE and points at the same
 *    Cloudflare Worker relay as the GitHub copy.
 *  - A "See the Southern California people group breakdown" resource link is
 *    inserted after the lede, replacing the cross-link that would otherwise
 *    live in the (omitted) nav.
 *
 * Auth: WP_USER + WP_APP_PASSWORD env vars (a WordPress "Application
 * Password", not the account login password -- generate one under
 * Users > Profile > Application Passwords).
 *
 * Usage: node scripts/sync-to-wordpress.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_FILE = path.join(__dirname, '..', 'docs', 'gospel-workers-application.html');
const WP_SITE = 'noplaceleft-la.org';
const WP_PAGE_ID = 91;
const RESOURCE_LINK_HTML =
  '  <a class="resource-link" href="https://noplaceleft-la.org/socal-people-groups-breakdown/">See the Southern California people group breakdown →</a>\n\n';

function extractBetween(text, startMarker, endMarker, { inclusive = false } = {}) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Marker not found: ${startMarker}`);
  const contentStart = startIdx + startMarker.length;
  const endIdx = text.indexOf(endMarker, contentStart);
  if (endIdx === -1) throw new Error(`Marker not found: ${endMarker}`);
  if (inclusive) return text.slice(startIdx, endIdx + endMarker.length);
  return text.slice(contentStart, endIdx);
}

// Extracts a <div ...>...</div> block starting at startMarker, matching
// nested divs by depth rather than the first "</div>" (which would be a
// nested div's closing tag, not the outer one's).
function extractDivBlock(text, startMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Marker not found: ${startMarker}`);
  const tagRe = /<(\/?)div\b[^>]*>/g;
  tagRe.lastIndex = startIdx;
  let depth = 0;
  let match;
  while ((match = tagRe.exec(text))) {
    if (match[1] === '') depth += 1;
    else depth -= 1;
    if (depth === 0) return text.slice(startIdx, match.index + match[0].length);
  }
  throw new Error(`Unbalanced <div> starting at marker: ${startMarker}`);
}

function stripBlock(text, selectorPrefix) {
  let out = '';
  let i = 0;
  while (true) {
    const idx = text.indexOf(selectorPrefix, i);
    if (idx === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, idx);
    const braceStart = text.indexOf('{', idx);
    let depth = 1;
    let j = braceStart + 1;
    while (depth > 0) {
      if (text[j] === '{') depth += 1;
      else if (text[j] === '}') depth -= 1;
      j += 1;
    }
    i = j;
  }
  return out;
}

function namespaceSelector(sel) {
  sel = sel.trim();
  if (sel === ':root' || sel === 'body') return '.npl-app-page';
  if (sel === '*') return '.npl-app-page *';
  return sel
    .split(',')
    .map((p) => `.npl-app-page ${p.trim()}`)
    .join(', ');
}

function namespaceCss(css) {
  const lines = css.split('\n');
  const out = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('@import') || stripped.startsWith('}') || stripped.startsWith('/*')) {
      out.push(line);
      continue;
    }
    if (stripped.startsWith('@media')) {
      const m = line.match(/^(\s*)(@media[^{]+)\{(.*)\}\s*$/);
      if (!m) {
        out.push(line);
        continue;
      }
      const [, indent, mediahead, inner] = m;
      const innerNew = inner.replace(/([^{}]+)\{([^{}]*)\}/g, (_match, sel, body) => `${namespaceSelector(sel)}{${body}}`);
      out.push(`${indent}${mediahead}{${innerNew} }`);
      continue;
    }
    if (line.includes('{')) {
      const idx = line.indexOf('{');
      const sel = line.slice(0, idx);
      const rest = line.slice(idx + 1);
      const indent = line.slice(0, line.length - line.trimStart().length);
      out.push(`${indent}${namespaceSelector(sel)}{${rest}`);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function buildWpContent(sourceHtml) {
  let css = extractBetween(sourceHtml, '<style>\n', '</style>');
  for (const sel of [
    'nav{',
    '.nav-logo{',
    '.nav-links{',
    '.nav-links a{',
    '.nav-links a:hover{',
    '.admin-toggle{',
    '.admin-panel{',
    '.admin-panel h3{',
    '.app-card{',
    '.app-card b{',
  ]) {
    css = stripBlock(css, sel);
  }
  css = namespaceCss(css).replace(/\n{3,}/g, '\n\n');

  let body = extractDivBlock(sourceHtml, '<div class="wrap">');
  // Insert the resource link after the lede paragraph.
  body = body.replace(/(<p class="lede">.*?<\/p>\n)/s, `$1${RESOURCE_LINK_HTML}`);

  const script = extractBetween(sourceHtml, '<script>\n', '</script>');
  const wrappedScript = `<script>\n(function(){\n${script}\n})();\n</script>`;

  return [
    '<!-- wp:html -->',
    '<style>',
    css,
    '</style>',
    '<div class="npl-app-page">',
    body,
    '</div>',
    '',
    wrappedScript,
    '<!-- /wp:html -->',
    '',
  ].join('\n');
}

function pushToWordPress(content) {
  const user = process.env.WP_USER;
  const appPassword = process.env.WP_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error('WP_USER and WP_APP_PASSWORD env vars are required to push (omit both for --dry-run).');
  }
  const auth = Buffer.from(`${user}:${appPassword}`).toString('base64');
  const payload = JSON.stringify({ content });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: WP_SITE,
        path: `/wp-json/wp/v2/pages/${WP_PAGE_ID}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`WordPress API returned ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sourceHtml = fs.readFileSync(SOURCE_FILE, 'utf8');
  const wpContent = buildWpContent(sourceHtml);

  if (dryRun) {
    process.stdout.write(wpContent);
    return;
  }

  const result = await pushToWordPress(wpContent);
  console.log(`Updated WordPress page ${result.id}, modified ${result.modified}, content length ${result.content.raw.length}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
