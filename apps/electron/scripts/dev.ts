import chalk from 'chalk';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import getPort from 'get-port';
import path from 'path';

import { TypescriptCompiler } from './compilers/typescript';
import { logger } from './utils/logger';
import { spawnProcess, treeKillSync } from './utils/process';

let childProcessRef: ChildProcess | undefined = undefined;
let viteProcessRef: ChildProcess | undefined = undefined;
let isCleaningUp = false;

const handleClose = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;

  // Silently clean up any running processes
  if (childProcessRef?.pid && !childProcessRef.killed) {
    treeKillSync(childProcessRef.pid);
  }
  if (viteProcessRef?.pid && !viteProcessRef.killed) {
    treeKillSync(viteProcessRef.pid);
  }
};
process.on('SIGINT', handleClose);
process.on('SIGTERM', handleClose);
process.on('exit', handleClose);

function startViteServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const webDir = path.join(process.cwd(), '..', 'web');

    viteProcessRef = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
      cwd: webDir,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    viteProcessRef.on('error', (error) => {
      logger.error('Failed to start Vite server:', error);
      reject(error);
    });

    // Give Vite some time to start up
    setTimeout(() => {
      logger.info(`renderer dev server is started to listen on port ${chalk.green(port)}.`);
      resolve();
    }, 3000);
  });
}

function startElectronApp(port: number, onClose: () => void) {
  if (childProcessRef?.pid && !childProcessRef.killed) {
    logger.info('restarting electron app...');

    childProcessRef.removeAllListeners('exit');
    childProcessRef.on('exit', () => {
      childProcessRef = spawnProcess(port);
      childProcessRef.on('exit', (code: number) => {
        logger.info(`electron app exited with code ${code}`);
        childProcessRef = undefined;
        if (!isCleaningUp) {
          onClose();
        }
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    childProcessRef.stdin && (childProcessRef.stdin as typeof process.stdin).pause();
    if (!childProcessRef.killed) {
      treeKillSync(childProcessRef.pid);
    }
  } else {
    logger.info('starting electron app...');

    childProcessRef = spawnProcess(port);
    childProcessRef.on('exit', (code: number) => {
      logger.info(`electron app exited with code ${code}`);
      childProcessRef = undefined;
      if (!isCleaningUp) {
        onClose();
        (process as any).exitCode = code;
      }
    });
  }
}

async function dev() {
  logger.info('cleaning dist directories ...');
  await Promise.all([
    fs.remove(path.join(process.cwd(), 'dist')),
    fs.remove(path.join(process.cwd(), '..', 'web', 'dist')),
  ]);

  const availablePort = await getPort({ port: 3000 });
  const mainCompiler = new TypescriptCompiler('main', path.join(process.cwd(), 'tsconfig.build.json'));

  // Start Vite dev server
  await startViteServer(availablePort);

  mainCompiler.on('success', async () => {
    startElectronApp(availablePort, async () => {
      if (viteProcessRef?.pid) {
        treeKillSync(viteProcessRef.pid);
      }
      process.exit(0);
    });
  });

  await mainCompiler.start();
}

dev();
