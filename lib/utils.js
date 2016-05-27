let fs = require('q-io/fs');
let path = require('path');
let bower = require('bower');
let tar = require('tar-fs');
let gunzip = require('gunzip-maybe');
let request = require('request');
let globby = require('globby');
let cheerio = require('cheerio');
let hydrolysis = require('hydrolysis');
let Q = require('q');
Q.longStackSupport = true;

// Comments in different files (particles.html) refer to this function
// update them if there are any changes made here.
// So basically we want to remove the bower_components folder but keep
// some files in it so we first copy the files, then remove the bower_components
// folder and then copy those files back by creating the directory trees
let removeBowerComponents = Q.async(function* (log) {
  let name = path.basename.bind(path), dir = path.dirname.bind(path);
  let resolve = path.resolve.bind(path), join = path.join.bind(path);
  let rel = p => `_site/${p}`;
  let pAll = (arr, fn) => Promise.all(arr.map(fn));

  let excludes = [
    'webcomponentsjs/webcomponents-lite.js',
    'particles.js/particles.js',
    't-component-panel/ace-element/ace/ace.js',
    't-component-panel/ace-element/ace/mode-json.js',
    't-component-panel/ace-element/ace/mode-javascript.js',
    't-component-panel/ace-element/ace/worker-json.js',
    't-component-panel/ace-element/ace/worker-javascript.js'
  ];

  excludes = excludes.map(e => resolve(rel(`bower_components/${e}`)));

  yield pAll(excludes, e => fs.copy(e, rel(name(e))));

  try {
    yield fs.removeTree(rel('bower_components'));
  } catch (err) {
    // FIXME: For some reason removing the bower_components fails
    // now since doing it is not so critical and since such errors
    // are a pure nonsense just catch it for now.
    log(err.toString());
  }

  yield pAll(excludes, e => fs.makeTree(dir(e)));
  yield pAll(excludes, e => fs.move(rel(name(e)), join(dir(e), name(e))));
});

// Takes two sets of patterns first, the default and overriding patterns.
// Both sets are first resolved to respective sets paths to produce a merged
// set of paths. If there are paths with same file names in both sets then
// paths in the override set are preferred over the other set.
let mergePatterns = Q.async(function* (defaultPatterns, patterns) {
  let [defaultPaths, paths] = yield Promise.all([
    globby([defaultPatterns]),
    globby([patterns])
  ]);

  let merged = {};
  let name = p => path.basename(p).replace(/\..*$/, '');

  defaultPaths.forEach(p => merged[name(p)] = p);
  paths.forEach(p => merged[name(p)] = p);

  return Object.keys(merged).map(key => merged[key]);
});

// Takes three parameters first, the array of glob patterns, second the
// directory from the above patterns will be resolved and third the directory
// to which the files will be copied. We have to create the intermediate
// directories in the `toDir` before we copy the file.
let copy = Q.async(function* (patterns, fromDir, toDir) {
  fromDir = path.resolve(fromDir);
  toDir = path.resolve(toDir);
  patterns = patterns.map(p => path.join(fromDir, p));

  let paths = yield globby(patterns, { nodir: true });
  paths = paths.map(p => path.resolve(p));
  let tPaths = paths.map(p => path.resolve(p).replace(fromDir, toDir));

  yield Promise.all(tPaths.map(p => fs.makeTree(path.dirname(p))));
  yield Promise.all(paths.map((p, i) => fs.copy(p, tPaths[i])));
});

// MingW, the environment used in Git Bash for Windows has taken upon itself
// to convert the arguments that look like POSIX paths to Win32 paths.
// Which might screw up the arguments that aren't actually paths but something
// like, well `baseurl`. So we need to fix the value of the argument if we're
// in MingW environment.

// Look at following url for further information.
// http://www.mingw.org/wiki/Posix_path_conversion

// You can run your commands with `MSYS_NO_PATHCONV=1` if you want to disable
// path conversion from command line.
// Eg. MSYS_NO_PATHCONV=1 command --baseurl='/elements'
// http://stackoverflow.com/a/34386471/1310569
function fixMsys(pth) {
  // detect if running in Msys envirnment
  if (!process.env.MSYSTEM && !process.env.MSYS) {
    return pth;
  }

  // following list of prefixes is not complete they are what I could find
  // on my machine by playing around. Don't hesitate to add more.

  // found on windows git bash
  let prefix1 = 'C:\\Program Files\\Git';

  // found on windows git bash running inside ConEmu
  let prefix2 = 'C:/Program Files/Git';

  if (pth.indexOf(prefix1) !== -1) {
    pth = pth.replace(prefix1, '');
    pth = pth.replace(/\\/g, '/');
  }

  else if (pth.indexOf(prefix2) !== -1) {
    pth = pth.replace(prefix2, '');
  }

  return pth;
}

let extractGhRepo = Q.async(function* (repo, exPath, name) {
  let repoName = repo.replace(/^[^\/]+\/(.+)$/, '$1');

  if (repoName === repo) {
    throw `Bad repo: ${repo}. Couldn't find repo name.`;
  }

  let arUrl = `https://github.com/${repo}/archive/master.tar.gz`;
  exPath = path.resolve(exPath);

  yield new Promise((resolve, reject) => {
    let extractStream = tar.extract(exPath);

    extractStream.on('finish', resolve);
    extractStream.on('error', reject);
    request(arUrl)
      .pipe(gunzip())
      .pipe(extractStream);
  });

  let fromPath = path.resolve(exPath, `${repoName}-master`);
  let toPath = path.resolve(exPath, name);

  yield fs.rename(fromPath, toPath);

  return toPath;
});

// TODO: use packages used by bower for loading and parsing bower.json
// following are the relevent packages that should be used
// https://www.npmjs.com/package/bower-json
// https://www.npmjs.com/package/bower-endpoint-parser
let extractDeps = Q.async(function* (baseDir, elName) {
  let bowerPath = `${baseDir}/bower.json`;
  let demoFilePath = `${baseDir}/demo/index.html`;
  let [ bowerExists, demoExists ] = yield Promise.all([
    fs.exists(bowerPath),
    fs.exists(demoFilePath)
  ]);

  if (!bowerExists) {
    return Promise.reject(`Demo doesn't exist: ${demoFilePath}`);
  }
  else if (!bowerExists || !demoExists) {
    return Promise.resolve([]);
  }

  let bowerDepsP = fs.read(bowerPath).then(bower => {
    bower = JSON.parse(bower || '{}');

    return Object.assign({}, bower.dependencies, bower.devDependencies);
  });

  baseDir = baseDir.replace(new RegExp(`/${elName}$`), '');
  let hydroP = hydrolysis.Analyzer.analyze(demoFilePath);
  let [ hydro, bowerDeps ] = yield Promise.all([hydroP, bowerDepsP]);

  // FIXME: links pointing to things inside the component directory
  // shouldn't be used to resolve dependencies from `bower.json`
  function parse(type, relPath) {
    relPath = relPath.replace(`${baseDir}/`, '');
    let pkg = relPath.match(/^[^\/]+/);
    let install = bowerDeps[pkg];

    if (install && !/[/#]/.test(install)) {
      install = `${pkg}#${install}`;
    }

    if (!pkg) {
      return Promise.reject(`Bad path in demo file: ${relPath}`);
    }

    return {
      pkg: pkg[0],
      relPath: relPath,
      install: install,
      type: type
    };
  }

  function filter(dep) {
    return !(new RegExp(`(${elName}.html)|(index.html)`).test(dep.relPath));
  }

  let docs = hydro.parsedDocuments || {};
  let scripts = hydro.parsedScripts || {};

  docs = Object.keys(docs)
    .map(parse.bind(null, 'link'))
    .filter(filter);

  scripts = Object.keys(scripts)
    .map(parse.bind(null, 'script'))
    .filter(filter);

  return [].concat(scripts, docs);
});

function tryRead(p) {
  return fs.exists(p)
    .then(exists => exists ? fs.read(p) : Promise.resolve(''));
}

let extractInnerHtml = Q.async(function* (name, fpath) {
  let exists = yield fs.exists(fpath);

  if (!exists) {
    return Promise.resolve('');
  }

  let text = fs.read(fpath);
  let $ = cheerio.load(text);
  let innerHTML = $(name).html() || '';

  innerHTML = innerHTML.split('\r\n')
    .map(line => line.replace(/^\s+/, '').replace(/\s+$/, ''))
    .filter(line => Boolean(line))
    .join('');

  return innerHTML;
});

function toDashCase(str) {
  return str.toLowerCase().replace(/[ _]+/g, '-');
}

function toCamelCase(str) {
  return str.replace(/-(.)/g, (m, m1) => m1.toUpperCase());
}

function bowCmd(cmd, ...args) {
  return new Promise((res, rej) => {
    bower.commands[cmd](...args)
      .on('end', (...values) => res(...values))
      .on('error', (...reasons) => rej(...reasons));
  });
}

function bowInstall(pkgs, cwd) {
  let opts = cwd ? { cwd: cwd } : undefined;

  return bowCmd('install', pkgs, undefined, opts);
}

module.exports = {
  fixMsys: fixMsys,
  copy: copy,
  mergePatterns: mergePatterns,
  removeBowerComponents: removeBowerComponents,
  extractGhRepo: extractGhRepo,
  extractDeps: extractDeps,
  tryRead: tryRead,
  extractInnerHtml: extractInnerHtml,

  toDashCase: toDashCase,
  toCamelCase: toCamelCase,

  bowCmd: bowCmd,
  bowInstall: bowInstall
};
