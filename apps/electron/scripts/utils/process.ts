import { execSync, spawn } from 'child_process';

function isSourceMapSupportInstalled(): boolean {
  try {
    require.resolve('source-map-support');
    return true;
  } catch {
    return false;
  }
}

export function spawnProcess(port: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
  const electronPath = require('electron') as unknown as string;
  const args = ['--log-level=3', '.'];

  if (isSourceMapSupportInstalled()) {
    args.unshift('-r', 'source-map-support/register');
  }

  return spawn(electronPath, args, {
    stdio: 'inherit',
    shell: false,
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_RENDERER_URL: `http://localhost:${port}`,
    },
  });
}

function isProcessRunning(pid: number): boolean {
  if (!pid || pid <= 0) return false;

  try {
    if (process.platform === 'win32') {
      // Use tasklist to check if process exists on Windows
      const result = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      // If the process exists, tasklist will return a line with the process info
      // If it doesn't exist, it returns "INFO: No tasks are running..."
      return !result.includes('INFO: No tasks are running');
    } else {
      // On Unix-like systems, use kill with signal 0
      process.kill(pid, 0);
      return true;
    }
  } catch (error) {
    // Any error means the process doesn't exist or we can't access it
    return false;
  }
}

export function treeKillSync(pid: number, signal?: string | number): void {
  if (!pid) return;

  // Check if process is still running first
  if (!isProcessRunning(pid)) {
    return; // Process is already dead, no need to kill
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      return;
    }

    const childs = getAllChilds(pid);
    childs.forEach(function (childPid) {
      killPid(childPid, signal);
    });

    killPid(pid, signal);
  } catch (error) {
    // Silently ignore all termination errors - the process is either already dead
    // or will be cleaned up by the OS. Common scenarios include:
    // - Process already terminated
    // - Access denied (process already being cleaned up)
    // - Process not found
    // - Tree kill command failed (process already dead)
    // We don't log anything here to avoid confusing warnings during normal shutdown
  }
}

function getAllPid(): {
  pid: number;
  ppid: number;
}[] {
  const rows = execSync('ps -A -o pid,ppid').toString().trim().split('\n').slice(1);
  const regex = /\s*(\d+)\s*(\d+)/;

  return rows
    .map(function (row) {
      const parts = regex.exec(row);

      if (parts === null) {
        return null;
      }

      return {
        pid: Number(parts[1]),
        ppid: Number(parts[2]),
      };
    })
    .filter(<T>(input: null | undefined | T): input is T => {
      return input != null;
    });
}

function getAllChilds(pid: number) {
  const allpid = getAllPid();

  const ppidHash: {
    [key: number]: number[];
  } = {};

  const result: number[] = [];

  allpid.forEach(function (item) {
    ppidHash[item.ppid] = ppidHash[item.ppid] || [];
    ppidHash[item.ppid].push(item.pid);
  });

  const find = function (pid: number) {
    ppidHash[pid] = ppidHash[pid] || [];
    ppidHash[pid].forEach(function (childPid) {
      result.push(childPid);
      find(childPid);
    });
  };

  find(pid);
  return result;
}

function killPid(pid: number, signal?: string | number) {
  try {
    process.kill(pid, signal);
  } catch (err) {
    if ((err as any).code !== 'ESRCH') {
      throw err;
    }
  }
}
