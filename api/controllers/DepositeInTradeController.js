/**
 * DepositeInTradeController
 *
 * @description :: Server-side logic for managing depositeintrades
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
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeBTC = sails.config.company.txFeeBTC;
var transactionFeeEBT = sails.config.company.txFeeEBT;
var transactionFeeGDS = sails.config.company.txFeeGDS;

var companyBTCAccount = sails.config.company.companyBTCAccount;
var companyBCHAccount = sails.config.company.companyBCHAccount;
var companyGDSAccount = sails.config.company.companyGDSAccount;
var companyEBTAccount = sails.config.company.companyEBTAccount;


var currencyNameBTC = "BTC";
var currencyNameBCH = "BCH";
var currencyNameGDS = "GDS";
var currencyNameEBT = "EBT";

var actionNameDeposit = "Deposit";
var actionNameWithdrawal = "Withdrawal";

module.exports = {
  depositeInWalletBTC: function(req, res) {
    console.log("Enter into depositeInWalletBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToDeposite = parseFloat(req.body.btcamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBTCAmountToDeposite || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
        console.log("User want send BTC to send ::: " + userBTCAmountToDeposite);
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
              var userBTCMainBalanceInDb = userDetails.BTCMainbalance;
              if (userBTCAmountToDeposite > userBTCMainBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBTCbalance = (parseFloat(userDetails.BTCbalance) + parseFloat(userBTCAmountToDeposite)).toFixed(8);
              var updatedBTCMainbalance = (parseFloat(userDetails.BTCMainbalance).toFixed(8) - parseFloat(userBTCAmountToDeposite).toFixed(8));

              User.update({
                  id: userDetails.id
                }, {
                  BTCbalance: parseFloat(updatedBTCbalance).toFixed(8),
                  BTCMainbalance: parseFloat(updatedBTCMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBTCAmountToDeposite,
                      currencyName: currencyNameBTC,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      User.findOne({
                          email: userEmailAddress
                        })
                        .exec(function(err, userDetails) {
                          if (err) {
                            console.log("Error to find user");
                          }
                          if (!userDetails) {
                            console.log("Invalid email!");
                          } else {
                            return res.json({
                              user: userDetails,
                              statusCode: 200
                            });
                          }
                        });
                    });
                });
            }
          });
      }
    });

  },
  withdrawInWalletBTC: function(req, res) {
    console.log("Enter into withdrawInWalletBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToWithDraw = parseFloat(req.body.btcamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBTCAmountToWithDraw || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
        var userBTCBalanceInDb = parseFloat(userDetails.BTCbalance).toFixed(8);
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User want send BTC to send ::: " + userBTCAmountToWithDraw);
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
              var userBTCBalanceInDb = userDetails.BTCbalance;
              if (userBTCAmountToWithDraw > userBTCBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBTCMainbalance = (parseFloat(userDetails.BTCMainbalance) + parseFloat(userBTCAmountToWithDraw)).toFixed(8);
              var updatedBTCbalance = (parseFloat(userDetails.BTCbalance).toFixed(8) - parseFloat(userBTCAmountToWithDraw).toFixed(8));
              User.update({
                  id: userDetails.id
                }, {
                  BTCbalance: parseFloat(updatedBTCbalance).toFixed(8),
                  BTCMainbalance: parseFloat(updatedBTCMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBTCAmountToWithDraw,
                      currencyName: currencyNameBTC,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }

                      //Move BTC Company account to User Account on Withdrawal
                      clientBTC.cmd('move',
                        companyBTCAccount,
                        userEmailAddress,
                        userBTCAmountToWithDraw,
                        function(err, moveBTCTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBTC :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BTC Server Refuse to connect App");
                              return res.json({
                                "message": "BTC Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyBTCAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyBTCAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BTC server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BTC server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BTC Server");
                            return res.json({
                              "message": "Error in BTC Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBTCTransaction status " + moveBTCTransaction);
                            if (moveBTCTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletBCH: function(req, res) {
    console.log("Enter into depositeInWalletBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToDeposite = parseFloat(req.body.bchamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBCHAmountToDeposite || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
              var userBCHMainBalanceInDb = userDetails.BCHMainbalance;
              if (userBCHAmountToDeposite > userBCHMainBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBCHbalance = (parseFloat(userDetails.BCHbalance) + parseFloat(userBCHAmountToDeposite)).toFixed(8);
              var updatedBCHMainbalance = (parseFloat(userDetails.BCHMainbalance).toFixed(8) - parseFloat(userBCHAmountToDeposite).toFixed(8));

              User.update({
                  id: userDetails.id
                }, {
                  BCHbalance: parseFloat(updatedBCHbalance).toFixed(8),
                  BCHMainbalance: parseFloat(updatedBCHMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBCHAmountToDeposite,
                      currencyName: currencyNameBCH,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      User.findOne({
                          email: userEmailAddress
                        })
                        .exec(function(err, userDetails) {
                          if (err) {
                            console.log("Error to find user");
                          }
                          if (!userDetails) {
                            console.log("Invalid email!");
                          } else {
                            return res.json({
                              user: userDetails,
                              statusCode: 200
                            });
                          }
                        });
                    });

                  // return res.json({
                  //   "message": "Balance Updated successfully!!!",
                  //   statusCode: 200
                  // });
                });
            }
          });
      }
    });

  },
  withdrawInWalletBCH: function(req, res) {
    console.log("Enter into withdrawInWalletBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToWithDraw = parseFloat(req.body.bchamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBCHAmountToWithDraw || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
              var userBCHBalanceInDb = userDetails.BCHbalance;
              if (userBCHAmountToWithDraw > userBCHBalanceInDb) {
                console.log("User BCH balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BCH balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBCHMainbalance = (parseFloat(userDetails.BCHMainbalance) + parseFloat(userBCHAmountToWithDraw)).toFixed(8);
              var updatedBCHbalance = (parseFloat(userDetails.BCHbalance).toFixed(8) - parseFloat(userBCHAmountToWithDraw).toFixed(8));
              User.update({
                  id: userDetails.id
                }, {
                  BCHbalance: parseFloat(updatedBCHbalance).toFixed(8),
                  BCHMainbalance: parseFloat(updatedBCHMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BCH main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBCHAmountToWithDraw,
                      currencyName: currencyNameBCH,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move BCH Company account to User Account on Withdrawal
                      clientBCH.cmd('move',
                        companyBCHAccount,
                        userEmailAddress,
                        userBCHAmountToWithDraw,
                        function(err, moveBCHTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBCH :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BCH Server Refuse to connect App");
                              return res.json({
                                "message": "BCH Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyBCHAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyBCHAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BCH server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BCH server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BCH Server");
                            return res.json({
                              "message": "Error in BCH Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBCHTransaction status " + moveBCHTransaction);
                            if (moveBCHTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletEBT: function(req, res) {
    console.log("Enter into depositeInWalletEBT");
    var userEmailAddress = req.body.userMailId;
    var userEBTAmountToDeposite = parseFloat(req.body.ebtamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userEBTAmountToDeposite || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
              var userEBTMainBalanceInDb = userDetails.EBTMainbalance;
              if (userEBTAmountToDeposite > userEBTMainBalanceInDb) {
                console.log("User EBT balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient EBT balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedEBTbalance = (parseFloat(userDetails.EBTbalance) + parseFloat(userEBTAmountToDeposite)).toFixed(8);
              var updatedEBTMainbalance = (parseFloat(userDetails.EBTMainbalance).toFixed(8) - parseFloat(userEBTAmountToDeposite).toFixed(8));

              User.update({
                  id: userDetails.id
                }, {
                  EBTbalance: parseFloat(updatedEBTbalance).toFixed(8),
                  EBTMainbalance: parseFloat(updatedEBTMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update EBT main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userEBTAmountToDeposite,
                      currencyName: currencyNameEBT,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      User.findOne({
                          email: userEmailAddress
                        })
                        .exec(function(err, userDetails) {
                          if (err) {
                            console.log("Error to find user");
                          }
                          if (!userDetails) {
                            console.log("Invalid email!");
                          } else {
                            return res.json({
                              user: userDetails,
                              statusCode: 200
                            });
                          }
                        });
                    });
                  // return res.json({
                  //   "message": "Balance Updated successfully!!!",
                  //   statusCode: 200
                  // });
                });
            }
          });
      }
    });

  },
  withdrawInWalletEBT: function(req, res) {
    console.log("Enter into depositeInWalletEBT");
    var userEmailAddress = req.body.userMailId;
    var userEBTAmountToWithDraw = parseFloat(req.body.ebtamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userEBTAmountToWithDraw || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
              var userEBTBalanceInDb = userDetails.EBTbalance;
              if (userEBTAmountToWithDraw > userEBTBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedEBTMainbalance = (parseFloat(userDetails.EBTMainbalance) + parseFloat(userEBTAmountToWithDraw)).toFixed(8);
              var updatedEBTbalance = (parseFloat(userDetails.EBTbalance).toFixed(8) - parseFloat(userEBTAmountToWithDraw).toFixed(8));
              User.update({
                  id: userDetails.id
                }, {
                  EBTbalance: parseFloat(updatedEBTbalance).toFixed(8),
                  EBTMainbalance: parseFloat(updatedEBTMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userEBTAmountToWithDraw,
                      currencyName: currencyNameEBT,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move EBT Company account to User Account on Withdrawal
                      clientEBT.cmd('move',
                        companyEBTAccount,
                        userEmailAddress,
                        userEBTAmountToWithDraw,
                        function(err, moveEBTTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalEBT :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("EBT Server Refuse to connect App");
                              return res.json({
                                "message": "EBT Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyEBTAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyEBTAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in EBT server err.code " + err.code);
                              return res.json({
                                "message": "Problem in EBT server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in EBT Server");
                            return res.json({
                              "message": "Error in EBT Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveEBTTransaction status " + moveEBTTransaction);
                            if (moveEBTTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletGDS: function(req, res) {

    console.log("Enter into depositeInWalletGDS");
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToDeposite = parseFloat(req.body.gdsamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userGDSAmountToDeposite || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
        var userGDSBalanceInDb = parseFloat(userDetails.GDSbalance).toFixed(8);
        console.log("User GDS balance in database ::: " + userGDSBalanceInDb);
        console.log("User want send GDS to send ::: " + userGDSAmountToDeposite);
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
              var userGDSMainBalanceInDb = userDetails.GDSMainbalance;
              if (userGDSAmountToDeposite > userGDSMainBalanceInDb) {
                console.log("User GDS balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient GDS balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedGDSbalance = (parseFloat(userDetails.GDSbalance) + parseFloat(userGDSAmountToDeposite)).toFixed(8);
              var updatedGDSMainbalance = (parseFloat(userDetails.GDSMainbalance).toFixed(8) - parseFloat(userGDSAmountToDeposite).toFixed(8));

              User.update({
                  id: userDetails.id
                }, {
                  GDSbalance: parseFloat(updatedGDSbalance).toFixed(8),
                  GDSMainbalance: parseFloat(updatedGDSMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update GDS main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userGDSAmountToDeposite,
                      currencyName: currencyNameGDS,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      User.findOne({
                          email: userEmailAddress
                        })
                        .exec(function(err, userDetails) {
                          if (err) {
                            console.log("Error to find user");
                          }
                          if (!userDetails) {
                            console.log("Invalid email!");
                          } else {
                            return res.json({
                              user: userDetails,
                              statusCode: 200
                            });
                          }
                        });
                    });

                  // return res.json({
                  //   "message": "Balance Updated successfully!!!",
                  //   statusCode: 200
                  // });
                });
            }
          });
      }
    });

  },
  withdrawInWalletGDS: function(req, res) {
    console.log("Enter into depositeInWalletGDS");
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToWithDraw = parseFloat(req.body.gdsamount).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userGDSAmountToWithDraw || !userSpendingPassword) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
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
              var userGDSBalanceInDb = userDetails.GDSbalance;
              if (userGDSAmountToWithDraw > userGDSBalanceInDb) {
                console.log("User GDS balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient GDS balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedGDSMainbalance = (parseFloat(userDetails.GDSMainbalance) + parseFloat(userGDSAmountToWithDraw)).toFixed(8);
              var updatedGDSbalance = (parseFloat(userDetails.GDSbalance).toFixed(8) - parseFloat(userGDSAmountToWithDraw).toFixed(8));
              User.update({
                  id: userDetails.id
                }, {
                  GDSbalance: parseFloat(updatedGDSbalance).toFixed(8),
                  GDSMainbalance: parseFloat(updatedGDSMainbalance).toFixed(8)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update GDS main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userGDSAmountToWithDraw,
                      currencyName: currencyNameGDS,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move GDS Company account to User Account on Withdrawal
                      clientGDS.cmd('move',
                        companyGDSAccount,
                        userEmailAddress,
                        userGDSAmountToWithDraw,
                        function(err, moveGDSTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalGDS :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("GDS Server Refuse to connect App");
                              return res.json({
                                "message": "GDS Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyGDSAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyGDSAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in GDS server err.code " + err.code);
                              return res.json({
                                "message": "Problem in GDS server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in GDS Server");
                            return res.json({
                              "message": "Error in GDS Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveGDSTransaction status " + moveGDSTransaction);
                            if (moveGDSTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
};
