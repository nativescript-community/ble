const webpack = require('@nativescript/webpack');
const fs = require('fs');
const { resolve } = require('path');

let snippetConfig;
if (fs.existsSync('../demo-snippets/webpack.config.ng.js')) {
    snippetConfig = require('../demo-snippets/webpack.config.ng.js');
}

module.exports = (env) => {
    webpack.init(env);
    return webpack.resolveConfig();
};
