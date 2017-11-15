/**
 * TradeBCHMarketController
 *
 * @description :: Server-side logic for managing tradebchmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var statusZero = sails.config.company.statusZero;
var statusOne = sails.config.company.statusOne;
var statusTwo = sails.config.company.statusTwo;

var statusZeroCreated = sails.config.company.statusZeroCreated;
var statusOneSuccessfull = sails.config.company.statusOneSuccessfull;
var statusTwoPending = sails.config.company.statusTwoPending;

var constants = require('./../../config/constants');


module.exports = {
  addAskBchMarket: async function (req, res) {
    console.log("Enter into ask api addAskBchMarket :: " + JSON.stringify(req.body));
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountBCH = req.body.askAmountBCH;
    var userAskRate = req.body.askRate;
    var userAskownerId = req.body.askownerId;
    var userSpendingPassword = req.body.spendingPassword;
    if (!userAskAmountBCH || !userAskAmountBTC ||
      !userAskRate || !userAskownerId || !userSpendingPassword) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    try {
      var userAsker = await User.findOne({
        id: userAskownerId
      });
    } catch (e) {

      return res.json({
        error: e,
        message: 'Error in fetching user',
        statusCode: 401
      });

    }
    console.log("Valid spending password !!!");
    console.log("Getting user details !!!");
    var userBCHBalanceInDb = parseFloat(userAsker.BCHbalance).toFixed(8);
    var userFreezedBCHBalanceInDb = parseFloat(userAsker.FreezedBCHbalance).toFixed(8);
    var userIdInDb = parseFloat(userAsker.id).toFixed(8);
    try {
      var valid = await User.compareSpendingpassword(userSpendingPassword, userAsker);

    } catch (e) {
      console.log("Error in comparing spending password", e);
      return res.json({
        error: e,
        message: 'Password did not match',
        statusCode: 401
      });
    }
    if (userAskAmountBCH >= userBCHBalanceInDb) {
      return res.json({
        "message": "You have insufficient BCH Balance",
        statusCode: 401
      });
    }
    try {
      var askDetails = await AskBCH.create({
        askAmountBTC: userAskAmountBTC,
        askAmountBCH: userAskAmountBCH,
        askRate: parseFloat(userAskRate).toFixed(8),
        status: statusZero,
        statusName: statusZeroCreated,
        askownerBCH: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.BCH_ASK_ADDED, askDetails);

    var updateUserBCHBalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
    var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userAskAmountBCH)).toFixed(8);

    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedBCHbalance: updateFreezedBCHBalance,
        BCHbalance: updateUserBCHBalance,
      });
    } catch (e) {

      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });

    }
    try {
      var allBidsFromdb = await BidBCH.find({
        bidRate: {
          'like': parseFloat(userAskRate)
        },
        status: {
          '!': statusOne
        }
      });
    } catch (e) {

      return res.json({
        error: e,
        message: 'Failed to find bch bid like user ask rate',
        statusCode: 401
      });

    }
    console.log("allBidsFromdb :: " + JSON.stringify(allBidsFromdb));
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
        if (total_bid <= totoalAskRemainingBCH) {
          for (var i = 0; i < allBidsFromdb.length; i++) {
            currentBidDetails = allBidsFromdb[i];
            console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5

            console.log("Enter into total_bid <= totoalAskRemainingBCH");
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingBCH = totoalAskRemainingBCH - allBidsFromdb[i].bidAmountBCH;
            totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH).toFixed(8) - parseFloat(currentBidDetails.bidAmountBCH).toFixed(8));
            totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
            console.log("start from here totoalAskRemainingBCH == 0::: " + totoalAskRemainingBCH);
            if (totoalAskRemainingBCH == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingBCH == 0");

              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBCH
                });
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to find bid/ask with bid/ask owner',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerBCH :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);

              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerBCH
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update users freezed and bch balance',
                  statusCode: 401
                });
              }

              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBCH
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update users BTCBalance and Freezed BCHBalance',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidBCH.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: currentBidDetails.id
              // });

              var bidDestroy = await BidBCH.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskBCH.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskBCH.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull,
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update AskBCH',
                  statusCode: 401
                });
              }
//emitting event of destruction of bch_ask
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBCH " + currentBidDetails.bidownerBCH);
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerBCH
              });
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);
              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBCH
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update user',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidBCH.destroy({
              //   id: currentBidDetails.id
              // });

              var desctroyCurrentBid = await BidBCH.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
            console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
            if (i == allBidsFromdb.length - 1) {
              console.log(currentBidDetails.id + " userAll Details :: ");
              console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBCH");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBCH
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update user',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
              console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
              try {
                var updatedaskDetails = await AskBCH.update({
                  id: askDetails.id
                }, {
                  askAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                  askAmountBCH: parseFloat(totoalAskRemainingBCH).toFixed(8),
                  status: statusTwo,
                  statusName: statusTwoPending,
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
            }
          }
        } else {
          for (var i = 0; i < allBidsFromdb.length; i++) {
            currentBidDetails = allBidsFromdb[i];
            console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingBCH = totoalAskRemainingBCH - allBidsFromdb[i].bidAmountBCH;
            if (totoalAskRemainingBCH >= currentBidDetails.bidAmountBCH) {
              totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH).toFixed(8) - parseFloat(currentBidDetails.bidAmountBCH).toFixed(8));
              totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              console.log("start from here totoalAskRemainingBCH == 0::: " + totoalAskRemainingBCH);

              if (totoalAskRemainingBCH == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalAskRemainingBCH == 0");
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBCH
                });
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: askDetails.askownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log("userAll askDetails.askownerBCH :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
                try {
                  var userUpdateBidder = await User.update({
                    id: currentBidDetails.bidownerBCH
                  }, {
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                    BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
                var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
                console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: askDetails.askownerBCH
                  }, {
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                    FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentBidDetails.id + " BidBCH.destroy currentBidDetails.id::: " + currentBidDetails.id);
                // var bidDestroy = await BidBCH.destroy({
                //   id: currentBidDetails.id
                // });
                var bidDestroy = await BidBCH.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);
                // var askDestroy = await AskBCH.destroy({
                //   id: askDetails.id
                // });
                var askDestroy = await AskBCH.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                return res.json({
                  "message": "Ask Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
                console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBCH " + currentBidDetails.bidownerBCH);
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: currentBidDetails.bidownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
                console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
                console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);

                try {
                  var userAllDetailsInDBBidderUpdate = await User.update({
                    id: currentBidDetails.bidownerBCH
                  }, {
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                    BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  })
                }
                console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
                // var desctroyCurrentBid = await BidBCH.destroy({
                //   id: currentBidDetails.id
                // });
                var desctroyCurrentBid = await BidBCH.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break

              console.log(currentBidDetails.id + " userAll Details :: ");
              console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update Bid
              var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH)).toFixed(8);

              try {
                var updatedaskDetails = await BidBCH.update({
                  id: currentBidDetails.id
                }, {
                  bidAmountBTC: parseFloat(updatedBidAmountBTC).toFixed(8),
                  bidAmountBCH: parseFloat(updatedBidAmountBCH).toFixed(8),
                  status: statusTwo,
                  statusName: statusTwoPending,
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update Bidder===========================================
              try {
                var userAllDetailsInDBBiddder = await User.findOne({
                  id: currentBidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.BCHbalance) + parseFloat(totoalAskRemainingBCH)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);
              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBCH
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update asker ===========================================

              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBCH");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBCH
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Destroy Ask===========================================
              console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskBCH.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskBCH.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
//emitting event for bch_ask destruction
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            }
          }

        }

      }
      console.log("Total Bid ::: " + total_bid);
      return res.json({
        "message": "Your ask placed successfully!!",
        statusCode: 200
      });

    } else {
      //No bid match on this rate Ask and Ask placed successfully
      return res.json({
        "message": "Your ask placed successfully!!",
        statusCode: 200
      });
    }
  },
  addBidBchMarket: async function(req, res) {
    console.log("Enter into ask api addBidBchMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountBCH = req.body.bidAmountBCH;
    var userBidRate = req.body.bidRate;
    var userBid1ownerId = req.body.bidownerId;
    var userSpendingPassword = req.body.spendingPassword;
    if (!userBidAmountBCH || !userBidAmountBTC ||
      !userBidRate || !userBid1ownerId || !userSpendingPassword) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    try {
      var userBidder = await User.findOne({
        id: userBid1ownerId
      });
    } catch (e) {
      return res.json({
        error:e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var valid = await User.compareSpendingpassword(userSpendingPassword, userBidder);

    } catch (e) {
      console.log("Eeeeeeeeeeee", e);
      return res.json({
        "message": 'Enter valid spending password',
        statusCode: 401
      });
    }
    console.log("Valid spending password !!!");
    console.log("Getting user details !!!");
    var userBTCBalanceInDb = parseFloat(userBidder.BTCbalance).toFixed(8);
    var userFreezedBTCBalanceInDb = parseFloat(userBidder.FreezedBTCbalance).toFixed(8);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    if (userBidAmountBTC >= userBTCBalanceInDb) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    try {
      var bidDetails = await BidBCH.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountBCH: userBidAmountBCH,
        bidRate: parseFloat(userBidRate),
        status: statusZero,
        statusName: statusZeroCreated,
        bidownerBCH: userIdInDb
      });
    } catch (e) {
      return res.json({
        error:e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

//emitting event for bid creation
    sails.sockets.blast(constants.BCH_BID_ADDED, bidDetails);

    console.log("Bid created .........");
    var updateUserBTCBalance = parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
    var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC)).toFixed(8);
    console.log("Updating user's bid details ");
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBTCbalance: updateFreezedBTCBalance,
        BTCbalance: updateUserBTCBalance,
      });
    } catch (e) {
      return res.json({
        error:e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskBCH.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        status: {
          '!': statusOne
        }
      });
    } catch (e) {
      return res.json({
        error:e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    console.log("Getting all bids details.............");
    if (allAsksFromdb) {
      if (allAsksFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_ask = 0;
        var totoalBidRemainingBCH = userBidAmountBCH;
        var totoalBidRemainingBTC = userBidAmountBTC;
        //this loop for sum of all Bids amount of BCH
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].bidAmountBCH;
        }
        if (total_ask <= totoalBidRemainingBCH) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingBCH = totoalBidRemainingBCH - allAsksFromdb[i].bidAmountBCH;
            totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
            console.log("start from here totoalBidRemainingBCH == 0::: " + totoalBidRemainingBCH);
            if (totoalBidRemainingBCH == 0) {

              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingBCH == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              try {
                var BidderuserAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll bidDetails.askownerBCH :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              //current ask details of Asker  updated
              //Ask FreezedBCHbalance balance of asker deducted and BTC to give asker
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BTCbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and BCH  give to bidder
              var updatedBCHbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BCHbalance) + parseFloat(totoalBidRemainingBCH)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBTCbalanceAsker = parseFloat(totoalAskRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " BidBCH.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: bidDetails.bidownerBCH
              // });
              var bidDestroy = await BidBCH.update({
                id: bidDetails.bidownerBCH
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              console.log(currentAskDetails.id + " AskBCH.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskBCH.destroy({
              //   id: currentAskDetails.askownerBCH
              // });
              try {
                var askDestroy = await AskBCH.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);

              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });

            } else {
              //destroy bid
              console.log(currentAskDetails.id + " enter into else of totoalBidRemainingBCH == 0");
              console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidownerBCH " + currentAskDetails.bidownerBCH);
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              var updatedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentAskDetails.id + " updatedBTCbalanceBidder:: " + updatedBTCbalanceBidder);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceBidder).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskBCH.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskBCH.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.BCH_ASK_DESTROYED,  destroyCurrentAsk);

              console.log(currentAskDetails.id + " Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " userAll Details :: ");
              console.log(currentAskDetails.id + " enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBCH");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log(currentAskDetails.id + " Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log(currentAskDetails.id + " bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidBCH.update({
                  id: bidDetails.bidownerBCH
                }, {
                  bidAmountBTC: parseFloat(totoalBidRemainingBTC).toFixed(8),
                  bidAmountBCH: parseFloat(totoalBidRemainingBCH).toFixed(8),
                  status: statusTwo,
                  statusName: statusTwoPending
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }


            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingBCH = totoalBidRemainingBCH - allAsksFromdb[i].bidAmountBCH;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
              console.log("start from here totoalBidRemainingBCH == 0::: " + totoalBidRemainingBCH);

              if (totoalBidRemainingBCH == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalBidRemainingBCH == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: bidDetails.bidownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log("userAll bidDetails.askownerBCH :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerBCH
                  }, {
                    FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8);
                var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerBCH
                  }, {
                    BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " BidBCH.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskBCH.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskBCH.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }

                sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);

                console.log(currentAskDetails.id + " AskBCH.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidBCH.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidBCH.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });

                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " enter into else of totoalBidRemainingBCH == 0");
                console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidownerBCH " + currentAskDetails.bidownerBCH);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerBCH
                  }, {
                    FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error:e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskBCH.destroy({
                //   id: currentAskDetails.id
                // });
                var destroyCurrentAsk = await AskBCH.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull,
                });
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " userAll Details :: ");
              console.log(currentAskDetails.id + " enter into i == allBidsFromdb.length - 1");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update Ask
              var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC)).toFixed(8);

              try {
                var updatedaskDetails = await AskBCH.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: parseFloat(updatedAskAmountBTC).toFixed(8),
                  askAmountBCH: parseFloat(updatedAskAmountBCH).toFixed(8),
                  status: statusTwo,
                  statusName: statusTwoPending,
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBCH");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBCHbalanceBidder);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBTCbalanceBidder);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error:e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " BidBCH.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: bidDetails.id
              // });
              var bidDestroy = await BidBCH.update({
                id: bidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });

              console.log(currentAskDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            }
          }
        }
      }
      console.log("Total Bid ::: " + total_ask);
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    } else {
      //No bid match on this rate Ask and Ask placed successfully
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    }
  },
  removeBidBCHMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdBCH;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    BidBCH.findOne({
      bidownerBCH: bidownerId,
      id: userBidId
    }).exec(function(err, bidDetails) {
      if (err) {
        return res.json({
          "message": "Error to find bid",
          statusCode: 400
        });
      }
      if (!bidDetails) {
        return res.json({
          "message": "No Bid found for this user",
          statusCode: 400
        });
      }
      console.log("Valid bid details !!!" + JSON.stringify(bidDetails));
      User.findOne({
        id: bidownerId
      }).exec(function(err, user) {
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
        var userBTCBalanceInDb = parseFloat(user.BTCbalance).toFixed(8);
        var bidAmountOfBTCInBidTableDB = parseFloat(bidDetails.bidAmountBTC).toFixed(8);
        var userFreezedBTCbalanceInDB = parseFloat(user.FreezedBTCbalance).toFixed(8);
        var updateFreezedBalance = userFreezedBTCbalanceInDB - bidAmountOfBTCInBidTableDB;
        var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) + parseFloat(bidAmountOfBTCInBidTableDB)).toFixed(8);
        console.log("userBTCBalanceInDb :" + userBTCBalanceInDb);
        console.log("bidAmountOfBTCInBidTableDB :" + bidAmountOfBTCInBidTableDB);
        console.log("userFreezedBTCbalanceInDB :" + userFreezedBTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBTCBalance :" + updateUserBTCBalance);

        User.update({
            id: bidownerId
          }, {
            BTCbalance: parseFloat(updateUserBTCBalance).toFixed(8),
            FreezedBTCbalance: parseFloat(updateFreezedBalance).toFixed(8)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing bid !!!");
            BidBCH.destroy({
              id: userBidId
            }).exec(function(err) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.BCH_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
              // User.findOne({
              //     id: bidownerId
              //   })
              //   .populateAll()
              //   .exec(function(err, userDetailsReturn) {
              //     if (err) {
              //       return res.json({
              //         "message": "Error to find user",
              //         statusCode: 401
              //       });
              //     }
              //     if (!userDetailsReturn) {
              //       return res.json({
              //         "message": "Invalid Id!",
              //         statusCode: 401
              //       });
              //     }
              //     return res.json(200, {
              //       user: userDetailsReturn,
              //       statusCode: 200
              //     });
              //   });
            });
          });
      });
    });
  },
  removeAskBCHMarket: function (req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdBCH;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    AskBCH.findOne({
      askownerBCH: askownerId,
      id: userAskId
    }).exec(function (err, askDetails) {
      if (err) {
        return res.json({
          "message": "Error to find ask",
          statusCode: 400
        });
      }
      if (!askDetails) {
        return res.json({
          "message": "No ask found for this user",
          statusCode: 400
        });
      }
      console.log("Valid ask details !!!" + JSON.stringify(askDetails));
      User.findOne({
        id: askownerId
      }).exec(function (err, user) {
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
        var userBCHBalanceInDb = parseFloat(user.BCHbalance).toFixed(8);
        var askAmountOfBCHInAskTableDB = parseFloat(askDetails.askAmountBCH).toFixed(8);
        var userFreezedBCHbalanceInDB = parseFloat(user.FreezedBCHbalance).toFixed(8);
        console.log("userBCHBalanceInDb :" + userBCHBalanceInDb);
        console.log("askAmountOfBCHInAskTableDB :" + askAmountOfBCHInAskTableDB);
        console.log("userFreezedBCHbalanceInDB :" + userFreezedBCHbalanceInDB);
        var updateFreezedBCHBalance = userFreezedBCHbalanceInDB - askAmountOfBCHInAskTableDB;
        var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) + parseFloat(askAmountOfBCHInAskTableDB)).toFixed(8);
        User.update({
          id: askownerId
        }, {
          BCHbalance: parseFloat(updateUserBCHBalance).toFixed(8),
          FreezedBCHbalance: parseFloat(updateFreezedBCHBalance).toFixed(8)
        })
          .exec(function (err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing ask !!!");
            AskBCH.destroy({
              id: userAskId
            }).exec(function (err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.BCH_ASK_DESTROYED, ask);

              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
              // User.findOne({
              //     id: askownerId
              //   })
              //   .populateAll()
              //   .exec(function(err, userDetailsReturn) {
              //     if (err) {
              //       return res.json({
              //         "message": "Error to find user",
              //         statusCode: 401
              //       });
              //     }
              //     if (!userDetailsReturn) {
              //       return res.json({
              //         "message": "Invalid Id!",
              //         statusCode: 401
              //       });
              //     }
              //     return res.json({
              //       user: userDetailsReturn,
              //       statusCode: 200
              //     });
              //   });
            });
          });
      });
    });
  },
  getAllBidBCH: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    BidBCH.find()
      .exec(function(err, allBidDetailsToExecute) {
        if (err) {
          console.log("Error to find ask");
        }
        if (!allBidDetailsToExecute) {
          return res.json({
            "message": "No Bid Found!!",
            statusCode: 401
          });
        }
        if (allBidDetailsToExecute) {
          if (allBidDetailsToExecute.length >= 1) {
            return res.json({
              bidsBCH: allBidDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No Bid Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskBCH: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    AskBCH.find()
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          console.log("Error to find ask");
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Bid Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            return res.json({
              asksBCH: allAskDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No Ask Found!!",
              statusCode: 401
            });
          }
        }
      });
  }
};
