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
var companyBTCAccount = sails.config.company.companyBTCAccount;
var companyBTCAccountAddress = sails.config.company.companyBTCAccountAddress;


//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
var companyBCHAccount = sails.config.company.companyBCHAccount;
var companyBCHAccountAddress = sails.config.company.companyBCHAccountAddress;
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeBTC = sails.config.company.txFeeBTC;

//EBT Wallet Details
var bitcoinEBT = require('bitcoin');
var clientEBT = new bitcoinEBT.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
//GDS Wallet Details
var bitcoinGDS = require('bitcoin');
var clientGDS = new bitcoinGDS.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});

module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniBTCAmountSentByUser = 0.001;
    miniBTCAmountSentByUser = parseFloat(miniBTCAmountSentByUser).toFixed(8);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
        var userBTCBalanceInDb = parseFloat(userDetails.BTCMainbalance).toFixed(8);
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
              var netamountToSend = parseFloat(userBTCAmountToSend).toFixed(8) - parseFloat(transactionFeeBTC).toFixed(8);
              console.log("clientBTC netamountToSend :: " + netamountToSend);
              clientBTC.cmd('sendfrom', userEmailAddress, userReceiverBTCAddress, parseFloat(netamountToSend).toFixed(8),
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
                  var updatedBTCbalance = (parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userBTCAmountToSend).toFixed(8));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedBTCbalance).toFixed(8));
                  User.update({
                      email: userEmailAddress
                    }, {
                      BTCMainbalance: parseFloat(updatedBTCbalance).toFixed(8)
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
    console.log("Enter into sendBCH with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountBCHSentByUser = 0.008;
    miniBCHAmountSentByUser = parseFloat(minimumAmountBCHSentByUser).toFixed(8);

    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userBCHAmountToSend < minimumAmountBCHSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "BCH Amount not less than " + minimumAmountBCHSentByUser,
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
      }
      var userBCHBalanceInDb = parseFloat(userDetails.BCHMainbalance).toFixed(8);
      var userBCHAddressInDb = userDetails.userBCHAddress;
      console.log("UserAMount in database ::: " + userDetails.BCHMainbalance);
      console.log("BCH Amount send by user ::: " + userBCHAmountToSend);
      if (userBCHAmountToSend > userBCHBalanceInDb) {
        console.log("BCH Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient BCH balance",
          statusCode: 401
        });
      }
      if (userReceiverBCHAddress == userBCHAddressInDb) {
        console.log("User address and recieverBCHCoinAddress Same !!!");
        return res.json({
          "message": "recieverBCHCoinAddress and Your BCH Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userBCHAmountToSend).toFixed(8) - parseFloat(transactionFeeBCH).toFixed(8);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeBCH ::: " + transactionFeeBCH);

          clientBCH.cmd('sendfrom', userEmailAddress, userReceiverBCHAddress, parseFloat(netAmountToSend).toFixed(8),
            minimumNumberOfConfirmation, userReceiverBCHAddress, userReceiverBCHAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromBCHAccount:: " + err);
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
              console.log("User balance in db:: " + userBCHBalanceInDb);
              console.log("UserBCHAmountToSend  :: " + userBCHAmountToSend);

              var updatedBCHbalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userBCHAmountToSend).toFixed(8);
              console.log("Update new Balance of user in DB ::" + updatedBCHbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  BCHMainbalance: updatedBCHbalance
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
                      console.log("Update User details of BCH " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  sendEBT: function(req, res, next) {
    console.log("Enter into sendEBT with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userEBTAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverEBTAddress = req.body.recieverEBTCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountEBTSentByUser = 0.008;
    miniEBTAmountSentByUser = parseFloat(minimumAmountEBTSentByUser).toFixed(8);

    if (!userEmailAddress || !userEBTAmountToSend || !userReceiverEBTAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userEBTAmountToSend < minimumAmountEBTSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "EBT Amount not less than " + minimumAmountEBTSentByUser,
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
      }
      var userEBTBalanceInDb = parseFloat(userDetails.EBTMainbalance).toFixed(8);
      var userEBTAddressInDb = userDetails.userEBTAddress;
      console.log("UserAMount in database ::: " + userDetails.EBTMainbalance);
      console.log("EBT Amount send by user ::: " + userEBTAmountToSend);
      if (userEBTAmountToSend > userEBTBalanceInDb) {
        console.log("EBT Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient EBT balance",
          statusCode: 401
        });
      }
      if (userReceiverEBTAddress == userEBTAddressInDb) {
        console.log("User address and recieverEBTCoinAddress Same !!!");
        return res.json({
          "message": "recieverEBTCoinAddress and Your EBT Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userEBTAmountToSend).toFixed(8) - parseFloat(transactionFeeEBT).toFixed(8);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeEBT ::: " + transactionFeeEBT);

          clientEBT.cmd('sendfrom', userEmailAddress, userReceiverEBTAddress, parseFloat(netAmountToSend).toFixed(8),
            minimumNumberOfConfirmation, userReceiverEBTAddress, userReceiverEBTAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromEBTAccount:: " + err);
                if (err.code && err.code == "ECONNREFUSED") {
                  return res.json({
                    "message": "EBT Server Refuse to connect App",
                    statusCode: 400
                  });
                }
                if (err.code && err.code == -5) {
                  return res.json({
                    "message": "Invalid EBT Address",
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
                    "message": "Problem in EBT server",
                    statusCode: 400
                  });
                }
                return res.json({
                  "message": "Error in EBT Server",
                  statusCode: 400
                });
              }
              console.log('TransactionDetails :', TransactionDetails);
              console.log("User balance in db:: " + userEBTBalanceInDb);
              console.log("UserEBTAmountToSend  :: " + userEBTAmountToSend);

              var updatedEBTbalance = parseFloat(userEBTBalanceInDb).toFixed(8) - parseFloat(userEBTAmountToSend).toFixed(8);
              console.log("Update new Balance of user in DB ::" + updatedEBTbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  EBTMainbalance: updatedEBTbalance
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
                      console.log("Update User details of EBT " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  sendGDS: function(req, res, next) {
    console.log("Enter into sendGDS with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverGDSAddress = req.body.recieverGDSCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountGDSSentByUser = 0.008;
    miniGDSAmountSentByUser = parseFloat(minimumAmountGDSSentByUser).toFixed(8);

    if (!userEmailAddress || !userGDSAmountToSend || !userReceiverGDSAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userGDSAmountToSend < minimumAmountGDSSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "GDS Amount not less than " + minimumAmountGDSSentByUser,
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
      }
      var userGDSBalanceInDb = parseFloat(userDetails.GDSMainbalance).toFixed(8);
      var userGDSAddressInDb = userDetails.userGDSAddress;
      console.log("UserAMount in database ::: " + userDetails.GDSMainbalance);
      console.log("GDS Amount send by user ::: " + userGDSAmountToSend);
      if (userGDSAmountToSend > userGDSBalanceInDb) {
        console.log("GDS Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient GDS balance",
          statusCode: 401
        });
      }
      if (userReceiverGDSAddress == userGDSAddressInDb) {
        console.log("User address and recieverGDSCoinAddress Same !!!");
        return res.json({
          "message": "recieverGDSCoinAddress and Your GDS Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userGDSAmountToSend).toFixed(8) - parseFloat(transactionFeeGDS).toFixed(8);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeGDS ::: " + transactionFeeGDS);

          clientGDS.cmd('sendfrom', userEmailAddress, userReceiverGDSAddress, parseFloat(netAmountToSend).toFixed(8),
            minimumNumberOfConfirmation, userReceiverGDSAddress, userReceiverGDSAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromGDSAccount:: " + err);
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
              console.log("User balance in db:: " + userGDSBalanceInDb);
              console.log("UserGDSAmountToSend  :: " + userGDSAmountToSend);

              var updatedGDSbalance = parseFloat(userGDSBalanceInDb).toFixed(8) - parseFloat(userGDSAmountToSend).toFixed(8);
              console.log("Update new Balance of user in DB ::" + updatedGDSbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  GDSMainbalance: updatedGDSbalance
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
                      console.log("Update User details of GDS " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  getTxsListBCH: function(req, res, next) {
    console.log("Enter into getTransactionListBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
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
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListEBT: function(req, res, next) {
    console.log("Enter into getTxsListEBT::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
      clientEBT.cmd(
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
  getTxsListGDS: function(req, res, next) {
    console.log("Enter into getTxsListGDS::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
  getBalBCH: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
      var userBCHMainbalanceInDb = parseFloat(user.BCHMainbalance).toFixed(8);
      var userFreezedBCHMainbalanceInDb = parseFloat(user.FreezedBCHbalance).toFixed(8);
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
          var totalBCHMainbalance = (parseFloat(userBCHMainbalanceInDb)).toFixed(8);
          console.log(parseFloat(userBCHMainbalanceFromServer).toFixed(8) + " BHC server and in DB BCH + Freezed " + parseFloat(totalBCHMainbalance).toFixed(8));
          if (parseFloat(userBCHMainbalanceFromServer).toFixed(8) > parseFloat(totalBCHMainbalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BCHMainbalance: parseFloat(userBCHMainbalanceFromServer).toFixed(8)
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
  getBalBTC: function(req, res, next) {
    console.log("Enter into getBalBTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
      console.log("UserBCH Balance ::" + user.BTCMainbalance);
      var userBTCMainbalanceInDb = parseFloat(user.BTCMainbalance).toFixed(8);
      var userFreezedBTCMainbalanceInDb = parseFloat(user.FreezedBTCbalance).toFixed(8);
      clientBTC.cmd(
        'getbalance',
        userMailId,
        function(err, userBTCMainbalanceFromServer, resHeaders) {
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
          var totalBTCMainbalance = (parseFloat(userBTCMainbalanceInDb)).toFixed(8);
          console.log(parseFloat(userBTCMainbalanceFromServer).toFixed(8) + " on server and in DB BTC + Freezed :: " + parseFloat(totalBTCMainbalance).toFixed(8));
          if (parseFloat(userBTCMainbalanceFromServer).toFixed(8) > parseFloat(totalBTCMainbalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BTCMainbalance: parseFloat(userBTCMainbalanceFromServer).toFixed(8)
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
            // res.json({
            //   "message": "No need to update",
            //   statusCode: 201
            // });
          }
        });
    });
  },
  getBalEBT: function(req, res, next) {
    console.log("Enter into getBalEBT::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
      console.log("UserBCH Balance ::" + user.EBTMainbalance);
      var userEBTMainbalanceInDb = parseFloat(user.EBTMainbalance).toFixed(8);
      var userFreezedEBTMainbalanceInDb = parseFloat(user.FreezedEBTbalance).toFixed(8);
      clientEBT.cmd(
        'getbalance',
        userMailId,
        function(err, userEBTMainbalanceFromServer, resHeaders) {
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
          var totalEBTMainbalance = (parseFloat(userEBTMainbalanceInDb)).toFixed(8);
          console.log(parseFloat(userEBTMainbalanceFromServer).toFixed(8) + " BHC server and in DB BCH + Freezed " + parseFloat(totalEBTMainbalance).toFixed(8));
          if (parseFloat(userEBTMainbalanceFromServer).toFixed(8) > parseFloat(totalEBTMainbalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                EBTMainbalance: parseFloat(userEBTMainbalanceFromServer).toFixed(8)
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
  getBalGDS: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
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
      console.log("UserBCH Balance ::" + user.GDSMainbalance);
      var userGDSMainbalanceInDb = parseFloat(user.GDSMainbalance).toFixed(8);
      var userFreezedGDSMainbalanceInDb = parseFloat(user.FreezedGDSbalance).toFixed(8);
      clientBCH.cmd(
        'getbalance',
        userMailId,
        function(err, userGDSMainbalanceFromServer, resHeaders) {
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
          var totalGDSMainbalance = (parseFloat(userGDSMainbalanceInDb)).toFixed(8);
          console.log(parseFloat(userGDSMainbalanceFromServer).toFixed(8) + " BHC server and in DB BCH + Freezed " + parseFloat(totalGDSMainbalance).toFixed(8));
          if (parseFloat(userGDSMainbalanceFromServer).toFixed(8) > parseFloat(totalGDSMainbalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                GDSMainbalance: parseFloat(userGDSMainbalanceFromServer).toFixed(8)
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
};
