/**
 * AskEBT.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    askAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askAmountEBT: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askRate: {
      type: 'float',
      required: true,
      defaultsTo: 0
    },
    askownerEBT: {
      model: 'user'
    }
  }
};
