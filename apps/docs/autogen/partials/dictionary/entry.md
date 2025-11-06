{{#if data.syntax.length}}
<div class="dict_entry" id="{{{id}}}" role="region">
<h3>
{{#each data.syntax}}
<a href="#{{{../id}}}" role="doc-noteref" aria-label="Reference to {{name}}">
{{name}}
{{#if since}}
<span class="since" role="note" aria-label="Since version">
{{{since}}}
</span>
{{/if}}
</a>
{{/each}}
</h3>

{{#if data.examples.length}}
<h4>
{{#each data.examples}}

{{> partials/dictionary/prim_example.md }}

{{/each}}
{{#if icons.length}}
{{#each icons}}
<img alt="{{alt}}" src="{{url}}" width="16" height="16">
{{/each}}
{{/if}}

</h4>
{{/if}}

{{{data.description}}}

</div>
{{/if}}
