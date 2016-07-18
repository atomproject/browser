# Introduction

This document outlines the organization of the code in this and the `ap-io`
project repositories. The `ap-io` project is the umbrella project for all the
command line utilities we have written and those that we'll write in the
future. The `browser` command is one of the commands made available through
`ap-io`. The `browser` project is a static site generator, it takes some data
and files as input, and generates a set of html files comprising of a website.
The files can now be hosted at any asset hosting provider like _gh-pages_
by github. There are other programs like `jekyll`, `metalsmith`, `nanoc` etc.
that perform similar functions as `browser` you might want to look them up.
The website that it generates is a interactive documentation site for
polymer elements. You can play around with the properties of various
components and browse the their api documentation.

# Working of `browser`

You invoke the `browser` command from a directory, this is the directory
in which the documentation site is generated, this directory also contains
input files necessary for the command. `browser` takes following files as
input from the directory in which it is being invoked.

1. `metadata.json` a configuration file containing elements to be shown
2. any `.md` files in `pages` dir will be used to create new pages
3. other files like `assets/logo.png` and `favicon.ico`

These files are merged with files in the browser project to generate the site.
The files in the current directory override their respective files from the
browser, if they are not provided then the files in browser are used. The site
is created in a directory named `_site` in the current directory. Have a look
at the readme of browser and setup a sample site before proceeding.

You should observe that any components listed in the `metadata.json` are
actually visible on their respective documentation pages. This means that the
corresponding components have to be installed using `bower`. The `install`
field in `metadata.json` provides a bower endpoint for an element. This
endpoint is used with `bower install` command. The dev dependencies of the
components are installed too, the exact steps are as follows.

1. Run `bower install <component name>` command
2. Copy the `bower.json` of the installed component
3. Run the `bower install` command to install dev dependencies

You should also notice the property panel and the component. The property
panel and the demo are auto generated if respective files named `property.json`
and `demo/atom.html` are not present in the element. The auto generated files
are placed in the current directory, one in which the `browser` command is invoked,
inside a folder with same name as the name of the component. These files
are copied to the installation location of the component on each subsequent
run of the command.

# Code Conventions

I've attempted to maintain a fairly regular code style throughout the project.
Though a lot of such code style preferences are subjective in nature and might
change from one contributor to another their utility cannot be underestimated.
A properly formatted, linted and orgranized codebase can be a pure delight to
read. Following conventions, style preferences and patterns are used.

### ES6

The new javascript language really provides some handy new ways of writing code.
I've eschewed traditional code in favor the ES6 standard and wherever possible
the new standard should be used. ES6 coupled with `Q` provides some really nice
patterns for writing async code. The latest node distributions support more
than 93% of the ES6 standard.

1. [Learn ES6](1)
2. [Async programming with generators](2)

### jshint

Using `jshint` while writing code significantly handles simple mistakes.
You should integrate jshint with your editor for best results and follow the
[documenation](3) if you need to tweak or understand the `.jshintrc` file
in this project.

### formatting

Indenation, line breaks and whitespaces are what make the code a pleasure to read.
While writing javascript I've mostly adhered to the javascript style [guide](4) by airbnb.
You should follow the same for the sake of consistency.
Regarding line endings, indentation and encoding settings you should look up the
`.editorconfig` file in the project. You should also integrate this settings into
your editor. The documentaion for this config file can be found at [EditorConfig](5) site.
Apart from these settings the width of the code ought not to exceed __80 char width__,
it's real pain to read a line that doesn't fit within your monitor width. With 80
char width you can also have at least two files open side by side while editing.

### testing

Though the project does have test cases they aren't comprehensive. The fact
that we heavily use file system module (which cannot be easily mocked) hinders
the writing of comprehensive test cases. For any bug found you should make
sure that you write a regression test case for it if possible. You can also
checkout the test cases for examples of api usage of various modules.

# Forking

You can also fork the `browser` repository and make changes to for creating
own version of documentation site. To enable this though `browser` project
plugs into `ap-io` for providing command interface it also its own command
line interface. Any changes to the command line interface have to be updated
in two places, one in `browser/bin/browser` and `ap-io/bin/ap-io`.


[1]: https://hacks.mozilla.org/category/es6-in-depth/
[2]: http://jlongster.com/A-Study-on-Solving-Callbacks-with-JavaScript-Generators
[3]: http://jshint.com/docs/
[4]: https://github.com/airbnb/javascript
[5]: http://editorconfig.org/

