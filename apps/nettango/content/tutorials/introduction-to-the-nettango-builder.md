---
title: Introduction to the NetTango Builder
version: 7.0.4
description: Learn how to use the NetTango Builder to create a blocks-based programming interface for the NetLogo Ants model. This tutorial will guide you through the process of designing your own domain-specific blocks and connecting them to an existing NetLogo model.
keywords:
  - NetTango
  - NetTango Web
  - NetLogo
  - Block-based Programming
tags:
  - NetTango
icon: lucide:puzzle
---

<style>
img {
    max-width: 450px;
}
video {
    max-width: 600px;
}
img, video {
    border-radius: 10px;
}
table pre {
    margin-bottom: 0;
}
</style>

# Introduction to the NetTango Builder

## What is NetTango?

*Starting with an existing NetLogo model*

![Sample blocks](/tutorial/images/sample-blocks.webp)

NetTango is a domain-blocks-based interface for the NetLogo agent-based modeling environment.

There are three possible ways to begin a project with the NetTango Builder:

1. Starting with a blank project
2. Starting with an existing model from the NetLogo Models Library.
3. Starting with an existing model by uploading from your computer.

In this step-by-step tutorial, we are going to explain how to start with an existing model from the NetLogo Models Library (#2). We are going to design a blocks-based programming interface for the NetLogo Ants model. Along the way, we are going to explain each component of the NetTango Builder in detail. We are also going to cover the relevant concepts, interface tools, and alternative design choices.

### Project Files

You can download the [final version of the blocks-based Ant model programming environment](tango/ants.html) and the [completed NetTango builder project file](tango/ants.ntjson) to explore the finished project.

> **Use a compatible browser**
>
> We advise you to run the NetTango Builder on a modern browser (e.g., Chrome, Safari, Firefox) and keep your browser up-to-date. 
>
> ::Flex{class="flex gap-3 justify-center text-2xl text-muted mt-(--space-sm)"}
> :Icon{name="fa:chrome" title="Chrome"} :Icon{name="fa:safari" title="Safari"} :Icon{name="fa:firefox" title="Firefox"} :Icon{name="fa:edge" title="Edge"} :Icon{name="fa:opera" title="Opera"}
> ::

## Preparing our project

### Loading the base model

We are going to work with a model that is already in the NetLogo Models Library, so we will click the "**Files**" button below the embedded blank NetLogo model. A context menu will appear. There, we will click the "**Choose NetLogo library model**" item. This will show a dialog where we can pick a model from the list of the library models or we can use the search box. We will write <kbd>ants</kbd> in the search box and click the top item ("Sample Models/Biology/Ants"). Then we will click the "**Load the model**" button. This will load the Ants model to our project.

If you are going to use one of your own models, you should use the "**Import NetLogo Model**" item from the same menu. The file you provide should be a NetLogo Desktop file with the `.nlogo` extension. NetLogo web files (`.html`) are not currently supported.

<p>
  <video controls poster="/tutorial/videos/thumb/01-load-ants.webp">
    <source src="/tutorial/videos/01-load-ants.mov" type="video/mp4" />
    Sorry. Your browser doesn't support videos.
  </video>
</p>

The NetTango builder has *auto-save functionality* built-in. If you make changes to your project, you can safely close the browser window. The latest version of your model will be there when you open the NetTango builder again.

You can also save your project as an external file with the `.ntjson` extension by clicking the "**Files**" button and then clicking the "**Export NetTango Project**" item. We advise you to do so only after making significant progress with your project because each time you click this button, the NetTango builder will generate a brand new file, which might make it difficult to track versions.

You can load an existing `ntjson` project file by clicking clicking the "**Files**" button and then clicking the "**Import NetTango JSON File**" item.

![Export JSON](/tutorial/images/export-json.webp)

> **Make a plan**
>
> It is advised to have a plan at hand before creating new projects with the NetTango builder. Here are some of the considerations to keep in mind:
>
> - Which agents are going to be programmable with the blocks-based interface?
> - What kinds of behavior will the users be programming?
> - How will you separate or combine each behavior into easily recognizable code blocks?
> - Which domain-specific words are best suited for each code block?
>
> We advise against one-to-one conversion of NetLogo code to NetTango blocks and encourage the use of more domain-specific terms. If you would like to see examples, please scroll down to the Example NetTango Projects section.

### Block Spaces

The next step in our project is to create two "**Block Spaces**". Each block space in NetTango is a self-contained widget that has its own blocks library. There can be as many block spaces in a NetTango project as needed. There can be just one, as well. The block spaces can simplify the programming environment in various ways. For example, you can use separate block spaces for each agent breed. Here, we will use one block space for the "*setup*" procedure and another for the "*go*" procedure for our ants model because we only have one agent breed.

Create two new block spaces by clicking the "**Add Block Space**" button <u>twice</u>.

<p>
  <video controls poster="/tutorial/videos/thumb/03-create-spaces.webp">
    <source src="/tutorial/videos/03-create-spaces.mov" type="video/mp4" />
    Sorry. Your browser doesn't support videos.
  </video>
</p>

Rename your block spaces as <kbd>Setup</kbd> and <kbd>Go</kbd>.

The names of the block spaces do not have any effect in the code execution. They are solely for users to distinguish the spaces from each other. Notice the change in the NetLogo Code widget below the block spaces. You will see two comments as ; Code for Setup and ; Code for Go. Once we add our code-blocks and assemble them as algorithms, the corresponding NetLogo code will appear in this area.

## Creating the Setup blocks

The setup procedure in the Ants model does the following actions:

1. Clear all and reset the ticks counter.
2. Set the default shape of the turtles as "*bug*".
3. Create a nest at the center of the model.
4. Create the ants at the center of the model.
5. Create the piles of food away from the nest.

We are going to create a corresponding code-block for the last three of these actions. As a design decision, the first two actions will be hard coded in our model. We are not going to create blocks for them.

### Creating a procedure block

We will get started with creating a *procedure block*. Each block space needs at least one procedure to encapsulate the blocks-based algorithms assembled inside.

We want our users to be able to manipulate the function of the **Setup** button. To do so, we will create a new procedure block called "`Setup`".

Click the "**Add Block**" button under the title of the <mark>"Setup"</mark> space. A pop-up menu will appear. Navigate to the "**Basics**" section and then click the "**new procedure**" item.

<p>
<p>
<video controls poster="/tutorial/videos/thumb/04-1-create-procedure.webp">
  <source src="/tutorial/videos/04-1-create-procedure.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>
</p>

A pop-up window titled "**Setup Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>Setup</kbd>.
2. Notice that the "**Limit**" is pre-defined as 1. This means that the users can only drag one setup block to their coding area. It is important to keep the limit as 1 because we cannot have multiple procedures with the same name in NetLogo.
3. Change the contents of the "**NetLogo code format**" to "`to blocks-setup`". When the user drags our procedure block to the coding area, a procedure named "`blocks-setup`" will be added to the end of the embedded NetLogo model. Because this is a procedure block, the NetTango builder will also add an "`end`" to the code. Any blocks that we attach to this procedure block will be pasted within the "`blocks-setup`" procedure.

<p>
<p>
<video controls poster="/tutorial/videos/thumb/04-2-create-setup.webp">
  <source src="/tutorial/videos/04-2-create-setup.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>
</p>

Click the "**Add New Block**" button at the bottom.

Notice that when you drag the "setup" block to the coding area (white background), the original block on the right will be disabled. This indicates that the user has ran out of the limit.

Also notice that the NetLogo code area below the blocks will show an empty `blocks-setup` procedure once you drag the block to the coding area.

> **Take advantage of the visual affordances of blocks-based programming**
>
> The NetTango builder provides a number of tools to change the appearance of the blocks, which can help us design blocks that are easier to learn. You can use colors, font formatting, and even emojis to indicate functionality, category, or other important distinctions. You can modify the visual properties of blocks by clicking the arrow next to the "Blocks Styles " section in the "**Setup Block**" screen.
>
> <p>
> <video controls poster="/tutorial/videos/thumb/06-block-styles.webp">
>   <source src="/tutorial/videos/06-block-styles.mov" type="video/mp4" />
>   Sorry. Your browser doesn't support videos.
> </video>
> </p>
>
> *Note: By default, the NetTango builder provides built-in colors for block types (e.g., command blocks are gray and procedure blocks are dark-red).*

### Creating a command block

Now that we have a procedure to fill-in, we are going to start creating our command blocks. Our first block will be "**Create ants**".

Click the "**Add Block**" button under the title of the <mark>"Setup"</mark> space. A pop-up menu will appear. Navigate to the "**Basics**" section and then click the "**empty command**" item.

<p>
<p>
<video controls poster="/tutorial/videos/thumb/05-1-create-command.webp">
  <source src="/tutorial/videos/05-1-create-command.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>
</p>

A pop-up window titled "**Setup Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>Create ants</kbd>.
2. Change the "**NetLogo code format**" to "`create-turtles {0}`". The expression `{0}` means that the value of our very first parameter will be pasted here by the NetTango engine.
3. Click the "**Add Parameter**" button below the colors. A new section with the title "<mark>Parameter 0</mark>" with some options will appear below the button.
   4. Change the "**Display name**" to <kbd>how many?</kbd>. The display name is shown to the users but it does not have any impact on the actual NetLogo code.
   5. Change the "**Type**" to "`range`". This will allow us to set a minimum and a maximum value for the parameter.
   6. Change the "**Default**" to <kbd>125</kbd>, which is the default value for this parameter in the Ants model.
   7. Leave the "**Min**" as <kbd>0</kbd>. This will allow us to set a minimum and a maximum value for the parameter.
   8. Change the "**Max**" to <kbd>300</kbd>.

<p>
<video controls poster="/tutorial/videos/thumb/05-2-command-setup.webp">
  <source src="/tutorial/videos/05-2-command-setup.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

Click the "**Add New Block**" button at the bottom.

Notice that the "**Limit**" option is left as blank for command blocks. This means that the users can drag as many instances of this block to their coding area as they wish.

Try your new block by dragging multiple copies to the coding area and attaching them to the Setup procedure.

Notice that only the NetLogo code of the blocks that are attached to the Setup procedure will appear in the NetLogo Code widget below the block-based programming area. Also notice that even though we have a "Create ants 300" block in the space, it is not reflected in the code because the blocks that are not attached to any procedure are omitted by the NetTango compiler.

### Connecting the base model

We created our 2 code blocks for the Setup space. When we drag the code blocks and assemble them as algorithms, we can see that the NetTango builder is generating the corresponding NetLogo code.

However, if we recompile our model and click the **Setup** button, we will notice that our model still runs the old code. This is because we need to modify our model to specifically run the "`blocks-setup`" procedure.

![Setup blocks](/tutorial/images/03-1-setup-blocks.webp)
![Setup code](/tutorial/images/03-2-setup-code.webp)

Doing so is easy:

1. Scroll up and click the "**NetLogo Code**" tab
2. Locate the "`to setup`" procedure and remove the lines 16-19 *(shown below)* and replace them with a single line of code "`blocks-setup`"

   ```
   create-turtles population
   [ set size 2         ;; easier to see
     set color red  ]   ;; red = not carrying food
   setup-patches
   ```

3. Click the "**Recompile Code**" button at the top of the NetLogo Code tab and close the NetLogo Code tab altogether.

<p>
<video controls poster="/tutorial/videos/thumb/07-edit-nl-code.webp">
  <source src="/tutorial/videos/07-edit-nl-code.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

Congratulations! We are now halfway done. If you followed each step of this tutorial so far, you should now be able to modify the behavior of the setup button of the Ants model with code-blocks.

### Creating the rest of the Setup blocks

Now that you created two blocks, it should be rather straightforward to create the rest of the <mark>Setup blocks</mark> without step-by-step instructions. Refer to the information below to create the remaining blocks:

**Create a nest:**

<table>
  <tr>
    <th>Display name</th>
    <td>Create a nest</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
ask patches [
    set nest? (distancexy 0 0) < {0}
    if nest? [ set pcolor violet]
    set nest-scent 200 - distancexy 0 0
]
```

  </td>
  </tr>
  <tr>
    <th>Parameter: <em>Diameter</em></th>
    <td>Type: range<br>Default: 5<br>Min: 1<br>Max: 10</td>
  </tr>
</table>

![Create a nest](/tutorial/images/08-create-a-nest.webp)

**Create a food pile:**

<table>
  <tr>
    <th>Display name</th>
    <td>Create a food pile</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
ask patches with [distancexy {0} {1} < 5][
    set food one-of [1 2]
    set pcolor {P0}
]
```

  </td>
  </tr>
  <tr>
    <th>Parameter: <em>X Coordinate</em></th>
    <td>Type: range<br>Default: 10<br>Min: -25<br>Max: 25</td>
  </tr>
  <tr>
    <th>Parameter: <em>Y Coordinate</em></th>
    <td>Type: range<br>Default: 10<br>Min: -25<br>Max: 25</td>
  </tr>
  <tr>
    <th>Property: <em>Color</em></th>
    <td>Type: select<br>Default: Cyan<br>Quote values in code: never-quote<br><br>Options:

  <table>
    <thead><tr><th>Actual Value</th><th>Display Value</th></tr></thead>
    <tbody>
      <tr><td>Cyan</td><td>Cyan</td></tr>
      <tr><td>Sky</td><td>Sky</td></tr>
      <tr><td>Blue</td><td>Blue</td></tr>
      <tr><td>Yellow</td><td>Yellow</td></tr>
      <tr><td>Red</td><td>Red</td></tr>
    </tbody>
  </table>

  </td>
  </tr>
</table>

![Create food piles](/tutorial/images/09-create-food-piles.webp)

## Creating the Go blocks

The *go procedure* in the Ants model is fairly more complex compared to the *setup procedure*. It has the following rules followed by each ant autonomously:

::pre{.bg-transparent}
- Am I carrying food (i.e., color = red)?
  - :span[*No?*]{.underline} Then, I will look for food:
    - If there :span[*is*]{.underline} food here (on my patch):
      - I will pick up 1 food from the patch.
      - I will change my state to carrying food (color = orange).
      - I will turn 180 degrees.
    - If there is :span[*no food*]{.underline} here:
      - I will smell the environment.
      - If I smell pheromone, I will turn towards the strongest smell.
  - :span[*Yes?*]{.underline} Then, I will return to the nest:
    - If I arrived at the nest:
      - I will change my state to "not carrying food" (i.e., color = orange).
      - I will turn around.
    - If I did not arrive at the nest, yet:
      - I will drop some chemical to the current patch.
      - I will turn towards the strongest nest smell.
- I will wiggle a bit.
- I will move forward 1 unit.
::

In addition to individual ant behavior, there is also a chemical diffusion & (i.e., pheromone evaporation) logic in the Go procedure. We are going to keep those parts hard-coded in our NetTango environment as a design decision in this tutorial.

### Creating a procedure block

As usual, we will get started with creating our procedure block for the Go space.

Click the "**Add Block**" button under the title of the <mark>"Go"</mark> space. A pop-up menu will appear. Navigate to the "**Basics**" section and then click the "**new procedure**" item.

<p>
<video controls poster="/tutorial/videos/thumb/10-create-go-procedure.webp">
  <source src="/tutorial/videos/10-create-go-procedure.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

A pop-up window titled "**Go Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>Go</kbd>.
2. Leave the "**Limit**" as 1.
3. Change the contents of the "**NetLogo code format**" to "`to blocks-go`".
4. Under "**Which blocks are allowed to be added to this chain starter?**" select "Allow blocks with at least one of the chosen tags". Then enter "ask ants" as a new tag name. This will be referenced when we create the next block, an "*`ask`*" block.

Click the "**Add New Block**" button at the bottom.

<p>
<video controls poster="/tutorial/videos/thumb/11-create-go-code.webp">
  <source src="/tutorial/videos/11-create-go-code.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

### Creating an "*`ask`*" block for agent rules

Since each ant-agent will follow their rules independently, we need an "*`ask`*" block. The wording of our ask block may vary based on context. Here, we are going to create an "*Each ant*" block. Some alternatives may be "*Ants do*", "*Ant actions*", or even simple emojis such as "🐜 🐜 🐜 🐜 🐜".

Click the "**Add Block**" button under the title of the <mark>"Go"</mark> space. A pop-up menu will appear. Navigate to the "**Control Blocks**" section and then click the "**Ask Turtles**" item.

<p>
<video controls poster="/tutorial/videos/thumb/12-create-ask.webp">
  <source src="/tutorial/videos/12-create-ask.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

A pop-up window titled "**Go Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>Each ant</kbd>.
2. Set the "**Limit**" as <kbd>1.</kbd>
3. Leave the contents of the "**NetLogo code format**" as "`ask turtles`".
4. Add the tag "ask ants" which we first created in the "Go" procedure block. Now only this block can be placed directly beneath the "Go" procedure block.

Click the "**Add New Block**" button at the bottom.

<p>
<video controls poster="/tutorial/videos/thumb/13-each-ant.webp">
  <source src="/tutorial/videos/13-each-ant.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

> **Adding Tags**
>
> Add tags to your blocks to help group and organize them. Tags work with control clauses to restrict where blocks can be placed in a program, either for NetLogo syntactical correctness or for modeling purposes. In this tutorial, we only added a tag to the "*Each ant*" block for syntax purposes, making sure that the "*Go*" block could only accept that block. This helped prevent errors and ensure that all other blocks are contained within the "*Each ant*" block. For example, the "*Move forward*" block (see Step 3e) would create an error if it were outside the "*Each ant*" block and directly within the "*Go*" block.
>
> Feel free to add more restrictions for design purposes. Say you wanted to make sure that the "*Drop pheromone*" block cannot be placed directly within the "*Each ant*" block and can only appear within an "*`if`*" block. You would have to add a tag to the "*`if`*" blocks and make sure the "*Each ant*" block can only accept blocks with that tag. Then only "*`if`*" blocks could be placed directly within the "*Each ant*" block, and "*Drop pheromone*" would have to be placed within an "*`if`*" block.

### Creating two "*`if`*" blocks for conditionals & branching

Our ants will do different things whether they are carrying food or not. One of the strategies would be to divide the logic into two separate procedures. Another strategy would be to create two separate spaces. Here, we will stick to a third, more crude/straightforward approach. We will provide our users two if blocks. We could do the same with a combined "ifelse" block, as well, but we will use two separate blocks for simplicity.

Click the "**Add Block**" button under the title of the <mark>"Go"</mark> space. A pop-up menu will appear. Navigate to the "**Control Blocks**" section and then click the "**if**" item.

<p>
<video controls poster="/tutorial/videos/thumb/14-create-if.webp">
  <source src="/tutorial/videos/14-create-if.mp4" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

A pop-up window titled "**Go Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>If I am not carrying food</kbd>.
2. Change the contents of the "**NetLogo code format**" to "`if color = red`".

Click the "**Add New Block**" button at the bottom.

<p>
<video controls poster="/tutorial/videos/thumb/15-if-carrying-food.webp">
  <source src="/tutorial/videos/15-if-carrying-food.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

Now we will <u>*duplicate*</u> our "<mark>if I am not carrying food</mark>" block by clicking the "Modify Block" button under the title of the "<mark>Go</mark>" space. A pop-up menu will appear. Navigate to the "If I am not carrying food" item and then click the "**duplicate**" item at the bottom of this list.

You will have an exactly identical block appearing at the bottom of the blocks list. Now, we will edit the second of our "<mark>If I am not carrying food</mark>" blocks to an "<mark>If I am carrying food</mark>" block. To do so, click the "**Modify Block**" button under the title of the "<mark>Go</mark>" space. A pop-up menu will appear. Navigate to the second "**If I am not carrying food**" item and then click the "**edit**" item.

<p>
<video controls poster="/tutorial/videos/thumb/16-duplicate-if.webp">
  <source src="/tutorial/videos/16-duplicate-if.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

A pop-up window titled "**Go Block**" will appear on the screen.

1. Change the "**Display Name**" to <kbd>If I am carrying food</kbd>.
2. Change the contents of the "**NetLogo code format**" to "`if color != red`".

Click the "**Update Block**" button at the bottom.

<p>
<video controls poster="/tutorial/videos/thumb/17-if-carrying-food.webp">
  <source src="/tutorial/videos/17-if-carrying-food.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

### Connecting the base model

We created 4 code blocks for the Go space so far. When we drag the code blocks and assemble them as algorithms, we can see that the NetTango builder is generating the corresponding NetLogo code.

However, if we **recompile** our model and click the **Go** button, we will once again notice that our model still runs the old code. We need to modify our model to specifically run the "`blocks-go`" procedure.

![Go blocks](/tutorial/images/18-go-blocks.webp)
![Go code](/tutorial/images/18-go-code.webp)

1. Scroll up and click the "**NetLogo Code**" tab
2. Locate the "`to go`" procedure and remove the highlighted lines (69-75) of code below and replace them with a single line of code "`blocks-go`"

   ```
   ask turtles
   [ if who >= ticks [ stop ] ;; delay initial departure
     ifelse color = red
     [ look-for-food  ]       ;; not carrying food? look for it
     [ return-to-nest ]       ;; carrying food? take it back to nest
     wiggle
     fd 1 
   ]
   ```

Now, you can click the "**Recompile Code**" button at the top of the NetLogo Code tab and close the NetLogo Code tab altogether.

<p>
<video controls poster="/tutorial/videos/thumb/19-edit-go-code.webp">
  <source src="/tutorial/videos/19-edit-go-code.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

Congratulations! We are now halfway done with creating our Go blocks. If you followed each step of this tutorial so far, you should now be able to modify the go procedure of the Ants model with code-blocks.

### Creating the rest of the Go blocks

Now we can finish building our NetTango Ants modeling environment by creating three additional *if blocks* and our *command blocks*. As this is a repetitive process, once again we will provide you with information about each block but we will not provide step-by-step instructions.

**If there is food here:**

<table>
  <tr>
    <th>Display name</th>
    <td>If there is food here</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
if food > 0
```

  </td>
  </tr>
</table>

**If I am at the nest:**

<table>
  <tr>
    <th>Display name</th>
    <td>If I am at the nest</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
if nest?
```

  </td>
  </tr>
</table>

**If I am not at the nest:**

<table>
  <tr>
    <th>Display name</th>
    <td>If I am not at the nest</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
if not nest?
```

  </td>
  </tr>
</table>

**Turn around:**

<table>
  <tr>
    <th>Display name</th>
    <td>Turn around</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
right 180
```

  </td>
  </tr>
</table>

**Pick food:**

<table>
  <tr>
    <th>Display name</th>
    <td>Pick food</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
if food > 0 [
  set food food - 1
  set color orange + 1
]
```

  </td>
  </tr>
</table>

**Drop food:**

<table>
  <tr>
    <th>Display name</th>
    <td>Drop food</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
set color red
```

  </td>
  </tr>
</table>

**Drop pheromone chemical:**

<table>
  <tr>
    <th>Display name</th>
    <td>Drop pheromone</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
set chemical chemical + 60
```

  </td>
  </tr>
</table>

**Turn towards pheromone smell:**

<table>
  <tr>
    <th>Display name</th>
    <td>Turn towards pheromone smell</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
if (chemical >= 0.05) and (chemical < 2) [
    uphill-chemical
]
```

  </td>
  </tr>
</table>

**Turn towards nest smell:**

<table>
  <tr>
    <th>Display name</th>
    <td>Turn towards nest smell</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
uphill-nest-scent
```

  </td>
  </tr>
</table>

**Wiggle:**

<table>
  <tr>
    <th>Display name</th>
    <td>Wiggle</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
right random 40
left random 40
if not can-move? 1 [ rt 180 ]
```

  </td>
  </tr>
</table>

**Move forward:**

<table>
  <tr>
    <th>Display name</th>
    <td>Move forward</td>
  </tr>
  <tr>
    <td>NetLogo code format</td>
    <td>

```
forward 1
```

  </td>
  </tr>
</table>

## Wrapping up

Congratulations! You have created your very first NetTango project. By now, you should have a fully functional domain-blocks-based environment for the NetLogo Ants model.

In case you did not follow along but skimmed the tutorial and you would like to test out the finished project, you can test the finished project with the following link (feel free to also use this link to view the suggested block ordering):

**[Blocks based Ants modeling environment (opens a new window)](tango/ants.html)**

You can also download the finished project file with the following link:

**[Project file](tango/ants.ntjson)**

<p>
<video controls poster="/tutorial/videos/thumb/20-final-go.webp">
  <source src="/tutorial/videos/20-finished-go.mov" type="video/mp4" />
  Sorry. Your browser doesn't support videos.
</video>
</p>

If you would like to preview and debug your project at each point during the process, you can click the "**Files**" button below the NetLogo model and then clicking the "**Preview Standalone HTML page**" item.

Once you finished your project and it is ready for deployment, you can save it as an `.html` file by clicking the "**Files**" button below the NetLogo model and then clicking the "**Export Standalone HTML File**" item.

![Export HTML](/tutorial/images/export-html.webp)

## Example projects

The NetTango builder has an embedded example project if you would like to quickly tinker with a pre-built project or if it is intimidating to start with an empty project.

To access the embedded example project, scroll to the end of the page and click the "**Load WSP Testing Defaults**" button. Keep in mind that this will erase your previous work without a prompt. Make sure to export your existing project if necessary.

![Load WSP](/tutorial/images/load-wsp.webp)

::Flex{.flex .gap-5}
![WSP](/tutorial/images/wsp.webp){class="object-contain"}
![WSP actions](/tutorial/images/wsp-actions.webp){class="object-contain"}
::

If you would like to get your hands on more example projects, here are a few others created by our research team members:


::div{class="my-10 flex flex-col gap-6 sm:flex-row sm:items-start"}


::Flex
![Rollypollies](/tutorial/images/rollypollies.webp){class="w-50 mt-0 rounded"}
::

:::div{class="flex flex-col gap-3 *:my-0"}
### Rollypollies


[:Icon{name="fa:file"} Download the Project file](tango/ants.ntjson){class="inline-flex items-center gap-2 font-semibold" download}

[:Icon{name="fa:external-link"} Demo the Rollypollies environment](tango/rollypollies.html){class="inline-flex items-center gap-2 font-semibold" target="_blank" rel="noopener"}

:span[The Rollypollies environment is developed by Sugat Dabholkar and Teresa Granito.]{class="italic text-gray-600"}
:::

::

::div{class="my-10 flex flex-col gap-6 sm:flex-row sm:items-start"}


::Flex
![Gas Particle Sandbox](/tutorial/images/gpc.webp){class="w-50 mt-0 rounded"}
::

:::div{class="flex flex-col gap-3 *:my-0"}
### Gas Particle Sandbox with Phenomenological Programming



[:Icon{name="fa:file"} Download the Project file](tango/gpc.ntjson){class="inline-flex items-center gap-2 font-semibold" download}

[:Icon{name="fa:external-link"} Demo the Gas Particle Sandbox environment](tango/gpc.html){class="inline-flex items-center gap-2 font-semibold" target="_blank" rel="noopener"}

:span[The Gas Particle Sandbox with Phenomenological Programming environment is developed by Umit Aslan, Nicholas LaGrassa, Michael Horn & Uri Wilensky.]{class="italic text-gray-600"}
:::
::

::div{class="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-600"}
Tutorial by Umit Aslan of [CCL](http://ccl.northwestern.edu/){class="font-semibold"}. NetLogo © 1999-2020 Uri Wilensky ([details & terms of use](http://ccl.northwestern.edu/netlogo/docs/copyright.html){class="font-semibold"})

:span[This work was made possible through generous support from the National Science Foundation (grants CNS-1138461, CNS-1441041, DRL-1020101, DRL-1640201 and DRL-1842374) and the Spencer Foundation (Award #201600069). Any opinions, findings, or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the funding organizations.]{class="text-xs"}
::