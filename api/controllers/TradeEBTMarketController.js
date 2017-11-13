/**
 * TradeEBTMarketController
 *
 * @description :: Server-side logic for managing tradeebtmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  addAskEBTMarket: async function(req, res) {
    console.log("Enter into ask api addAskEBTMarket :: " + JSON.stringify(req.body));
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountEBT = req.body.askAmountEBT;
    var userAskRate = req.body.askRate;
    var userAskownerId = req.body.askownerId;
    if (!userAskAmountEBT || !userAskAmountBTC ||
      !userAskRate || !userAskownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    var userAsker = await User.findOne({
      id: userAskownerId
    });
    console.log("Valid spending password !!!");
    console.log("Getting user details !!!");
    var userEBTBalanceInDb = parseFloat(userAsker.EBTbalance).toFixed(8);
    var userFreezedEBTBalanceInDb = parseFloat(userAsker.FreezedEBTbalance).toFixed(8);
    var userIdInDb = parseFloat(userAsker.id).toFixed(8);
    if (userAskAmountEBT >= userEBTBalanceInDb) {
      return res.json({
        "message": "You have insufficient EBT Balance",
        statusCode: 401
      });
    }
    var askDetails = await AskEBT.create({
      askAmountBTC: userAskAmountBTC,
      askAmountEBT: userAskAmountEBT,
      askRate: parseFloat(userAskRate).toFixed(8),
      askowner: userIdInDb
    });
    var updateUserEBTBalance = parseFloat(userEBTBalanceInDb).toFixed(8) - parseFloat(userAskAmountEBT).toFixed(8);
    var updateFreezedEBTBalance = (parseFloat(userFreezedEBTBalanceInDb) + parseFloat(userAskAmountEBT)).toFixed(8);

    var userUpdateAsk = await User.update({
      id: userIdInDb
    }, {
      FreezedEBTbalance: updateFreezedEBTBalance,
      EBTbalance: updateUserEBTBalance,
    });
    var allBidsFromdb = await BidEBT.find({
      bidRate: {
        'like': parseFloat(userAskRate)
      }
    });
    if (allBidsFromdb) {
      if (allBidsFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_bid = 0;
        var totoalAskRemainingEBT = userAskAmountEBT;
        var totoalAskRemainingBTC = userAskAmountBTC;
        //this loop for sum of all Bids amount of EBT
        for (var i = 0; i < allBidsFromdb.length; i++) {
          total_bid = total_bid + allBidsFromdb[i].bidAmountEBT;
        }
        if (total_bid <= totoalAskRemainingEBT) {
          for (var i = 0; i < allBidsFromdb.length; i++) {
            currentBidDetails = allBidsFromdb[i];
            console.log(currentBidDetails.id + " totoalAskRemainingEBT :: " + totoalAskRemainingEBT);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5

            console.log("Enter into total_bid <= totoalAskRemainingEBT");
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingEBT = totoalAskRemainingEBT - allBidsFromdb[i].bidAmountEBT;
            totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT).toFixed(8) - parseFloat(currentBidDetails.bidAmountEBT).toFixed(8));
            totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
            console.log("start from here totoalAskRemainingEBT == 0::: " + totoalAskRemainingEBT);
            if (totoalAskRemainingEBT == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingEBT == 0");
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askowner
              })
              console.log("userAll askDetails.askowner :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT)).toFixed(8);
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
              });
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8)
              });
              console.log(currentBidDetails.id + " BidEBT.destroy currentBidDetails.id::: " + currentBidDetails.id);
              var bidDestroy = await BidEBT.destroy({
                id: currentBidDetails.id
              });
              console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await AskEBT.destroy({
                id: askDetails.id
              });
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEBT == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidowner " + currentBidDetails.bidowner);
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);

              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
              });
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              var desctroyCurrentBid = await BidEBT.destroy({
                id: currentBidDetails.id
              });
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
            console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
            if (i == allBidsFromdb.length - 1) {
              console.log(currentBidDetails.id + " userAll Details :: ");
              console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askowner
              });
              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8)
              });

              console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
              console.log(currentBidDetails.id + " Update In last Ask askAmountEBT totoalAskRemainingEBT " + totoalAskRemainingEBT);
              console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
              var updatedaskDetails = await AskEBT.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                askAmountEBT: parseFloat(totoalAskRemainingEBT).toFixed(8)
              });
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
              totoalAskRemainingEBT = (parseFloat(totoalAskRemainingEBT).toFixed(8) - parseFloat(currentBidDetails.bidAmountEBT).toFixed(8));
              totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              console.log("start from here totoalAskRemainingEBT == 0::: " + totoalAskRemainingEBT);

              if (totoalAskRemainingEBT == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalAskRemainingEBT == 0");
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidowner
                });
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askowner
                });
                console.log("userAll askDetails.askowner :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT)).toFixed(8);
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidowner
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
                });
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
                var updatedFreezedEBTbalanceAsker = parseFloat(totoalAskRemainingEBT).toFixed(8);
                console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
                var updatedUser = await User.update({
                  id: askDetails.askowner
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8)
                });
                console.log(currentBidDetails.id + " BidEBT.destroy currentBidDetails.id::: " + currentBidDetails.id);
                var bidDestroy = await BidEBT.destroy({
                  id: currentBidDetails.id
                });
                console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);
                var askDestroy = await AskEBT.destroy({
                  id: askDetails.id
                });
                return res.json({
                  "message": "Ask Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEBT == 0");
                console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidowner " + currentBidDetails.bidowner);
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidowner
                });
                console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(currentBidDetails.bidAmountEBT)).toFixed(8);
                console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
                console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);

                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidowner
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
                });
                console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
                var desctroyCurrentBid = await BidEBT.destroy({
                  id: currentBidDetails.id
                });
                console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break

              console.log(currentBidDetails.id + " userAll Details :: ");
              console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askowner
              });
              //Update Bid
              var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedBidAmountEBT = (parseFloat(currentBidDetails.bidAmountEBT) - parseFloat(totoalAskRemainingEBT)).toFixed(8);

              var updatedaskDetails = await BidEBT.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: parseFloat(updatedBidAmountBTC).toFixed(8),
                bidAmountEBT: parseFloat(updatedBidAmountEBT).toFixed(8)
              });

              //Update Bidder===========================================
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.EBTbalance) + parseFloat(totoalAskRemainingEBT)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEBTbalanceBidder:: " + updatedEBTbalanceBidder);
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
              });
              //Update asker ===========================================

              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8);
              var updatedFreezedEBTbalanceAsker = parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(userAskAmountEBT).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8)
              });
              //Destroy Ask===========================================
              console.log(currentBidDetails.id + " AskEBT.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await AskEBT.destroy({
                id: askDetails.id
              });
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
  addBidEBTMarket: async function(req, res) {
    console.log("Enter into ask api addBidEBTMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountEBT = req.body.bidAmountEBT;
    var userBidRate = req.body.bidRate;
    var userBidownerId = req.body.bidownerId;

    if (!userBidAmountEBT || !userBidAmountBTC ||
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
    console.log("BidEBT.create ............");
    var bidDetails = await BidEBT.create({
      bidAmountBTC: userBidAmountBTC,
      bidAmountEBT: userBidAmountEBT,
      bidRate: parseFloat(userBidRate),
      bidowner: userIdInDb
    });
    console.log("Bid created .........");
    var updateUserBTCBalance = parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
    var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC)).toFixed(8);
    console.log("Updating ");
    var userUpdateBidDetails = await User.update({
      id: userIdInDb
    }, {
      FreezedBTCbalance: updateFreezedBTCBalance,
      BTCbalance: updateUserBTCBalance,
    });
    console.log("Bid created .........");
    var allAsksFromdb = await AskEBT.find({
      askRate: {
        'like': parseFloat(userBidRate)
      }
    });
    console.log("Getting all bids details.............");
    if (allAsksFromdb) {
      if (allAsksFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_ask = 0;
        var totoalBidRemainingEBT = userBidAmountEBT;
        var totoalBidRemainingBTC = userBidAmountBTC;
        //this loop for sum of all Bids amount of EBT
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].bidAmountEBT;
        }
        if (total_ask <= totoalBidRemainingEBT) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEBT :: " + totoalBidRemainingEBT);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingEBT = totoalBidRemainingEBT - allAsksFromdb[i].bidAmountEBT;
            totoalBidRemainingEBT = (parseFloat(totoalBidRemainingEBT).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
            console.log("start from here totoalBidRemainingEBT == 0::: " + totoalBidRemainingEBT);
            if (totoalBidRemainingEBT == 0) {

              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingEBT == 0");
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              var BidderuserAllDetailsInDBBidder = await User.findOne({
                id: bidDetails.bidowner
              });
              console.log("userAll bidDetails.askowner :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              //current ask details of Asker  updated
              //Ask FreezedEBTbalance balance of asker deducted and BTC to give asker
              var userUpdateAsker = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedEBTbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BTCbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8)
              });
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and EBT  give to bidder
              var updatedEBTbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.EBTbalance) + parseFloat(totoalBidRemainingEBT)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBTCbalanceAsker = parseFloat(totoalAskRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceAsker).toFixed(8)
              });
              console.log(currentAskDetails.id + " BidEBT.destroy currentAskDetails.id::: " + currentAskDetails.id);
              var bidDestroy = await BidEBT.destroy({
                id: bidDetails.bidowner
              });
              console.log(currentAskDetails.id + " AskEBT.destroy bidDetails.id::: " + bidDetails.id);
              var askDestroy = await AskEBT.destroy({
                id: currentAskDetails.askowner
              });
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });

            } else {
              //destroy bid
              console.log(currentAskDetails.id + " enter into else of totoalBidRemainingEBT == 0");
              console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidowner " + currentAskDetails.bidowner);
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedEBTbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
              var updatedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedEBTbalanceBidder:: " + updatedFreezedEBTbalanceBidder);
              console.log(currentAskDetails.id + " updatedBTCbalanceBidder:: " + updatedBTCbalanceBidder);

              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceBidder).toFixed(8),
                BTCbalance: parseFloat(updatedBTCbalanceBidder).toFixed(8)
              });
              console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              var destroyCurrentAsk = await AskEBT.destroy({
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
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askowner");
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidEBT.EBTbalance) + parseFloat(userBidAmountEBT)).toFixed(8) - parseFloat(totoalBidRemainingEBT).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });
              console.log(currentAskDetails.id + " Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " Update In last Ask askAmountEBT totoalBidRemainingEBT " + totoalBidRemainingEBT);
              console.log(currentAskDetails.id + " bidDetails.id ::: " + bidDetails.id);
              var updatedbidDetails = await BidEBT.update({
                id: bidDetails.bidowner
              }, {
                bidAmountBTC: parseFloat(totoalBidRemainingBTC).toFixed(8),
                bidAmountEBT: parseFloat(totoalBidRemainingEBT).toFixed(8)
              });
            }
          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEBT :: " + totoalBidRemainingEBT);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingEBT = totoalBidRemainingEBT - allAsksFromdb[i].bidAmountEBT;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingEBT = (parseFloat(totoalBidRemainingEBT).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
              totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.askAmountBTC).toFixed(8));
              console.log("start from here totoalBidRemainingEBT == 0::: " + totoalBidRemainingEBT);

              if (totoalBidRemainingEBT == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log("Enter into totoalBidRemainingEBT == 0");
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askowner
                });
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidowner
                });
                console.log("userAll bidDetails.askowner :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askowner
                }, {
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
                var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)).toFixed(8) - parseFloat(totoalBidRemainingEBT).toFixed(8);
                var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedEBTbalanceAsker);
                var updatedUser = await User.update({
                  id: bidDetails.bidowner
                }, {
                  EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8),
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
                });
                console.log(currentAskDetails.id + " BidEBT.destroy currentAskDetails.id::: " + currentAskDetails.id);
                var bidDestroy = await AskEBT.destroy({
                  id: currentAskDetails.id
                });
                console.log(currentAskDetails.id + " AskEBT.destroy bidDetails.id::: " + bidDetails.id);
                var bidDestroy = await BidEBT.destroy({
                  id: bidDetails.id
                });
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " enter into else of totoalBidRemainingEBT == 0");
                console.log(currentAskDetails.id + " start User.findOne currentAskDetails.bidowner " + currentAskDetails.bidowner);
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askowner
                });
                console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountEBT).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
                console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);

                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askowner
                }, {
                  FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
                console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                var destroyCurrentAsk = await AskEBT.destroy({
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
              var updatedAskAmountEBT = (parseFloat(currentAskDetails.askAmountEBT).toFixed(8) - parseFloat(totoalBidRemainingEBT).toFixed(8));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC)).toFixed(8);

              var updatedaskDetails = await AskEBT.update({
                id: currentAskDetails.id
              }, {
                askAmountBTC: parseFloat(updatedAskAmountBTC).toFixed(8),
                askAmountEBT: parseFloat(updatedAskAmountEBT).toFixed(8)
              });

              //Update Asker===========================================11
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              var updatedFreezedEBTbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEBTbalance).toFixed(8) - parseFloat(totoalBidRemainingEBT).toFixed(8));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker:: " + updatedFreezedEBTbalanceAsker);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedEBTbalance: parseFloat(updatedFreezedEBTbalanceAsker).toFixed(8),
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
              });
              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askowner");
              var updatedEBTbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EBTbalance) + parseFloat(userBidAmountEBT)).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedEBTbalanceBidder);
              console.log(currentAskDetails.id + " updatedFreezedEBTbalanceAsker ::: " + updatedFreezedBTCbalanceBidder);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                EBTbalance: parseFloat(updatedEBTbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });
              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " BidEBT.destroy bidDetails.id::: " + bidDetails.id);
              var bidDestroy = await BidEBT.destroy({
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
  }
};
