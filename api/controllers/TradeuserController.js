/**
 * TradeuserController
 *
 * @description :: Server-side logic for managing tradeusers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  addAskBchMarket: async function(req, res) {
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
    var userAsker = await User.findOne({
      id: userAskownerId
    });
    try {
      var valid = await User.compareSpendingpassword(userSpendingPassword, userAsker);

    } catch (e) {
      console.log("Eeeeeeeeeeee", e);
      return res.json({
        "message": 'Enter valid spending password',
        statusCode: 401
      });
    }
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
              //Update asker===========================================

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
};
