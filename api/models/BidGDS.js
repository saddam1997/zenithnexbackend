/**
 * BidGDS.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var moment = require('moment');
module.exports = {

  schema: true,
  attributes: {
    createTimeUTC: {
      type: 'string',
    },
    bidAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidAmountGDS: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountGDS: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidRate: {
      type: 'float',
      required: true,
      defaultsTo: 0
    },
    status: {
      type: 'integer'
    },
    statusName: {
      type: 'string'
    },
    bidownerGDS: {
      model: 'user'
    }

  },
  afterCreate: function(values, next) {
    //values.createTimeUTC = moment.utc().format();
    values.createTimeUTC = Date.parse(moment.utc().format()) / 1000;
    BidGDS.update({
      id: values.id
    }, values, next);
  }
};