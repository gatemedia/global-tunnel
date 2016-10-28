/*jshint node:true */
'use strict';

var util = require('util');
var http = require('http');
var HttpAgent = http.Agent;
var https = require('https');
var HttpsAgent = https.Agent;

var _ = require('lodash');

/**
 * Proxy some traffic over HTTP.
 */
function OuterHttpAgent(opts) {
  HttpAgent.call(this, opts);
  mixinProxying(this, opts.proxy);
}
util.inherits(OuterHttpAgent, HttpAgent);
exports.OuterHttpAgent = OuterHttpAgent;

/**
 * Proxy some traffic over HTTPS.
 */
function OuterHttpsAgent(opts) {
  HttpsAgent.call(this, opts);
  mixinProxying(this, opts.proxy);
}
util.inherits(OuterHttpsAgent, HttpsAgent);
exports.OuterHttpsAgent = OuterHttpsAgent;

/**
 * Override createConnection and addRequest methods on the supplied agent.
 * http.Agent and https.Agent will set up createConnection in the constructor.
 */
function mixinProxying(agent, proxyOpts) {
  agent.proxy = proxyOpts;

  var orig = _.pick(agent, 'createConnection', 'addRequest');

  // Make the tcp or tls connection go to the proxy, ignoring the
  // destination host:port arguments.
  agent.createConnection = function(port, host, options) {
    return orig.createConnection.call(this,
                                      this.proxy.port, this.proxy.host, options);
  };

  // tell the proxy where we really want to go by fully-qualifying the path
  // part. Force a localAddress if one was configured
  agent.addRequest = function(req, host, port, localAddress) {
    var options = toOptions(host, port, localAddress);
    req.path = this.proxy.innerProtocol + '//' + options.host + ':' + options.port + req.path;
    if (this.proxy.localAddress) {
      options.localAddress = this.proxy.localAddress;
    }
    return orig.addRequest.call(this, req, options.host, options.port, options.localAddress);
  };
}

function toOptions(host, port, localAddress) {
  if (typeof host === 'string') { // since v0.10
    return {
      host: host,
      port: port,
      localAddress: localAddress
    };
  }
  return host; // for v0.11 or later
}
