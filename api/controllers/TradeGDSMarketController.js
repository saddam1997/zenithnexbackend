/**
 * TradeGDSMarketController
 *
 * @description :: Server-side logic for managing tradegdsmarkets
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
  addAskGDSMarket: async function(req, res) {
    console.log("Enter into ask api addAskGDSMarket : : ");
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountGDS = parseFloat(req.body.askAmountGDS);
    var userAskRate = req.body.askRate;
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountGDS || !userAskAmountBTC ||
      !userAskRate || !userAskownerId) {
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
    console.log("Getting user details !!!");
    var userGDSBalanceInDb = parseFloat(userAsker.GDSbalance).toFixed(8);
    var userFreezedGDSBalanceInDb = parseFloat(userAsker.FreezedGDSbalance).toFixed(8);
    var userIdInDb = parseFloat(userAsker.id).toFixed(8);
    if (userAskAmountGDS >= userGDSBalanceInDb) {
      return res.json({
        "message": "You have insufficient GDS Balance",
        statusCode: 401
      });
    }
    try {
      var askDetails = await AskGDS.create({
        askAmountBTC: userAskAmountBTC,
        askAmountGDS: userAskAmountGDS,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountGDS: userAskAmountGDS,
        askRate: parseFloat(userAskRate).toFixed(8),
        status: statusTwo,
        statusName: statusTwoPending,
        askownerGDS: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.GDS_ASK_ADDED, askDetails);
    var updateUserGDSBalance = parseFloat(userGDSBalanceInDb).toFixed(8) - parseFloat(userAskAmountGDS).toFixed(8);
    var updateFreezedGDSBalance = (parseFloat(userFreezedGDSBalanceInDb) + parseFloat(userAskAmountGDS)).toFixed(8);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedGDSbalance: updateFreezedGDSBalance,
        GDSbalance: updateUserGDSBalance,
      });
    } catch (e) {

      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });

    }
    try {
      var allBidsFromdb = await BidGDS.find({
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
        var totoalAskRemainingGDS = userAskAmountGDS;
        var totoalAskRemainingBTC = userAskAmountBTC;
        //this loop for sum of all Bids amount of GDS
        for (var i = 0; i < allBidsFromdb.length; i++) {
          total_bid = total_bid + allBidsFromdb[i].bidAmountGDS;
        }
        if (total_bid <= totoalAskRemainingGDS) {
          for (var i = 0; i < allBidsFromdb.length; i++) {
            currentBidDetails = allBidsFromdb[i];
            console.log(currentBidDetails.id + " totoalAskRemainingGDS :: " + totoalAskRemainingGDS);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5

            console.log("Enter into total_bid <= totoalAskRemainingGDS");
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingGDS = totoalAskRemainingGDS - allBidsFromdb[i].bidAmountGDS;
            totoalAskRemainingGDS = (parseFloat(totoalAskRemainingGDS).toFixed(8) - parseFloat(currentBidDetails.bidAmountGDS).toFixed(8));
            totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
            console.log("start from here totoalAskRemainingGDS == 0::: " + totoalAskRemainingGDS);
            if (totoalAskRemainingGDS == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingGDS == 0");

              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerGDS
                });
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to find bid/ask with bid/ask owner',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerGDS :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS)).toFixed(8);

              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerGDS
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update users freezed and bch balance',
                  statusCode: 401
                });
              }

              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedGDSbalanceAsker = parseFloat(totoalAskRemainingGDS).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGDS
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update users BTCBalance and Freezed GDSBalance',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidGDS.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidGDS.destroy({
              //   id: currentBidDetails.id
              // });

              try {
                var bidDestroy = await BidGDS.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              console.log(currentBidDetails.id + " AskGDS.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskGDS.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskGDS.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull,
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update AskGDS',
                  statusCode: 401
                });
              }
              //emitting event of destruction of bch_ask
              sails.sockets.blast(constants.GDS_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingGDS == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerGDS " + currentBidDetails.bidownerGDS);
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerGDS
              });
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);
              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGDS
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update user',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidGDS.destroy({
              //   id: currentBidDetails.id
              // });

              try {
                var desctroyCurrentBid = await BidGDS.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
            console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
            if (i == allBidsFromdb.length - 1) {
              console.log(currentBidDetails.id + " userAll Details :: ");
              console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerGDS");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedGDSbalanceAsker = parseFloat(totoalAskRemainingGDS).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGDS
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed to update user',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
              console.log(currentBidDetails.id + " Update In last Ask askAmountGDS totoalAskRemainingGDS " + totoalAskRemainingGDS);
              console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
              try {
                var updatedaskDetails = await AskGDS.update({
                  id: askDetails.id
                }, {
                  askAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                  askAmountGDS: parseFloat(totoalAskRemainingGDS).toFixed(8),
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
            console.log(currentBidDetails.id + " totoalAskRemainingGDS :: " + totoalAskRemainingGDS);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingGDS = totoalAskRemainingGDS - allBidsFromdb[i].bidAmountGDS;
            if (totoalAskRemainingGDS >= currentBidDetails.bidAmountGDS) {
              totoalAskRemainingGDS = (parseFloat(totoalAskRemainingGDS).toFixed(8) - parseFloat(currentBidDetails.bidAmountGDS).toFixed(8));
              totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              console.log("start from here totoalAskRemainingGDS == 0::: " + totoalAskRemainingGDS);

              if (totoalAskRemainingGDS == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalAskRemainingGDS == 0");
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: currentBidDetails.bidownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: askDetails.askownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log("userAll askDetails.askownerGDS :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS)).toFixed(8);
                try {
                  var userUpdateBidder = await User.update({
                    id: currentBidDetails.bidownerGDS
                  }, {
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                    GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
                var updatedFreezedGDSbalanceAsker = parseFloat(totoalAskRemainingGDS).toFixed(8);
                console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: askDetails.askownerGDS
                  }, {
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                    FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentBidDetails.id + " BidGDS.destroy currentBidDetails.id::: " + currentBidDetails.id);
                // var bidDestroy = await BidGDS.destroy({
                //   id: currentBidDetails.id
                // });
                try {
                  var bidDestroy = await BidGDS.update({
                    id: currentBidDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                console.log(currentBidDetails.id + " AskGDS.destroy askDetails.id::: " + askDetails.id);
                // var askDestroy = await AskGDS.destroy({
                //   id: askDetails.id
                // });
                try {
                  var askDestroy = await AskGDS.update({
                    id: askDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                return res.json({
                  "message": "Ask Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentBidDetails.id + " enter into else of totoalAskRemainingGDS == 0");
                console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerGDS " + currentBidDetails.bidownerGDS);
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: currentBidDetails.bidownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS)).toFixed(8);
                console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
                console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);

                try {
                  var userAllDetailsInDBBidderUpdate = await User.update({
                    id: currentBidDetails.bidownerGDS
                  }, {
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                    GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  })
                }
                console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
                // var desctroyCurrentBid = await BidGDS.destroy({
                //   id: currentBidDetails.id
                // });
                var desctroyCurrentBid = await BidGDS.update({
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
                  id: askDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update Bid
              var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedBidAmountGDS = (parseFloat(currentBidDetails.bidAmountGDS) - parseFloat(totoalAskRemainingGDS)).toFixed(8);

              try {
                var updatedaskDetails = await BidGDS.update({
                  id: currentBidDetails.id
                }, {
                  bidAmountBTC: parseFloat(updatedBidAmountBTC).toFixed(8),
                  bidAmountGDS: parseFloat(updatedBidAmountGDS).toFixed(8),
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

              //Update Bidder===========================================
              try {
                var userAllDetailsInDBBiddder = await User.findOne({
                  id: currentBidDetails.bidownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.GDSbalance) + parseFloat(totoalAskRemainingGDS)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);
              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGDS
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update asker ===========================================

              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerGDS");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8);
              var updatedFreezedGDSbalanceAsker = parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(userAskAmountGDS).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGDS
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Destroy Ask===========================================
              console.log(currentBidDetails.id + " AskGDS.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskGDS.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskGDS.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //emitting event for bch_ask destruction
              sails.sockets.blast(constants.GDS_ASK_DESTROYED, askDestroy);
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
  addBidGDSMarket: async function(req, res) {
    console.log("Enter into ask api addBidGDSMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountGDS = req.body.bidAmountGDS;
    var userBidRate = req.body.bidRate;
    var userBid1ownerId = req.body.bidownerId;

    if (!userBidAmountGDS || !userBidAmountBTC ||
      !userBidRate || !userBid1ownerId) {
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
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    console.log("Getting user details !! !");
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
      var bidDetails = await BidGDS.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountGDS: userBidAmountGDS,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountGDS: userBidAmountGDS,
        bidRate: parseFloat(userBidRate),
        status: statusTwo,
        statusName: statusTwoPending,
        bidownerGDS: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.GDS_BID_ADDED, bidDetails);

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
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskGDS.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        status: {
          '!': statusOne
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    console.log("Getting all bids details.............");
    if (allAsksFromdb) {
      if (allAsksFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_ask = 0;
        var totoalBidRemainingGDS = userBidAmountGDS;
        var totoalBidRemainingBTC = userBidAmountBTC;
        //this loop for sum of all Bids amount of GDS
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountGDS;
        }
        if (total_ask <= totoalBidRemainingGDS) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingGDS :: " + totoalBidRemainingGDS);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingGDS = totoalBidRemainingGDS - allAsksFromdb[i].bidAmountGDS;
            totoalBidRemainingGDS = (parseFloat(totoalBidRemainingGDS).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
            console.log("start from here totoalBidRemainingGDS == 0::: " + totoalBidRemainingGDS);
            if (totoalBidRemainingGDS == 0) {

              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingGDS == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              try {
                var BidderuserAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll bidDetails.askownerGDS totoalBidRemainingGDS == 0:: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              //current ask details of Asker  updated
              //Ask FreezedGDSbalance balance of asker deducted and BTC to give asker
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BTCbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and GDS  give to bidder
              //var updatedGDSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GDSbalance) + parseFloat(totoalBidRemainingGDS)).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8);
              var updatedGDSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS)).toFixed(8) - parseFloat(totoalBidRemainingGDS).toFixed(8);
              var updatedFreezedBTCbalanceAsker = parseFloat(totoalBidRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGDS == 0updatedGDSbalanceBidder ::: " + updatedGDSbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGDS == 0updatedFreezedBTCbalanceAsker ::: " + updatedFreezedBTCbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingGDS == 0BidGDS.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidGDS.destroy({
              //   id: bidDetails.bidownerGDS
              // });
              try {
                var bidDestroy = await BidGDS.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0AskGDS.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskGDS.destroy({
              //   id: currentAskDetails.askownerGDS
              // });
              try {
                var askDestroy = await AskGDS.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.GDS_ASK_DESTROYED, askDestroy);

              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });

            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0  enter into else of totoalBidRemainingGDS == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0start User.findOne currentAskDetails.askownerGDS " + currentAskDetails.askownerGDS);
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedGDSbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
              var updatedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0updatedFreezedGDSbalanceBidder:: " + updatedFreezedGDSbalanceBidder);
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0updatedBTCbalanceBidder:: " + updatedBTCbalanceBidder);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceBidder).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskGDS.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskGDS.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.GDS_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingGDS == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerGDS");
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBid.GDSbalance) + parseFloat(userBidAmountGDS)).toFixed(8) - parseFloat(totoalBidRemainingGDS).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - updatedGDSbalanceBidder ::: " + updatedGDSbalanceBidder);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountGDS totoalBidRemainingGDS " + totoalBidRemainingGDS);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidGDS.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: parseFloat(totoalBidRemainingBTC).toFixed(8),
                  bidAmountGDS: parseFloat(totoalBidRemainingGDS).toFixed(8),
                  status: statusTwo,
                  statusName: statusTwoPending
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
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingGDS :: " + totoalBidRemainingGDS);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingGDS = totoalBidRemainingGDS - allAsksFromdb[i].bidAmountGDS;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingGDS = (parseFloat(totoalBidRemainingGDS).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
              totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingGDS == 0::: " + totoalBidRemainingGDS);

              if (totoalBidRemainingGDS == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingGDS == 0Enter into totoalBidRemainingGDS == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: bidDetails.bidownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingGDS == 0userAll bidDetails.askownerGDS :: ");
                console.log(" totoalBidRemainingGDS == 0Update value of Bidder and asker");
                var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);

                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingGDS == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingGDS == 0updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
                console.log(" totoalBidRemainingGDS == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------");
                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerGDS
                  }, {
                    FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS)).toFixed(8) - parseFloat(totoalBidRemainingGDS).toFixed(8);
                var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerGDS
                  }, {
                    GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8),
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 BidGDS.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskGDS.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskGDS.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }

                sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);

                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 AskGDS.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidGDS.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidGDS.update({
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
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 enter into else of totoalBidRemainingGDS == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0totoalBidRemainingGDS == 0 start User.findOne currentAskDetails.askownerGDS " + currentAskDetails.askownerGDS);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerGDS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountGDS).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 updatedFreezedGDSbalanceAsker:: " + updatedFreezedGDSbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerGDS
                  }, {
                    FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskGDS.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskGDS.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull,
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //Update Ask
              var updatedAskAmountGDS = (parseFloat(currentAskDetails.askAmountGDS).toFixed(8) - parseFloat(totoalBidRemainingGDS).toFixed(8));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC)).toFixed(8);

              try {
                var updatedaskDetails = await AskGDS.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: parseFloat(updatedAskAmountBTC).toFixed(8),
                  askAmountGDS: parseFloat(updatedAskAmountGDS).toFixed(8),
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

              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGDS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance).toFixed(8) - parseFloat(totoalBidRemainingGDS).toFixed(8));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC)).toFixed(8);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedGDSbalanceAsker:: " + updatedFreezedGDSbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerGDS");
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS)).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedBTCbalanceAsker ::: " + updatedGDSbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedGDSbalanceAsker ::: " + updatedFreezedBTCbalanceBidder);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidGDS.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidGDS.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidGDS.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
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
  removeBidGDSMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdGDS;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    BidGDS.findOne({
      bidownerGDS: bidownerId,
      id: userBidId,
      status: {
        '!': statusOne
      }
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
            BidGDS.destroy({
              id: userBidId
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.GDS_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  removeAskGDSMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdGDS;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    AskGDS.findOne({
      askownerGDS: askownerId,
      id: userAskId,
      status: {
        '!': statusOne
      }
    }).exec(function(err, askDetails) {
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
        var userGDSBalanceInDb = parseFloat(user.GDSbalance).toFixed(8);
        var askAmountOfGDSInAskTableDB = parseFloat(askDetails.askAmountGDS).toFixed(8);
        var userFreezedGDSbalanceInDB = parseFloat(user.FreezedGDSbalance).toFixed(8);
        console.log("userGDSBalanceInDb :" + userGDSBalanceInDb);
        console.log("askAmountOfGDSInAskTableDB :" + askAmountOfGDSInAskTableDB);
        console.log("userFreezedGDSbalanceInDB :" + userFreezedGDSbalanceInDB);
        var updateFreezedGDSBalance = userFreezedGDSbalanceInDB - askAmountOfGDSInAskTableDB;
        var updateUserGDSBalance = (parseFloat(userGDSBalanceInDb) + parseFloat(askAmountOfGDSInAskTableDB)).toFixed(8);
        User.update({
            id: askownerId
          }, {
            GDSbalance: parseFloat(updateUserGDSBalance).toFixed(8),
            FreezedGDSbalance: parseFloat(updateFreezedGDSBalance).toFixed(8)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing ask !!!");
            AskGDS.destroy({
              id: userAskId
            }).exec(function(err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.GDS_ASK_DESTROYED, ask);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidGDS: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    BidGDS.find({
        status: {
          '!': statusOne
        }
      })
      .sort('bidRate DESC')
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
              bidsGDS: allBidDetailsToExecute,
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
  getAllAskGDS: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    AskGDS.find({
        status: {
          '!': statusOne
        }
      })
      .sort('askRate ASC')
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
              asksGDS: allAskDetailsToExecute,
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
