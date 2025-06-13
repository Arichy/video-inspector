# 📦 Video Inspector Version Management

This directory contains scripts for managing version numbers across the Video Inspector project.

## 🚀 Release Version Script

The `release-version.cjs` script automatically updates version numbers in all relevant project files.

### 📁 Files Updated

The script updates version numbers and commits these files:
1. **`package.json`** - Frontend package version
2. **`src-tauri/Cargo.toml`** - Rust backend package version
3. **`src-tauri/tauri.conf.json`** - Tauri application version
4. **`src-tauri/Cargo.lock`** - Locked dependency versions (auto-updated)

### 🎯 Usage

```bash
# Patch version bump (0.1.0 → 0.1.1) with auto-commit
pnpm release-version patch

# Minor version bump (0.1.0 → 0.2.0) with auto-commit
pnpm release-version minor

# Major version bump (0.1.0 → 1.0.0) with auto-commit
pnpm release-version major

# Skip automatic git commit and tag (manual mode)
pnpm release-version patch --no-commit
```

### 📋 Semantic Versioning

The script follows [Semantic Versioning](https://semver.org/) principles:

| Bump Level | When to Use | Example |
|------------|-------------|---------|
| **patch** | Bug fixes, small improvements | `0.1.0` → `0.1.1` |
| **minor** | New features, backwards compatible | `0.1.0` → `0.2.0` |
| **major** | Breaking changes, major updates | `0.1.0` → `1.0.0` |

### 🔄 Version Bump Rules

- **Patch**: Increments patch number, keeps major and minor unchanged
- **Minor**: Increments minor number, resets patch to 0, keeps major unchanged  
- **Major**: Increments major number, resets minor and patch to 0

### 📝 Example Output

#### With Auto-Commit (Default)
```bash
$ pnpm release-version minor

🚀 Video Inspector Version Bump
Bump level: minor

ℹ️  Current version: 0.1.0
ℹ️  New version: 0.2.0

Updating version in all files...

✅ Updated package.json
✅ Updated src-tauri/Cargo.toml
✅ Updated src-tauri/tauri.conf.json

🎉 Version bump completed!
Updated from 0.1.0 to 0.2.0

📝 Committing version changes...

ℹ️  Executing: git add .
✅ Added all changes to staging
ℹ️  Executing: git commit -m "chore: bump version to v0.2.0"
✅ Committed version changes
ℹ️  Executing: git tag v0.2.0
✅ Created tag v0.2.0

🏷️  Version v0.2.0 committed and tagged!

Final steps:
1. Push changes: git push
2. Push tags: git push --tags
```

#### Manual Mode (--no-commit)
```bash
$ pnpm release-version minor --no-commit

🚀 Video Inspector Version Bump
Bump level: minor

ℹ️  Current version: 0.1.0
ℹ️  New version: 0.2.0

Updating version in all files...

✅ Updated package.json
✅ Updated src-tauri/Cargo.toml
✅ Updated src-tauri/tauri.conf.json

🎉 Version bump completed!
Updated from 0.1.0 to 0.2.0

📝 Skipping git commit (--no-commit flag specified)

Manual steps:
1. Review the changes
2. Commit: git add . && git commit -m "chore: bump version to v0.2.0"
3. Tag: git tag v0.2.0
4. Push: git push && git push --tags
```

### ⚠️ Version Mismatch Detection

If the script detects that files have different version numbers before the update, it will show a warning but still update all files to the new version:

```bash
⚠️  Version mismatch detected in source files:
⚠️    package.json: 0.1.0
⚠️    Cargo.toml: 0.1.1
⚠️    tauri.conf.json: 0.1.2
⚠️  All files have been updated to the new version.
```

### 🛠️ Steps After Version Bump

#### Automatic Mode (Default)
The script automatically handles git operations:
1. ✅ **Updates version files**
2. ✅ **Updates Cargo.lock** (`cargo check`)
3. ✅ **Stages all changes** (`git add .`)
4. ✅ **Commits changes** (`git commit -m "chore: bump version to vX.Y.Z"`)
5. ✅ **Creates tag** (`git tag vX.Y.Z`)
6. ✅ **Clean workspace** (no uncommitted changes)

You only need to:
```bash
git push && git push --tags
```

#### Manual Mode (--no-commit)
After running with `--no-commit`, follow these steps:

1. **Review Changes**: Check that all files were updated correctly
2. **Commit Changes**:
   ```bash
   git add .
   git commit -m "chore: bump version to v1.0.0"
   ```
3. **Create Tag**:
   ```bash
   git tag v1.0.0
   ```
4. **Push Changes**:
   ```bash
   git push && git push --tags
   ```

### 🔧 Script Features

- ✅ **Cross-platform**: Works on macOS, Linux, and Windows
- ✅ **Auto-commit**: Automatically commits and tags changes
- ✅ **Smart Cargo.lock handling**: Automatically updates and includes Cargo.lock
- ✅ **Manual mode**: Optional `--no-commit` flag for manual control
- ✅ **Git detection**: Checks for git availability and repository status
- ✅ **Error handling**: Validates input and file existence
- ✅ **Colorful output**: Easy-to-read console messages
- ✅ **Version validation**: Ensures proper semantic version format
- ✅ **Atomic updates**: Updates all files or fails completely
- ✅ **Helpful guidance**: Provides next steps after completion

### 🔒 Cargo.lock Handling

The script intelligently handles `Cargo.lock` updates:

1. **After updating `Cargo.toml`**: Runs `cargo check` to update `Cargo.lock`
2. **Includes in commit**: `Cargo.lock` is automatically staged and committed
3. **Timing solution**: Eliminates the uncertainty of when `Cargo.lock` gets updated
4. **Clean commits**: Ensures version commits include all related dependency changes

This approach ensures that:
- ✅ Version commits are complete and include locked dependency versions
- ✅ No surprise `Cargo.lock` changes appear later
- ✅ Builds are reproducible with the exact dependency versions

### 🚨 Error Handling

The script will exit with an error if:
- Invalid bump level is provided (must be `patch`, `minor`, or `major`)
- Required files are missing
- Version format is invalid (must be `x.y.z`)
- File read/write operations fail

### 📂 File Structure

```
scripts/
├── release-version.cjs    # Main version management script
└── README.md             # This documentation
```

### 🔍 Technical Details

- **Language**: Node.js (CommonJS format)
- **Dependencies**: Only Node.js built-in modules (`fs`, `path`)
- **Regex Pattern**: `/^version\s*=\s*"([^"]+)"/m` for Cargo.toml
- **JSON Parsing**: Native JSON.parse/stringify for package.json and tauri.conf.json

This script ensures consistent version management across all components of the Video Inspector application! 🎉
