/**
 * ChartdataController
 *
 * @description :: Server-side logic for managing chartdatas
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var statusOne = sails.config.company.statusOne;
module.exports = {

  getAllSuccessfullBidBCH: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullBidBCH :: ");
    BidBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allBidDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error to find  BidBCH!!",
            statusCode: 401
          });
        }
        if (!allBidDetailsToExecute) {
          return res.json({
            "message": "No BidBCH Found!!",
            statusCode: 401
          });
        }
        if (allBidDetailsToExecute) {
          console.log("Return BidBCHs all BidBCHs !!!");
          if (allBidDetailsToExecute.length >= 1) {
            return res.json({
              bidsBCH: allBidDetailsToExecute,
              statusCode: 200
            });
          } else {
            console.log("Return BidBCHs all bids !!!");
            return res.json({
              "message": "No Bid Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllSuccessfullAskBCH: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskBCH :: ");
    AskBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error to find AskBCH!!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskBCH Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            return res.json({
              asksBCH: allAskDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No Ask Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllSuccessfullBidGDS: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullBidGDS :: ");
    BidGDS.find({
        status: {
          'like': statusOne
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allBidDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error To find BidGDS!!",
            statusCode: 401
          });
        }
        if (!allBidDetailsToExecute) {
          return res.json({
            "message": "No BidGDS Found!!",
            statusCode: 401
          });
        }
        if (allBidDetailsToExecute) {
          if (allBidDetailsToExecute.length >= 1) {
            return res.json({
              bidsGDS: allBidDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No BidGDS Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllSuccessfullAskGDS: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskGDS :: ");
    AskGDS.find({
        status: {
          'like': statusOne
        }
      })
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          console.log("Error to find AskGDS");
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskGDS Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            return res.json({
              asksGDS: allAskDetailsToExecute,
              statusCode: 200
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
  getAllSuccessfullBidEBT: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullBidEBT :: ");
    BidEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allBidDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get BidEBT !!",
            statusCode: 401
          });
        }
        if (!allBidDetailsToExecute) {
          return res.json({
            "message": "No BidEBT Found!!",
            statusCode: 401
          });
        }
        if (allBidDetailsToExecute) {
          if (allBidDetailsToExecute.length >= 1) {
            return res.json({
              bidsEBT: allBidDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No BidEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllSuccessfullAskEBT: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskEBT.find({
        status: {
          'like': statusOne
        }
      })
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
            return res.json({
              asksEBT: allAskDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  }

};
