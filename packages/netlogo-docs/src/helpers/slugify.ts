import slugify from "slugify";

export const slugifyOptions = {
  lower: true,
  replacement: "--",
  remove: /[*+~()'"!:@\?&<>"'`]/g,
};

export function toSlug(name: string): string {
  return slugify(name, slugifyOptions);
}
