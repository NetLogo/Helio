{{#if data.constants.length}}
<div class="dict_entry" id="{{{id}}}" data-constants="{{#each data.constants}}{{{name}}}{{#unless @last}} {{/unless}}{{/each}}">

### {{{data.title}}}

{{#each data.constants}}
`{{{name}}}` {{#if value}}= {{{value}}}{{/if}}<br/>
{{/each}}

</div>
{{/if}}