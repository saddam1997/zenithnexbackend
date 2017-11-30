/**
 * TradeEBTMarketController
 *
 * @description :: Server-side logic for managing tradeebtmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

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
    console.log("Enter into ask api addAskEBTMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountEBT = new BigNumber(req.body.askAmountEBT);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountEBT || !userAskAmountBTC || !userAskRate || !userAskownerId) {
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
    if (!userAsker) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("User details find successfully :::: " + JSON.stringify(userAsker));
    var userEBTBalanceInDb = new BigNumber(userAsker.EBTbalance);
    var userFreezedEBTBalanceInDb = new BigNumber(userAsker.FreezedEBTbalance);

    userEBTBalanceInDb = userEBTBalanceInDb.toFixed(8);
    userFreezedEBTBalanceInDb = userFreezedEBTBalanceInDb.toFixed(8);

    var userIdInDb = userAsker.id;
    if (userAskAmountEBT.greaterThanOrEqualTo(userEBTBalanceInDb)) {
      return res.json({
        "message": "You have insufficient EBT Balance",
        statusCode: 401
      });
    }
    console.log("userAskAmountEBT :: " + userAskAmountEBT);
    console.log("userEBTBalanceInDb :: " + userEBTBalanceInDb);
    // if (userAskAmountEBT >= userEBTBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient EBT Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = userAskAmountBTC.toFixed(8);
    userAskAmountEBT = userAskAmountEBT.toFixed(8);
    userAskRate = userAskRate.toFixed(8);
    try {
      var askDetails = await AskEBT.create({
        askAmountBTC: userAskAmountBTC,
        askAmountEBT: userAskAmountEBT,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountEBT: userAskAmountEBT,
        askRate: userAskRate,
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
    // var updateUserEBTBalance = (parseFloat(userEBTBalanceInDb) - parseFloat(userAskAmountEBT));
    // var updateFreezedEBTBalance = (parseFloat(userFreezedEBTBalanceInDb) + parseFloat(userAskAmountEBT));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userEBTBalanceInDb = new BigNumber(userEBTBalanceInDb);
    var updateUserEBTBalance = userEBTBalanceInDb.minus(userAskAmountEBT);
    updateUserEBTBalance = updateUserEBTBalance.toFixed(8);
    userFreezedEBTBalanceInDb = new BigNumber(userFreezedEBTBalanceInDb);
    var updateFreezedEBTBalance = userFreezedEBTBalanceInDb.plus(userAskAmountEBT);
    updateFreezedEBTBalance = updateFreezedEBTBalance.toFixed(8);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedEBTbalance: updateFreezedEBTBalance,
        EBTbalance: updateUserEBTBalance
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
      var totoalAskRemainingEBT = new BigNumber(userAskAmountEBT);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
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
          // totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT) - parseFloat(currentBidDetails.bidAmountEBT));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingEBT = totoalAskRemainingEBT.minus(currentBidDetails.bidAmountEBT);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.toFixed(8);
            var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(currentBidDetails.bidAmountEBT);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of EBT Update user " + updatedEBTbalanceBidder);
            //var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
            var txFeesBidderEBT = new BigNumber(currentBidDetails.bidAmountEBT);

            txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess)
            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.toFixed(8);

            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                EBTbalance: updatedEBTbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and bch balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT);
            //var updatedFreezedEBTbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT)) + parseFloat(totoalAskRemainingEBT));
            var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(userAskAmountEBT);
            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.plus(totoalAskRemainingEBT);

            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.toFixed(8);
            //Deduct Transation Fee Asker
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.toFixed(8);
            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedEBTbalance: updatedFreezedEBTbalanceAsker
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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(currentBidDetails.bidAmountEBT);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of EBT 089089Update user " + updatedEBTbalanceBidder);
            // var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
            var txFeesBidderEBT = new BigNumber(currentBidDetails.bidAmountEBT);
            txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);

            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            // updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);

            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.toFixed(8);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                EBTbalance: updatedEBTbalanceBidder
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEBT");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalAskRemainingEBT));
            //var updatedFreezedEBTbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT)) + parseFloat(totoalAskRemainingEBT));
            var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(userAskAmountEBT);
            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.plus(totoalAskRemainingEBT);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
            console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.toFixed(8);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedEBTbalance: updatedFreezedEBTbalanceAsker
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
            //totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT) - parseFloat(currentBidDetails.bidAmountEBT));
            totoalAskRemainingEBT = totoalAskRemainingEBT.minus(currentBidDetails.bidAmountEBT);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));
              var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(currentBidDetails.bidAmountEBT);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 EBT Update user " + updatedEBTbalanceBidder);
              //var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
              var txFeesBidderEBT = new BigNumber(currentBidDetails.bidAmountEBT);
              txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
              console.log("After deduct TX Fees of EBT Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerEBT
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  EBTbalance: updatedEBTbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
              //var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT);
              //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalAskRemainingEBT));
              //var updatedFreezedEBTbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT)) + parseFloat(totoalAskRemainingEBT));
              var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
              updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(userAskAmountEBT);
              updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.plus(totoalAskRemainingEBT);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
              console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var btcAmountSucess = new BigNumber(userAskAmountBTC);
              btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(updatedBTCbalanceAsker);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerEBT
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedEBTbalance: updatedFreezedEBTbalanceAsker
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

              //var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT));
              var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(currentBidDetails.bidAmountEBT);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              //var txFeesBidderEBT = (parseFloat(currentBidDetails.bidAmountEBT) * parseFloat(txFeeEBTWithdrawSuccess));
              var txFeesBidderEBT = new BigNumber(currentBidDetails.bidAmountEBT);
              txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);
              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerEBT
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  EBTbalance: updatedEBTbalanceBidder
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
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountEBT = (parseFloat(currentBidDetails.bidAmountEBT) - parseFloat(totoalAskRemainingEBT));
            var updatedBidAmountEBT = new BigNumber(currentBidDetails.bidAmountEBT);
            updatedBidAmountEBT = updatedBidAmountEBT.minus(totoalAskRemainingEBT);

            try {
              var updatedaskDetails = await BidEBT.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountEBT: updatedBidAmountEBT,
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
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


            //var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.EBTbalance) + parseFloat(totoalAskRemainingEBT));

            var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.EBTbalance);
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(totoalAskRemainingEBT);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of EBT Update user " + updatedEBTbalanceBidder);
            //var bchAmountSucess = parseFloat(totoalAskRemainingEBT);
            //var bchAmountSucess = new BigNumber(totoalAskRemainingEBT);
            //var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
            //var txFeesBidderEBT = (parseFloat(totoalAskRemainingEBT) * parseFloat(txFeeEBTWithdrawSuccess));
            var txFeesBidderEBT = new BigNumber(totoalAskRemainingEBT);
            txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);

            //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
            updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
            console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
            console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEBTbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEBT
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                EBTbalance: updatedEBTbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEBT");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(userAskAmountEBT));
            var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
            updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(userAskAmountEBT);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingEBT " + totoalAskRemainingEBT);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEBT
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedEBTbalance: updatedFreezedEBTbalanceAsker
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
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountEBT = new BigNumber(req.body.bidAmountEBT);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = userBidAmountBTC.toFixed(8);
    userBidAmountEBT = userBidAmountEBT.toFixed(8);
    userBidRate = userBidRate.toFixed(8);


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
    if (!userBidder) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("Getting user details !! !");
    var userBTCBalanceInDb = new BigNumber(userBidder.BTCbalance);
    var userFreezedBTCBalanceInDb = new BigNumber(userBidder.FreezedBTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBTC = new BigNumber(userBidAmountBTC);
    if (userBidAmountBTC.greaterThanOrEqualTo(userBTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    userBidAmountBTC = userBidAmountBTC.toFixed(8);
    try {
      var bidDetails = await BidEBT.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountEBT: userBidAmountEBT,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountEBT: userBidAmountEBT,
        bidRate: userBidRate,
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
    //var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBidAmountBTC));
    var updateUserBTCBalance = new BigNumber(userBTCBalanceInDb);
    updateUserBTCBalance = updateUserBTCBalance.minus(userBidAmountBTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC));
    var updateFreezedBTCBalance = new BigNumber(userBidder.FreezedBTCbalance);
    updateFreezedBTCBalance = updateFreezedBTCBalance.plus(userBidAmountBTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBTCBalance  " + updateFreezedBTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserBTCBalance  " + updateUserBTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBTCbalance: updateFreezedBTCBalance.toFixed(8),
        BTCbalance: updateUserBTCBalance.toFixed(8),
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
        var totoalBidRemainingEBT = new BigNumber(userBidAmountEBT);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
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
            //totoalBidRemainingEBT = (parseFloat(totoalBidRemainingEBT) - parseFloat(currentAskDetails.askAmountEBT));
            totoalBidRemainingEBT = totoalBidRemainingEBT.minus(currentAskDetails.askAmountEBT);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
              //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
              var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
              updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(currentAskDetails.askAmountEBT);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of EBT Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedEBTbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: updatedFreezedEBTbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              //var updatedEBTbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));
              var updatedEBTbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.EBTbalance);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(userBidAmountEBT);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(totoalBidRemainingEBT);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainEBT updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
              var bchAmountSucess = new BigNumber(userBidAmountEBT);
              bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingEBT);

              //var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
              var txFeesBidderEBT = new BigNumber(bchAmountSucess);
              txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);

              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingEBT == 0updatedEBTbalanceBidder ::: " + updatedEBTbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingEBT asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: updatedEBTbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0  enter into else of totoalBidRemainingEBT == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0start User.findOne currentAskDetails.bidownerEBT ");
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
              //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
              var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
              updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(currentAskDetails.askAmountEBT);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEBT == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: updatedFreezedEBTbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              //var updatedEBTbalanceBidder = ((parseFloat(userAllDetailsInDBBid.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));
              var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBid.EBTbalance);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(userBidAmountEBT);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(totoalBidRemainingEBT);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainEBT updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
              var bchAmountSucess = new BigNumber(userBidAmountEBT);
              bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingEBT);

              //var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
              var txFeesBidderEBT = new BigNumber(bchAmountSucess);
              txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);

              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);
              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedEBTbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: updatedEBTbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountEBT: totoalBidRemainingEBT,
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
              totoalBidRemainingEBT = totoalBidRemainingEBT.minus(currentAskDetails.askAmountEBT);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
                //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));
                var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
                updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(currentAskDetails.askAmountEBT);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingEBT == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingEBT == 0updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
                console.log(" totoalBidRemainingEBT == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingEBT " + totoalBidRemainingEBT);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerEBT
                  }, {
                    FreezedEBTbalance: updatedFreezedEBTbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedEBTbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)) - parseFloat(totoalBidRemainingEBT));

                var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
                updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(userBidAmountEBT);
                updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(totoalBidRemainingEBT);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainEBT totoalAskRemainingEBT " + totoalBidRemainingBTC);
                console.log("Total Ask RemainEBT BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainEBT updatedFreezedEBTbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
                //var bchAmountSucess = (parseFloat(userBidAmountEBT) - parseFloat(totoalBidRemainingEBT));
                var bchAmountSucess = new BigNumber(userBidAmountEBT);
                bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingEBT);


                //var txFeesBidderEBT = (parseFloat(bchAmountSucess) * parseFloat(txFeeEBTWithdrawSuccess));
                var txFeesBidderEBT = new BigNumber(bchAmountSucess);
                txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);
                console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
                //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
                updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);

                console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingEBT == 0 updatedFreezedEBTbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingEBT " + totoalBidRemainingEBT);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerEBT
                  }, {
                    EBTbalance: updatedEBTbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(currentAskDetails.askAmountEBT));

                var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
                updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(currentAskDetails.askAmountEBT);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingEBT == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingEBT " + totoalBidRemainingEBT);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerEBT
                  }, {
                    FreezedEBTbalance: updatedFreezedEBTbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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
              //  var updatedAskAmountEBT = (parseFloat(currentAskDetails.askAmountEBT) - parseFloat(totoalBidRemainingEBT));

              var updatedAskAmountEBT = new BigNumber(currentAskDetails.askAmountEBT);
              updatedAskAmountEBT = updatedAskAmountEBT.minus(totoalBidRemainingEBT);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskEBT.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountEBT: updatedAskAmountEBT,
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

              //var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance) - parseFloat(totoalBidRemainingEBT));
              var updatedFreezedEBTbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEBTbalance);
              updatedFreezedEBTbalanceAsker = updatedFreezedEBTbalanceAsker.minus(totoalBidRemainingEBT);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEBT totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEBT userAllDetailsInDBAsker.FreezedEBTbalance " + userAllDetailsInDBAsker.FreezedEBTbalance);
              console.log("Total Ask RemainEBT updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of EBT Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedEBTbalanceAsker " + updatedFreezedEBTbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEBT
                }, {
                  FreezedEBTbalance: updatedFreezedEBTbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              //var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountEBT " + userBidAmountEBT);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.EBTbalance " + userAllDetailsInDBBidder.EBTbalance);

              var updatedEBTbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EBTbalance);
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.plus(userBidAmountEBT);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);
              //var txFeesBidderEBT = (parseFloat(updatedEBTbalanceBidder) * parseFloat(txFeeEBTWithdrawSuccess));
              var txFeesBidderEBT = new BigNumber(userBidAmountEBT);
              txFeesBidderEBT = txFeesBidderEBT.times(txFeeEBTWithdrawSuccess);

              console.log("txFeesBidderEBT :: " + txFeesBidderEBT);
              //updatedEBTbalanceBidder = (parseFloat(updatedEBTbalanceBidder) - parseFloat(txFeesBidderEBT));
              updatedEBTbalanceBidder = updatedEBTbalanceBidder.minus(txFeesBidderEBT);

              console.log("After deduct TX Fees of EBT Update user " + updatedEBTbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedEBTbalanceBidder ::: " + updatedEBTbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedEBTbalanceBidder " + updatedEBTbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEBT
                }, {
                  EBTbalance: updatedEBTbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                "message": "Bid Executed successfully",
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
  getAllBidEBT: function(req, res) {
    console.log("Enter into ask api getAllBidEBT :: ");
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
    console.log("Enter into ask api getAllAskEBT :: ");
    AskEBT.find()
      .sort('askRate ASC')
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
    console.log("Enter into ask api getBidsEBTSuccess :: ");
    BidEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC ASC')
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
    console.log("Enter into ask api getAsksEBTSuccess :: ");
    AskEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC ASC')
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