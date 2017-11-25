/**
 * TradeEBTMarketController
 *
 * @description :: Server-side logic for managing tradeebtmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var statusZero = sails.config.company.statusZero;
var statusOne = sails.config.company.statusOne;
var statusTwo = sails.config.company.statusTwo;

var statusZeroCreated = sails.config.company.statusZeroCreated;
var statusOneSuccessfull = sails.config.company.statusOneSuccessfull;
var statusTwoPending = sails.config.company.statusTwoPending;
var constants = require('./../../config/constants');

const txFeeEBTWithdrawSuccess = sails.config.common.txFeeEBTWithdrawSuccess;
const txFeeBTCWithdrawSuccess = sails.config.common.txFeeBTCWithdrawSuccess;

module.exports = {
  addAskEBTMarket: async function(req, res) {
    console.log("Enter into ask api addAskEBTMarket : : ");
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC);
    var userAskAmountEBT = parseFloat(req.body.askAmountEBT);
    var userAskRate = parseFloat(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountEBT || !userAskAmountBTC ||
      !userAskRate || !userAskownerId) {
      console.log("Invalid Parameter!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountEBT < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
      console.log("Negative Paramter");
      return res.json({
        "message": "Negative Paramter!!!!",
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
    console.log("User details find successfully :::: " + userAsker.email);
    var userEBTBalanceInDb = parseFloat(userAsker.EBTbalance);
    var userFreezedEBTBalanceInDb = parseFloat(userAsker.FreezedEBTbalance);
    var userIdInDb = parseFloat(userAsker.id);
    if (userAskAmountEBT >= userEBTBalanceInDb) {
      return res.json({
        "message": "You have insufficient EBT Balance",
        statusCode: 401
      });
    }
    try {
      var askDetails = await AskEBT.create({
        askAmountBTC: userAskAmountBTC,
        askAmountEBT: userAskAmountEBT,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountEBT: userAskAmountEBT,
        askRate: parseFloat(userAskRate),
        status: statusTwo,
        statusName: statusTwoPending,
        askownerEBT: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.EBT_ASK_ADDED, askDetails);
    var updateUserEBTBalance = (parseFloat(userEBTBalanceInDb) - parseFloat(userAskAmountEBT));
    var updateFreezedEBTBalance = (parseFloat(userFreezedEBTBalanceInDb) + parseFloat(userAskAmountEBT));
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedEBTbalance: updateFreezedEBTBalance,
        EBTbalance: updateUserEBTBalance,
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidEBT.find({
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
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingEBT = userAskAmountEBT;
      var totoalAskRemainingBTC = userAskAmountBTC;
      //this loop for sum of all Bids amount of EBT
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountEBT;
      }
      if (total_bid <= totoalAskRemainingEBT) {
        console.log("Inside of total_bid <= totoalAskRemainingEBT");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingEBT");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingEBT :: " + totoalAskRemainingEBT);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT) - parseFloat(currentBidDetails.bidAmountEBT));
          totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          console.log(currentBidDetails.id + " After totoalAskRemainingEBT :: " + totoalAskRemainingEBT);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingEBT == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingEBT == 0");

            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerEBT
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEBT
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));
            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                EBTbalance: parseFloat(updatedEBTbalanceBidder)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and bch balance',
                statusCode: 401
              });
            }

            var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT);

            //Deduct Transation Fee Asker
            var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed EBTBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidEBT:: ");
            try {
              var bidDestroy = await BidEBT.update({
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
            sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskEBT.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskEBT',
                statusCode: 401
              });
            }
            //emitting event of destruction of bch_ask
            sails.sockets.blast(constants.EBT_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEBT == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerEBT " + currentBidDetails.bidownerEBT);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerEBT
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                EBTbalance: parseFloat(updatedEBTbalanceBidder)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);

            try {
              var desctroyCurrentBid = await BidEBT.update({
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
            sails.sockets.blast(constants.EBT_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEBT
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEBT");
            var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalAskRemainingEBT));
            var updatedFreezedEBTbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT)) + parseFloat(totoalAskRemainingEBT));
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
            console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));

            var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskEBT.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountEBT: parseFloat(totoalAskRemainingEBT),
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
            sails.sockets.blast(constants.EBT_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingEBT :: " + totoalAskRemainingEBT);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingEBT = totoalAskRemainingEBT - allBidsFromdb[i].bidAmountEBT;
          if (totoalAskRemainingEBT >= currentBidDetails.bidAmountEBT) {
            totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT) - parseFloat(currentBidDetails.bidAmountEBT));
            totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            console.log("start from here totoalAskRemainingEBT == 0::: " + totoalAskRemainingEBT);

            if (totoalAskRemainingEBT == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingEBT == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerEBT
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
                  id: askDetails.askownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerEBT :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerEBT
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                  EBTbalance: parseFloat(updatedEBTbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              //var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT);
              //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalAskRemainingEBT));
              var updatedFreezedEBTbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT)) + parseFloat(totoalAskRemainingEBT));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
              console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerEBT
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker),
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidEBT.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidEBT.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidEBT.update({
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
              sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskEBT.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskEBT.update({
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
              sails.sockets.blast(constants.EBT_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEBT == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerEBT " + currentBidDetails.bidownerEBT);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerEBT
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                  EBTbalance: parseFloat(updatedEBTbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidEBT.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidEBT.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.EBT_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEBT
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update Bid
            var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountEBT = (parseFloat(currentBidDetails.bidAmountEBT) - parseFloat(totoalAskRemainingEBT));

            try {
              var updatedaskDetails = await BidEBT.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: parseFloat(updatedBidAmountBTC),
                bidAmountEBT: parseFloat(updatedBidAmountEBT),
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
            //Update socket.io
            sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerEBT
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.EBTbalance) + parseFloat(totoalAskRemainingEBT));

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            var bchAmountSucess = parseFloat(totoalAskRemainingEBT);
            var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
            updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                EBTbalance: parseFloat(updatedEBTbalanceBidder)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEBT");
            var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT));

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskEBT.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskEBT.update({
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
            sails.sockets.blast(constants.EBT_ASK_DESTROYED, askDestroy);
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
  },
  addBidEBTMarket: async function(req, res) {
    console.log("Enter into ask api addBidEBTMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountEBT = req.body.bidAmountEBT;
    var userBidRate = req.body.bidRate;
    var userBid1ownerId = req.body.bidownerId;

    if (!userBidAmountEBT || !userBidAmountBTC ||
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
    var userBTCBalanceInDb = parseFloat(userBidder.BTCbalance);
    var userFreezedBTCBalanceInDb = parseFloat(userBidder.FreezedBTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    if (userBidAmountBTC >= userBTCBalanceInDb) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    try {
      var bidDetails = await BidEBT.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountEBT: userBidAmountEBT,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountEBT: userBidAmountEBT,
        bidRate: parseFloat(userBidRate),
        status: statusTwo,
        statusName: statusTwoPending,
        bidownerEBT: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.EBT_BID_ADDED, bidDetails);

    console.log("Bid created .........");
    var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBidAmountBTC));
    var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC));
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
      var allAsksFromdb = await AskEBT.find({
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
        var totoalBidRemainingEBT = userBidAmountEBT;
        var totoalBidRemainingBTC = userBidAmountBTC;
        //this loop for sum of all Bids amount of EBT
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountEBT;
        }
        if (total_ask <= totoalBidRemainingEBT) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEBT :: " + totoalBidRemainingEBT);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingEBT = totoalBidRemainingEBT - allAsksFromdb[i].bidAmountEBT;
            totoalBidRemainingEBT = (parseFloat(totoalBidRemainingEBT) - parseFloat(currentAskDetails.askAmountEBT));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            console.log("start from here totoalBidRemainingEBT == 0::: " + totoalBidRemainingEBT);
            if (totoalBidRemainingEBT == 0) {

              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingEBT == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerEBT totoalBidRemainingEBT == 0:: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedEBTbalance balance of asker deducted and BTC to give asker
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker)
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
                  id: bidDetails.bidownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and EBT  give to bidder
              //var updatedEBTbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.EBTbalance) + parseFloat(totoalBidRemainingEBT)) - parseFloat(totoalBidRemainingBTC);
              var updatedEBTbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainEBT updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
              var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingEBT == 0updatedEBTbalanceBidder ::: " + updatedEBTbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingEBT == updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: parseFloat(updatedEBTbalanceBidder),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingEBT == 0BidEBT.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidEBT.destroy({
              //   id: bidDetails.bidownerEBT
              // });
              try {
                var bidDestroy = await BidEBT.update({
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
              sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0AskEBT.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskEBT.destroy({
              //   id: currentAskDetails.askownerEBT
              // });
              try {
                var askDestroy = await AskEBT.update({
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
              sails.sockets.blast(constants.EBT_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0  enter into else of totoalBidRemainingEBT == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0start User.findOne currentAskDetails.bidownerEBT " + currentAskDetails.bidownerEBT);
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0updatedBTCbalanceBidder:: ");

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskEBT.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskEBT.update({
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

              sails.sockets.blast(constants.EBT_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingEBT == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerEBT");
              var updatedEBTbalanceBidder = ((parseFloat(userAllDetailsInDBBid.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainEBT updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
              var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: parseFloat(updatedEBTbalanceBidder),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountEBT totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidEBT.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: parseFloat(totoalBidRemainingBTC),
                  bidAmountEBT: parseFloat(totoalBidRemainingEBT),
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
              sails.sockets.blast(constants.EBT_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingEBT :: " + totoalBidRemainingEBT);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingEBT = totoalBidRemainingEBT - allAsksFromdb[i].bidAmountEBT;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingEBT = (parseFloat(totoalBidRemainingEBT) - parseFloat(currentAskDetails.askAmountEBT));
              totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingEBT == 0::: " + totoalBidRemainingEBT);

              if (totoalBidRemainingEBT == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingEBT == 0Enter into totoalBidRemainingEBT == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerEBT
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
                    id: bidDetails.bidownerEBT
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingEBT == 0userAll bidDetails.askownerEBT :: ");
                console.log(" totoalBidRemainingEBT == 0Update value of Bidder and asker");
                var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingEBT == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingEBT == 0updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
                console.log(" totoalBidRemainingEBT == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------");
                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerEBT
                  }, {
                    FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedEBTbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));
                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalBidRemainingBTC);
                console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
                var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
                var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
                console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
                updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
                console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerEBT
                  }, {
                    EBTbalance: parseFloat(updatedEBTbalanceBidder),
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 BidEBT.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskEBT.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskEBT.update({
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
                sails.sockets.blast(constants.EBT_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 AskEBT.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidEBT.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidEBT.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 enter into else of totoalBidRemainingEBT == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0totoalBidRemainingEBT == 0 start User.findOne currentAskDetails.bidownerEBT " + currentAskDetails.bidownerEBT);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerEBT
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerEBT
                  }, {
                    FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskEBT.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskEBT.update({
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
                sails.sockets.blast(constants.EBT_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              var updatedAskAmountEBT = (parseFloat(currentAskDetails.askAmountEBT) - parseFloat(totoalBidRemainingEBT));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));

              try {
                var updatedaskDetails = await AskEBT.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: parseFloat(updatedAskAmountBTC),
                  askAmountEBT: parseFloat(updatedAskAmountEBT),
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
              sails.sockets.blast(constants.EBT_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalBidRemainingEBT));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
              console.log("Total Ask RemainEBT updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker)
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
                  id: bidDetails.bidownerEBT
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerEBT");
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              var txFeesBidderEBT = (parseFloat(updatedEBTbalanceBidder) * parseFloat(txFeeEBTWithdrawSuccess));
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedEBTbalanceBidder ::: " + updatedEBTbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: parseFloat(updatedEBTbalanceBidder),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidEBT.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidEBT.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidEBT.update({
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
              sails.sockets.blast(constants.EBT_BID_DESTROYED, bidDestroy);
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
  removeBidEBTMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdEBT;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    BidEBT.findOne({
      bidownerEBT: bidownerId,
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
        var userBTCBalanceInDb = parseFloat(user.BTCbalance);
        var bidAmountOfBTCInBidTableDB = parseFloat(bidDetails.bidAmountBTC);
        var userFreezedBTCbalanceInDB = parseFloat(user.FreezedBTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBTCbalanceInDB) - parseFloat(bidAmountOfBTCInBidTableDB));
        var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) + parseFloat(bidAmountOfBTCInBidTableDB));
        console.log("userBTCBalanceInDb :" + userBTCBalanceInDb);
        console.log("bidAmountOfBTCInBidTableDB :" + bidAmountOfBTCInBidTableDB);
        console.log("userFreezedBTCbalanceInDB :" + userFreezedBTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBTCBalance :" + updateUserBTCBalance);

        User.update({
            id: bidownerId
          }, {
            BTCbalance: parseFloat(updateUserBTCBalance),
            FreezedBTCbalance: parseFloat(updateFreezedBalance)
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
            BidEBT.destroy({
              id: userBidId
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.EBT_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  removeAskEBTMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdEBT;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    AskEBT.findOne({
      askownerEBT: askownerId,
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
        var userEBTBalanceInDb = parseFloat(user.EBTbalance);
        var askAmountOfEBTInAskTableDB = parseFloat(askDetails.askAmountEBT);
        var userFreezedEBTbalanceInDB = parseFloat(user.FreezedEBTbalance);
        console.log("userEBTBalanceInDb :" + userEBTBalanceInDb);
        console.log("askAmountOfEBTInAskTableDB :" + askAmountOfEBTInAskTableDB);
        console.log("userFreezedEBTbalanceInDB :" + userFreezedEBTbalanceInDB);
        var updateFreezedEBTBalance = (parseFloat(userFreezedEBTbalanceInDB) - parseFloat(askAmountOfEBTInAskTableDB));
        var updateUserEBTBalance = (parseFloat(userEBTBalanceInDb) + parseFloat(askAmountOfEBTInAskTableDB));
        User.update({
            id: askownerId
          }, {
            EBTbalance: parseFloat(updateUserEBTBalance),
            FreezedEBTbalance: parseFloat(updateFreezedEBTBalance)
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
            AskEBT.destroy({
              id: userAskId
            }).exec(function(err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.EBT_ASK_DESTROYED, ask);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  // getAllBidEBT: function(req, res) {
  //   console.log("Enter into ask api getAllBid :: ");
  //   BidEBT.find({
  //       status: {
  //         '!': statusOne
  //       }
  //     })
  //     .sort('bidRate DESC')
  //     .exec(function(err, allBidDetailsToExecute) {
  //       if (err) {
  //         return res.json({
  //           "message": "Error to find Bids!!",
  //           statusCode: 401
  //         });
  //       }
  //       if (allBidDetailsToExecute) {
  //         if (allBidDetailsToExecute.length >= 1) {
  //           return res.json({
  //             bidsEBT: allBidDetailsToExecute,
  //             statusCode: 200
  //           });
  //         } else {
  //           return res.json({
  //             "message": "No Bid Found!!",
  //             statusCode: 401
  //           });
  //         }
  //       }
  //     });
  // },
  // getAllAskEBT: function(req, res) {
  //   console.log("Enter into ask api getAllBid :: ");
  //   AskEBT.find({
  //       status: {
  //         '!': statusOne
  //       }
  //     })
  //     .sort('askRate ASC')
  //     .exec(function(err, allAskDetailsToExecute) {
  //       if (err) {
  //         console.log("Error to find ask");
  //       }
  //       if (!allAskDetailsToExecute) {
  //         return res.json({
  //           "message": "No Ask Found!!",
  //           statusCode: 401
  //         });
  //       }
  //       if (allAskDetailsToExecute) {
  //         if (allAskDetailsToExecute.length >= 1) {
  //           return res.json({
  //             asksEBT: allAskDetailsToExecute,
  //             statusCode: 200
  //           });
  //         } else {
  //           return res.json({
  //             "message": "No Ask Found!!",
  //             statusCode: 401
  //           });
  //         }
  //       }
  //     });
  // }
  getAllBidEBT: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    BidEBT.find()
      .sort('bidRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidEBT.find()
              .sum('bidAmountEBT')
              .exec(function(err, bidAmountEBTSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountEBTSum",
                    statusCode: 401
                  });
                }
                BidEBT.find()
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEBTSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEBT: allAskDetailsToExecute,
                      bidAmountEBTSum: bidAmountEBTSum[0].bidAmountEBT,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskEBT: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    AskEBT.find()
      .sort('askRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskEBT.find()
              .sum('askAmountEBT')
              .exec(function(err, askAmountEBTSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountEBTSum",
                    statusCode: 401
                  });
                }
                AskEBT.find()
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEBTSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEBT: allAskDetailsToExecute,
                      askAmountEBTSum: askAmountEBTSum[0].askAmountEBT,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsEBTSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    BidEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidEBT.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountEBT')
              .exec(function(err, bidAmountEBTSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountEBTSum",
                    statusCode: 401
                  });
                }
                BidEBT.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEBTSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEBT: allAskDetailsToExecute,
                      bidAmountEBTSum: bidAmountEBTSum[0].bidAmountEBT,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAsksEBTSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('askRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskEBT.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountEBT')
              .exec(function(err, askAmountEBTSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountEBTSum",
                    statusCode: 401
                  });
                }
                AskEBT.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEBTSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEBT: allAskDetailsToExecute,
                      askAmountEBTSum: askAmountEBTSum[0].askAmountEBT,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};