'use strict';

let fs = require('q-io/fs');
let Q = require('q');
let request = require('request');
let tar = require('tar-fs');
let gunzip = require('gunzip-maybe');
let bower = require('bower');

let { pushd, popd } = (function() {
  let stack = [];

  return {
    pushd: dir => {
      process.env.OLDPWD = stack.push(process.cwd());
      process.chdir(dir);
    },
    popd: () => process.chdir(process.env.OLDPWD = stack.pop())
  };
})();

module.exports = Q.async(function* (config) {
  let elements = config.elements
    .filter(el => el.location.githubUser && el.location.githubRepo)
    .map(el => {
      let loc = el.location;
      let dep = `${loc.githubUser}/${loc.githubRepo}`;

      return {
        name: el.name,
        dir: `_site/${el.pageDirName}`,
        dep: dep,
        archiveUrl: `https://github.com/${dep}/archive/master.tar.gz`
      };
    });

  for (let el of elements) {
    yield fs.makeTree(el.dir);

    console.log(`Extract: ${el.archiveUrl}`);
    yield new Promise((resolve, reject) => {
      let extractStream = tar.extract(el.dir);

      extractStream.on('finish', resolve);
      extractStream.on('error', reject);
      request(el.archiveUrl)
        .pipe(gunzip())
        .pipe(extractStream);
    });

    pushd(el.dir);

    yield fs.copy(`${el.name}-master/bower.json`, 'bower.json');

    console.log(`Install: ${el.dir}`);
    yield new Promise((resolve, reject) => {
      bower.commands
        .install()
        .on('end', resolve)
        .on('error', reject);
    });
    yield new Promise((resolve, reject) => {
      bower.commands
        .install(['atomproject/dynamic-data-source'])
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Copy: ${el.name}-master`);
    yield fs.copyTree(`${el.name}-master`, `bower_components/${el.name}`);

    popd();
  }
});
