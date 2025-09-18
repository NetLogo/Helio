# NetLogo Dictionary

{{> partials/dictionary/header.md }}

## Categories

This is an approximate grouping. Remember that a turtle-related
primitive might still be used by patches or the observer, and vice
versa. To see which agents (turtles, patches, links, observer) can
actually run a primitive, consult its dictionary entry.

{{#dictionary.categories}}

<h3 id="{{{id}}}">{{{title}}}</h3>

{{#entries}}
[[{{{name}}}|{{{id}}}]]
{{#if additional_names.length}}
({{#each additional_names}}[[{{{.}}}|{{{../id}}}]]{{#unless @last}}, {{/unless}}{{/each}})
{{/if}}
{{/entries}}
{{/dictionary.categories}}

## Built-In Variables
<div>

{{#each dictionary.variables}}
<h3 id="{{{id}}}">{{{title}}}</h3>

{{#each entries}}
[[{{{name}}}|{{{id}}}]]
{{/each}}

{{/each}}

</div>

## Keywords
{{#each dictionary.keywords.entries}}
[[{{{name}}}|{{{id}}}]]
{{/each}}

## Constants

{{#each dictionary.entries}}
{{> partials/dictionary/constant.md }}
{{/each}}

## Primitives and Commands

{{#each dictionary.entries}}
{{> partials/dictionary/entry.md }}
{{/each}}