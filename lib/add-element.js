let path = require('path');
let fs = require('q-io/fs');
let globby = require('globby');
let inquirer = require('inquirer');
let Q = require('q');
Q.longStackSupport = true;

let cfg = require('./config');
let utils = require('./utils');
let {
  validateName,
  validateInstall,
  validateCategory,
  validateDisplayName,
  validateGithubUrl
} = require('./element');

function handleValidate(validateFn, val) {
  try {
    validateFn(val);
    return true;
  } catch (err) {
    return err.message;
  }
}

/**
 * Seed a new polymer element based off the polymer `seed-element`
 * @param {Object} el information about new element to create
 * @return {String}    information about new element to create
 */
let createNewElement = Q.async(function* (el) {
  let repo = 'polymerelements/seed-element';
  // download and extrac the seed-element
  let repoPath = yield utils.extractGhRepo(repo, '.', el.name);
  el.install = repoPath;

  yield fs.removeTree(path.resolve(repoPath, '.github'));

  let replacePaths = yield globby([`${repoPath}/**`], {nodir: true});

  // replace the text `seed-element` with the name of the new element
  yield Promise.all(replacePaths.map(Q.async(function*(p) {
    let content = yield fs.read(p);
    let ccName = utils.toCamelCase(el.name);

    content = content.replace(/seedElement/g, ccName);
    content = content.replace(/seed-element/g, el.name);

    yield fs.write(p, content);
  })));

  let fromPath = path.resolve(repoPath, 'seed-element.html');
  let toPath = path.resolve(repoPath, `${el.name}.html`);
  // rename the paths to the new name
  yield fs.rename(fromPath, toPath);

  return el;
});

let addElement = Q.async(function* () {
  let config = yield cfg.getConfig();
  let catChoices = config.categories.map(cat => cat.name);

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
    validate: handleValidate.bind(null, validateName)
  }, {
    type: 'input',
    message: 'display name',
    name: 'displayName',
    default: answers => answers.name,
    validate: handleValidate.bind(null, validateDisplayName)
  }, {
    type: 'input',
    message: 'bower install endpoint',
    name: 'install',
    validate: install => {
      try {
        return validateInstall(install)
          .then(() => true)
          .catch(err => Promise.resolve(err.message));
      } catch (err) {
        return Promise.resolve(err.message);
      }
    },
    when: answers => !answers.isNew
  }, {
    type: 'input',
    message: 'github url',
    name: 'githubUrl',
    validate: handleValidate.bind(null, validateGithubUrl),
    when: answers => !answers.isNew
  }, {
    type: 'list',
    message: 'category',
    name: 'category',
    choices: catChoices,
    validate: handleValidate.bind(null, validateCategory)
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
