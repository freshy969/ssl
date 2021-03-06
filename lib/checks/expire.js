const tls       = require('tls');
const net       = require('net');
const url       = require('url');
const _         = require('underscore');
const moment    = require('moment');
const async     = require('async');
const fs        = require('fs');
const Constants = require('../constants');

/**
* Check the valid date of a certificate
**/
module.exports = exports = function(payload, options, fn) {

  // pull out the params we can use
  var address     = options.address;
  var client      = options.client;
  var socket      = options.client;

  // get the data
  var data        = payload.getData();

  // sanity check
  if(!client) return fn(null);

  // get the certificate
  var cert = client.getPeerCertificate(false);

  // just in case the peer does not provide a certificate ...
  if(!cert) return fn(null);

  // extra the params from our certificate
  var validFrom       = null;
  var validTo         = null;

  try {

    // try to parse the dates
    validFrom = moment(cert.valid_from, Constants.TLS_DATE_FORMAT);
    validTo = moment(cert.valid_to, Constants.TLS_DATE_FORMAT);

  } catch(err) {}

  // sanity check that we got our dates
  if(!validFrom) return fn(null);
  if(!validTo) return fn(null);

  // get the amount of valid days still remaining
  var days = validTo.diff(moment(), 'days');

  // check if the certificate has expired already ?
  if(days <= 0) {

    // update the message if perhaps today
    var message       = 'Certificate on $ expired $ days ago and should be renewed.';
    var identifiers   = [ address, -(days) ];

    // check the date
    if(days == 0) {

      // reset message and identifiers
      message         = 'Certificate on $ expires today, and should be renewed.';
      identifiers     = [ address ];

    }

    // yeap add the rule
    payload.addRule({

      message:      'Certificate has expired',
      key:          'expired',
      type:         'critical'

    }, {

      message:      message,
      identifiers:  identifiers

    });

    // stop exec
    return fn(null);

  } else {

    // message to show in the sidebar
    var message     = 'Server certificate on $ expires in $ days and should be renewed.';
    var identifiers = [ address, days ];
    var type        = 'error';

    // according to the length of days set the message
    if(days <= 14) {

      type          = 'error';

    } else if(days < 31) {

      // expired today
      type          = 'warning';

    } else return fn(null);

    // yeap add the rule
    payload.addRule({

      message:      'SSL Certificate is about to expire',
      key:          'expire',
      type:         type

    }, {

      display:      'text',
      message:      message,
      identifiers:  identifiers

    });

    // finish
    return fn(null);

  }

};