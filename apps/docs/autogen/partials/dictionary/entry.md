{{#if data.syntax.length}}
<div class="dict_entry" id="{{{id}}}">
<h3>
{{#each data.syntax}}
<a href="#{{{../id}}}">
{{name}}
{{#if since}}
<span class="since">
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