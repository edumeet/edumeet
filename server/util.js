'use strict';

var crypto = require('crypto');

exports.random = function (howMany, chars) {
    chars = chars
        || "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
    var rnd = crypto.randomBytes(howMany)
        , value = new Array(howMany)
        , len = len = Math.min(256, chars.length)
        , d = 256 / len

    for (var i = 0; i < howMany; i++) {
        value[i] = chars[Math.floor(rnd[i] / d)]
    };

    return value.join('');
}
