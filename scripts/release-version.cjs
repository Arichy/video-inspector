#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Video Inspector Version Management Script
 * 
 * Updates version numbers across all project files:
 * - package.json
 * - src-tauri/Cargo.toml
 * - src-tauri/tauri.conf.json
 * 
 * Usage: node scripts/release-version.js <bump_level>
 * Where bump_level is one of: patch, minor, major
 */

// File paths
const FILES = {
  packageJson: 'package.json',
  cargoToml: 'src-tauri/Cargo.toml',
  tauriConf: 'src-tauri/tauri.conf.json'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ Error: ${message}`, colors.red);
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Execute git command with error handling
 */
function execGitCommand(command, description) {
  try {
    info(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    success(description);
  } catch (error) {
    error(`Failed to ${description.toLowerCase()}: ${error.message}`);
  }
}

/**
 * Check if git is available and we're in a git repository
 */
function checkGitStatus() {
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });

    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if there are any uncommitted changes
 */
function hasUncommittedChanges() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Commit version changes and create tag
 */
function commitVersionChanges(newVersionStr) {
  if (!checkGitStatus()) {
    warning('Git not available or not in a git repository. Skipping git operations.');
    log('\nManual steps:');
    log('1. Review the changes');
    log(`2. Commit: git add . && git commit -m "chore: bump version to v${newVersionStr}"`);
    log(`3. Tag: git tag v${newVersionStr}`);
    log('4. Push: git push && git push --tags\n');
    return;
  }

  log('\n📝 Committing version changes...\n');

  // Add all changes
  execGitCommand('git add .', 'Added all changes to staging');

  // Commit changes
  const commitMessage = `chore: bump version to v${newVersionStr}`;
  execGitCommand(`git commit -m "${commitMessage}"`, 'Committed version changes');

  // Create tag
  execGitCommand(`git tag v${newVersionStr}`, `Created tag v${newVersionStr}`);

  log(`\n${colors.bright}${colors.green}🏷️  Version v${newVersionStr} committed and tagged!${colors.reset}\n`);

  log('Final steps:');
  log('1. Push changes: git push');
  log('2. Push tags: git push --tags\n');
}

/**
 * Parse semantic version string
 */
function parseVersion(versionStr) {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    error(`Invalid version format: ${versionStr}. Expected format: x.y.z`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Bump version based on level
 */
function bumpVersion(version, level) {
  const newVersion = { ...version };
  
  switch (level) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
    default:
      error(`Invalid bump level: ${level}. Must be one of: patch, minor, major`);
  }
  
  return newVersion;
}

/**
 * Format version object to string
 */
function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Read and validate file exists
 */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    error(`File not found: ${filePath}`);
  }
  
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    error(`Failed to read ${filePath}: ${err.message}`);
  }
}

/**
 * Write file with error handling
 */
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    success(`Updated ${filePath}`);
  } catch (err) {
    error(`Failed to write ${filePath}: ${err.message}`);
  }
}

/**
 * Update package.json version
 */
function updatePackageJson(newVersion) {
  const content = readFile(FILES.packageJson);
  const packageData = JSON.parse(content);
  
  const oldVersion = packageData.version;
  packageData.version = formatVersion(newVersion);
  
  const updatedContent = JSON.stringify(packageData, null, 2) + '\n';
  writeFile(FILES.packageJson, updatedContent);
  
  return oldVersion;
}

/**
 * Update Cargo.toml version
 */
function updateCargoToml(newVersion) {
  const content = readFile(FILES.cargoToml);
  const versionRegex = /^version\s*=\s*"([^"]+)"/m;
  const match = content.match(versionRegex);
  
  if (!match) {
    error('Could not find version field in Cargo.toml');
  }
  
  const oldVersion = match[1];
  const newVersionStr = formatVersion(newVersion);
  const updatedContent = content.replace(versionRegex, `version = "${newVersionStr}"`);
  
  writeFile(FILES.cargoToml, updatedContent);
  
  return oldVersion;
}

/**
 * Update tauri.conf.json version
 */
function updateTauriConf(newVersion) {
  const content = readFile(FILES.tauriConf);
  const tauriData = JSON.parse(content);
  
  if (!tauriData.version) {
    error('Could not find version field in tauri.conf.json');
  }
  
  const oldVersion = tauriData.version;
  tauriData.version = formatVersion(newVersion);
  
  const updatedContent = JSON.stringify(tauriData, null, 2) + '\n';
  writeFile(FILES.tauriConf, updatedContent);
  
  return oldVersion;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.length > 2) {
    error('Usage: node scripts/release-version.cjs <bump_level> [--no-commit]\nWhere bump_level is one of: patch, minor, major\nUse --no-commit to skip automatic git commit and tag');
  }

  const bumpLevel = args[0].toLowerCase();
  const shouldCommit = !args.includes('--no-commit');
  
  if (!['patch', 'minor', 'major'].includes(bumpLevel)) {
    error(`Invalid bump level: ${bumpLevel}. Must be one of: patch, minor, major`);
  }
  
  log(`\n${colors.bright}🚀 Video Inspector Version Bump${colors.reset}`);
  log(`${colors.cyan}Bump level: ${bumpLevel}${colors.reset}\n`);
  
  // Read current version from package.json
  const packageContent = readFile(FILES.packageJson);
  const packageData = JSON.parse(packageContent);
  const currentVersionStr = packageData.version;
  
  if (!currentVersionStr) {
    error('Could not find version in package.json');
  }
  
  info(`Current version: ${currentVersionStr}`);
  
  // Parse and bump version
  const currentVersion = parseVersion(currentVersionStr);
  const newVersion = bumpVersion(currentVersion, bumpLevel);
  const newVersionStr = formatVersion(newVersion);
  
  info(`New version: ${newVersionStr}\n`);
  
  // Update all files
  log('Updating version in all files...\n');
  
  const packageOldVersion = updatePackageJson(newVersion);
  const cargoOldVersion = updateCargoToml(newVersion);
  const tauriOldVersion = updateTauriConf(newVersion);
  
  // Verify all versions were the same
  if (packageOldVersion !== cargoOldVersion || packageOldVersion !== tauriOldVersion) {
    warning('Version mismatch detected in source files:');
    warning(`  package.json: ${packageOldVersion}`);
    warning(`  Cargo.toml: ${cargoOldVersion}`);
    warning(`  tauri.conf.json: ${tauriOldVersion}`);
    warning('All files have been updated to the new version.');
  }
  
  log(`\n${colors.bright}${colors.green}🎉 Version bump completed!${colors.reset}`);
  log(`${colors.cyan}Updated from ${currentVersionStr} to ${newVersionStr}${colors.reset}`);

  // Automatically commit and tag the changes (unless --no-commit is specified)
  if (shouldCommit) {
    commitVersionChanges(newVersionStr);
  } else {
    log('\n📝 Skipping git commit (--no-commit flag specified)\n');
    log('Manual steps:');
    log('1. Review the changes');
    log(`2. Commit: git add . && git commit -m "chore: bump version to v${newVersionStr}"`);
    log(`3. Tag: git tag v${newVersionStr}`);
    log('4. Push: git push && git push --tags\n');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  parseVersion,
  bumpVersion,
  formatVersion
};
