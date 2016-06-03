let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let addElementContext = Q.async(function* (baseurl, travisBaseUrl, el) {
  el.dirUrl = `${baseurl}/${el.pageDirName}/bower_components/${el.name}`;
  el.pageUrl = `${baseurl}/${el.pageDirName}/`;

  el.documentationFileUrl = `${el.dirUrl}/`;
  el.demoFileUrl = `${el.dirUrl}/demo/index.html`;
  el.propertiesFileUrl = `${el.dirUrl}/property.json`;

  if (el.name === 'demo-tester') {
    let pf = 'bower_components/t-component-panel/demo/property.json';
    el.propertiesFileUrl = `${baseurl}/${pf}`;
  }

  let gh = el.github;
  if (gh && gh.user && gh.repo) {
    let elTravisUrl = `${travisBaseUrl}/${gh.user}/${gh.repo}`;
    el.linkToTravis = `${elTravisUrl}/`;
    el.buildStatusUrl = `${elTravisUrl}.svg?branch=master`;
  }

  let docP = utils.tryRead(`${el.dir}/design-doc.md`);
  // TODO: both `bower.json` and `demo/index.html` may not be present
  let htmlP = utils.extractInnerHtml(el.name, `${el.dir}/demo/index.html`);
  let depsP = utils.extractDeps(el.dir, el.install);

  let [ doc, html, deps ] = yield Promise.all([docP, htmlP, depsP]);

  el.designDoc = '\n' + doc;
  el.innerHTML = html;
  el.dependencies = JSON.stringify(deps);

  return el;
});

module.exports = addElementContext;
