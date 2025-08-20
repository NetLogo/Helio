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

<!-- {{#dictionary.entries}}
{{#data.syntax}}
[[{{{name}}}]]
{{/data.syntax}}
{{/dictionary.entries}} -->

[[in-<breed>-neighbors]]
[[in-<breed>-neighbors]]

{{#subcategories}}

<h4 id="{{{id}}}">{{{title}}}</h4>

{{/subcategories}}

{{/dictionary.categories}}

## Built-In Variables {#builtinvariables}

{{#dictionary.categories}}
{{#subcategories}}
### {{{title}}} {#{{{id}}}}

{{/subcategories}}
{{/dictionary.categories}}

## Keywords {#Keywords}

{{#dictionary.entries}}
{{#data.syntax}}
{{#entry_categories}}
{{#isKeyword}}
[`{{{name}}}`](#{{{../../../id}}}) {{/isKeyword}}
{{/entry_categories}}
{{/data.syntax}}
{{/dictionary.entries}}

## Constants {#Constants}

{{#dictionary.entries}}
{{#data.constants}}
<div class="dict_entry" id="{{{../id}}}">

### {{{title}}}

{{#constants}}
**[{{{name}}}](#{{{../../id}}})**{{#value}} = {{{value}}}{{/value}}  
{{/constants}}

</div>
{{/data.constants}}
{{/dictionary.entries}}

## Dictionary Entries

{{#dictionary.entries}}
{{#data.syntax}}
<div class="dict_entry" id="{{{../id}}}">

### {{#syntax}}{{{name}}}{{#since}}<span class="since">{{{since}}}</span>{{/since}}{{^last}} {{/last}}{{/syntax}} {#{{{../id}}}}

{{#examples}}
<span class="prim_example">{{{code}}}</span>
{{/examples}}

{{{description}}}

</div>
{{/data.syntax}}
{{/dictionary.entries}}