/**
 * BidGDS.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,
  attributes: {
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

  }
};
