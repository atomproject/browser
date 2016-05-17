let path = require('path');
let fs = require('q-io/fs');
let globby = require('globby');
let inquirer = require('inquirer');
let Q = require('q');
let request = require('request');
let tar = require('tar-fs');
let gunzip = require('gunzip-maybe');
Q.longStackSupport = true;

let cfg = require('./config');

let createNewElement = Q.async(function* (el) {
  let arUrl = 'https://github.com/polymerelements/seed-element/archive/master.tar.gz';
  let exPath = path.resolve(el.install);

  yield new Promise((resolve, reject) => {
    let extractStream = tar.extract(exPath);

    extractStream.on('finish', resolve);
    extractStream.on('error', reject);
    request(arUrl)
      .pipe(gunzip())
      .pipe(extractStream);
  });

  let fromPath = path.resolve(exPath, 'seed-element-master');
  let toPath = path.resolve(exPath, el.name);

  yield fs.rename(fromPath, toPath);
  el.install = toPath;

  yield fs.removeTree(path.resolve(toPath, '.github'));

  let replacePaths = yield globby([`${toPath}/**`], {nodir: true});

  yield Promise.all(replacePaths.map(Q.async(function*(p) {
    let content = yield fs.read(p);
    let ccName = el.name.replace(/-(.)/g, (m, m1) => m1.toUpperCase());

    content = content.replace(/seedElement/g, ccName);
    content = content.replace(/seed-element/g, el.name);

    yield fs.write(p, content);
  })));

  fromPath = path.resolve(toPath, 'seed-element.html');
  toPath = path.resolve(toPath, `${el.name}.html`);
  yield fs.rename(fromPath, toPath);

  return el;
});

let addElement = Q.async(function* () {
  let config = yield cfg.getConfig();
  let categories = config.categories || [];
  let catChoices = categories
    .filter(cat => cat && cat.name && cat.displayName)
    .map(cat => cat.name);

  let questions = [{
    type: 'confirm',
    message: 'create a new element?',
    name: 'isNew',
    default: false
  }, {
    type: 'input',
    message: 'name',
    name: 'name',
    validate: name => /^\w+-\w/.test(name)
  }, {
    type: 'input',
    message: 'display name',
    name: 'displayName',
    validate: displayName => displayName.length > 0
  }, {
    type: 'input',
    message: answers => answers.isNew ?
      'create at path' :
      'bower install endpoint',
    name: 'install',
    validate: install => install.length > 0
  }, {
    type: 'input',
    message: 'github url',
    name: 'githubUrl'
  }];

  if (catChoices.length) {
    questions.push({
      type: 'list',
      message: 'category',
      name: 'category',
      default: 0,
      choices: catChoices
    });
  }

  let answers = yield inquirer.prompt(questions);
  let el = {};

  Object.keys(answers).forEach(key => {
    if (answers[key] !== '' && key !== 'isNew') {
      el[key] = answers[key];
    }
  });

  if (answers.isNew) {
    let isPathValid = yield fs.exists(answers.install);

    if (!isPathValid) {
      throw `Path does not exist: ${answers.install}`;
    }

    el = yield createNewElement(el);
  }

  yield cfg.addElement(el);
});

module.exports = addElement;
