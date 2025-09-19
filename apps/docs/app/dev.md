# Developer Notes

## Versioning
- The website gets built twice. Once with `BASE_PATH=undefined`, meaning it lives at root and once with `BASE_PATH=$PRODUCT_VERSION` meaning it lives one level below root.
- All links use `<Link>` which respects that option by default. This applies to the Navbar and the markdown pages as well.
- Images are handled by `<Image>` HOC over `next/image` which DOES NOT handle the base path internally. You must use the `basePath` option in `nextOptions` on the image.
- Honestly, I used to need `<base>` path tags, but I doubt that's needed at this point.