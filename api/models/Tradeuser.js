/**
 * Tradeuser.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    BTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    BCHbalance: {
      type: 'float',
      defaultsTo: 0
    },
    GDSbalance: {
      type: 'float',
      defaultsTo: 0
    },
    EBTbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBCHbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedGDSbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedEBTbalance: {
      type: 'float',
      defaultsTo: 0
    },
    tradeuserowner: {
      model: 'user'
    }
  }
};
