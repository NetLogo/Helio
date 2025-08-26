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

  :::span{.prim_example}
    {{code}}
    {{#if since}}
      :::span{.since}
      {{{since}}}
      :::
    {{/if}}
  :::

  {{/each}}
  </h4>
  {{/if}}

  {{{data.description}}}

</div>
{{/if}}