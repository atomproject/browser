'use strict';

let url = require('url');

module.exports = function(githubUrl) {
  if (!githubUrl) {
    return;
  }

  let origUrl;
  githubUrl = url.parse(origUrl = githubUrl);

  if (!githubUrl.path) {
    throw new Error(`No repo found in url: ${origUrl}`);
  }

  let hn = githubUrl.hostname;
  if (!hn || (hn && hn.indexOf('github') === -1)) {
    throw new Error(`Not a github url: ${origUrl}`);
  }

  let parts = githubUrl.path.split('/');

  return {
    user: parts[1],
    repo: parts[2]
  };
};
