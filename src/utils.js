var assert = require('assert')
var request = require('superagent')
var async = require('async')
var throttle = require('throttleme')
var proxyURL;

function btcToSatoshi(value) {
  return Math.round(1e8 * parseFloat(value))
}

function assertJSend(body) {
  assert.notEqual(body.status, 'error', body.message || 'Invalid JSend response:' + JSON.stringify(body))
  assert.notEqual(body.status, 'fail', body.data ? JSON.stringify(body.data) : 'Invalid JSend response: ' + JSON.stringify(body))

  assert.equal(body.status, 'success', 'Unexpected JSend response: ' + body)
  assert.notEqual(body.data, undefined, 'Unexpected JSend response: ' + body)
}

function handleJSend(callback) {
  return function(err, response) {
    if (err) {
      return callback(normalizeError(err, response))
    }

    var body
    try {
      body = JSON.parse(response.text)
    } catch (exception) {
      return callback(exception)
    }

    try {
      assertJSend(body)
    } catch (exception) {
      return callback(exception)
    }

    callback(null, body.data)
  }
}

function normalizeError (err, response) {
  var body = response && response.body
  if (!body) return err

  err = new Error(body.message || err.message)
  for (var p in body) {
    err[p] = body[p]
  }

  return err
}

function batchRequest(uri, items, options, callback) {
  items = [].concat(items)

  if(typeof options === 'function') {
    callback = options
    options = {}
  } else {
    options = options || {}
  }

  var itemsPerBatch = options.itemsPerBatch || 20
  var params = options.params

  var batches = []
  while(items.length > itemsPerBatch){
    var batch = items.splice(0, itemsPerBatch)
    batches.push(batch)
  }

  if(items.length > 0) batches.push(items)

  var requests = batches.map(function(batch) {
    return function(cb) {
      module.exports.makeRequest(uri + batch.join(','), params, cb)
    }
  })

  var consolidated = []
  async.parallel(requests, function(err, results) {
    if(err) return callback(err)

    results.forEach(function(r) {
      consolidated = consolidated.concat(r)
    })

    consolidated = consolidated.filter(function (item) {
      // filter out nulls
      return item
    })

    callback(null, consolidated)
  })
}

function makeRequest(uri, params, callback){
  if(Array.isArray(params)){
    uri +=  '?' + params.join('&')
  } else if (params instanceof Function) {
    callback = params
  }

  if(proxyURL) {
    uri = proxyURL + encodeURIComponent(uri)
  }

  request
    .get(uri)
    .timeout(20000)
    .end(handleJSend(callback))
}

function makePostRequest(uri, form, callback){
  if(proxyURL) {
    uri = proxyURL + encodeURIComponent(uri)
  }

  request
    .post(uri)
    .timeout(20000)
    .send(form)
    .end(handleJSend(callback))
}

function setProxyURL(url) {
  proxyURL = url
}

function throttleGet (millis) {
  module.exports.makeRequest = throttle(makeRequest, millis)
}

function throttlePost (millis) {
  module.exports.makePostRequest = throttle(makePostRequest, millis)
}

module.exports = {
  handleJSend: handleJSend,
  btcToSatoshi: btcToSatoshi,
  batchRequest: batchRequest,
  makeRequest: makeRequest,
  makePostRequest: makePostRequest,
  setProxyURL: setProxyURL,
  throttleGet: throttleGet,
  throttlePost: throttlePost
}
