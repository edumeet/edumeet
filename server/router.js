'use strict';

const EventEmitter = require( 'events' );
const eventEmitter = new EventEmitter();
const path = require('path');
const url = require('url');
const httpHelpers = require('./http-helpers');
const fs = require('fs');
const config = require('./config');
const utils = require('./util');
const querystring = require('querystring');
const https = require('https')
const Logger = require('./lib/Logger');

const logger = new Logger();

let authRequests = {}; // ongoing auth requests :
/*
{
  state:
  {
    peerName:'peerName'
    code:'oauth2 code',
    roomId: 'romid',
  }
}
*/
const actions = {
  'GET': function(req, res) {
    var parsedUrl = url.parse(req.url,true);
    if ( parsedUrl.pathname === '/auth-callback' )
    {
      if ( typeof(authRequests[parsedUrl.query.state]) != 'undefined' )
      {
        console.log('got authorization code for access token: ',parsedUrl.query,authRequests[parsedUrl.query.state]);
        const auth = "Basic " + new Buffer(config.oauth2.client_id + ":" + config.oauth2.client_secret).toString("base64");
        const postUrl = url.parse(config.oauth2.token_endpoint);
        let postData = querystring.stringify({
          "grant_type":"authorization_code",
          "code":parsedUrl.query.code,
          "redirect_uri":config.oauth2.redirect_uri
        });

        let request = https.request( {
          host    : postUrl.hostname,
          path    : postUrl.pathname,
          port    : postUrl.port,
          method  : 'POST',
          headers :
          {
            'Content-Type'  : 'application/x-www-form-urlencoded',
            'Authorization' : auth,
            'Content-Length': Buffer.byteLength(postData)
          }
        }, function(res)
        {
          res.setEncoding("utf8");
          let body = "";
          res.on("data", data => {
            body += data;
          });
          res.on("end", () => {
            if ( res.statusCode == 200 )
            {
              console.log('We\'ve got an access token!', body);
              body = JSON.parse(body);
              authRequests[parsedUrl.query.state].access_token =
                body.access_token;
              const auth = "Bearer " + body.access_token;
              const getUrl = url.parse(config.oauth2.userinfo_endpoint);
              let request = https.request( {
                host    : getUrl.hostname,
                path    : getUrl.pathname,
                port    : getUrl.port,
                method  : 'GET',
                headers :
                {
                  'Authorization' : auth,
                }
              }, function(res)
              {
                res.setEncoding("utf8");
                let body = '';
                res.on("data", data => {
                  body += data;
                });
                res.on("end", () => {
                  // we don't need this any longer:
                  delete authRequests[parsedUrl.query.state].access_token;

                  body = JSON.parse(body);
                  console.log(body);
                  if ( res.statusCode == 200 )
                  {
                    authRequests[parsedUrl.query.state].verified = true;
                    if ( typeof(body.sub) != 'undefined')
                    {
                      authRequests[parsedUrl.query.state].sub = body.sub;
                    }
                    if ( typeof(body.name) != 'undefined')
                    {
                      authRequests[parsedUrl.query.state].name = body.name;
                    }
                    if ( typeof(body.picture) != 'undefined')
                    {
                      authRequests[parsedUrl.query.state].picture = body.picture;
                    }
                  } else {
                    {
                      authRequests[parsedUrl.query.state].verified = false;
                    }
                  }
                  eventEmitter.emit('auth',
                    authRequests[parsedUrl.query.state]);

                  delete authRequests[parsedUrl.query.state];
                });
              });
              request.write(' ');
              request.end;
            }
            else
            {
              console.log('access_token denied',body);
              authRequests[parsedUrl.query.state].verified = false;
              delete authRequests[parsedUrl.query.state].access_token;
              eventEmitter.emit('auth',
                authRequests[parsedUrl.query.state]);
            }
          });
        });
        request.write(postData);
        request.end;
      }
      else
      {
        logger.warn('Got authorization_code for unseen state:', parsedUrl)
      }
    }
    else if (parsedUrl.pathname === '/login') {
      const state = utils.random(10);
      httpHelpers.redirector(res, config.oauth2.authorization_endpoint
        + '?client_id=' + config.oauth2.client_id
        + '&redirect_uri=' + config.oauth2.redirect_uri
        + '&state=' + state
        + '&scopes=' + config.oauth2.scopes.request.join('+')
        + '&response_type=' + config.oauth2.response_type);
      authRequests[state] =
        {
          'roomId'   : parsedUrl.query.roomId,
          'peerName' : parsedUrl.query.peerName
        };
      console.log('Started authorization process: ', parsedUrl.query);
    }
    else
    {
      console.log('requested url:', parsedUrl.pathname);
      var resolvedBase = path.resolve('./public');
      var safeSuffix = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      var fileLoc = path.join(resolvedBase, safeSuffix);

          var stream = fs.createReadStream(fileLoc);

          // Handle non-existent file -> delivering index.html
          stream.on('error', function(error) {
  						stream = fs.createReadStream(path.resolve('./public/index.html'));
              res.statusCode = 200;
  		        stream.pipe(res);
          });

          // File exists, stream it to user
          res.statusCode = 200;
          stream.pipe(res);
    }
  },

  'POST': function(req, res) {
    httpHelpers.prepareResponse(req, function(data) {
      // Do something with the data that was just collected by the helper
      // e.g., validate and save to db
      // either redirect or respond
        // should be based on result of the operation performed in response to the POST request intent
        // e.g., if user wants to save, and save fails, throw error
      httpHelpers.redirector(res, /* redirect path , optional status code -  defaults to 302 */);
    });
  }
};

module.exports = eventEmitter;

module.exports.handleRequest = function(req, res) {
  var action = actions[req.method];
  action ? action(req, res) : httpHelpers.send404(res);
};
