# {{title}}


The Info tab provides an introduction to a model. It explains what system is being modeled, how the model was
created, and and how to use it. It may also suggest things to explore and ways to extend the model, or call your
attention to particular NetLogo features the model uses.
![[infotab/infotab.png]]

You may wish to read the Info tab of an existing model before interacting with its widgets or its code.

#### Table of Contents

## Editing

The normal, formatted view of the Info tab is not editable. To make edits, click the &quot;Edit&quot; button.
When done editing, click the &quot;Edit&quot; button again.

![[infotab/infotabedit.png]]

You edit the Info tab as unformatted plain text. When you're done editing, the plain text you entered is
displayed in a more attractive format.

To control how the formatted display looks, you use a &quot;markup language&quot; called Markdown. You may have
encountered Markdown elsewhere; it is used on a number of web sites. (There are other markup languages in use on
the web; for example, Wikipedia used a markup language called MediaWiki. Markup languages differ in details.)

The remainder of this guide is a tour of Markdown.

## Headings

A heading begins with one or more hash marks (`#`). The number of hash marks used controls the size and prominence of the header, with one hash mark indicating the largest header.

#### Input

```text
# First-level heading

## Second-level heading

### Third-level heading

#### Fourth-level heading
```

## Paragraphs

#### Example

```text
This is a paragraph. There are no spaces before the word 'This'.

This is another paragraph. The first line has two sentences.
The entire paragraph has one line with three sentences.

Single line breaks in the input
do not make line breaks in the output,
as demonstrated here.
```

#### Formatted

This is a paragraph. There are no spaces before the word 'This'.

This is another paragraph. The first line has two sentences. The entire paragraph has one line with three sentences.

Single line breaks in the input do not make line breaks in the output, as demonstrated here.

## Italicized and bold text

#### Example

```text
For italics, surround text with underscores:
_hello, world_.

For bold, surround text with two asterisks:
**hello, world**.

You can also combine them:
_**hello**_ and **_goodbye_**
```

#### Formatted

For italics, surround text with underscores:
_hello, world_.

For bold, surround text with two asterisks:
**hello, world**.

You can also combine them:
_**hello**_ and **_goodbye_**

## Ordered lists

#### Example

```text
We are about to start an ordered list.

  1. Ordered lists are indented 2 spaces.
    a) Subitems are indented 2 more spaces (4 in all).
  2. The next item in the list starts with the next number.
  3. And so on...
```

#### Formatted

We are about to start an ordered list.

  1. Ordered lists are indented 2 spaces.
    a) Subitems are indented 2 more spaces (4 in all for a second level item).
  2. The next item in the list starts with the next number.
  3. And so on...

## Unordered lists

#### Example

```text
We are about to start an unordered list.

  * Like ordered lists, unordered lists are also indented 2 spaces.
  * Unlike ordered lists, unordered lists use stars instead of numbers.
    * Sub items are indented 2 more spaces.
    * Here's another sub item.
```

#### Formatted

We are about to start an unordered list.

  * Like ordered lists, unordered lists are also indented 2 spaces.
  * Unlike ordered lists, unordered lists use stars instead of numbers.
    * Sub items are indented 2 more spaces.
    * Here's another sub item.

## Links

### Automatic links

The simplest way to create a link is to just type it in:

#### Example

```text
http://ccl.northwestern.edu/netlogo/
```

#### Formatted

http://ccl.northwestern.edu/netlogo/

### Links with text

If you want to use your own text for the link, here's how:

```text
[link text here](link.address.here)
```

#### Example

```text
[NetLogo](http://ccl.northwestern.edu/netlogo/)
```

#### Formatted

[NetLogo](http://ccl.northwestern.edu/netlogo/)

### Local links

It is also possible to link to a page on your computer, instead of a page somewhere on the Internet.

Local links have this form:

```text
[alt text](file:path)
```

Any spaces in the path must be converted to %20. For example, this:

```text
file:my page.html
```

must be written as:

```text
file:my%20page.html
```

The path is relative to the directory that the model file is in.

#### Example

The easiest way to link to files on your computer is to put them into the same directory as your model. Assuming you have a file named `index.html` in the same directory as your model, the link would look like this:

```text
[Home](file:index.html)
```

#### Example

Here is another example where the file lives in a directory called docs, and docs is in the same directory as your model:

```text
[Home](file:docs/index.html)
```

## Images

Images are very similar to links, but have an exclamation point in front:

```text
![alt text](http://location/of/image)
```

(The alternate text is the text that gets displayed if the image is not found.)

#### Example

```text
![NetLogo](http://ccl.northwestern.edu/netlogo/images/netlogo-title-new.jpg)
```

#### Formatted

![NetLogo](http://ccl.northwestern.edu/netlogo/images/netlogo-title-new.jpg)

### Local images

Also very similar to links, it is possible to display an image on your computer instead of an image somewhere on the Internet. Assuming you have an image named `image.jpg`, local images look like this:

```text
![alt text](file:path)
```

The path is relative to the directory that the model file is in.

As with local links, any spaces in the name of the file or the path must be converted to %20.

#### Example

Like local links, the easiest way to display images on your computer is to put them into the same directory as your model. This example displays the image "Perspective Example.png", which resides in the same directory as this model (Info Tab Example).

```text
![Example](file:Perspective%20Example.png)
```

#### Formatted

![Example](images/infotab/Perspective%20Example.png)

### Bundled images

Images that are bundled with the model (See [Resource Manager](resource-manager.html)) can also be displayed in the
Info tab. To display a bundled image, use the same syntax as for local files above, but omit the `file:` specifier.
For example, if there is a bundled image called `wolf-sheep`, you can include it in the Info tab as follows:

```text
![Wolf Sheep](wolf-sheep)
```

To control various properties of an image, such as its size, you can use the equivalent HTML tag instead of Markdown
syntax, as follows:

```text
<img src="wolf-sheep" alt="Wolf Sheep" width="100" />
```

In either case, if the provided name refers to a resource that is not an image, a dummy image will be displayed in its
place.

## Block quotations

Consecutive lines starting with > will become block quotations.
You can put whatever text you like inside of it and you can also style it.

#### Example

```text
> Let me see: four times five is twelve, and four times six is thirteen,
> and four times seven is --- _oh dear!_
> I shall never get to twenty at that rate!
```

#### Formatted

> Let me see: four times five is twelve, and four times six is thirteen,
> and four times seven is --- _oh dear!_
> I shall never get to twenty at that rate!

## Code

To include a short piece of code in a sentence, surround it with backticks (`).

#### Example

```text
You can create a single turtle with the `crt 1` command.
```

#### Formatted

You can create a single turtle with the `crt 1` command.

## Code blocks

It is also possible to have blocks of code. To create a code block, indent every line of the block by 4 spaces. Another way is to surround it with a three backticks line before and after the block. (If you don't want your code to be colored as NetLogo code, add `text` after the first three backticks.)

#### Example

```text
About to start the code block.
Leave a blank line after this one, and then put the code block:

    ; a typical go procedure
    to go
      ask turtles
        [ fd 1 ]
      tick
    end
```

or:

````text
About to start the code block.
Leave a blank line after this one, and then put the code block:

```
; a typical go procedure
to go
  ask turtles
    [ fd 1 ]
  tick
end
```
````

#### Formatted

About to start the code block.
Leave a blank line after this one, and then put the code block:

    ; a typical go procedure
    to go
      ask turtles
        [ fd 1 ]
      tick
    end

## Superscripts and subscripts

Superscripts and subscripts are useful for writing formulas, equations, footnotes and more. Subscripts appear half a character below the baseline, and are written using the HTML tag `<sub>`. Superscripts appear half a character above the baseline, and are written using the HTML tag `<sup>`.

#### Example

```text
H<sub>2</sub>O

2x<sup>4</sup> + x<sup>2</sup>

WWW<sup>[1]</sup>
```

#### Formatted

H<sub>2</sub>O

2x<sup>4</sup> + x<sup>2</sup> + 42

WWW<sup>[1]</sup>

## Notes on usage

 * Paragraphs, lists, code blocks and other features should be separated from each other with a blank line.  If you find that something isn't formatted the way you expected, it might be because you need to add a blank line before it.

 * To prevent a special character from being treated as markup, put a backslash (`\`) before it.

## Other features

Markdown has additional features that we have not shown here.

We have tested the features shown above on a variety of systems.  If you use other Markdown features, you may find that they work on your computer, or not.  Even a feature that works on your computer might work differently, or not work at all, for someone with a different operating system or Java virtual machine.

If you want all NetLogo users to be able to read your Info tab, use only the features shown above.

More information about Markdown is at https://daringfireball.net/projects/markdown/. For rendering Markdown, NetLogo uses the [Flexmark-java](https://github.com/vsch/flexmark-java) library.
