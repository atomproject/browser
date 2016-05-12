'use strict';

let fs = require('q-io/fs');
let Q = require('q');
let Vulcanize = require('vulcanize');
let crisper = require('crisper');

// we have to exclude the ace js library from vulcanization since it loads
// service workers using urls relative to itself. Any files in the `excludes`
// option to the vulcanization must also be added to the arra `excludes` in
// `removeBowerComponents` function.
let vulcan = new Vulcanize({
  excludes: [
    'bower_components/t-component-panel/ace-element/ace/'
  ],
  inlineScripts: true,
  inlineCss: true,
  stripComments: true
});

module.exports = Q.async(function*() {
  let htmlP = new Promise((resolve, reject) => {
    vulcan.process('_site/components/elements.html', (err, html) => {
      if (err) {
        reject(err);
      }

      resolve(html);
    });
  });

  let html = yield htmlP;
  let crisp = crisper({
    source: html,
    jsFileName: '../scripts/build.js',
    scriptInHead: false
  });

  htmlP = fs.write('_site/components/elements.html', crisp.html);
  let jsP = fs.write('_site/scripts/build.js', crisp.js);

  yield Promise.all([htmlP, jsP]);
});
