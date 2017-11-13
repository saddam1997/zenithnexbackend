/**
 * TradebchmarketController
 *
 * @description :: Server-side logic for managing tradebchmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  addAskBchMarket: async function(req, res) {
    console.log("Enter into ask api addAskBchMarket :: " + JSON.stringify(req.body));
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountBCH = req.body.askAmountBCH;
    var userAskRate = req.body.askRate;
    var userAskownerId = req.body.askownerId;
    if (!userAskAmountBCH || !userAskAmountBTC ||
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
    var userBCHBalanceInDb = parseFloat(userAsker.BCHbalance).toFixed(8);
    var userFreezedBCHBalanceInDb = parseFloat(userAsker.FreezedBCHbalance).toFixed(8);
    var userIdInDb = parseFloat(userAsker.id).toFixed(8);
    if (userAskAmountBCH >= userBCHBalanceInDb) {
      return res.json({
        "message": "You have insufficient BCH Balance",
        statusCode: 401
      });
    }
    var askDetails = await Ask.create({
      askAmountBTC: userAskAmountBTC,
      askAmountBCH: userAskAmountBCH,
      askRate: parseFloat(userAskRate).toFixed(8),
      askowner: userIdInDb
    });
    var updateUserBCHBalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
    var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userAskAmountBCH)).toFixed(8);

    var userUpdateAsk = await User.update({
      id: userIdInDb
    }, {
      FreezedBCHbalance: updateFreezedBCHBalance,
      BCHbalance: updateUserBCHBalance,
    });
    var allBidsFromdb = await Bid.find({
      bidRate: {
        'like': parseFloat(userAskRate)
      }
    });
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
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askowner
              })
              console.log("userAll askDetails.askowner :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
              });
              console.log(currentBidDetails.id + " Bid.destroy currentBidDetails.id::: " + currentBidDetails.id);
              var bidDestroy = await Bid.destroy({
                id: currentBidDetails.id
              });
              console.log(currentBidDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await Ask.destroy({
                id: askDetails.id
              });
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidowner " + currentBidDetails.bidowner);
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              var desctroyCurrentBid = await Bid.destroy({
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
              var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
              });
              console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
              console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
              var updatedaskDetails = await Ask.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC).toFixed(8),
                askAmountBCH: parseFloat(totoalAskRemainingBCH).toFixed(8)
              });
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
                  id: currentBidDetails.bidowner
                });
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askowner
                });
                console.log("userAll askDetails.askowner :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidowner
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8);
                var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH).toFixed(8);
                console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
                var updatedUser = await User.update({
                  id: askDetails.askowner
                }, {
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
                });
                console.log(currentBidDetails.id + " Bid.destroy currentBidDetails.id::: " + currentBidDetails.id);
                var bidDestroy = await Bid.destroy({
                  id: currentBidDetails.id
                });
                console.log(currentBidDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
                var askDestroy = await Ask.destroy({
                  id: askDetails.id
                });
                return res.json({
                  "message": "Ask Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
                console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidowner " + currentBidDetails.bidowner);
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidowner
                });
                console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
                var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(currentBidDetails.bidAmountBTC).toFixed(8));
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH)).toFixed(8);
                console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
                console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);

                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidowner
                }, {
                  FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                  BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                });
                console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
                var desctroyCurrentBid = await Bid.destroy({
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
              var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH)).toFixed(8);

              var updatedaskDetails = await Bid.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: parseFloat(updatedBidAmountBTC).toFixed(8),
                bidAmountBCH: parseFloat(updatedBidAmountBCH).toFixed(8)
              });

              //Update Bidder===========================================
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidowner
              });
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance).toFixed(8) - parseFloat(totoalAskRemainingBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.BCHbalance) + parseFloat(totoalAskRemainingBCH)).toFixed(8);
              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              //Update asker ===========================================

              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askowner");
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
              console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
              });
              //Destroy Ask===========================================
              console.log(currentBidDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await Ask.destroy({
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
  addBidBchMarket: async function(req, res) {
    console.log("Enter into ask api addBidBchMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = req.body.bidAmountBTC;
    var userBidAmountBCH = req.body.bidAmountBCH;
    var userBidRate = req.body.bidRate;
    var userBidownerId = req.body.bidownerId;

    if (!userBidAmountBCH || !userBidAmountBTC ||
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
    var bidDetails = await Bid.create({
      bidAmountBTC: userBidAmountBTC,
      bidAmountBCH: userBidAmountBCH,
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
    var allAsksFromdb = await Ask.find({
      askRate: {
        'like': parseFloat(userBidRate)
      }
    });
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
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.askowner
              });
              var BidderuserAllDetailsInDBBidder = await User.findOne({
                id: bidDetails.bidowner
              });
              console.log("userAll bidDetails.askowner :: ");
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
              console.log(currentAskDetails.id + " Ask.destroy bidDetails.id::: " + bidDetails.id);
              var askDestroy = await Ask.destroy({
                id: currentAskDetails.askowner
              });
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });

            } else {
              //destroy bid
              console.log(currentAskDetails.id + " enter into else of totoalBidRemainingBCH == 0");
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
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askowner");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });

              console.log(currentAskDetails.id + " Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log(currentAskDetails.id + " bidDetails.id ::: " + bidDetails.id);
              var updatedbidDetails = await Bid.update({
                id: bidDetails.bidowner
              }, {
                bidAmountBTC: parseFloat(totoalBidRemainingBTC).toFixed(8),
                bidAmountBCH: parseFloat(totoalBidRemainingBCH).toFixed(8)
              });

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
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askowner
                });
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidowner
                });
                console.log("userAll bidDetails.askowner :: ");
                console.log("Update value of Bidder and asker");
                var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(currentAskDetails.askAmountBCH).toFixed(8));
                var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC)).toFixed(8);
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askowner
                }, {
                  FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                  BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
                });
                var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8);
                var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC).toFixed(8);
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
                console.log(currentAskDetails.id + " Ask.destroy bidDetails.id::: " + bidDetails.id);
                var bidDestroy = await Bid.destroy({
                  id: bidDetails.id
                });
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " enter into else of totoalBidRemainingBCH == 0");
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
              var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8));
              var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC)).toFixed(8);

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
              var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(totoalBidRemainingBCH).toFixed(8));
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.askowner
              }, {
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8),
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8)
              });
              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askowner");
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)).toFixed(8);
              var updatedFreezedBTCbalanceBidder = parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance).toFixed(8) - parseFloat(userBidAmountBTC).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBCHbalanceBidder);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBTCbalanceBidder);
              var updatedUser = await User.update({
                id: bidDetails.bidowner
              }, {
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8),
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8)
              });
              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " Bid.destroy bidDetails.id::: " + bidDetails.id);
              var bidDestroy = await Bid.destroy({
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
  removeBidBCHMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidId;
    var bidownerId = req.body.bidownerId;

    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    Bid.findOne({
      bidowner: bidownerId,
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
            Bid.destroy({
              id: userBidId
            }).exec(function(err) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }
              console.log("Returning user details !!!");
              User.findOne({
                  id: bidownerId
                })
                .populateAll()
                .exec(function(err, userDetailsReturn) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!userDetailsReturn) {
                    return res.json({
                      "message": "Invalid Id!",
                      statusCode: 401
                    });
                  }
                  return res.json(200, {
                    user: userDetailsReturn,
                    statusCode: 200
                  });
                });
            });
          });
      });
    });
  },
  removeAskBCHMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askId;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    Ask.findOne({
      askowner: askownerId,
      id: userAskId
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
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing ask !!!");
            Ask.destroy({
              id: userAskId
            }).exec(function(err) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              console.log("Returning user details !!!");
              User.findOne({
                  id: askownerId
                })
                .populateAll()
                .exec(function(err, userDetailsReturn) {
                  if (err) {
                    return res.json({
                      "message": "Error to find user",
                      statusCode: 401
                    });
                  }
                  if (!userDetailsReturn) {
                    return res.json({
                      "message": "Invalid Id!",
                      statusCode: 401
                    });
                  }
                  return res.json({
                    user: userDetailsReturn,
                    statusCode: 200
                  });
                });
            });
          });
      });
    });
  },
};
