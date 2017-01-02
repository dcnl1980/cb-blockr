var assert = require('assert')

var Addresses = require('./addresses')
var Blocks = require('./blocks')
var Transactions = require('./transactions')
var utils = require('./utils')

var NETWORKS = {
  testnet: "tbtc",
  bitcoin: "btc",
  litecoin: "ltc"
}

function Blockr(network, proxyURL) {
  network = network || 'bitcoin'
  assert(network in NETWORKS, 'Unknown network: ' + network)
  var BASE_URL = this._baseUrl = 'https://' + NETWORKS[network] + '.blockr.io/api/v1/'

  // end points
  this.transactions = new Transactions(BASE_URL + 'tx/')
  this.addresses = new Addresses(BASE_URL + 'address/', this.transactions)
  this.blocks = new Blocks(BASE_URL + 'block/', this.transactions)
  this._urlForPath = function (path) {
    return BASE_URL + path
  }

  this.network = network

  utils.setProxyURL(proxyURL)
  this.proxyURL = proxyURL
}

Blockr.Addresses = Addresses
Blockr.Blocks = Blocks
Blockr.Transactions = Transactions
Blockr.prototype.info = function (cb) {
  utils.makeRequest(this._urlForPath('coin/info'), function (err, data) {
    if (err) return cb(err)

    var block = data.last_block
    cb(null, {
      blockHeight: block.nb,
      timestamp: new Date(block.time_utc).getTime(),
      txCount: block.nb_txs
    })
  })
}

Blockr.prototype.getNetwork = function() { return this.network }
Blockr.prototype.getProxyURL = function() { return this.proxyURL }
Blockr.throttleGet = utils.throttleGet
Blockr.throttlePost = utils.throttlePost

module.exports = Blockr
