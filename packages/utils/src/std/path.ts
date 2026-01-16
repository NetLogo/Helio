export function convertPath(path: string, target: "windows" | "posix"): string {
  if (target === "posix") {
    return path.replace(/^([a-zA-Z]):\\/, "/$1/").replace(/\\/g, "/");
  } else {
    return path.replace(/^\/([a-zA-Z])\//, "$1:\\").replace(/\//g, "\\");
  }
}
