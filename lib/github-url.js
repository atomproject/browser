
let url = require('url');

function gurl(githubUrl) {
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

  if (!parts[1]) {
    throw new Error(`No user found in url: ${origUrl}`);
  }

  if (!parts[2]) {
    throw new Error(`No repo found in url: ${origUrl}`);
  }

  return {
    user: parts[1],
    repo: parts[2]
  };
}

module.exports = gurl;
