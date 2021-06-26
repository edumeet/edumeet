const path = require('path')
const escape = require('escape-string-regexp');
module.exports = function override(config, env) {
    // include lib-edumeet for typescript loader
    const rules = config.module.rules.find(r => r.oneOf).oneOf

    for(let loader of rules) {
        if('file.ts'.match(loader.test) && loader.loader.match(/babel-loader/)) {
            console.log(loader.include)
            loader.include = [
                path.join(__dirname, '../src'),
                path.join(__dirname, '../node_modules/lib-edumeet/src'),
                path.join(__dirname, '../../lib-edumeet/src'),
            ]
        }
    }

    return config;
}

module.exports.devServer = function(configFunction) {
    return function(proxy, allowedHost) {
        const config = configFunction(proxy, allowedHost);

        // also watch for changes in lib-edumeet
        config.watchOptions.ignored = new RegExp(
            `^(?!${escape(
              path.normalize(path.join(__dirname, 'src') + '/').replace(/[\\]+/g, '/')
            )}).+/node_modules/(?!lib-edumeet)`,
            'g'
          );
        // Return your customised Webpack Development Server config.
        return config;
      };
}