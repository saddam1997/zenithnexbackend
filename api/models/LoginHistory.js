/**
 * LoginHistory.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    logintime: {
      type: 'string',
    },
    logouttime: {
      type: 'string',
    },
    ip: {
      type: 'string',
    },
    status: {
      type: 'string',
    },
    loginowner: {
      model: 'user'
    }
  }
};