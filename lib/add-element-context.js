let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let _addElementContext = Q.async(function* (el, baseurl, showBuildStatus) {
  el.dirUrl = `${baseurl}/${el.pageDirName}/bower_components/${el.name}`;
  el.pageUrl = `${baseurl}/${el.pageDirName}/`;

  el.documentationFileUrl = `${el.dirUrl}/`;

  let gh = el.github;

  if (showBuildStatus && gh && gh.user && gh.repo) {
    let travisBaseUrl = 'https://travis-ci.org';
    let elTravisUrl = `${travisBaseUrl}/${gh.user}/${gh.repo}`;

    el.linkToTravis = `${elTravisUrl}/`;
    el.buildStatusUrl = `${elTravisUrl}.svg?branch=master`;
  }

  let doc = yield utils.tryRead(el.designDocFile);
  el.designDoc = '\n' + doc;

  return el;
});

/**
 * Adds the properties on element config object for use in generating site pages
 * @param {String} baseurl          The base url of the site
 * @param {Boolean} showBuildStatus Display the build status per element?
 * @param {Object} el               The element config object
 * @return {Object} el              The element config object
 */
let _addDemoElementContext = Q.async(function* (el, baseurl, showBuildStatus) {
  el.demoFileUrl = `${el.dirUrl}/demo/atom.html`;
  el.propertiesFileUrl = `${el.dirUrl}/property.json`;

  // TODO: both bower and demo file may not be present
  let htmlP = utils.extractInnerHtml(el.name, el.demoFile);
  let depsP = utils.extractDeps(el.bowerFile, el.demoFile, el.install);

  let [ html, deps ] = yield Promise.all([htmlP, depsP]);

  el.innerHTML = html;
  el.dependencies = JSON.stringify(deps);

  return el;
});

function addElementContext(elements, baseurl, showBuildStatus) {
  return Promise.all(elements.map(el =>
    _addElementContext(el, baseurl, showBuildStatus)
  ));
}

function addDemoElementContext(elementsWithDemo, baseurl, showBuildStatus) {
  return Promise.all(elementsWithDemo.map(el =>
    _addDemoElementContext(el, baseurl, showBuildStatus)
  ));
}

module.exports = {
  addElementContext: addElementContext,
  addDemoElementContext: addDemoElementContext
};
