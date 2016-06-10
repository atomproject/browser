'use strict';

let fs = require('q-io/fs');
let nodeFetch = require('node-fetch');
let baseApiEndPoint = 'https://api.travis-ci.org/repos';
let idFilePath = '_site/element-ids.json';
let Q = require('q');

function getJson(url) {
  return nodeFetch(url).then(resp => {
    //TODO: will other response status codes do for our task?
    return resp.status === 200 ? resp.json() : Promise.reject();
  });
}

let getElementIds = Q.async(function* (log, config) {
  if (!config.showBuildStatus) {
    log('Ids: user has disabled showing build status');

    return fs.write(idFilePath, '[]');
  }

  let results, elementIds;
  let elementUrls = config.elements
    .filter(el => el.name !== 'demo-tester')
    .map(el => {
      if (!el.github) {
        return '';
      }

      return baseApiEndPoint +
        '/' + el.github.user +
        '/' + el.github.repo;
    });

  try {
    log('Ids: Get travis ids of elements');
    results = yield Promise.all(elementUrls.map(entityApi => {
        return entityApi ? getJson(entityApi) : Promise.resolve({});
    }));
    elementIds = results.map(result => result.id);

    log('Ids: Save travis ids of elements to a file');
    elementIds = JSON.stringify(elementIds);
    yield fs.write(idFilePath, elementIds);
  }
  catch (ex) {
    log('Ids: Something went wrong');
    yield fs.write(idFilePath, '[]');
  }
});

module.exports = getElementIds;
