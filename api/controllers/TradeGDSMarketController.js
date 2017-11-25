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

const txFeeGDSWithdrawSuccess = sails.config.common.txFeeGDSWithdrawSuccess;
const txFeeBTCWithdrawSuccess = sails.config.common.txFeeBTCWithdrawSuccess;


module.exports = {

  addAskGDSMarket: async function(req, res) {
    console.log("Enter into ask api addAskGDSMarket : : ");
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC);
    var userAskAmountGDS = parseFloat(req.body.askAmountGDS);
    var userAskRate = parseFloat(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountGDS || !userAskAmountBTC ||
      !userAskRate || !userAskownerId) {
      console.log("Invalid Parameter!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountGDS < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userGDSBalanceInDb = parseFloat(userAsker.GDSbalance);
    var userFreezedGDSBalanceInDb = parseFloat(userAsker.FreezedGDSbalance);
    var userIdInDb = parseFloat(userAsker.id);
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
        askRate: parseFloat(userAskRate),
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
    var updateUserGDSBalance = (parseFloat(userGDSBalanceInDb) - parseFloat(userAskAmountGDS));
    var updateFreezedGDSBalance = (parseFloat(userFreezedGDSBalanceInDb) + parseFloat(userAskAmountGDS));
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
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingGDS = userAskAmountGDS;
      var totoalAskRemainingBTC = userAskAmountBTC;
      //this loop for sum of all Bids amount of GDS
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountGDS;
      }
      if (total_bid <= totoalAskRemainingGDS) {
        console.log("Inside of total_bid <= totoalAskRemainingGDS");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingGDS");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingGDS :: " + totoalAskRemainingGDS);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          totoalAskRemainingGDS = (parseFloat(totoalAskRemainingGDS) - parseFloat(currentBidDetails.bidAmountGDS));
          totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          console.log(currentBidDetails.id + " After totoalAskRemainingGDS :: " + totoalAskRemainingGDS);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

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
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS));
            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
            var txFeesBidderGDS = (parseFloat(currentBidDetails.bidAmountGDS) * parseFloat(txFeeGDSWithdrawSuccess));
            console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
            updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
            console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerGDS
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                GDSbalance: parseFloat(updatedGDSbalanceBidder)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and bch balance',
                statusCode: 401
              });
            }

            var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedGDSbalanceAsker = parseFloat(totoalAskRemainingGDS);

            //Deduct Transation Fee Asker
            var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGDS
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker)
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed GDSBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidGDS:: ");
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
            sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskGDS.destroy askDetails.id::: " + askDetails.id);

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
            console.log("Ask Executed successfully and Return!!!");
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
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS));

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
            var txFeesBidderGDS = (parseFloat(currentBidDetails.bidAmountGDS) * parseFloat(txFeeGDSWithdrawSuccess));
            console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
            updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
            console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGDS
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                GDSbalance: parseFloat(updatedGDSbalanceBidder)
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
            sails.sockets.blast(constants.GDS_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
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
            var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            //var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(totoalAskRemainingGDS));
            var updatedFreezedGDSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(userAskAmountGDS)) + parseFloat(totoalAskRemainingGDS));
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainGDS totoalAskRemainingGDS " + totoalAskRemainingGDS);
            console.log("Total Ask RemainGDS userAllDetailsInDBAsker.FreezedGDSbalance " + userAllDetailsInDBAsker.FreezedGDSbalance);
            console.log("Total Ask RemainGDS updatedFreezedGDSbalanceAsker " + updatedFreezedGDSbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));

            var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGDS
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker)
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
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountGDS: parseFloat(totoalAskRemainingGDS),
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
            sails.sockets.blast(constants.GDS_ASK_DESTROYED, updatedaskDetails);
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
            totoalAskRemainingGDS = (parseFloat(totoalAskRemainingGDS) - parseFloat(currentBidDetails.bidAmountGDS));
            totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
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
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              var txFeesBidderGDS = (parseFloat(currentBidDetails.bidAmountGDS) * parseFloat(txFeeGDSWithdrawSuccess));
              console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
              updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
              console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerGDS
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                  GDSbalance: parseFloat(updatedGDSbalanceBidder)
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              //var updatedFreezedGDSbalanceAsker = parseFloat(totoalAskRemainingGDS);
              //var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(totoalAskRemainingGDS));
              var updatedFreezedGDSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(userAskAmountGDS)) + parseFloat(totoalAskRemainingGDS));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGDS totoalAskRemainingGDS " + totoalAskRemainingGDS);
              console.log("Total Ask RemainGDS userAllDetailsInDBAsker.FreezedGDSbalance " + userAllDetailsInDBAsker.FreezedGDSbalance);
              console.log("Total Ask RemainGDS updatedFreezedGDSbalanceAsker " + updatedFreezedGDSbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGDS
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker),
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker)
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
              sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
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
              sails.sockets.blast(constants.GDS_ASK_DESTROYED, askDestroy);
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
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(currentBidDetails.bidAmountGDS));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              var txFeesBidderGDS = (parseFloat(currentBidDetails.bidAmountGDS) * parseFloat(txFeeGDSWithdrawSuccess));
              console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
              updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
              console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGDS
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                  GDSbalance: parseFloat(updatedGDSbalanceBidder)
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
              sails.sockets.blast(constants.GDS_BID_DESTROYED, desctroyCurrentBid);
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
            var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountGDS = (parseFloat(currentBidDetails.bidAmountGDS) - parseFloat(totoalAskRemainingGDS));

            try {
              var updatedaskDetails = await BidGDS.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: parseFloat(updatedBidAmountBTC),
                bidAmountGDS: parseFloat(updatedBidAmountGDS),
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
            sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
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
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.GDSbalance) + parseFloat(totoalAskRemainingGDS));

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
            var bchAmountSucess = parseFloat(totoalAskRemainingGDS);
            var txFeesBidderGDS = (parseFloat(bchAmountSucess) * parseFloat(txFeeGDSWithdrawSuccess));
            updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
            console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
            console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGDSbalanceBidder:: " + updatedGDSbalanceBidder);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGDS
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder),
                GDSbalance: parseFloat(updatedGDSbalanceBidder)
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
            var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(userAskAmountGDS));

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGDS
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker),
                FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker)
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
            totoalBidRemainingGDS = (parseFloat(totoalBidRemainingGDS) - parseFloat(currentAskDetails.askAmountGDS));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
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

              console.log("userAll bidDetails.askownerGDS totoalBidRemainingGDS == 0:: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(currentAskDetails.askAmountGDS));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedGDSbalance balance of asker deducted and BTC to give asker
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker),
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
                  id: bidDetails.bidownerGDS
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
              //var updatedGDSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GDSbalance) + parseFloat(totoalBidRemainingGDS)) - parseFloat(totoalBidRemainingBTC);
              var updatedGDSbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS)) - parseFloat(totoalBidRemainingGDS));
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGDS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGDS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainGDS updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              var bchAmountSucess = (parseFloat(userBidAmountGDS) - parseFloat(totoalBidRemainingGDS));
              var txFeesBidderGDS = (parseFloat(bchAmountSucess) * parseFloat(txFeeGDSWithdrawSuccess));
              console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
              updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
              console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingGDS == 0updatedGDSbalanceBidder ::: " + updatedGDSbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGDS == updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
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
              sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
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
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0start User.findOne currentAskDetails.bidownerGDS " + currentAskDetails.bidownerGDS);
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
              var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(currentAskDetails.askAmountGDS));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGDS == 0updatedBTCbalanceBidder:: ");

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker)
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
              var updatedGDSbalanceBidder = ((parseFloat(userAllDetailsInDBBid.GDSbalance) + parseFloat(userBidAmountGDS)) - parseFloat(totoalBidRemainingGDS));
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGDS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGDS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainGDS updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              var bchAmountSucess = (parseFloat(userBidAmountGDS) - parseFloat(totoalBidRemainingGDS));
              var txFeesBidderGDS = (parseFloat(bchAmountSucess) * parseFloat(txFeeGDSWithdrawSuccess));
              console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
              updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
              console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder),
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountGDS totoalBidRemainingGDS " + totoalBidRemainingGDS);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidGDS.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: parseFloat(totoalBidRemainingBTC),
                  bidAmountGDS: parseFloat(totoalBidRemainingGDS),
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
              sails.sockets.blast(constants.GDS_BID_DESTROYED, updatedbidDetails);

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
              totoalBidRemainingGDS = (parseFloat(totoalBidRemainingGDS) - parseFloat(currentAskDetails.askAmountGDS));
              totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
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
                var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(currentAskDetails.askAmountGDS));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingGDS == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingGDS == 0updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
                console.log(" totoalBidRemainingGDS == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------");
                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerGDS
                  }, {
                    FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker)
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                var updatedGDSbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS)) - parseFloat(totoalBidRemainingGDS));
                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainGDS totoalAskRemainingGDS " + totoalBidRemainingBTC);
                console.log("Total Ask RemainGDS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainGDS updatedFreezedGDSbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
                var bchAmountSucess = (parseFloat(userBidAmountGDS) - parseFloat(totoalBidRemainingGDS));
                var txFeesBidderGDS = (parseFloat(bchAmountSucess) * parseFloat(txFeeGDSWithdrawSuccess));
                console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
                updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
                console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingGDS == 0 updatedFreezedGDSbalanceAsker ::: " + updatedFreezedGDSbalanceAsker);
                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerGDS
                  }, {
                    GDSbalance: parseFloat(updatedGDSbalanceBidder),
                    FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder)
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
                sails.sockets.blast(constants.GDS_ASK_DESTROYED, askDestroy);
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
                sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 enter into else of totoalBidRemainingGDS == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0totoalBidRemainingGDS == 0 start User.findOne currentAskDetails.bidownerGDS " + currentAskDetails.bidownerGDS);
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
                var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(currentAskDetails.askAmountGDS));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 updatedFreezedGDSbalanceAsker:: " + updatedFreezedGDSbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGDS == 0 updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerGDS
                  }, {
                    FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker),
                    BTCbalance: parseFloat(updatedBTCbalanceAsker)
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
                sails.sockets.blast(constants.GDS_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              var updatedAskAmountGDS = (parseFloat(currentAskDetails.askAmountGDS) - parseFloat(totoalBidRemainingGDS));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));

              try {
                var updatedaskDetails = await AskGDS.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: parseFloat(updatedAskAmountBTC),
                  askAmountGDS: parseFloat(updatedAskAmountGDS),
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
              sails.sockets.blast(constants.GDS_ASK_DESTROYED, updatedaskDetails);
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

              var updatedFreezedGDSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGDSbalance) - parseFloat(totoalBidRemainingGDS));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGDS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGDS userAllDetailsInDBAsker.FreezedGDSbalance " + userAllDetailsInDBAsker.FreezedGDSbalance);
              console.log("Total Ask RemainGDS updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              console.log("After deduct TX Fees of GDS Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedGDSbalanceAsker:: " + updatedFreezedGDSbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGDS
                }, {
                  FreezedGDSbalance: parseFloat(updatedFreezedGDSbalanceAsker),
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
                  id: bidDetails.bidownerGDS
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
              var updatedGDSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GDSbalance) + parseFloat(userBidAmountGDS));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);
              var txFeesBidderGDS = (parseFloat(updatedGDSbalanceBidder) * parseFloat(txFeeGDSWithdrawSuccess));
              console.log("txFeesBidderGDS :: " + txFeesBidderGDS);
              updatedGDSbalanceBidder = (parseFloat(updatedGDSbalanceBidder) - parseFloat(txFeesBidderGDS));
              console.log("After deduct TX Fees of GDS Update user " + updatedGDSbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedGDSbalanceBidder ::: " + updatedGDSbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);
              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGDS
                }, {
                  GDSbalance: parseFloat(updatedGDSbalanceBidder),
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
              sails.sockets.blast(constants.GDS_BID_DESTROYED, bidDestroy);
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
        var userGDSBalanceInDb = parseFloat(user.GDSbalance);
        var askAmountOfGDSInAskTableDB = parseFloat(askDetails.askAmountGDS);
        var userFreezedGDSbalanceInDB = parseFloat(user.FreezedGDSbalance);
        console.log("userGDSBalanceInDb :" + userGDSBalanceInDb);
        console.log("askAmountOfGDSInAskTableDB :" + askAmountOfGDSInAskTableDB);
        console.log("userFreezedGDSbalanceInDB :" + userFreezedGDSbalanceInDB);
        var updateFreezedGDSBalance = (parseFloat(userFreezedGDSbalanceInDB) - parseFloat(askAmountOfGDSInAskTableDB));
        var updateUserGDSBalance = (parseFloat(userGDSBalanceInDb) + parseFloat(askAmountOfGDSInAskTableDB));
        User.update({
            id: askownerId
          }, {
            GDSbalance: parseFloat(updateUserGDSBalance),
            FreezedGDSbalance: parseFloat(updateFreezedGDSBalance)
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
  // getAllBidGDS: function(req, res) {
  //   console.log("Enter into ask api getAllBid :: ");
  //   BidGDS.find({
  //       status: {
  //         '!': statusOne
  //       }
  //     })
  //     .sort('bidRate DESC')
  //     .exec(function(err, allBidDetailsToExecute) {
  //       if (err) {
  //         console.log("Error to find ask");
  //       }
  //       if (!allBidDetailsToExecute) {
  //         return res.json({
  //           "message": "No Bid Found!!",
  //           statusCode: 401
  //         });
  //       }
  //       if (allBidDetailsToExecute) {
  //         if (allBidDetailsToExecute.length >= 1) {
  //           return res.json({
  //             bidsGDS: allBidDetailsToExecute,
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
  // getAllAskGDS: function(req, res) {
  //   console.log("Enter into ask api getAllBid :: ");
  //   AskGDS.find({
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
  //             asksGDS: allAskDetailsToExecute,
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
  getAllBidGDS: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    BidGDS.find()
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
            BidGDS.find()
              .sum('bidAmountGDS')
              .exec(function(err, bidAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGDSSum",
                    statusCode: 401
                  });
                }
                BidGDS.find()
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGDS: allAskDetailsToExecute,
                      bidAmountGDSSum: bidAmountGDSSum[0].bidAmountGDS,
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
  getAllAskGDS: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    AskGDS.find()
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
            AskGDS.find()
              .sum('askAmountGDS')
              .exec(function(err, askAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGDSSum",
                    statusCode: 401
                  });
                }
                AskGDS.find()
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGDS: allAskDetailsToExecute,
                      askAmountGDSSum: askAmountGDSSum[0].askAmountGDS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskGDS Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsGDSSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    BidGDS.find({
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
            BidGDS.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountGDS')
              .exec(function(err, bidAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGDSSum",
                    statusCode: 401
                  });
                }
                BidGDS.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGDS: allAskDetailsToExecute,
                      bidAmountGDSSum: bidAmountGDSSum[0].bidAmountGDS,
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
  getAsksGDSSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskGDS.find({
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
            AskGDS.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountGDS')
              .exec(function(err, askAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGDSSum",
                    statusCode: 401
                  });
                }
                AskGDS.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGDS: allAskDetailsToExecute,
                      askAmountGDSSum: askAmountGDSSum[0].askAmountGDS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskGDS Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};