let fs = require('q-io/fs');
let path = require('path');
let globby = require('globby');
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

module.exports = {
  fixMsys: fixMsys,
  copy: copy,
  mergePatterns: mergePatterns,
  removeBowerComponents: removeBowerComponents
};
