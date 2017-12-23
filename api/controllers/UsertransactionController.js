/**
 * UsertransactionController
 *
 * @description :: Server-side logic for managing usertransactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: sails.config.company.clientBTChost,
  port: sails.config.company.clientBTCport,
  user: sails.config.company.clientBTCuser,
  pass: sails.config.company.clientBTCpass
});
//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
//CLUB Wallet Details
var bitcoinCLUB = require('bitcoin');
var clientCLUB = new bitcoinCLUB.Client({
  host: sails.config.company.clientCLUBhost,
  port: sails.config.company.clientCLUBport,
  user: sails.config.company.clientCLUBuser,
  pass: sails.config.company.clientCLUBpass
});
//PYY Wallet Details
var bitcoinPYY = require('bitcoin');
var clientPYY = new bitcoinPYY.Client({
  host: sails.config.company.clientPYYhost,
  port: sails.config.company.clientPYYport,
  user: sails.config.company.clientPYYuser,
  pass: sails.config.company.clientPYYpass
});
//GDS Wallet Details
var bitcoinGDS = require('bitcoin');
var clientGDS = new bitcoinGDS.Client({
  host: sails.config.company.clientGDShost,
  port: sails.config.company.clientGDSport,
  user: sails.config.company.clientGDSuser,
  pass: sails.config.company.clientGDSpass
});
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeCLUB = sails.config.company.txFeeCLUB;
var transactionFeeBTC = sails.config.company.txFeeBTC;
var transactionFeePYY = sails.config.company.txFeePYY;
var transactionFeeGDS = sails.config.company.txFeeGDS;
module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = parseFloat(req.body.amount);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniBTCAmountSentByUser = 0.001;
    miniBTCAmountSentByUser = parseFloat(miniBTCAmountSentByUser);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userBTCAmountToSend < miniBTCAmountSentByUser) {
      console.log("Sending amount is not less then " + miniBTCAmountSentByUser);
      return res.json({
        "message": "Sending amount BTC is not less then " + miniBTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userBTCBalanceInDb = parseFloat(userDetails.BTCMainbalance);
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User want send BTC to send ::: " + userBTCAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userBTCAddressInDb = userDetails.userBTCAddress;
              var userBTCBalanceInDb = userDetails.BTCMainbalance;
              if (userBTCAmountToSend > userBTCBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              if (userReceiverBTCAddress == userBTCAddressInDb) {
                console.log("User address and userReceiverBTCAddress Same !!!");
                return res.json({
                  "message": "userReceiverBTCAddress and Your BTC Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userBTCAmountToSend) - parseFloat(transactionFeeBTC);
              console.log("clientBTC netamountToSend :: " + netamountToSend);
              clientBTC.cmd('sendfrom', userEmailAddress, userReceiverBTCAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverBTCAddress, userReceiverBTCAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromBTCAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "BTC Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid BTC Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in BTC server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in BTC Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userBTCAddressInDb :: " + userBTCAddressInDb);
                  console.log("userBTCAmountToSend  :: " + userBTCAmountToSend);
                  var updatedBTCbalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBTCAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedBTCbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      BTCMainbalance: parseFloat(updatedBTCbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
                          if (err) {
                            return res.json({
                              "message": "Error to find user",
                              statusCode: 401
                            });
                          }
                          if (!user) {
                            return res.json({
                              "message": "Invalid email!",
                              statusCode: 401
                            });
                          }
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  sendBCH: function(req, res, next) {
    console.log("Enter into sendBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = parseFloat(req.body.amount);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniBCHAmountSentByUser = 0.001;
    miniBCHAmountSentByUser = parseFloat(miniBCHAmountSentByUser);
    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userBCHAmountToSend < miniBCHAmountSentByUser) {
      console.log("Sending amount is not less then " + miniBCHAmountSentByUser);
      return res.json({
        "message": "Sending amount BCH is not less then " + miniBCHAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userBCHBalanceInDb = parseFloat(userDetails.BCHMainbalance);
        console.log("User BCH balance in database ::: " + userBCHBalanceInDb);
        console.log("User want send BCH to send ::: " + userBCHAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userBCHAddressInDb = userDetails.userBCHAddress;
              var userBCHBalanceInDb = userDetails.BCHMainbalance;
              if (userBCHAmountToSend > userBCHBalanceInDb) {
                console.log("User BCH balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BCH balance",
                  statusCode: 401
                });
              }
              if (userReceiverBCHAddress == userBCHAddressInDb) {
                console.log("User address and userReceiverBCHAddress Same !!!");
                return res.json({
                  "message": "userReceiverBCHAddress and Your BCH Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userBCHAmountToSend) - parseFloat(transactionFeeBCH);
              console.log("clientBCH netamountToSend :: " + netamountToSend);
              clientBCH.cmd('sendfrom', userEmailAddress, userReceiverBCHAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverBCHAddress, userReceiverBCHAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromBCHAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "BCH Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid BCH Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in BCH server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in BCH Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userBCHAddressInDb :: " + userBCHAddressInDb);
                  console.log("userBCHAmountToSend  :: " + userBCHAmountToSend);
                  var updatedBCHbalance = (parseFloat(userBCHBalanceInDb) - parseFloat(userBCHAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedBCHbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      BCHMainbalance: parseFloat(updatedBCHbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
                          if (err) {
                            return res.json({
                              "message": "Error to find user",
                              statusCode: 401
                            });
                          }
                          if (!user) {
                            return res.json({
                              "message": "Invalid email!",
                              statusCode: 401
                            });
                          }
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  sendGDS: function(req, res, next) {
    console.log("Enter into sendGDS");
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToSend = parseFloat(req.body.amount);
    var userReceiverGDSAddress = req.body.recieverGDSCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniGDSAmountSentByUser = 0.001;
    miniGDSAmountSentByUser = parseFloat(miniGDSAmountSentByUser);
    if (!userEmailAddress || !userGDSAmountToSend || !userReceiverGDSAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userGDSAmountToSend < miniGDSAmountSentByUser) {
      console.log("Sending amount is not less then " + miniGDSAmountSentByUser);
      return res.json({
        "message": "Sending amount GDS is not less then " + miniGDSAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userGDSBalanceInDb = parseFloat(userDetails.GDSMainbalance);
        console.log("User GDS balance in database ::: " + userGDSBalanceInDb);
        console.log("User want send GDS to send ::: " + userGDSAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userGDSAddressInDb = userDetails.userGDSAddress;
              var userGDSBalanceInDb = userDetails.GDSMainbalance;
              if (userGDSAmountToSend > userGDSBalanceInDb) {
                console.log("User GDS balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient GDS balance",
                  statusCode: 401
                });
              }
              if (userReceiverGDSAddress == userGDSAddressInDb) {
                console.log("User address and userReceiverGDSAddress Same !!!");
                return res.json({
                  "message": "userReceiverGDSAddress and Your GDS Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userGDSAmountToSend) - parseFloat(transactionFeeGDS);
              console.log("clientGDS netamountToSend :: " + netamountToSend);
              clientGDS.cmd('sendfrom', userEmailAddress, userReceiverGDSAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverGDSAddress, userReceiverGDSAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromGDSAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "GDS Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid GDS Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in GDS server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in GDS Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userGDSAddressInDb :: " + userGDSAddressInDb);
                  console.log("userGDSAmountToSend  :: " + userGDSAmountToSend);
                  var updatedGDSbalance = (parseFloat(userGDSBalanceInDb) - parseFloat(userGDSAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedGDSbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      GDSMainbalance: parseFloat(updatedGDSbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
                          if (err) {
                            return res.json({
                              "message": "Error to find user",
                              statusCode: 401
                            });
                          }
                          if (!user) {
                            return res.json({
                              "message": "Invalid email!",
                              statusCode: 401
                            });
                          }
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  sendPYY: function(req, res, next) {
    console.log("Enter into sendPYY");
    var userEmailAddress = req.body.userMailId;
    var userPYYAmountToSend = parseFloat(req.body.amount);
    var userReceiverPYYAddress = req.body.recieverPYYCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniPYYAmountSentByUser = 0.001;
    miniPYYAmountSentByUser = parseFloat(miniPYYAmountSentByUser);
    if (!userEmailAddress || !userPYYAmountToSend || !userReceiverPYYAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userPYYAmountToSend < miniPYYAmountSentByUser) {
      console.log("Sending amount is not less then " + miniPYYAmountSentByUser);
      return res.json({
        "message": "Sending amount PYY is not less then " + miniPYYAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userPYYBalanceInDb = parseFloat(userDetails.PYYMainbalance);
        console.log("User PYY balance in database ::: " + userPYYBalanceInDb);
        console.log("User want send PYY to send ::: " + userPYYAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userPYYAddressInDb = userDetails.userPYYAddress;
              var userPYYBalanceInDb = userDetails.PYYMainbalance;
              if (userPYYAmountToSend > userPYYBalanceInDb) {
                console.log("User PYY balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient PYY balance",
                  statusCode: 401
                });
              }
              if (userReceiverPYYAddress == userPYYAddressInDb) {
                console.log("User address and userReceiverPYYAddress Same !!!");
                return res.json({
                  "message": "userReceiverPYYAddress and Your PYY Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userPYYAmountToSend) - parseFloat(transactionFeePYY);
              console.log("clientPYY netamountToSend :: " + netamountToSend);
              clientPYY.cmd('sendfrom', userEmailAddress, userReceiverPYYAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverPYYAddress, userReceiverPYYAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromPYYAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "PYY Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid PYY Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in PYY server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in PYY Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userPYYAddressInDb :: " + userPYYAddressInDb);
                  console.log("userPYYAmountToSend  :: " + userPYYAmountToSend);
                  var updatedPYYbalance = (parseFloat(userPYYBalanceInDb) - parseFloat(userPYYAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedPYYbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      PYYMainbalance: parseFloat(updatedPYYbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
                          if (err) {
                            return res.json({
                              "message": "Error to find user",
                              statusCode: 401
                            });
                          }
                          if (!user) {
                            return res.json({
                              "message": "Invalid email!",
                              statusCode: 401
                            });
                          }
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  sendCLUB: function(req, res, next) {
    console.log("Enter into sendCLUB");
    var userEmailAddress = req.body.userMailId;
    var userCLUBAmountToSend = parseFloat(req.body.amount);
    var userReceiverCLUBAddress = req.body.recieverCLUBCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniCLUBAmountSentByUser = 0.001;
    miniCLUBAmountSentByUser = parseFloat(miniCLUBAmountSentByUser);
    if (!userEmailAddress || !userCLUBAmountToSend || !userReceiverCLUBAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userCLUBAmountToSend < miniCLUBAmountSentByUser) {
      console.log("Sending amount is not less then " + miniCLUBAmountSentByUser);
      return res.json({
        "message": "Sending amount CLUB is not less then " + miniCLUBAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userCLUBBalanceInDb = parseFloat(userDetails.CLUBMainbalance);
        console.log("User CLUB balance in database ::: " + userCLUBBalanceInDb);
        console.log("User want send CLUB to send ::: " + userCLUBAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userCLUBAddressInDb = userDetails.userCLUBAddress;
              var userCLUBBalanceInDb = userDetails.CLUBMainbalance;
              if (userCLUBAmountToSend > userCLUBBalanceInDb) {
                console.log("User CLUB balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient CLUB balance",
                  statusCode: 401
                });
              }
              if (userReceiverCLUBAddress == userCLUBAddressInDb) {
                console.log("User address and userReceiverCLUBAddress Same !!!");
                return res.json({
                  "message": "userReceiverCLUBAddress and Your CLUB Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userCLUBAmountToSend) - parseFloat(transactionFeeCLUB);
              console.log("clientCLUB netamountToSend :: " + netamountToSend);
              clientCLUB.cmd('sendfrom', userEmailAddress, userReceiverCLUBAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverCLUBAddress, userReceiverCLUBAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromCLUBAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "CLUB Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid CLUB Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in CLUB server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in CLUB Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userCLUBAddressInDb :: " + userCLUBAddressInDb);
                  console.log("userCLUBAmountToSend  :: " + userCLUBAmountToSend);
                  var updatedCLUBbalance = (parseFloat(userCLUBBalanceInDb) - parseFloat(userCLUBAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedCLUBbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      CLUBMainbalance: parseFloat(updatedCLUBbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
                          if (err) {
                            return res.json({
                              "message": "Error to find user",
                              statusCode: 401
                            });
                          }
                          if (!user) {
                            return res.json({
                              "message": "Invalid email!",
                              statusCode: 401
                            });
                          }
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  getTxsListBCH: function(req, res, next) {
    console.log("Enter into getTransactionListBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBCH.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListCLUB: function(req, res, next) {
    console.log("Enter into getTransactionListCLUB::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientCLUB.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromCLUBAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CLUB Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CLUB server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CLUB Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");

          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListBTC: function(req, res, next) {

    console.log("Enter into getTxsListBTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBTC.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromBTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListPYY: function(req, res, next) {
    console.log("Enter into getTxsListPYY::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientPYY.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromPYYAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "PYY Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in PYY server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in PYY Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");

          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListGDS: function(req, res, next) {
    console.log("Enter into getTxsListGDS::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientGDS.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromGDSAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "GDS Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in GDS server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in GDS Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");

          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getBalBCH: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.BCHMainbalance);
      var userBCHMainbalanceInDb = parseFloat(user.BCHMainbalance);
      var userFreezedBCHMainbalanceInDb = parseFloat(user.FreezedBCHbalance);
      clientBCH.cmd(
        'getbalance',
        userMailId,
        function(err, userBCHMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid BCH Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          var totalBCHMainbalance = (parseFloat(userBCHMainbalanceInDb));
          console.log(parseFloat(userBCHMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalBCHMainbalance));
          if (parseFloat(userBCHMainbalanceFromServer) > parseFloat(totalBCHMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BCHMainbalance: parseFloat(userBCHMainbalanceFromServer)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!user) {
                    return res.json({
                      "message": "Invalid email!",
                      statusCode: 401
                    });
                  }
                  console.log("Return Update details for BCH balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalCLUB: function(req, res, next) {
    console.log("Enter into getBalCLUB::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserCLUB Balance ::" + user.CLUBMainbalance);
      var userCLUBMainbalanceInDb = parseFloat(user.CLUBMainbalance);
      var userFreezedCLUBMainbalanceInDb = parseFloat(user.FreezedCLUBbalance);
      clientCLUB.cmd(
        'getbalance',
        userMailId,
        function(err, userCLUBMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromCLUBAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CLUB Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid CLUB Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CLUB server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CLUB Server",
              statusCode: 400
            });
          }
          var totalCLUBMainbalance = (parseFloat(userCLUBMainbalanceInDb));
          console.log(parseFloat(userCLUBMainbalanceFromServer) + " BHC server and in DB CLUB + Freezed " + parseFloat(totalCLUBMainbalance));
          if (parseFloat(userCLUBMainbalanceFromServer) > parseFloat(totalCLUBMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                CLUBMainbalance: parseFloat(userCLUBMainbalanceFromServer)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!user) {
                    return res.json({
                      "message": "Invalid email!",
                      statusCode: 401
                    });
                  }
                  console.log("Return Update details for CLUB balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalBTC: function(req, res, next) {
    console.log("Enter into getBalBTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBTC Balance ::" + user.BTCMainbalance);
      var userBTCMainbalanceInDb = parseFloat(user.BTCMainbalance);
      var userFreezedBTCMainbalanceInDb = parseFloat(user.FreezedBTCbalance);
      clientBTC.cmd(
        'getbalance',
        userMailId,
        function(err, userBTCMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server",
              statusCode: 400
            });
          }
          var totalBTCMainbalance = (parseFloat(userBTCMainbalanceInDb));
          console.log(parseFloat(userBTCMainbalanceFromServer) + " on server and in DB BTC + Freezed :: " + parseFloat(totalBTCMainbalance));
          if (parseFloat(userBTCMainbalanceFromServer) > parseFloat(totalBTCMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BTCMainbalance: parseFloat(userBTCMainbalanceFromServer)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!user) {
                    return res.json({
                      "message": "Invalid email!",
                      statusCode: 401
                    });
                  }
                  console.log("Return Update details for BTC balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });

          }
        });
    });
  },
  getBalPYY: function(req, res, next) {
    console.log("Enter into getBalPYY::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserPYY Balance ::" + user.PYYMainbalance);
      var userPYYMainbalanceInDb = parseFloat(user.PYYMainbalance);
      var userFreezedPYYMainbalanceInDb = parseFloat(user.FreezedPYYbalance);
      clientPYY.cmd(
        'getbalance',
        userMailId,
        function(err, userPYYMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromPYYAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "PYY Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid PYY Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in PYY server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in PYY Server",
              statusCode: 400
            });
          }
          var totalPYYMainbalance = (parseFloat(userPYYMainbalanceInDb));
          console.log(parseFloat(userPYYMainbalanceFromServer) + " BHC server and in DB PYY + Freezed " + parseFloat(totalPYYMainbalance));
          if (parseFloat(userPYYMainbalanceFromServer) > parseFloat(totalPYYMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                PYYMainbalance: parseFloat(userPYYMainbalanceFromServer)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!user) {
                    return res.json({
                      "message": "Invalid email!",
                      statusCode: 401
                    });
                  }
                  console.log("Return Update details for PYY balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalGDS: function(req, res, next) {
    console.log("Enter into getBalGDS::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserGDS Balance ::" + user.GDSMainbalance);
      var userGDSMainbalanceInDb = parseFloat(user.GDSMainbalance);
      var userFreezedGDSMainbalanceInDb = parseFloat(user.FreezedGDSbalance);
      clientGDS.cmd(
        'getbalance',
        userMailId,
        function(err, userGDSMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromGDSAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "GDS Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid GDS Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in GDS server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in GDS Server",
              statusCode: 400
            });
          }
          var totalGDSMainbalance = (parseFloat(userGDSMainbalanceInDb));
          console.log(parseFloat(userGDSMainbalanceFromServer) + " BHC server and in DB GDS + Freezed " + parseFloat(totalGDSMainbalance));
          if (parseFloat(userGDSMainbalanceFromServer) > parseFloat(totalGDSMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                GDSMainbalance: parseFloat(userGDSMainbalanceFromServer)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!user) {
                    return res.json({
                      "message": "Invalid email!",
                      statusCode: 401
                    });
                  }
                  console.log("Return Update details for GDS balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
};