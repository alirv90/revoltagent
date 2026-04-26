// Stub for `fs` and `node:fs`. Only used when `workspaceToolkits: false`
// keeps the workspace toolkit code path unreachable. All functions throw if
// invoked at runtime.

const unavailable = (name: string) => () => {
  throw new Error(`fs.${name} is not available in a Web Worker`);
};

const constantsStub = new Proxy(
  {},
  {
    get() {
      return 0;
    },
  },
);

export const constants = constantsStub;
export const existsSync = (() => false) as (path: unknown) => boolean;
export const readFileSync = unavailable("readFileSync");
export const writeFileSync = unavailable("writeFileSync");
export const mkdirSync = unavailable("mkdirSync");
export const statSync = unavailable("statSync");

const promisesNs = {
  access: unavailable("promises.access"),
  lstat: unavailable("promises.lstat"),
  mkdir: unavailable("promises.mkdir"),
  open: unavailable("promises.open"),
  readFile: unavailable("promises.readFile"),
  readdir: unavailable("promises.readdir"),
  realpath: unavailable("promises.realpath"),
  rm: unavailable("promises.rm"),
  rmdir: unavailable("promises.rmdir"),
  unlink: unavailable("promises.unlink"),
  writeFile: unavailable("promises.writeFile"),
};

export const promises = promisesNs;

const fsDefault = {
  constants: constantsStub,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  promises: promisesNs,
};

export default fsDefault;
