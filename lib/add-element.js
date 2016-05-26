let path = require('path');
let fs = require('q-io/fs');
let globby = require('globby');
let inquirer = require('inquirer');
let Q = require('q');
Q.longStackSupport = true;
let request = require('request');
let tar = require('tar-fs');
let gunzip = require('gunzip-maybe');
let bower = require('bower');

let gurl = require('./github-url');
let cfg = require('./config');

let createNewElement = Q.async(function* (el) {
  let arUrl = 'https://github.com/polymerelements/seed-element/archive/master.tar.gz';
  let exPath = path.resolve('.');

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

  if (catChoices.length) {
    catChoices.push('no category');
  }

  let questions = [{
    type: 'confirm',
    message: 'create a new element?',
    name: 'isNew',
    default: false
  }, {
    type: 'input',
    message: 'name',
    name: 'name',
    validate: name => {
      let isValid = /^\w+-\w/.test(name);

      if (!isValid) {
        return 'Element name should contain at least a single `-`';
      }

      return true;
    }
  }, {
    type: 'input',
    message: 'display name',
    name: 'displayName',
    default: answers => answers.name
  }, {
    type: 'input',
    message: 'bower install endpoint',
    name: 'install',
    validate: install => {
      return new Promise(res => {
        bower.commands
          .info(install)
          .on('end', () => res(true))
          .on('error', () => res('bower couldn\'t find the package'));
      });
    },
    when: answers => !answers.isNew
  }, {
    type: 'input',
    message: 'github url',
    name: 'githubUrl',
    validate: githubUrl => {
      try {
        gurl(githubUrl);
      } catch (e) {
        return 'Bad URL. Please enter correct URL for a github repo';
      }

      return true;
    },
    when: answers => !answers.isNew
  }, {
    type: 'list',
    message: 'category',
    name: 'category',
    choices: catChoices,
    when: () => catChoices.length
  }];

  let answers = yield inquirer.prompt(questions);
  let el = {};

  Object.keys(answers).forEach(key => {
    if (answers[key] !== '' && key !== 'isNew' &&
        (key === 'category' ? answers[key] !== 'no category' : true)) {

      el[key] = answers[key];
    }
  });

  if (answers.isNew) {
    console.log(`\ncreating the new element ${el.name}`);
    el = yield createNewElement(el);
  }

  console.log('\nmetadata.json updated with new element');
  yield cfg.addElement(el);
});

module.exports = addElement;
