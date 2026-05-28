#!/usr/bin/env node

/**
 * Sync docs from /docs to /website/docs with Docusaurus front matter.
 *
 * This script:
 * 1. Clears the website/docs directory
 * 2. Copies all markdown files from /docs
 * 3. Adds front matter (title, sidebar_position) to each file
 * 4. Renames README.md files to index.md (Docusaurus convention)
 * 5. Creates _category_.json files for directories
 * 6. Copies non-markdown assets (images, etc.)
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const SOURCE_DIR = path.join(ROOT_DIR, "docs");
const TARGET_DIR = path.join(__dirname, "../docs");

// Files/directories to skip
const SKIP_PATTERNS = [".git", "node_modules", "_build"];

// Category metadata for directories (customize as needed)
const CATEGORY_CONFIG = {
  "database-service": {
    label: "Database Service",
    position: 3,
  },
  implementations: {
    label: "Implementations",
    position: 5,
  },
  developers: {
    label: "Developers",
    position: 4,
  },
  quickstart: {
    label: "Quickstart",
    position: 1,
  },
  testing: {
    label: "Testing",
    position: 5,
  },
};

// Explicit sidebar positions for root-level docs
const ROOT_POSITIONS = {
  "developers-quickstart.md": 2,
  "api.md": 6,
  "database-service.md": 3,
  "llm-provider-configuration.md": 4,
  "architecture.md": 5,
};

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Check if file already has front matter
 */
function hasFrontMatter(content) {
  return content.trimStart().startsWith("---");
}

/**
 * Generate front matter for a markdown file
 */
function generateFrontMatter(title, sidebarPosition) {
  const lines = ["---"];
  if (title) {
    lines.push(`title: "${title.replace(/"/g, '\\"')}"`);
  }
  if (sidebarPosition !== undefined) {
    lines.push(`sidebar_position: ${sidebarPosition}`);
  }
  lines.push("---");
  return lines.join("\n");
}

/**
 * Calculate sidebar position based on filename
 */
function getSidebarPosition(filename, dirPath, isIndex) {
  // Index files (from README.md) should be first
  if (isIndex) {
    return 1;
  }

  // Check explicit positions for root files
  const relPath = path.relative(SOURCE_DIR, path.join(dirPath, filename));
  if (ROOT_POSITIONS[relPath]) {
    return ROOT_POSITIONS[relPath];
  }

  // Default alphabetical ordering
  return undefined;
}

/**
 * Rewrite README.md links to index.md links for Docusaurus compatibility
 */
function rewriteReadmeLinks(content) {
  // Replace links like [text](README.md) or [text](./README.md) with [text](index.md)
  // Also handle paths like database-service/README.md -> database-service/index.md
  return content.replace(
    /\]\(([^)]*?)README\.md([^)]*)\)/gi,
    (match, prefix, suffix) => {
      // If the link is just README.md or ./README.md, replace with index.md
      const newPrefix = prefix.replace(/README\.md$/i, "");
      return `](${newPrefix}index.md${suffix})`;
    }
  );
}

/**
 * Process a single markdown file
 */
function processMarkdownFile(sourcePath, targetPath, dirPath) {
  let content = fs.readFileSync(sourcePath, "utf8");
  const filename = path.basename(sourcePath);
  const isReadme = filename.toLowerCase() === "readme.md";

  // Determine target filename (README.md -> index.md)
  let targetFilename = filename;
  if (isReadme) {
    targetFilename = "index.md";
  }
  const finalTargetPath = path.join(
    path.dirname(targetPath),
    isReadme ? "index.md" : path.basename(targetPath)
  );

  // Rewrite README.md links to index.md
  content = rewriteReadmeLinks(content);

  // Skip front matter generation if already has front matter
  if (hasFrontMatter(content)) {
    fs.writeFileSync(finalTargetPath, content);
    console.log(`  Copied (has front matter): ${path.relative(TARGET_DIR, finalTargetPath)}`);
    return;
  }

  // Extract title and generate front matter
  const title = extractTitle(content);
  const sidebarPosition = getSidebarPosition(filename, dirPath, isReadme);
  const frontMatter = generateFrontMatter(title, sidebarPosition);

  // Combine front matter with content
  const newContent = frontMatter + "\n\n" + content;

  fs.writeFileSync(finalTargetPath, newContent);
  console.log(`  Processed: ${path.relative(TARGET_DIR, finalTargetPath)}`);
}

/**
 * Create _category_.json for a directory
 */
function createCategoryJson(dirPath, dirName) {
  const config = CATEGORY_CONFIG[dirName] || {
    label: dirName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  };

  const categoryPath = path.join(dirPath, "_category_.json");
  fs.writeFileSync(categoryPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`  Created category: ${path.relative(TARGET_DIR, categoryPath)}`);
}

/**
 * Recursively sync a directory
 */
function syncDirectory(sourceDir, targetDir, depth = 0) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  // Create _category_.json for subdirectories (not root)
  if (depth > 0) {
    const dirName = path.basename(sourceDir);
    createCategoryJson(targetDir, dirName);
  }

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    // Skip patterns
    if (SKIP_PATTERNS.some((p) => entry.name.includes(p))) {
      continue;
    }

    if (entry.isDirectory()) {
      syncDirectory(sourcePath, targetPath, depth + 1);
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".md")) {
        processMarkdownFile(sourcePath, targetPath, sourceDir);
      } else {
        // Copy non-markdown files (images, etc.)
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  Copied asset: ${path.relative(TARGET_DIR, targetPath)}`);
      }
    }
  }
}

/**
 * Clear the target directory
 */
function clearTargetDir() {
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true });
    console.log("Cleared existing website/docs directory");
  }
}

/**
 * Main entry point
 */
function main() {
  console.log("Syncing docs from /docs to /website/docs...\n");

  // Verify source exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Error: Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Clear and recreate target
  clearTargetDir();
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // Sync all docs
  syncDirectory(SOURCE_DIR, TARGET_DIR);

  console.log("\nDocs sync complete!");
}

main();
