const autoDocumentedExtensions = new Map<string, string>([
  ["arduino", "Arduino"],
  ["array", "Array"],
  ["bitmap", "Bitmap"],
  ["csv", "CSV"],
  ["gis", "GIS"],
  ["gogo", "GoGo"],
  ["ls", "LevelSpace"],
  ["matrix", "Matrix"],
  ["nw", "Networks"],
  ["palette", "Palette"],
  ["profiler", "Profiler"],
  ["py", "Python"],
  ["resource", "Resource"],
  ["rnd", "Rnd"],
  ["sr", "Simple R"],
  ["sound", "Sound"],
  ["table", "Table"],
  ["time", "Time"],
  ["vid", "Vid"],
  ["view2.5d", "View2.5D"],
]);

const configFileName = "documentation.yaml";

const markdownTemplate = `
# {{extensionName}}

{{{prePrimitiveSections}}}

## Primitives
Looking for the primitive reference for the {{extensionName}} extension? You can find [the full reference here](/{{primRoot}}/dictionary).

{{^emptyTableOfContents}}{{#contents}}

### {{fullCategoryName}}
<div id="{{shortCategoryName}}">
  {{#prims}}
  <a class="code" href="#{{id}}"><code>{{primitive.fullName}}</code></a>
  {{/prims}}
</div>

{{/contents}}{{/emptyTableOfContents}}

{{#emptyTableOfContents}}{{#contents}}
<div id="{{shortCategoryName}}" class="prose">
  {{#prims}}
  <a class="code" href="#{{id}}"><code>{{primitive.fullName}}</code></a>
  {{/prims}}
</div>
{{/contents}}{{/emptyTableOfContents}}

### All Primitives

{{#primitives}}
{{> primTemplate}}
{{/primitives}}

{{{postPrimitiveSections}}}
`;

const primTemplate = /*markdown*/ `
<div class="dict_entry" id="{{id}}">

  <h3>
    <a href="#{{id}}">{{primitive.fullName}}</a>
  </h3>

  <h4>
    {{^isInfix}}{{#examples}}
    <span class="prim_example">{{primitive.fullName}}{{#args}} <i>{{name}}</i>{{/args}}</span>
    {{/examples}}{{/isInfix}}
    {{#isInfix}}{{#examples}}
    <span class="prim_example"><i>{{leftArg.name}}</i> {{primitive.fullName}}{{#rightArgs}} <i>{{name}}</i>{{/rightArgs}}</span>
    {{/examples}}{{/isInfix}}
  </h4>

  {{{description}}}

</div>
`;

const primIndexTemplate = /*markdown*/ `
{{#entry}}
${primTemplate}
{{/entry}}
`;

export {
  autoDocumentedExtensions,
  configFileName,
  markdownTemplate,
  primIndexTemplate,
  primTemplate,
};
