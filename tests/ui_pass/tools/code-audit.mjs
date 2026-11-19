import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/frontend/src';
const OUT_FILE = '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/tests/ui_pass/reports/code-patterns.md';

function getAllFiles(dir, exts = ['.ts', '.tsx', '.css']) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(dirent.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllFiles(SRC_DIR);

const patterns = {
  fixedDimensions: {
    title: "Fixed Heights & Widths (`h-[...px]`, `w-[...px]`, `min-h-`, `max-h-`)",
    regex: /\b(h-\[\d+px\]|w-\[\d+px\]|max-h-\[\d+px\]|min-h-\[\d+px\]|max-w-\[\d+px\]|min-w-\[\d+px\]|h-\d+|w-\d+)\b/g,
    occurrences: []
  },
  viewportUnits: {
    title: "Viewport Units (`h-screen`, `w-screen`, `100vh`, `100vw`)",
    regex: /\b(h-screen|w-screen|100vh|100vw|min-h-screen)\b/g,
    occurrences: []
  },
  overflowRules: {
    title: "Overflow Rules (`overflow-hidden`, `overflow-x-hidden`, `overflow-y-auto`)",
    regex: /\b(overflow-(hidden|auto|scroll|x-hidden|y-hidden|x-auto|y-auto))\b/g,
    occurrences: []
  },
  arbitraryPx: {
    title: "Arbitrary Pixel Values in Tailwind Classes",
    regex: /\b([a-z-]+-\[\d+px\])\b/g,
    occurrences: []
  },
  hexColors: {
    title: "Hardcoded Hex Colors (`#...` and `[#...]`)",
    regex: /#([0-9a-fA-F]{3,8})\b/g,
    occurrences: []
  },
  zIndices: {
    title: "Z-Index Values (`z-...`)",
    regex: /\b(z-(0|10|20|30|40|50|\[\d+\]))\b/g,
    occurrences: []
  }
};

for (const file of files) {
  const relPath = path.relative(SRC_DIR, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [key, pat] of Object.entries(patterns)) {
      let match;
      const r = new RegExp(pat.regex);
      while ((match = r.exec(line)) !== null) {
        pat.occurrences.push({
          file: relPath,
          line: i + 1,
          token: match[0],
          context: line.trim()
        });
      }
    }
  }
}

let report = `# Code Pattern Audit - frontend/src\n\n`;
report += `*Generated: ${new Date().toISOString()}*\n`;
report += `*Total scanned files: ${files.length}*\n\n`;

report += `## Summary of Findings\n\n`;
report += `| Category | Total Matches | Unique Values |\n`;
report += `| :--- | :--- | :--- |\n`;

for (const [key, pat] of Object.entries(patterns)) {
  const unique = new Set(pat.occurrences.map(o => o.token)).size;
  report += `| ${pat.title} | ${pat.occurrences.length} | ${unique} |\n`;
}

report += `\n---\n\n`;

for (const [key, pat] of Object.entries(patterns)) {
  report += `## ${pat.title}\n\n`;
  report += `**Total Count:** ${pat.occurrences.length}\n\n`;

  // Aggregate by unique token
  const tokenMap = {};
  for (const occ of pat.occurrences) {
    if (!tokenMap[occ.token]) tokenMap[occ.token] = [];
    tokenMap[occ.token].push(`${occ.file}:${occ.line}`);
  }

  const sortedTokens = Object.entries(tokenMap).sort((a, b) => b[1].length - a[1].length);

  report += `### Frequency Table\n\n`;
  report += `| Token / Value | Frequency | Sample Locations |\n`;
  report += `| :--- | :--- | :--- |\n`;
  for (const [token, locs] of sortedTokens.slice(0, 30)) {
    const samples = locs.slice(0, 3).join(', ') + (locs.length > 3 ? ` (+${locs.length - 3} more)` : '');
    report += `| \`${token}\` | ${locs.length} | \`${samples}\` |\n`;
  }
  report += `\n`;
}

fs.writeFileSync(OUT_FILE, report, 'utf8');
console.log(`Report written to ${OUT_FILE}`);
