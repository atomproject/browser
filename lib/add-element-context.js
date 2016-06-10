let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let addElementContext = Q.async(function* (baseurl, showBuildStatus, el) {
  el.dirUrl = `${baseurl}/${el.pageDirName}/bower_components/${el.name}`;
  el.pageUrl = `${baseurl}/${el.pageDirName}/`;

  el.documentationFileUrl = `${el.dirUrl}/`;
  el.demoFileUrl = `${el.dirUrl}/demo/atom.html`;
  el.propertiesFileUrl = `${el.dirUrl}/property.json`;

  let gh = el.github;

  if (showBuildStatus && gh && gh.user && gh.repo) {
    let travisBaseUrl = 'https://travis-ci.org';
    let elTravisUrl = `${travisBaseUrl}/${gh.user}/${gh.repo}`;

    el.linkToTravis = `${elTravisUrl}/`;
    el.buildStatusUrl = `${elTravisUrl}.svg?branch=master`;
  }

  let docP = utils.tryRead(el.designDocFile);
  // TODO: both bower and demo file may not be present
  let htmlP = utils.extractInnerHtml(el.name, el.demoFile);
  let depsP = utils.extractDeps(el.bowerFile, el.demoFile, el.install);

  let [ doc, html, deps ] = yield Promise.all([docP, htmlP, depsP]);

  el.designDoc = '\n' + doc;
  el.innerHTML = html;
  el.dependencies = JSON.stringify(deps);

  return el;
});

module.exports = addElementContext;
