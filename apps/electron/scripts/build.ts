import fs from 'fs-extra';
import path from 'path';

import { TypescriptCompiler } from './compilers/typescript';
import { logger } from './utils/logger';

const WEB_DIST = path.join(process.cwd(), '..', 'web', 'dist');
const ELECTRON_DIST = path.join(process.cwd(), 'dist');
const ELECTRON_PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

async function build() {
  logger.info('cleaning dist directory...');
  await fs.remove(ELECTRON_DIST);

  // Compile main process TypeScript
  logger.info('compiling main process...');
  const mainCompiler = new TypescriptCompiler('main', path.join(process.cwd(), 'tsconfig.build.json'));

  await new Promise<void>((resolve, reject) => {
    mainCompiler.on('success', () => {
      logger.info('main process compiled successfully');
      resolve();
    });
    mainCompiler.on('failed', (errors) => {
      logger.error('main process compilation failed:', errors);
      reject(new Error(`Compilation failed with ${errors.length} errors`));
    });
    mainCompiler.start();
  });

  // Copy web dist to electron dist directory
  logger.info('copying web dist files...');
  if (await fs.pathExists(WEB_DIST)) {
    await fs.copy(WEB_DIST, path.join(ELECTRON_DIST, 'renderer'));
  } else {
    logger.warn('Web dist directory not found. Make sure to build the web app first.');
  }

  // Create package.json for distribution
  logger.info('creating distribution package.json...');
  const electronPackageJson = await fs.readJson(ELECTRON_PACKAGE_JSON_PATH);

  const distPackageJson = {
    name: electronPackageJson.name,
    version: electronPackageJson.version,
    description: electronPackageJson.description,
    author: electronPackageJson.author,
    license: electronPackageJson.license,
    main: './main.js',
    dependencies: {},
  };

  await fs.writeJson(path.join(ELECTRON_DIST, 'package.json'), distPackageJson, { spaces: 2 });

  logger.info('build completed successfully');
}

build().catch((error) => {
  logger.error('Build failed:', error);
  process.exit(1);
});
