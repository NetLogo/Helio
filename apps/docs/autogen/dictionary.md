# {{title}}

<div class="centertext" style="padding-bottom: 1rem; max-width: inherit;">
  <div class="block">
    <div class="smallfont centertext tocborder inlineblock">
      Alphabetical:
      <span class="bold">
        <a class="modern-anchor" href="#A">A</a>
        <a class="modern-anchor" href="#B">B</a>
        <a class="modern-anchor" href="#C">C</a>
        <a class="modern-anchor" href="#D">D</a>
        <a class="modern-anchor" href="#E">E</a>
        <a class="modern-anchor" href="#F">F</a>
        <a class="modern-anchor" href="#G">G</a>
        <a class="modern-anchor" href="#H">H</a>
        <a class="modern-anchor" href="#I">I</a>
        <a class="modern-anchor" href="#J">J</a>
        <!--<a class="modern-anchor" href="#K">K</a>-->
        <a class="modern-anchor" href="#L">L</a>
        <a class="modern-anchor" href="#M">M</a>
        <a class="modern-anchor" href="#N">N</a>
        <a class="modern-anchor" href="#O">O</a>
        <a class="modern-anchor" href="#P">P</a>
        <!--<a class="modern-anchor" href="#Q">Q</a>-->
        <a class="modern-anchor" href="#R">R</a>
        <a class="modern-anchor" href="#S">S</a>
        <a class="modern-anchor" href="#T">T</a>
        <a class="modern-anchor" href="#U">U</a>
        <a class="modern-anchor" href="#V">V</a>
        <a class="modern-anchor" href="#W">W</a>
        <a class="modern-anchor" href="#X">X</a>
        <a class="modern-anchor" href="#Y">Y</a>
        <!--<a class="modern-anchor" href="#Z">Z</a>-->
        <a class="modern-anchor" href="#ops">-&gt;</a>
      </span>
    </div>
  </div>
  <div class="block">
    <div class="smallfont centertext tocborder inlineblock">
      Categories: <a class="modern-anchor" href="#turtlegroup">Turtle</a> - <a class="modern-anchor" href="#patchgroup">Patch</a> - <a class="modern-anchor" href="#linkgroup">Links</a>
      - <a class="modern-anchor" href="#agentsetgroup">Agentset</a> - <a class="modern-anchor" href="#colorgroup">Color</a>
      - <a class="modern-anchor" href="#anonproceduresgroup">Anonymous Procedures</a> - <a class="modern-anchor" href="#controlgroup">Control/Logic</a> - <a class="modern-anchor" href="#worldgroup">World</a>
      <br>
      <a class="modern-anchor" href="#perspectivegroup">Perspective</a> -
      <a class="modern-anchor" href="#iogroup">Input/Output</a> - <a class="modern-anchor" href="#fileiogroup">File</a> - <a class="modern-anchor" href="#listsgroup">List</a> -
      <a class="modern-anchor" href="#stringgroup">String</a> - <a class="modern-anchor" href="#mathematicalgroup">Math</a> - <a class="modern-anchor" href="#plottinggroup">Plotting</a>
      - <a class="modern-anchor" href="#systemgroup">System</a> - <a class="modern-anchor" href="#hubnetgroup">HubNet</a>
    </div>
  </div>
  <div class="block">
    <div class="smallfont centertext tocborder inlineblock">
      Special: <a class="modern-anchor" href="#builtinvariables">Variables</a> - <a class="modern-anchor" href="#Keywords">Keywords</a> - <a class="modern-anchor" href="#Constants">Constants</a>
    </div>
  </div>
</div>


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

{{#dictionary.catalog.variables.subcategories}}
<h3 id="{{{id}}}">{{{title}}}</h3>
{{/dictionary.catalog.variables.subcategories}}

</div>

## Keywords
{{#each dictionary.catalog.keywords.entries}}
[[{{{name}}}|{{{id}}}]]
{{/each}}

## Constants

{{#each dictionary.entries}}
{{#if data.constants.length}}
<div class="dict_entry" id="{{{id}}}" data-constants="{{#each data.constants}}{{{name}}}{{#unless @last}} {{/unless}}{{/each}}">

### {{{data.title}}}

{{#each data.constants}}
[[{{{name}}}]] {{#if value}}= {{{value}}}{{/if}}<br/>
{{/each}}

</div>
{{/if}}
{{/each}}

## Primitives and Commands

{{#each dictionary.entries}}
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
{{/each}}