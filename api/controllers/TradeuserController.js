/**
 * TradeuserController
 *
 * @description :: Server-side logic for managing tradeusers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  addAskBchMarket: function(req, res) {
    console.log("Enter into ask api addAsk :: " + JSON.stringify(req.body));
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountBCH = req.body.askAmountBCH;
    var userAskRate = req.body.askRate;
    var userAskownerId = req.body.askownerId;
    var userSpendingPassword = req.body.spendingPassword;

    if (!userAskAmountBCH || !userAskAmountBTC || !userSpendingPassword ||
      !userAskRate || !userAskownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountBCH < 0.008) {
      return res.json({
        "message": "Minimum ask amount is not less then 0.008",
        statusCode: 401
      });
    }
    User.findOne({
      id: userAskownerId
    }).exec(function(errToFindUser, userAsker) {
      if (errToFindUser) {
        return res.json({
          "message": "Error to find userAsker",
          statusCode: 401
        });
      }
      if (!userAsker) {
        return res.json({
          "message": "Invalid UserId!!",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userAsker,
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
            console.log("Getting user details !!!");
            var userBCHBalanceInDb = parseFloat(userAsker.BCHbalance).toFixed(8);
            var userFreezedBCHBalanceInDb = parseFloat(userAsker.FreezedBCHbalance).toFixed(8);
            var userIdInDb = parseFloat(userAsker.id).toFixed(8);
            if (userAskAmountBCH >= userBCHBalanceInDb) {
              return res.json({
                "message": "You have insufficient BCH Balance",
                statusCode: 401
              });
            }
            Ask.create({
                askAmountBTC: userAskAmountBTC,
                askAmountBCH: userAskAmountBCH,
                askRate: parseFloat(userAskRate).toFixed(8),
                askowner: userIdInDb
              })
              .exec(function(err, askDetails) {
                if (err) {
                  console.log("Error to Create Ask !!!");
                  return res.json({
                    "message": "Error to create Ask",
                    statusCode: 400
                  });
                }
                var updateUserBCHBalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
                var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userAskAmountBCH)).toFixed(8);
                User.update({
                    id: userIdInDb
                  }, {
                    FreezedBCHbalance: updateFreezedBCHBalance,
                    BCHbalance: updateUserBCHBalance,
                  })
                  .exec(function(err, updated) {
                    if (err) {
                      console.log("Error to update Userask details !!!");
                      return res.json({
                        "message": "Error to update Userask details !!!",
                        statusCode: 400
                      });
                    }
                    Bid.find({
                        bidRate: {
                          'like': parseFloat(userAskRate)
                        }
                      })
                      //.sort('id DESC')
                      .exec(function(err, allBidsFromdb) {
                        if (err) {
                          console.log("Error to find ask");
                        }
                        if (!allBidsFromdb) {
                          //No bid match on this rate Ask and Ask placed successfully
                          return res.json({
                            "message": "Your ask placed successfully!",
                            statusCode: 200
                          });
                        }
                        if (allBidsFromdb) {
                          if (allBidsFromdb.length >= 1) {
                            //Find exact bid if available in db
                            var total_bid = 0;
                            var totoalAskRemainingBCH = userAskAmountBCH;
                            var totoalAskRemainingBTC = userAskAmountBTC;
                            //this loop for sum of all Bids amount of BCH
                            for (var i = 0; i < allBidsFromdb.length; i++) {
                              total_bid = total_bid + allBidsFromdb[i].bidAmountBCH;
                            }
                            //this loop for Settlement of bids and asks
                            for (var i = 0; i < allBidsFromdb.length; i++) {
                              console.log("Enter into loop i :: " + i);
                              console.log(i + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
                              console.log(i + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
                              if (total_bid <= totoalAskRemainingBCH) {
                                console.log("Enter into total_bid <= totoalAskRemainingBCH");
                                var currentBidDetails = allBidsFromdb[i];
                                console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
                                //totoalAskRemainingBCH = totoalAskRemainingBCH - allBidsFromdb[i].bidAmountBCH;
                                totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH).toFixed(8) - parseFloat(currentBidDetails.bidAmountBCH).toFixed(8));
                                totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));

                                if (totoalAskRemainingBCH == 0) {
                                  //destroy bid and ask and update bidder and asker balances and break
                                  console.log("Enter into totoalAskRemainingBCH == 0");
                                  User.findOne({
                                      id: currentBidDetails.bidowner
                                    })
                                    .exec(function(err, userAllDetailsInDBBidder) {
                                      if (err) {
                                        console.log("Error to find user");
                                      }
                                      if (!userAllDetailsInDBBidder) {
                                        console.log("Invalid email!");
                                      } else {
                                        console.log("userAll currentBidDetails.bidowner :: ");
                                        User.findOne({
                                            id: askDetails.askowner
                                          })
                                          .exec(function(err, userAllDetailsInDBAsker) {
                                            if (err) {
                                              console.log("Error to find user");
                                            }
                                            if (!userAllDetailsInDBBidder) {
                                              console.log("Invalid email!");
                                            } else {
                                              console.log("userAll askDetails.askowner :: ");
                                              console.log("Update value of Bidder and asker");
                                              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                                              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
                                              User.update({
                                                  id: currentBidDetails.bidowner
                                                }, {
                                                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                                                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                                                })
                                                .exec(function(err, updatedUserBidder) {
                                                  if (err) {
                                                    console.log("Error to update User after move bid!!!!!!!!!");
                                                  }
                                                  console.log("Enter into User.update currentBidDetails.bidowner");
                                                  var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(askDetails.askAmountBTC)).toFixed(8);
                                                  var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(askDetails.askAmountBCH).toFixed(8));
                                                  User.update({
                                                      id: askDetails.askowner
                                                    }, {
                                                      BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                                                      FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                                                    })
                                                    .exec(function(err, updatedUserAsker) {
                                                      if (err) {
                                                        console.log("Error to update User after move bid!!!!!!!!!");
                                                      }
                                                      console.log("Enter into User.update askDetails.askowner");
                                                      console.log(i + " User details updatedUserAsker :: " + JSON.stringify(updatedUserAsker[0]));
                                                      console.log(i + " User details updatedUserBidder  " + JSON.stringify(updatedUserBidder[0].BCHbalance));
                                                      Bid.destroy({
                                                        id: currentBidDetails.id
                                                      }).exec(function(err) {
                                                        if (err) {
                                                          return res.json({
                                                            "message": "Error to remove ask",
                                                            statusCode: 400
                                                          });
                                                        }
                                                        console.log("Returning Bid.destroy !!!");
                                                        Ask.destroy({
                                                          id: askDetails.id
                                                        }).exec(function(err) {
                                                          if (err) {
                                                            return res.json({
                                                              "message": "Error to remove ask",
                                                              statusCode: 400
                                                            });
                                                          }
                                                          console.log("Ask.destroy...............");
                                                          return res.json({
                                                            "message": "Ask Executed successfully",
                                                            statusCode: 200
                                                          });
                                                        });
                                                      });
                                                    });
                                                });
                                            }
                                          })
                                      }
                                    })
                                } else {
                                  //destroy bid
                                  console.log("enter into else of totoalAskRemainingBCH == 0");
                                  console.log("start User.findOne currentBidDetails.bidowner " + currentBidDetails.bidowner);
                                  User.findOne({
                                      id: currentBidDetails.bidowner
                                    })
                                    .exec(function(err, userAllDetailsInDBBidder) {
                                      if (err) {
                                        console.log("Error to find user");
                                      }
                                      if (!userAllDetailsInDBBidder) {
                                        console.log("Invalid email!");
                                      } else {
                                        console.log("enter into else of User.findOne currentBidDetails.bidowner ");
                                        var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                                        var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);

                                        User.update({
                                            id: currentBidDetails.bidowner
                                          }, {
                                            FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                                            BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                                          })
                                          .exec(function(err, updatedUser) {
                                            if (err) {
                                              console.log("Error to update User after move bid!!!!!!!!!");
                                            }
                                            console.log("enter into else of   User.update  currentBidDetails.bidowner");
                                            Bid.destroy({
                                              id: currentBidDetails.id
                                            }).exec(function(err) {
                                              if (err) {
                                                return res.json({
                                                  "message": "Error to remove ask",
                                                  statusCode: 400
                                                });
                                              }
                                              console.log("Bid destroy successfully !!!! " + currentBidDetails.id);

                                            });
                                          });
                                      }
                                    });
                                }
                                if (i == allBidsFromdb.length - 1) {
                                  console.log("userAll Details :: ");
                                  console.log("enter into i == allBidsFromdb.length - 1");
                                  User.findOne({
                                      id: askDetails.askowner
                                    })
                                    .exec(function(err, userAllDetailsInDBAsker) {
                                      if (err) {
                                        console.log("Error to find user");
                                      }
                                      if (!userAllDetailsInDBAsker) {
                                        console.log("Invalid email!");
                                      } else {
                                        console.log("enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
                                        var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
                                        var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
                                        User.update({
                                            id: askDetails.askowner
                                          }, {
                                            BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                                            FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                                          })
                                          .exec(function(err, updatedUser) {
                                            if (err) {
                                              console.log("Error to update User after move bid!!!!!!!!!");
                                            }
                                            console.log("User details i == allBidsFromdb.length - 1 updatedUser[0].BTCbalance :: " + updatedUser[0].BTCbalance);
                                            console.log("User details i == allBidsFromdb.length - 1 updatedUser[0].FreezedBCHbalance  " + updatedUser[0].FreezedBCHbalance);
                                            Ask.update({
                                              id: askDetails.id
                                            }, {
                                              askAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                                              askAmountBCH: parseFloat(totoalAskRemainingBCH).toFixed(8)
                                            }).exec(function(err) {
                                              if (err) {
                                                return res.json({
                                                  "message": "Error to remove ask",
                                                  statusCode: 400
                                                });
                                              }
                                              console.log("User details i == allBidsFromdb.length - 1 Ask updated successfully :: ");
                                            });
                                          });
                                      }
                                    })
                                }
                              }
                            }
                            console.log("Total Bid ::: " + total_bid);
                            return res.json({
                              "total_bid": total_bid,
                              "bids": allBidsFromdb,
                              statusCode: 200
                            });

                          } else {
                            //No bid match on this rate Ask and Ask placed successfully
                            return res.json({
                              "message": "Your ask placed successfully!!",
                              statusCode: 200
                            });
                          }
                        }
                      });

                  });
              });
          }
        });

    });

  }
};
