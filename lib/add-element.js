let path = require('path');
let fs = require('q-io/fs');
let globby = require('globby');
let inquirer = require('inquirer');
let Q = require('q');
Q.longStackSupport = true;

let gurl = require('./github-url');
let cfg = require('./config');
let utils = require('./utils');

let createNewElement = Q.async(function* (el) {
  let repo = 'polymerelements/seed-element';
  let repoPath = yield utils.extractGhRepo(repo, '.', el.name);
  el.install = repoPath;

  yield fs.removeTree(path.resolve(repoPath, '.github'));

  let replacePaths = yield globby([`${repoPath}/**`], {nodir: true});

  yield Promise.all(replacePaths.map(Q.async(function*(p) {
    let content = yield fs.read(p);
    let ccName = utils.toCamelCase(el.name);

    content = content.replace(/seedElement/g, ccName);
    content = content.replace(/seed-element/g, el.name);

    yield fs.write(p, content);
  })));

  let fromPath = path.resolve(repoPath, 'seed-element.html');
  let toPath = path.resolve(repoPath, `${el.name}.html`);
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
      return utils.bowCmd('info', install)
        .then(() => true)
        .catch(() => 'bower couldn\'t find the package');
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
