// Stub for `child_process` and `node:child_process`. Web Workers cannot spawn
// processes; calling these throws.

const unavailable = (name: string) => () => {
  throw new Error(`child_process.${name} is not available in a Web Worker`);
};

export const spawn = unavailable("spawn");
export const exec = unavailable("exec");
export const execSync = unavailable("execSync");
export const execFile = unavailable("execFile");
export const fork = unavailable("fork");

export default {
  spawn,
  exec,
  execSync,
  execFile,
  fork,
};
