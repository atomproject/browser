# Dependencies

1. Node (>6.0.0)
2. Npm (>3.8.6)

# Installation

```
npm i -g ap-io
```

# Usage

```
browser [-h | --help] [-v | --version] [-n | --new <dir name>] [-g | --generate]
```

This command creates static documentation site from the given data. To create
a site you first create a directory and add a file named `metadata.json` in it.
This file contains configuration related to the site and the elements for which
the documentation is to be generated. You can also provide files to override the
default icon, favicon and site pages.

To get started first create a new documentation site.

```
browser -c myDocs
```

This will create a folder named `myDocs` with all the files necessary to generate
the site. If you don't provide a name to the command then a folder named `docs`
will be created. So, `cd` into the directory and generate the site.

```
cd myDocs && browser -g
``

This creates documentation site in folder `_site`. You can copy this folder for
deployment.
