function normalizeArray(parts: string[], allowAboveRoot: boolean): string[] {
  const res: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (res.length && res[res.length - 1] !== "..") res.pop();
      else if (allowAboveRoot) res.push("..");
    } else {
      res.push(part);
    }
  }
  return res;
}

function normalize(p: string): string {
  const isAbsolute = p.startsWith("/");
  const trailing = p.length > 1 && p.endsWith("/");
  let parts = normalizeArray(p.split("/"), !isAbsolute).join("/");
  if (!parts && !isAbsolute) parts = ".";
  if (parts && trailing) parts += "/";
  return (isAbsolute ? "/" : "") + parts;
}

function join(...parts: string[]): string {
  const filtered = parts.filter((p) => typeof p === "string" && p.length > 0);
  return normalize(filtered.join("/"));
}

function resolve(...parts: string[]): string {
  let resolved = "";
  let absolute = false;
  for (let i = parts.length - 1; i >= 0 && !absolute; i--) {
    const p = parts[i];
    if (typeof p !== "string" || !p) continue;
    resolved = `${p}/${resolved}`;
    absolute = p.startsWith("/");
  }
  resolved = normalizeArray(resolved.split("/"), !absolute).join("/");
  return (absolute ? "/" : "") + resolved || ".";
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  if (i === -1) return ".";
  if (i === 0) return "/";
  return p.slice(0, i);
}

function basename(p: string, ext?: string): string {
  const i = p.lastIndexOf("/");
  let name = i === -1 ? p : p.slice(i + 1);
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}

function extname(p: string): string {
  const base = basename(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i);
}

function isAbsolute(p: string): boolean {
  return p.startsWith("/");
}

function relative(from: string, to: string): string {
  const fromResolved = resolve(from);
  const toResolved = resolve(to);
  if (fromResolved === toResolved) return "";
  const f = fromResolved.split("/");
  const t = toResolved.split("/");
  let i = 0;
  while (i < f.length && i < t.length && f[i] === t[i]) i++;
  const up = f.slice(i).map(() => "..");
  return [...up, ...t.slice(i)].join("/");
}

export const sep = "/";
export const delimiter = ":";
export const posix = {
  normalize,
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  relative,
  sep,
  delimiter,
};

export { normalize, join, resolve, dirname, basename, extname, isAbsolute, relative };

export default {
  normalize,
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  relative,
  sep,
  delimiter,
  posix,
};
