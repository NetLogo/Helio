# NetLogo Shared Markdown

## Usage

```tsx

import NetLogoMarkdown from '@repo/markdown'
import '@repo/markdown/styles.scss';

export default function MyComponent() {
  const markdownContent = /* ... */
  return (
    <NetLogoMarkdown>{markdownContent}</NetLogoMarkdown>
  )
}
```

## Plugins
|Name|Role|Type|Custom|
|---|---|---|---|
|`rehypeSlug`|Add IDs to headings|`rehype`||
|`rehypeAutolinkHeadings`|Add anchor links to headings|`rehype`||
|`rehypeRaw`|Parse raw HTML|`rehype`||
|`rehypeTocWrapper`|Wrap table of contents|`rehype`|✓|
|`rehypeTableWrapper`|Wrap tables|`rehype`|✓|
|`remarkDirective`|Parse directives|`remark`||
|`remarkDirectiveRehype`|Transform directives to HTML|`remark`||
|`remarkWikiLink`|Parse wiki-style links|`remark`|✓|
|`remarkGfm`|GitHub Flavored Markdown|`remark`||
|`remarkSmartypants`|Smart quotes and dashes|`remark`||
|`remarkRehypeQuestion`|Question directives|`remark`|✓|
|`remarkHighlightNL`|NetLogo syntax highlighting|`remark`|✓|
|`remarkToc`|Generate table of contents|`remark`||
