const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const FILES_TO_CHECK = [
  'README.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  'SUPPORT.md',
  'SECURITY.md',
  'ARCHITECTURE.md',
  'API.md',
  'TESTING.md',
  'DEPLOYMENT.md',
  'FAQ.md',
  'TROUBLESHOOTING.md',
  'STYLE_GUIDE.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'COPYRIGHT.md',
  'docs/architecture.md',
  'docs/backend.md',
  'docs/frontend.md',
  'docs/authentication.md',
  'docs/database.md',
  'docs/socket-events.md',
  'docs/api.md',
  'docs/deployment.md',
  'docs/testing.md',
  'docs/security.md',
  'docs/performance.md',
  'docs/roadmap.md',
  'docs/faq.md',
  'docs/contributing.md',
  'docs/release-process.md'
];

const REQUIRED_SECTIONS = [
  { name: 'Title (H1)', regex: /^#\s+.+/m },
  { name: 'Purpose (H2)', regex: /^##\s+Purpose/mi },
  { name: 'Navigation (H2)', regex: /^##\s+Navigation/mi },
  { name: 'Examples (H2)', regex: /^##\s+(Examples|Change\s+Type)/mi },
  { name: 'Notes (H2)', regex: /^##\s+Notes/mi },
  { name: 'Best Practices (H2)', regex: /^##\s+(Best\s+Practices|Standards\s+of\s+Behavior|Standard\s+of\s+Behavior)/mi },
  { name: 'References (H2)', regex: /^##\s+References/mi }
];

let totalErrors = 0;

function logError(filePath, msg) {
  console.error(`❌ [${filePath}]: ${msg}`);
  totalErrors++;
}

console.log('🏁 Starting ChessPlay Documentation Verification...');

FILES_TO_CHECK.forEach((relPath) => {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    logError(relPath, 'File does not exist.');
    return;
  }

  const content = fs.readFileSync(absPath, 'utf8');

  // 1. Verify Required Sections (skip README.md)
  if (relPath !== 'README.md') {
    REQUIRED_SECTIONS.forEach((section) => {
      if (!section.regex.test(content)) {
        logError(relPath, `Missing required section: "${section.name}"`);
      }
    });
  }

  // 2. Parse and Verify Links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    let linkTarget = match[2];

    // Clean up any line reference hashes like #L12-L24 or anchor hashes
    const hashIndex = linkTarget.indexOf('#');
    if (hashIndex !== -1) {
      linkTarget = linkTarget.substring(0, hashIndex);
    }

    if (!linkTarget) continue; // Anchor-only link inside the same file

    // Skip web links and email links
    if (
      linkTarget.startsWith('http://') ||
      linkTarget.startsWith('https://') ||
      linkTarget.startsWith('mailto:')
    ) {
      continue;
    }

    // Skip screenshot placeholders that do not exist physically yet
    if (linkTarget.includes('docs/screenshots/')) {
      continue;
    }

    let resolvedAbsPath;
    if (linkTarget.startsWith('file:///')) {
      // Handle file protocol links pointing to the project
      // Standardize Windows vs Unix file URLs
      const fileUrlPath = linkTarget.replace(/^file:\/\/\//, '');
      const projectRootPrefix = 'Users/sunilkumarkv/Desktop/Projects/chessPlay/';
      
      if (fileUrlPath.includes(projectRootPrefix)) {
        const workspaceRelativePath = fileUrlPath.substring(
          fileUrlPath.indexOf(projectRootPrefix) + projectRootPrefix.length
        );
        resolvedAbsPath = path.join(ROOT_DIR, workspaceRelativePath);
      } else {
        // Absolute local path on the user's box
        resolvedAbsPath = '/' + fileUrlPath;
      }
    } else {
      // Relative path to current document folder
      resolvedAbsPath = path.resolve(path.dirname(absPath), linkTarget);
    }

    if (!fs.existsSync(resolvedAbsPath)) {
      logError(relPath, `Broken link "${linkText}" -> Target "${linkTarget}" does not exist locally (resolved: "${resolvedAbsPath}")`);
    }
  }
});

if (totalErrors === 0) {
  console.log('✅ All documentation files are valid! No broken links or missing sections found.');
  process.exit(0);
} else {
  console.error(`🛑 Verification failed with ${totalErrors} error(s).`);
  process.exit(1);
}
