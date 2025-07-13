#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively delete a directory and all its contents
 * @param {string} dirPath - Path to directory to delete
 */
function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Deleting: ${dirPath}`);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✓ Deleted: ${dirPath}`);
    } catch (error) {
      // Try alternative method for Windows permission issues
      if (error.code === 'EPERM' && process.platform === 'win32') {
        try {
          // Change permissions and try again
          fs.chmodSync(dirPath, 0o777);
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`✓ Deleted: ${dirPath} (after fixing permissions)`);
        } catch (secondError) {
          console.warn(`⚠ Partially deleted ${dirPath}: ${secondError.message}`);
          console.log('  Some files may be locked by running processes');
        }
      } else {
        console.error(`✗ Failed to delete ${dirPath}:`, error.message);
      }
    }
  } else {
    console.log(`⚠ Directory not found: ${dirPath}`);
  }
}

/**
 * Clean a workspace directory
 * @param {string} workspaceDir - Path to workspace
 */
function cleanWorkspace(workspaceDir) {
  console.log(`\nCleaning workspace: ${workspaceDir}`);
  
  const dirsToClean = [
    path.join(workspaceDir, '.turbo'),
    path.join(workspaceDir, 'node_modules'),
    path.join(workspaceDir, 'dist'),
    path.join(workspaceDir, 'build')
  ];

  dirsToClean.forEach(deleteDirectory);
}

// Main execution
console.log('🧹 Starting cleanup...\n');

const rootDir = process.cwd();

// Clean root
console.log('Cleaning root directory...');
deleteDirectory(path.join(rootDir, '.turbo'));
deleteDirectory(path.join(rootDir, 'node_modules'));

// Clean workspaces
const workspaces = [
  'apps/web',
  'apps/electron',
  'packages/typescript-config'
];

workspaces.forEach(workspace => {
  const workspacePath = path.join(rootDir, workspace);
  if (fs.existsSync(workspacePath)) {
    cleanWorkspace(workspacePath);
  } else {
    console.log(`⚠ Workspace not found: ${workspace}`);
  }
});

console.log('\n✨ Cleanup complete!');
