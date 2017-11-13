/**
 * AskController
 *
 * @description :: Server-side logic for managing asks
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

var _ = require('underscore');

module.exports = {
  addBidBchMarket: async function(req, res) {
    console.log("Enter into ask api addAsk :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountBCH = req.body.bidAmountBCH;
    var userBidRate = req.body.bidRate;
    var userBidownerId = req.body.bidowner;
    var userSpendingPassword = req.body.spendingPassword;
    if (!userBidAmountBCH || !userBidAmountBTC || !userSpendingPassword ||
      !userBidRate || !userBidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    var userBidder = await User.findOne({
      id: userBidownerId
    });
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
    if (userBidAmountBTC >= userBTCBalanceInDb) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    var bidDetails = await Bid.create({
      bidAmountBTC: userBidAmountBTC,
      bidAmountBCH: userBidAmountBCH,
      bidRate: parseFloat(userBidRate),
      bidowner: userIdInDb
    });
    var updateUserBTCBalance = parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
    var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC)).toFixed(8);

    var userUpdateAsk = await User.update({
      id: userIdInDb
    }, {
      FreezedBTCbalance: updateFreezedBTCBalance,
      BTCbalance: updateUserBTCBalance,
    });
    var allAsksFromdb = await Ask.find({
      bidRate: {
        'like': parseFloat(userBidRate)
      }
    });
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
              console.log("Enter into totoalAskRemainingBCH == 0");
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              var BidderuserAllDetailsInDBBidder = await User.findOne({
                id: bidDetails.bidowner
              });
              console.log("userAll askDetails.askowner :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              //current ask details of Asker  updated
              //Ask FreezedBCHbalance balance of asker deducted and BTC to give asker
              var userUpdateAsker = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedBCHbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BTCbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and BCH  give to bidder
              var updatedBCHbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BCHbalance) + parseFloat(totoalBidRemainingBCH)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBTCbalanceAsker = parseFloat(totoalAskRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceAsker).toFixed(8)
              });
              console.log(currentAskDetails.id + " Bid.destroy currentAskDetails.id::: " + currentAskDetails.id);
              var bidDestroy = await Bid.destroy({
                id: bidDetails.bidowner
              });
              console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await Ask.destroy({
                id: currentAskDetails.askowner
              });
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });

            } else {
              //destroy bid
              console.log(currentAskDetails.id + " enter into else of totoalAskRemainingBCH == 0");
              console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidowner " + currentAskDetails.bidowner);
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              var updatedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentAskDetails.id + " updatedBTCbalanceBidder:: " + updatedBTCbalanceBidder);

              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceBidder).toFixed(8),
                BTCbalance: parseFloat(updatedBTCbalanceBidder).toFixed(8)
              });
              console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              var destroyCurrentAsk = await Ask.destroy({
                id: currentAskDetails.id
              });
              console.log(currentAskDetails.id + " Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " userAll Details :: ");
              console.log(currentAskDetails.id + " enter into i == allBidsFromdb.length - 1");

              var userAllDetailsInDBBid = await User.findOne({
                id: bidDetails.bidowner
              });
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalAskRemainingBCH).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(totoalAskRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });

              console.log(currentAskDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
              console.log(currentAskDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log(currentAskDetails.id + " askDetails.id ::: " + askDetails.id);
              var updatedbidDetails = await Bid.update({
                id: bidDetails.bidowner
              }, {
                bidAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                bidAmountBCH: parseFloat(totoalAskRemainingBCH).toFixed(8)
              });

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
            console.log(currentAskDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalAskRemainingBCH = totoalAskRemainingBCH - allAsksFromdb[i].bidAmountBCH;
            if (totoalAskRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
              totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
              console.log("start from here totoalAskRemainingBCH == 0::: " + totoalAskRemainingBCH);

              if (totoalAskRemainingBCH == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalAskRemainingBCH == 0");
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askowner
                });
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidowner
                });
                console.log("userAll askDetails.askowner :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askowner
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalAskRemainingBCH).toFixed(8);
                var updatedFreezedBTCbalanceBidder = parseFloat(totoalAskRemainingBTC).toFixed(8);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
                var updatedUser = await User.update({
                  id: bidDetails.bidowner
                }, {
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
                console.log(currentAskDetails.id + " Bid.destroy currentAskDetails.id::: " + currentAskDetails.id);
                var bidDestroy = await Ask.destroy({
                  id: currentAskDetails.id
                });
                console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
                var bidDestroy = await Bid.destroy({
                  id: bidDetails.id
                });
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " enter into else of totoalAskRemainingBCH == 0");
                console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidowner " + currentAskDetails.bidowner);
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askowner
                });
                console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askowner
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
                console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                var destroyCurrentAsk = await Ask.destroy({
                  id: currentAskDetails.id
                });
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " userAll Details :: ");
              console.log(currentAskDetails.id + " enter into i == allBidsFromdb.length - 1");
              var userAllDetailsInDBBidder = await User.findOne({
                id: bidDetails.bidowner
              });
              //Update Ask
              var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH).toFixed(8) - parseFloat(totoalAskRemainingBCH).toFixed(8));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalAskRemainingBTC)).toFixed(8);

              var updatedaskDetails = await Ask.update({
                id: currentAskDetails.id
              }, {
                askAmountBTC: parseFloat(updatedAskAmountBTC).toFixed(8),
                askAmountBCH: parseFloat(updatedAskAmountBCH).toFixed(8)
              });

              //Update Asker===========================================11
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(totoalAskRemainingBCH).toFixed(8));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalAskRemainingBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
              });
              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userAskAmountBCH)).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(userAskAmountBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBCHbalanceBidder);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBTCbalanceBidder);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });
              //Destroy Ask===========================================Working
              console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
              var bidDestroy = await Ask.destroy({
                id: bidDetails.id
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
        "total_ask": total_ask,
        "bids": allAsksFromdb,
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
};
