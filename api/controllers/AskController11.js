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
            currentBidDetails = allAsksFromdb[i];
            console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
            console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
            //totoalAskRemainingBCH = totoalAskRemainingBCH - allAsksFromdb[i].bidAmountBCH;
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
              console.log(currentBidDetails.id + " enter into i == allAsksFromdb.length - 1");

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

              console.log(currentBidDetails.id + " enter into userAskAmountBTC i == allAsksFromdb.length - 1 askDetails.askowner");
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
  addAsk: function(req, res) {

    console.log("Enter into ask api addAsk :: " + JSON.stringify(req.body));
    var userAskAmountBTC = parseFloat(req.body.askAmountBTC).toFixed(8);
    var userAskAmountBCH = req.body.askAmountBCH;
    var userAskRate = parseFloat(req.body.askRate).toFixed(8);
    var userAskownerId = req.body.askownerId;
    var userSpendingPassword = req.body.spendingPassword;
    var currentAskrateOfServer = parseFloat(req.body.currentAskrateOfServer).toFixed(8);
    var minimumAmountToApplyForAsk = 0.01;
    var minimumAskCanApplyByUser = (parseFloat(currentAskrateOfServer) + parseFloat(minimumAmountToApplyForAsk)).toFixed(8);
    if (!userAskAmountBCH || !userAskAmountBTC || !userSpendingPassword ||
      !userAskRate || !userAskownerId || !currentAskrateOfServer) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    console.log("currentAskrateOfServer :: " + currentAskrateOfServer);
    console.log("userAskRate :: " + userAskRate);
    console.log("minimumAskCanApplyByUser :: " + minimumAskCanApplyByUser);
    if (minimumAskCanApplyByUser < userAskRate) {
      return res.json({
        "message": "Minimum Askrate is " + minimumAskCanApplyByUser + " !",
        statusCode: 401
      });
    }
    if (userAskAmountBCH < 0.008) {
      return res.json({
        "message": "Minimum ask amount is not less then 0.008",
        statusCode: 401
      });
    }
    User.findOne({
      id: userAskownerId
    }).exec(function(errToFindUser, userAsker) {
      if (errToFindUser) {
        return res.json({
          "message": "Error to find userAsker",
          statusCode: 401
        });
      }
      if (!userAsker) {
        return res.json({
          "message": "Invalid UserId!!",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userAsker,
        function(err, valid) {
          if (err) {
            console.log("Eror To compare password !!!");
            return res.json({
              "message": err,
              statusCode: 401
            });
          }
          if (!valid) {
            console.log("Invalid spendingpassword !!!");
            return res.json({
              "message": 'Enter valid spending password',
              statusCode: 401
            });
          } else {
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
            Ask.create({
                askAmountBTC: userAskAmountBTC,
                askAmountBCH: userAskAmountBCH,
                askRate: parseFloat(userAskRate).toFixed(8),
                askowner: userIdInDb
              })
              .exec(function(err, askDetails) {
                if (err) {
                  console.log("Error to Create Ask !!!");
                  return res.json({
                    "message": "Error to create Ask",
                    statusCode: 400
                  });
                }
                var updateUserBCHBalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userAskAmountBCH).toFixed(8);
                var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userAskAmountBCH)).toFixed(8);
                User.update({
                    id: userIdInDb
                  }, {
                    FreezedBCHbalance: updateFreezedBCHBalance,
                    BCHbalance: updateUserBCHBalance,
                  })
                  .exec(function(err, updated) {
                    if (err) {
                      console.log("Error to update Userask details !!!");
                      return res.json({
                        "message": "Error to update Userask details !!!",
                        statusCode: 400
                      });
                    }
                    Bid.find({
                        bidRate: {
                          'like': parseFloat(userAskRate).toFixed(4)
                        }
                      })
                      .sort('bidAmountBCH ASC')
                      .exec(function(err, allBidsFromdb) {
                        if (err) {
                          console.log("Error to find ask");
                        }
                        if (!allBidsFromdb) {
                          //No bid match on this rate Ask and Ask placed successfully
                          return res.json({
                            "message": "Your ask placed successfully!",
                            statusCode: 200
                          });
                        }
                        if (allBidsFromdb) {
                          if (allBidsFromdb.length >= 1) {
                            //Find exact bid if available in db
                            var exactAmountMatchBid = _.findWhere(allBidsFromdb, {
                              bidAmountBCH: parseFloat(userAskAmountBCH)
                            });
                            if (exactAmountMatchBid) {

                              User.findOne({
                                  id: exactAmountMatchBid.bidowner
                                })
                                .exec(function(err, userBidder) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userBidder) {
                                    console.log("Invalid id!");
                                  } else {
                                    console.log("userBidder Details :: ");
                                    console.log(userBidder.email + " :: " + JSON.stringify(userBidder));
                                    // Settlement of userAsker
                                    clientBTC.cmd('move',
                                      companyBTCAccount,
                                      userAsker.email,
                                      userAskAmountBTC,
                                      function(err, transactionAsker, resHeaders) {
                                        if (err) {
                                          console.log("Error from sendFromBCHAccount:: ");
                                          console.log("Error in BCH Server");
                                          return res.json({
                                            "message": "Error in BCH Server",
                                            statusCode: 400
                                          });
                                        } else {
                                          //Not error in BCH Transaction
                                          console.log("transactionAsker ::: " + transactionAsker);
                                          if (transactionAsker == true) {
                                            console.log("Transaction successfully for move user To Company BCHacc::: " + transactionAsker);
                                            clientBCH.cmd('move',
                                              userAsker.email,
                                              companyBCHAccount,
                                              userAskAmountBCH,
                                              function(err, transactionBuyBTC, resHeaders) {
                                                if (err) {
                                                  console.log("Error from sendFromBCHAccount:: ");
                                                  return res.json({
                                                    "message": "Error in BCH Server",
                                                    statusCode: 400
                                                  });
                                                } else {
                                                  //Not error in Send BCT
                                                  console.log("transactionBuyBTC ::: " + transactionBuyBTC);
                                                  if (transactionBuyBTC == true) {
                                                    console.log("Transaction successfully for move user To Company acc::: " + transactionBuyBTC);
                                                    var updatedBTCbalanceAsker = (parseFloat(userAsker.BTCbalance) - parseFloat(userAskAmountBTC)).toFixed(8);
                                                    var updatedBCHbalanceAsker = (parseFloat(userAsker.BCHbalance) +
                                                      parseFloat(userAskAmountBCH)).toFixed(8);
                                                    User.update({
                                                        email: userAsker.email
                                                      }, {
                                                        BTCbalance: parseFloat(updatedBTCbalanceAsker).toFixed(8),
                                                        BCHbalance: parseFloat(updatedBCHbalanceAsker).toFixed(8)
                                                      })
                                                      .exec(function(err, updatedUser) {
                                                        if (err) {
                                                          console.log("Error to udpate .....");
                                                          return res.json({
                                                            "message": "Error to update User Details",
                                                            statusCode: 400
                                                          });
                                                        }
                                                        // Settlement of userBidder  userBidder
                                                        clientBTC.cmd('move',
                                                          userBidder.email,
                                                          companyBTCAccount,
                                                          exactAmountMatchBid.bidAmountBTC,
                                                          function(err, transactionBidder, resHeaders) {
                                                            if (err) {
                                                              console.log("Error from sendFromBCHAccount:: ");
                                                              console.log("Error in BCH Server");
                                                              return res.json({
                                                                "message": "Error in BCH Server",
                                                                statusCode: 400
                                                              });
                                                            } else {
                                                              //Not error in BCH Transaction
                                                              console.log("transactionBidder ::: " + transactionBidder);
                                                              if (transactionBidder == true) {
                                                                console.log("Transaction successfully for move user To Company BCHacc::: " + transactionBidder);
                                                                clientBCH.cmd('move',
                                                                  companyBCHAccount,
                                                                  userBidder.email,
                                                                  exactAmountMatchBid.bidAmountBCH,
                                                                  function(err, transactionBuyBTC, resHeaders) {
                                                                    if (err) {
                                                                      console.log("Error from sendFromBCHAccount:: ");
                                                                      return res.json({
                                                                        "message": "Error in BCH Server",
                                                                        statusCode: 400
                                                                      });
                                                                    } else {
                                                                      //Not error in Send BCT
                                                                      console.log("transactionBuyBTC ::: " + transactionBuyBTC);
                                                                      if (transactionBuyBTC == true) {
                                                                        console.log("Transaction successfully for move user To Company acc::: " + transactionBuyBTC);
                                                                        var updatedBTCbalanceBidder = (parseFloat(userBidder.BTCbalance).toFixed(8) - parseFloat(exactAmountMatchBid.bidAmountBTC).toFixed(8));
                                                                        var updatedBCHbalanceBidder = (parseFloat(userBidder.BCHbalance) +
                                                                          parseFloat(exactAmountMatchBid.bidAmountBCH)).toFixed(8);
                                                                        User.update({
                                                                            email: userBidder.email
                                                                          }, {
                                                                            BTCbalance: parseFloat(updatedBTCbalanceBidder).toFixed(8),
                                                                            BCHbalance: parseFloat(updatedBCHbalanceBidder).toFixed(8)
                                                                          })
                                                                          .exec(function(err, updatedUser) {
                                                                            if (err) {
                                                                              console.log("Error to udpate .....");
                                                                              return res.json({
                                                                                "message": "Error to update User Details",
                                                                                statusCode: 400
                                                                              });
                                                                            }
                                                                            console.log("Removing ask !!!");
                                                                            Ask.destroy({
                                                                              id: askDetails.id
                                                                            }).exec(function(err) {
                                                                              if (err) {
                                                                                return res.json({
                                                                                  "message": "Error to remove ask",
                                                                                  statusCode: 400
                                                                                });
                                                                              }
                                                                              console.log("Removing bid !!! !!!");
                                                                              Bid.destroy({
                                                                                id: exactAmountMatchBid.id
                                                                              }).exec(function(err) {
                                                                                if (err) {
                                                                                  return res.json({
                                                                                    "message": "Error to remove ask",
                                                                                    statusCode: 400
                                                                                  });
                                                                                }
                                                                                console.log("Returning user details !!!");
                                                                                User.findOne({
                                                                                    email: userAsker.email
                                                                                  })
                                                                                  .populateAll()
                                                                                  .exec(function(err, user) {
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
                                                                                    return res.json({
                                                                                      user: user,
                                                                                      statusCode: 200
                                                                                    });
                                                                                  });
                                                                              });
                                                                            });
                                                                          });
                                                                      } else {
                                                                        return res.json({
                                                                          "message": "Transaction Failed BTC",
                                                                          statusCode: 400
                                                                        });
                                                                      }
                                                                    }

                                                                  });
                                                              } else {
                                                                //Error to send BCH From user account to companyBCH account
                                                                console.log("Error to send BCH From user account to companyBCH account ");
                                                                return res.json({
                                                                  "message": "Transaction Failed BCH",
                                                                  statusCode: 400
                                                                });
                                                              }
                                                            }
                                                          });
                                                      });

                                                  } else {
                                                    return res.json({
                                                      "message": "Transaction Failed BTC",
                                                      statusCode: 400
                                                    });
                                                  }
                                                }

                                              });
                                          } else {
                                            //Error to send BCH From user account to companyBCH account
                                            console.log("Error to send BCH From user account to companyBCH account ");
                                            return res.json({
                                              "message": "Transaction Failed BCH",
                                              statusCode: 400
                                            });
                                          }
                                        }
                                      });
                                  }
                                });
                            } //Find Exact value not matched
                            else {
                              return res.json({
                                "message": allBidsFromdb,
                                statusCode: 200
                              });
                            }
                          } else {
                            //No bid match on this rate Ask and Ask placed successfully
                            return res.json({
                              "message": "Your ask placed successfully!!",
                              statusCode: 200
                            });
                          }
                        }
                      });
                    // User.findOne({
                    //     id: userIdInDb
                    //   })
                    //   .populateAll()
                    //   .exec(function(err, userDetailsReturn) {
                    //     if (err) {
                    //       return res.json({
                    //         "message": "Error to find user",
                    //         statusCode: 401
                    //       });
                    //     }
                    //     if (!userDetailsReturn) {
                    //       return res.json({
                    //         "message": "Invalid email!",
                    //         statusCode: 401
                    //       });
                    //     }
                    //     return res.json(200, {
                    //       user: userDetailsReturn,
                    //       statusCode: 200
                    //     });
                    //   });
                  });
              });
          }
        });

    });
  },
  removeAsk: function(req, res) {
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
  getAllAsk: function(req, res) {
    console.log("Enter into ask api getAllAsk :: ");
    Ask.find()
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          console.log("Error to find ask");
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Asks Found!!askRate",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            return res.json({
              asks: allAskDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No Asks Found!!",
              statusCode: 401
            });
          }
        }
      });
  }
};
