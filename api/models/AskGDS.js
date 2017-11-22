/**
 * AskGDS.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,

  attributes: {
    createTimeUTC: {
      type: 'string',
    },
    askAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askAmountGDS: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountGDS: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askRate: {
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
    askownerGDS: {
      model: 'user'
    }
  }
};