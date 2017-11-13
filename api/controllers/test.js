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
    bidRate: parseFloat(userBidRate).toFixed(8),
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
            console.log("Enter into totoalBidRemainingBCH == 0");
            var userAllDetailsInDBAsker = await User.findOne({
              id: currentAskDetails.askowner
            });
            var userAllDetailsInDBAsker = await User.findOne({
              id: askDetails.askowner
            })
            console.log("userAll askDetails.askowner :: ");
            console.log("Update value of Bidder and asker");
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBTCbalance).toFixed(8) - parseFloat(currentAskDetails.bidAmountBTC).toFixed(8));
            var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.bidAmountBCH)).toFixed(8);
            var userUpdateBidder = await User.update({
              id: currentAskDetails.askowner
            }, {
              FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
              BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
            });
            var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userBidAmountBTC)).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8);
            var updatedFreezedBCHbalanceAsker = parseFloat(totoalBidRemainingBCH).toFixed(8);
            console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
            var updatedUser = await User.update({
              id: askDetails.askowner
            }, {
              BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
              FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
            });
            console.log(currentAskDetails.id + " Bid.destroy currentAskDetails.id::: " + currentAskDetails.id);
            var bidDestroy = await Bid.destroy({
              id: currentAskDetails.id
            });
            console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
            var askDestroy = await Ask.destroy({
              id: askDetails.id
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
              id: currentAskDetails.bidowner
            });
            console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBTCbalance).toFixed(8) - parseFloat(currentAskDetails.bidAmountBTC).toFixed(8));
            var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.bidAmountBCH)).toFixed(8);
            console.log(currentAskDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentAskDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);

            var userAllDetailsInDBAskerUpdate = await User.update({
              id: currentAskDetails.bidowner
            }, {
              FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
              BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
            });
            console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
            var desctroyCurrentBid = await Bid.destroy({
              id: currentAskDetails.id
            });
            console.log(currentAskDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
          }
          console.log(currentAskDetails.id + "index index == allAsksFromdb.length - 1 ");
          if (i == allAsksFromdb.length - 1) {
            console.log(currentAskDetails.id + " userAll Details :: ");
            console.log(currentAskDetails.id + " enter into i == allAsksFromdb.length - 1");

            var userAllDetailsInDBAsker = await User.findOne({
              id: askDetails.askowner
            });
            console.log(currentAskDetails.id + " enter into userBidAmountBTC i == allAsksFromdb.length - 1 askDetails.askowner");
            var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userBidAmountBTC)).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8);
            var updatedFreezedBCHbalanceAsker = parseFloat(totoalBidRemainingBCH).toFixed(8);
            console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
            var updatedUser = await User.update({
              id: askDetails.askowner
            }, {
              BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
              FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
            });

            console.log(currentAskDetails.id + " Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
            console.log(currentAskDetails.id + " Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
            console.log(currentAskDetails.id + " askDetails.id ::: " + askDetails.id);
            var updatedaskDetails = await Ask.update({
              id: askDetails.id
            }, {
              askAmountBTC: parseFloat(totoalBidRemainingBTC).toFixed(8),
              askAmountBCH: parseFloat(totoalBidRemainingBCH).toFixed(8)
            });
          }

        }
      } else {
        for (var i = 0; i < allAsksFromdb.length; i++) {
          currentAskDetails = allAsksFromdb[i];
          console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
          console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
          console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
          console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails));
          //totoalBidRemainingBCH = totoalBidRemainingBCH - allAsksFromdb[i].bidAmountBCH;
          if (totoalBidRemainingBCH >= currentAskDetails.bidAmountBCH) {
            totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH).toFixed(8) - parseFloat(currentAskDetails.bidAmountBCH).toFixed(8));
            totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC).toFixed(8) - parseFloat(currentAskDetails.bidAmountBTC).toFixed(8));
            console.log("start from here totoalBidRemainingBCH == 0::: " + totoalBidRemainingBCH);

            if (totoalBidRemainingBCH == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingBCH == 0");
              var userAllDetailsInDBAsker = await User.findOne({
                id: currentAskDetails.bidowner
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askowner
              });
              console.log("userAll askDetails.askowner :: ");
              console.log("Update value of Bidder and asker");
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBTCbalance).toFixed(8) - parseFloat(currentAskDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.bidAmountBCH)).toFixed(8);
              var userUpdateBidder = await User.update({
                id: currentAskDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userBidAmountBTC)).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8);
              var updatedFreezedBCHbalanceAsker = parseFloat(totoalBidRemainingBCH).toFixed(8);
              console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
              var updatedUser = await User.update({
                id: askDetails.askowner
              }, {
                BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
              });
              console.log(currentAskDetails.id + " Bid.destroy currentAskDetails.id::: " + currentAskDetails.id);
              var bidDestroy = await Bid.destroy({
                id: currentAskDetails.id
              });
              console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
              var askDestroy = await Ask.destroy({
                id: askDetails.id
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
                id: currentAskDetails.bidowner
              });
              console.log(currentAskDetails.id + " Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBAsker.FreezedBTCbalance).toFixed(8) - parseFloat(currentAskDetails.bidAmountBTC).toFixed(8));
              var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.bidAmountBCH)).toFixed(8);
              console.log(currentAskDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentAskDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);

              var userAllDetailsInDBAskerUpdate = await User.update({
                id: currentAskDetails.bidowner
              }, {
                FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
                BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
              });
              console.log(currentAskDetails.id + " userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              var desctroyCurrentBid = await Bid.destroy({
                id: currentAskDetails.id
              });
              console.log(currentAskDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentAskDetails.id + " userAll Details :: ");
            console.log(currentAskDetails.id + " enter into i == allAsksFromdb.length - 1");

            var userAllDetailsInDBAsker = await User.findOne({
              id: askDetails.askowner
            });
            //Update Bid
            var updatedBidAmountBTC = (parseFloat(currentAskDetails.bidAmountBTC).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8));
            var updatedBidAmountBCH = (parseFloat(currentAskDetails.bidAmountBCH) - parseFloat(totoalBidRemainingBCH)).toFixed(8);

            var updatedaskDetails = await Bid.update({
              id: currentAskDetails.id
            }, {
              bidAmountBTC: parseFloat(updatedBidAmountBTC).toFixed(8),
              bidAmountBCH: parseFloat(updatedBidAmountBCH).toFixed(8)
            });

            //Update Bidder===========================================
            var userAllDetailsInDBBiddder = await User.findOne({
              id: currentAskDetails.bidowner
            });
            var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance).toFixed(8) - parseFloat(totoalBidRemainingBTC).toFixed(8));
            var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.BCHbalance) + parseFloat(totoalBidRemainingBCH)).toFixed(8);
            console.log(currentAskDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentAskDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);
            var userAllDetailsInDBAskerUpdate = await User.update({
              id: currentAskDetails.bidowner
            }, {
              FreezedBTCbalance: parseFloat(updatedFreezedBTCbalanceBidder).toFixed(8),
              BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
            });
            //Update asker===========================================

            console.log(currentAskDetails.id + " enter into userBidAmountBTC i == allAsksFromdb.length - 1 askDetails.askowner");
            var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userBidAmountBTC)).toFixed(8);
            var updatedFreezedBCHbalanceAsker = parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance).toFixed(8) - parseFloat(userBidAmountBCH).toFixed(8);
            console.log(currentAskDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentAskDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
            var updatedUser = await User.update({
              id: askDetails.askowner
            }, {
              BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
              FreezedBCHbalance: parseFloat(updatedFreezedBCHbalanceAsker).toFixed(8)
            });
            //Destroy Ask===========================================
            console.log(currentAskDetails.id + " Ask.destroy askDetails.id::: " + askDetails.id);
            var askDestroy = await Ask.destroy({
              id: askDetails.id
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
