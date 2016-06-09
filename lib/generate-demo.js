let path = require('path');

let fs = require('q-io/fs');
let Q = require('q');
Q.longStackSupport = true;

function demoFile(name) {
return `
<!doctype html>

<html>
<head>

  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">

  <title>${name} demo</title>

  <script src="../../webcomponentsjs/webcomponents-lite.js"></script>

  <link rel="import" href="../${name}.html">
</head>
<body>

  <${name}></${name}>

</body>
</html>
`;
}

let createDemo = Q.async(function* (el) {
  let exists = yield Promise.all([
    fs.exists(el.demoFile),
    fs.exists(el.userDemoFile)
  ]);

  if (!exists[0] && !exists[1]) {
    yield fs.makeTree(path.dirname(el.userDemoFile));
    yield fs.write(el.userDemoFile, demoFile(el.name));
  }
});

function createDemos(log, config) {
  return Promise.all(config.elements.map(createDemo));
}

module.exports = createDemos;
