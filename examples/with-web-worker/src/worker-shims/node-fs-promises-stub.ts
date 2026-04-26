// Stub for `fs/promises` and `node:fs/promises`. Same contract as node-fs-stub.

const unavailable = (name: string) => () => {
  throw new Error(`fs/promises.${name} is not available in a Web Worker`);
};

export const access = unavailable("access");
export const lstat = unavailable("lstat");
export const mkdir = unavailable("mkdir");
export const open = unavailable("open");
export const readFile = unavailable("readFile");
export const readdir = unavailable("readdir");
export const realpath = unavailable("realpath");
export const rm = unavailable("rm");
export const rmdir = unavailable("rmdir");
export const unlink = unavailable("unlink");
export const writeFile = unavailable("writeFile");

export default {
  access,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  rmdir,
  unlink,
  writeFile,
};
