'use strict';

let fs = require('q-io/fs');
let path = require('path');
let fm = require('front-matter');
let Liquid = require('liquid-node');
let marked = require('marked');
let engine = new Liquid.Engine();
let Q = require('q');

// a layout is a list of files with each file putting the contents
// of the file preceeding it in its body. This is useful for sharing
// a common structure between files. Eg. pages/about.md contents are
// put in its layout layouts/text-page.html in place of `{{ content }}`.
// But this method only finds out the layouts recursively.
let resolveLayout = Q.async(function* (filePath, config, layout, queue) {
  let file = yield fs.read(path.resolve(filePath));

  file = fm(file);
  queue = queue || [];
  queue.push(file);

  layout = (file.attributes && file.attributes.layout) || layout;

  // layout can either be provided as argument the first call of recursion
  // or in the front matter of the file being processed
  if (layout) {
    filePath = `${config._layoutsDir}/${layout}.html`;
    yield resolveLayout(filePath, config, null, queue);
  }

  // since no layout could be found the processing stops here
  return queue;
});

// this method takes the output of `resolveLayout` method, the context
// and outputs the content.
let renderLayout = Q.async(function* (queue, context) {
  for (let item of queue) {
    Object.assign(context.page, item.attributes);
    let content = yield engine.parseAndRender(item.body, context);
    context.content = content;
  }

  return context.content;
});

// creates a page per element using the template
let createElementPage = Q.async(function* (elContext, config) {
  let templatePath = `${config._templatesDir}/github.html`;
  // resolve the layout of the template
  let queue = yield resolveLayout(templatePath, config);
  let context = {site: config, page: elContext};

  // get the contents of the element page
  let page = yield renderLayout(queue, context);
  let pagePath = elContext.pageDirName;

  // we want clean urls so we create index.html files in element dirs
  yield fs.makeTree(path.join('_site', pagePath));
  pagePath = path.join('_site', pagePath ,'index.html');

  console.log(`Build: ${path.resolve(pagePath)}`);
  yield fs.write(pagePath, page);
});

// creates a page for a file (this can be a markdown or html file)
let createPage = Q.async(function* (filePath, config) {
  let stat = yield fs.stat(filePath);

  if (!stat.isFile()) {
    return;
  }

  // resolve the layout of the page with default `text-page` layout
  let queue = yield resolveLayout(filePath, config, 'text-page');
  let pathObj = path.parse(filePath);
  let context = {site: config, page: {}};

  // parse into html if the file is of type markdown
  if (config.markdownExtensions.indexOf(pathObj.ext) !== -1) {
    queue[0].body = marked(queue[0].body || '');
  }

  // render the layout and get the contents of the page
  let page = yield renderLayout(queue, context);
  let outDir = path.resolve('_site');

  // so we want clean urls and the way we implement them is by
  // creating a directory by the name of the file and then creating
  // an index.html file in it. Eg. about.html -> about/index.html
  if (pathObj.name !== 'index') {
    outDir = path.join(outDir, pathObj.name);
  }

  yield fs.makeTree(outDir);
  let pagePath = path.join(outDir, `index.html`);

  console.log(`Build: ${pagePath}`);
  yield fs.write(pagePath, page);
});

// the config used here should contain everything, i.e. `fullConfig`
module.exports = Q.async(function* (config, pages) {
  config.pages = pages
    .map(p => {
      let name = path.basename(p).replace(/\..*/, '');

      return name.toLowerCase() === 'index' ? false : {
        url: `${config.baseurl}/${name}/`,
        name: name[0].toUpperCase() + name.slice(1)
      };
    })
    .filter(p => Boolean(p));

  //setup yaml parser engine
  engine.fileSystem = new Liquid.LocalFileSystem();
  engine.fileSystem.root = config._includesDir;

  //create the out dir
  yield fs.makeTree('_site');

  //create element pages
  let elPagesP = config.elements.map(elContext => {
    return createElementPage(elContext, config);
  });

  //create other pages
  let pagesP = pages.map(pagePath => createPage(pagePath, config));

  return Promise.all([...elPagesP, ...pagesP]);
});
