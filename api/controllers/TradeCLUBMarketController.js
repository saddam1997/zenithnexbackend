/**
 * TradeCLUBMarketController
 *
 * @description :: Server-side logic for managing Tradeclubmarkets
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

const txFeeCLUBWithdrawSuccess = sails.config.common.txFeeCLUBWithdrawSuccess;
const txFeeBTCWithdrawSuccess = sails.config.common.txFeeBTCWithdrawSuccess;

module.exports = {


  addAskCLUBMarket: async function(req, res) {
    console.log("Enter into ask api addAskCLUBMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountCLUB = new BigNumber(req.body.askAmountCLUB);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCLUB || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCLUB < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userCLUBBalanceInDb = new BigNumber(userAsker.CLUBbalance);
    var userFreezedCLUBBalanceInDb = new BigNumber(userAsker.FreezedCLUBbalance);

    userCLUBBalanceInDb = userCLUBBalanceInDb.toFixed(8);
    userFreezedCLUBBalanceInDb = userFreezedCLUBBalanceInDb.toFixed(8);

    var userIdInDb = userAsker.id;
    if (userAskAmountCLUB.greaterThanOrEqualTo(userCLUBBalanceInDb)) {
      return res.json({
        "message": "You have insufficient CLUB Balance",
        statusCode: 401
      });
    }
    console.log("userAskAmountCLUB :: " + userAskAmountCLUB);
    console.log("userCLUBBalanceInDb :: " + userCLUBBalanceInDb);
    // if (userAskAmountCLUB >= userCLUBBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient CLUB Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = userAskAmountBTC.toFixed(8);
    userAskAmountCLUB = userAskAmountCLUB.toFixed(8);
    userAskRate = userAskRate.toFixed(8);
    try {
      var askDetails = await AskCLUB.create({
        askAmountBTC: userAskAmountBTC,
        askAmountCLUB: userAskAmountCLUB,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountCLUB: userAskAmountCLUB,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        askownerCLUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.CLUB_ASK_ADDED, askDetails);
    // var updateUserCLUBBalance = (parseFloat(userCLUBBalanceInDb) - parseFloat(userAskAmountCLUB));
    // var updateFreezedCLUBBalance = (parseFloat(userFreezedCLUBBalanceInDb) + parseFloat(userAskAmountCLUB));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userCLUBBalanceInDb = new BigNumber(userCLUBBalanceInDb);
    var updateUserCLUBBalance = userCLUBBalanceInDb.minus(userAskAmountCLUB);
    updateUserCLUBBalance = updateUserCLUBBalance.toFixed(8);
    userFreezedCLUBBalanceInDb = new BigNumber(userFreezedCLUBBalanceInDb);
    var updateFreezedCLUBBalance = userFreezedCLUBBalanceInDb.plus(userAskAmountCLUB);
    updateFreezedCLUBBalance = updateFreezedCLUBBalance.toFixed(8);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedCLUBbalance: updateFreezedCLUBBalance,
        CLUBbalance: updateUserCLUBBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidCLUB.find({
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
      var totoalAskRemainingCLUB = new BigNumber(userAskAmountCLUB);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of CLUB
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountCLUB;
      }
      if (total_bid <= totoalAskRemainingCLUB) {
        console.log("Inside of total_bid <= totoalAskRemainingCLUB");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingCLUB");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingCLUB :: " + totoalAskRemainingCLUB);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingCLUB = (parseFloat(totoalAskRemainingCLUB) - parseFloat(currentBidDetails.bidAmountCLUB));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingCLUB = totoalAskRemainingCLUB.minus(currentBidDetails.bidAmountCLUB);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingCLUB :: " + totoalAskRemainingCLUB);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingCLUB == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingCLUB == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerCLUB
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCLUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(currentBidDetails.bidAmountCLUB));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.toFixed(8);
            var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(currentBidDetails.bidAmountCLUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of CLUB Update user " + updatedCLUBbalanceBidder);
            //var txFeesBidderCLUB = (parseFloat(currentBidDetails.bidAmountCLUB) * parseFloat(txFeeCLUBWithdrawSuccess));
            var txFeesBidderCLUB = new BigNumber(currentBidDetails.bidAmountCLUB);

            txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess)
            console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
            //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.toFixed(8);

            console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCLUB
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CLUBbalance: updatedCLUBbalanceBidder
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
            //var updatedFreezedCLUBbalanceAsker = parseFloat(totoalAskRemainingCLUB);
            //var updatedFreezedCLUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(userAskAmountCLUB)) + parseFloat(totoalAskRemainingCLUB));
            var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(userAskAmountCLUB);
            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.plus(totoalAskRemainingCLUB);

            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.toFixed(8);
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
            console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCLUB
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed CLUBBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidCLUB:: ");
            try {
              var bidDestroy = await BidCLUB.update({
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
            sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskCLUB.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskCLUB.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskCLUB',
                statusCode: 401
              });
            }
            //emitting event of destruction of bch_ask
            sails.sockets.blast(constants.CLUB_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCLUB == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCLUB " + currentBidDetails.bidownerCLUB);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerCLUB
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(currentBidDetails.bidAmountCLUB));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(currentBidDetails.bidAmountCLUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of CLUB 089089Update user " + updatedCLUBbalanceBidder);
            // var txFeesBidderCLUB = (parseFloat(currentBidDetails.bidAmountCLUB) * parseFloat(txFeeCLUBWithdrawSuccess));
            var txFeesBidderCLUB = new BigNumber(currentBidDetails.bidAmountCLUB);
            txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);

            console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
            // updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);

            console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.toFixed(8);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCLUBbalanceBidder:: " + updatedCLUBbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCLUB
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CLUBbalance: updatedCLUBbalanceBidder
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
              var desctroyCurrentBid = await BidCLUB.update({
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
            sails.sockets.blast(constants.CLUB_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCLUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCLUB");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(totoalAskRemainingCLUB));
            //var updatedFreezedCLUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(userAskAmountCLUB)) + parseFloat(totoalAskRemainingCLUB));
            var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(userAskAmountCLUB);
            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.plus(totoalAskRemainingCLUB);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCLUB totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainCLUB userAllDetailsInDBAsker.FreezedCLUBbalance " + userAllDetailsInDBAsker.FreezedCLUBbalance);
            console.log("Total Ask RemainCLUB updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
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
            console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.toFixed(8);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCLUBbalanceAsker ::: " + updatedFreezedCLUBbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCLUB
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCLUB totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCLUB.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountCLUB: parseFloat(totoalAskRemainingCLUB),
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
            sails.sockets.blast(constants.CLUB_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingCLUB :: " + totoalAskRemainingCLUB);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCLUB = totoalAskRemainingCLUB - allBidsFromdb[i].bidAmountCLUB;
          if (totoalAskRemainingCLUB >= currentBidDetails.bidAmountCLUB) {
            //totoalAskRemainingCLUB = (parseFloat(totoalAskRemainingCLUB) - parseFloat(currentBidDetails.bidAmountCLUB));
            totoalAskRemainingCLUB = totoalAskRemainingCLUB.minus(currentBidDetails.bidAmountCLUB);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingCLUB == 0::: " + totoalAskRemainingCLUB);

            if (totoalAskRemainingCLUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingCLUB == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCLUB
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
                  id: askDetails.askownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerCLUB :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(currentBidDetails.bidAmountCLUB));
              var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(currentBidDetails.bidAmountCLUB);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 CLUB Update user " + updatedCLUBbalanceBidder);
              //var txFeesBidderCLUB = (parseFloat(currentBidDetails.bidAmountCLUB) * parseFloat(txFeeCLUBWithdrawSuccess));
              var txFeesBidderCLUB = new BigNumber(currentBidDetails.bidAmountCLUB);
              txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);
              console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
              //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
              console.log("After deduct TX Fees of CLUB Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCLUB
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  CLUBbalance: updatedCLUBbalanceBidder
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
              //var updatedFreezedCLUBbalanceAsker = parseFloat(totoalAskRemainingCLUB);
              //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(totoalAskRemainingCLUB));
              //var updatedFreezedCLUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(userAskAmountCLUB)) + parseFloat(totoalAskRemainingCLUB));
              var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
              updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(userAskAmountCLUB);
              updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.plus(totoalAskRemainingCLUB);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCLUB totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainCLUB userAllDetailsInDBAsker.FreezedCLUBbalance " + userAllDetailsInDBAsker.FreezedCLUBbalance);
              console.log("Total Ask RemainCLUB updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
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

              console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCLUBbalanceAsker ::: " + updatedFreezedCLUBbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCLUB
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidCLUB.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidCLUB.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidCLUB.update({
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
              sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskCLUB.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskCLUB.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskCLUB.update({
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
              sails.sockets.blast(constants.CLUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCLUB == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCLUB " + currentBidDetails.bidownerCLUB);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCLUB
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

              //var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(currentBidDetails.bidAmountCLUB));
              var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(currentBidDetails.bidAmountCLUB);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
              //var txFeesBidderCLUB = (parseFloat(currentBidDetails.bidAmountCLUB) * parseFloat(txFeeCLUBWithdrawSuccess));
              var txFeesBidderCLUB = new BigNumber(currentBidDetails.bidAmountCLUB);
              txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);
              console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
              //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
              console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedCLUBbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCLUB
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  CLUBbalance: updatedCLUBbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidCLUB.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidCLUB.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.CLUB_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCLUB
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
            //var updatedBidAmountCLUB = (parseFloat(currentBidDetails.bidAmountCLUB) - parseFloat(totoalAskRemainingCLUB));
            var updatedBidAmountCLUB = new BigNumber(currentBidDetails.bidAmountCLUB);
            updatedBidAmountCLUB = updatedBidAmountCLUB.minus(totoalAskRemainingCLUB);

            try {
              var updatedaskDetails = await BidCLUB.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountCLUB: updatedBidAmountCLUB,
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
            sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerCLUB
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


            //var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.CLUBbalance) + parseFloat(totoalAskRemainingCLUB));

            var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.CLUBbalance);
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(totoalAskRemainingCLUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
            //var bchAmountSucess = parseFloat(totoalAskRemainingCLUB);
            //var bchAmountSucess = new BigNumber(totoalAskRemainingCLUB);
            //var txFeesBidderCLUB = (parseFloat(bchAmountSucess) * parseFloat(txFeeCLUBWithdrawSuccess));
            //var txFeesBidderCLUB = (parseFloat(totoalAskRemainingCLUB) * parseFloat(txFeeCLUBWithdrawSuccess));
            var txFeesBidderCLUB = new BigNumber(totoalAskRemainingCLUB);
            txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);

            //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
            updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
            console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
            console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCLUBbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCLUB
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CLUBbalance: updatedCLUBbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCLUB");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(userAskAmountCLUB));
            var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
            updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(userAskAmountCLUB);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCLUBbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCLUB " + totoalAskRemainingCLUB);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCLUB
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskCLUB.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskCLUB.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskCLUB.update({
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
            sails.sockets.blast(constants.CLUB_ASK_DESTROYED, askDestroy);
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
  addBidCLUBMarket: async function(req, res) {
    console.log("Enter into ask api addBidCLUBMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountCLUB = new BigNumber(req.body.bidAmountCLUB);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = userBidAmountBTC.toFixed(8);
    userBidAmountCLUB = userBidAmountCLUB.toFixed(8);
    userBidRate = userBidRate.toFixed(8);


    if (!userBidAmountCLUB || !userBidAmountBTC ||
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
      var bidDetails = await BidCLUB.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountCLUB: userBidAmountCLUB,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountCLUB: userBidAmountCLUB,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        bidownerCLUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.CLUB_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskCLUB.find({
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
        var totoalBidRemainingCLUB = new BigNumber(userBidAmountCLUB);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of CLUB
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCLUB;
        }
        if (total_ask <= totoalBidRemainingCLUB) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCLUB :: " + totoalBidRemainingCLUB);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCLUB = totoalBidRemainingCLUB - allAsksFromdb[i].bidAmountCLUB;
            //totoalBidRemainingCLUB = (parseFloat(totoalBidRemainingCLUB) - parseFloat(currentAskDetails.askAmountCLUB));
            totoalBidRemainingCLUB = totoalBidRemainingCLUB.minus(currentAskDetails.askAmountCLUB);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingCLUB == 0::: " + totoalBidRemainingCLUB);
            if (totoalBidRemainingCLUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingCLUB == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerCLUB totoalBidRemainingCLUB == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(currentAskDetails.askAmountCLUB));
              var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
              updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(currentAskDetails.askAmountCLUB);
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
              console.log("After deduct TX Fees of CLUB Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCLUBbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCLUB
                }, {
                  FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker,
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
                  id: bidDetails.bidownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and CLUB  give to bidder
              //var updatedCLUBbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CLUBbalance) + parseFloat(totoalBidRemainingCLUB)) - parseFloat(totoalBidRemainingBTC);
              //var updatedCLUBbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CLUBbalance) + parseFloat(userBidAmountCLUB)) - parseFloat(totoalBidRemainingCLUB));
              var updatedCLUBbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CLUBbalance);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(userBidAmountCLUB);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(totoalBidRemainingCLUB);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCLUB totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCLUB BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainCLUB updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountCLUB) - parseFloat(totoalBidRemainingCLUB));
              var bchAmountSucess = new BigNumber(userBidAmountCLUB);
              bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingCLUB);

              //var txFeesBidderCLUB = (parseFloat(bchAmountSucess) * parseFloat(txFeeCLUBWithdrawSuccess));
              var txFeesBidderCLUB = new BigNumber(bchAmountSucess);
              txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);

              console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
              //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
              console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCLUB == 0updatedCLUBbalanceBidder ::: " + updatedCLUBbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCLUB asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCLUB
                }, {
                  CLUBbalance: updatedCLUBbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingCLUB == 0BidCLUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidCLUB.destroy({
              //   id: bidDetails.bidownerCLUB
              // });
              try {
                var bidDestroy = await BidCLUB.update({
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
              sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingCLUB == 0AskCLUB.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskCLUB.destroy({
              //   id: currentAskDetails.askownerCLUB
              // });
              try {
                var askDestroy = await AskCLUB.update({
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
              sails.sockets.blast(constants.CLUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0  enter into else of totoalBidRemainingCLUB == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == 0start User.findOne currentAskDetails.bidownerCLUB ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(currentAskDetails.askAmountCLUB));
              var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
              updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(currentAskDetails.askAmountCLUB);
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

              console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCLUB
                }, {
                  FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskCLUB.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskCLUB.update({
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

              sails.sockets.blast(constants.CLUB_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCLUB == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingCLUB == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCLUB");
              //var updatedCLUBbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CLUBbalance) + parseFloat(userBidAmountCLUB)) - parseFloat(totoalBidRemainingCLUB));
              var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBid.CLUBbalance);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(userBidAmountCLUB);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(totoalBidRemainingCLUB);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCLUB totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCLUB BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainCLUB updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountCLUB) - parseFloat(totoalBidRemainingCLUB));
              var bchAmountSucess = new BigNumber(userBidAmountCLUB);
              bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingCLUB);

              //var txFeesBidderCLUB = (parseFloat(bchAmountSucess) * parseFloat(txFeeCLUBWithdrawSuccess));
              var txFeesBidderCLUB = new BigNumber(bchAmountSucess);
              txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);

              console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
              //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);
              console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCLUBbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCLUB
                }, {
                  CLUBbalance: updatedCLUBbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCLUB totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCLUB.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountCLUB: totoalBidRemainingCLUB,
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
              sails.sockets.blast(constants.CLUB_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingCLUB :: " + totoalBidRemainingCLUB);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCLUB = totoalBidRemainingCLUB - allAsksFromdb[i].bidAmountCLUB;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingCLUB = totoalBidRemainingCLUB.minus(currentAskDetails.askAmountCLUB);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingCLUB == 0::: " + totoalBidRemainingCLUB);

              if (totoalBidRemainingCLUB == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingCLUB == 0Enter into totoalBidRemainingCLUB == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCLUB
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
                    id: bidDetails.bidownerCLUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingCLUB == 0userAll bidDetails.askownerCLUB :: ");
                console.log(" totoalBidRemainingCLUB == 0Update value of Bidder and asker");
                //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(currentAskDetails.askAmountCLUB));
                var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
                updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(currentAskDetails.askAmountCLUB);

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

                console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCLUB == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCLUB == 0updatedFreezedCLUBbalanceAsker ::: " + updatedFreezedCLUBbalanceAsker);
                console.log(" totoalBidRemainingCLUB == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCLUB
                  }, {
                    FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedCLUBbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(userBidAmountCLUB)) - parseFloat(totoalBidRemainingCLUB));

                var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
                updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(userBidAmountCLUB);
                updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(totoalBidRemainingCLUB);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCLUB totoalAskRemainingCLUB " + totoalBidRemainingBTC);
                console.log("Total Ask RemainCLUB BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainCLUB updatedFreezedCLUBbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
                //var bchAmountSucess = (parseFloat(userBidAmountCLUB) - parseFloat(totoalBidRemainingCLUB));
                var bchAmountSucess = new BigNumber(userBidAmountCLUB);
                bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingCLUB);


                //var txFeesBidderCLUB = (parseFloat(bchAmountSucess) * parseFloat(txFeeCLUBWithdrawSuccess));
                var txFeesBidderCLUB = new BigNumber(bchAmountSucess);
                txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);
                console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
                //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
                updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);

                console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCLUB == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCLUB == 0 updatedFreezedCLUBbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCLUB
                  }, {
                    CLUBbalance: updatedCLUBbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingCLUB == 0 BidCLUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskCLUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskCLUB.update({
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
                sails.sockets.blast(constants.CLUB_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingCLUB == 0 AskCLUB.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidCLUB.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidCLUB.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0 enter into else of totoalBidRemainingCLUB == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0totoalBidRemainingCLUB == 0 start User.findOne currentAskDetails.bidownerCLUB " + currentAskDetails.bidownerCLUB);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCLUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(currentAskDetails.askAmountCLUB));

                var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
                updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(currentAskDetails.askAmountCLUB);

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
                console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0 updatedFreezedCLUBbalanceAsker:: " + updatedFreezedCLUBbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCLUB
                  }, {
                    FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCLUB == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskCLUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskCLUB.update({
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
                sails.sockets.blast(constants.CLUB_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCLUB = (parseFloat(currentAskDetails.askAmountCLUB) - parseFloat(totoalBidRemainingCLUB));

              var updatedAskAmountCLUB = new BigNumber(currentAskDetails.askAmountCLUB);
              updatedAskAmountCLUB = updatedAskAmountCLUB.minus(totoalBidRemainingCLUB);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskCLUB.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountCLUB: updatedAskAmountCLUB,
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
              sails.sockets.blast(constants.CLUB_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedCLUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCLUBbalance) - parseFloat(totoalBidRemainingCLUB));
              var updatedFreezedCLUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCLUBbalance);
              updatedFreezedCLUBbalanceAsker = updatedFreezedCLUBbalanceAsker.minus(totoalBidRemainingCLUB);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCLUB totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCLUB userAllDetailsInDBAsker.FreezedCLUBbalance " + userAllDetailsInDBAsker.FreezedCLUBbalance);
              console.log("Total Ask RemainCLUB updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of CLUB Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedCLUBbalanceAsker:: " + updatedFreezedCLUBbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCLUBbalanceAsker " + updatedFreezedCLUBbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCLUB
                }, {
                  FreezedCLUBbalance: updatedFreezedCLUBbalanceAsker,
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
                  id: bidDetails.bidownerCLUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCLUB");
              //var updatedCLUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CLUBbalance) + parseFloat(userBidAmountCLUB));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountCLUB " + userBidAmountCLUB);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.CLUBbalance " + userAllDetailsInDBBidder.CLUBbalance);

              var updatedCLUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CLUBbalance);
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.plus(userBidAmountCLUB);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);
              //var txFeesBidderCLUB = (parseFloat(updatedCLUBbalanceBidder) * parseFloat(txFeeCLUBWithdrawSuccess));
              var txFeesBidderCLUB = new BigNumber(userBidAmountCLUB);
              txFeesBidderCLUB = txFeesBidderCLUB.times(txFeeCLUBWithdrawSuccess);

              console.log("txFeesBidderCLUB :: " + txFeesBidderCLUB);
              //updatedCLUBbalanceBidder = (parseFloat(updatedCLUBbalanceBidder) - parseFloat(txFeesBidderCLUB));
              updatedCLUBbalanceBidder = updatedCLUBbalanceBidder.minus(txFeesBidderCLUB);

              console.log("After deduct TX Fees of CLUB Update user " + updatedCLUBbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedCLUBbalanceBidder ::: " + updatedCLUBbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCLUBbalanceBidder " + updatedCLUBbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCLUB " + totoalBidRemainingCLUB);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCLUB
                }, {
                  CLUBbalance: updatedCLUBbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidCLUB.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidCLUB.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidCLUB.update({
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
              sails.sockets.blast(constants.CLUB_BID_DESTROYED, bidDestroy);
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
  removeBidCLUBMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdCLUB;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidCLUB.findOne({
      bidownerCLUB: bidownerId,
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
            BidCLUB.destroy({
              id: userBidId
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.CLUB_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  removeAskCLUBMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdCLUB;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskCLUB.findOne({
      askownerCLUB: askownerId,
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
        var userCLUBBalanceInDb = parseFloat(user.CLUBbalance);
        var askAmountOfCLUBInAskTableDB = parseFloat(askDetails.askAmountCLUB);
        var userFreezedCLUBbalanceInDB = parseFloat(user.FreezedCLUBbalance);
        console.log("userCLUBBalanceInDb :" + userCLUBBalanceInDb);
        console.log("askAmountOfCLUBInAskTableDB :" + askAmountOfCLUBInAskTableDB);
        console.log("userFreezedCLUBbalanceInDB :" + userFreezedCLUBbalanceInDB);
        var updateFreezedCLUBBalance = (parseFloat(userFreezedCLUBbalanceInDB) - parseFloat(askAmountOfCLUBInAskTableDB));
        var updateUserCLUBBalance = (parseFloat(userCLUBBalanceInDb) + parseFloat(askAmountOfCLUBInAskTableDB));
        User.update({
            id: askownerId
          }, {
            CLUBbalance: parseFloat(updateUserCLUBBalance),
            FreezedCLUBbalance: parseFloat(updateFreezedCLUBBalance)
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
            AskCLUB.destroy({
              id: userAskId
            }).exec(function(err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.CLUB_ASK_DESTROYED, ask);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidCLUB: function(req, res) {
    console.log("Enter into ask api getAllBidCLUB :: ");
    BidCLUB.find()
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
            BidCLUB.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('bidAmountCLUB')
              .exec(function(err, bidAmountCLUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCLUBSum",
                    statusCode: 401
                  });
                }
                BidCLUB.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCLUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCLUB: allAskDetailsToExecute,
                      bidAmountCLUBSum: bidAmountCLUBSum[0].bidAmountCLUB,
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
  getAllAskCLUB: function(req, res) {
    console.log("Enter into ask api getAllAskCLUB :: ");
    AskCLUB.find()
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
            AskCLUB.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('askAmountCLUB')
              .exec(function(err, askAmountCLUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCLUBSum",
                    statusCode: 401
                  });
                }
                AskCLUB.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCLUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCLUB: allAskDetailsToExecute,
                      askAmountCLUBSum: askAmountCLUBSum[0].askAmountCLUB,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCLUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsCLUBSuccess: function(req, res) {
    console.log("Enter into ask api getBidsCLUBSuccess :: ");
    BidCLUB.find({
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
            BidCLUB.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountCLUB')
              .exec(function(err, bidAmountCLUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCLUBSum",
                    statusCode: 401
                  });
                }
                BidCLUB.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCLUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCLUB: allAskDetailsToExecute,
                      bidAmountCLUBSum: bidAmountCLUBSum[0].bidAmountCLUB,
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
  getAsksCLUBSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCLUBSuccess :: ");
    AskCLUB.find({
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
            AskCLUB.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountCLUB')
              .exec(function(err, askAmountCLUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCLUBSum",
                    statusCode: 401
                  });
                }
                AskCLUB.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCLUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCLUB: allAskDetailsToExecute,
                      askAmountCLUBSum: askAmountCLUBSum[0].askAmountCLUB,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCLUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },


};