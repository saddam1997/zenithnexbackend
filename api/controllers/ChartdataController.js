/**
 * ChartdataController
 *
 * @description :: Server-side logic for managing chartdatas
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  getAllBidBCH: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    BidBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allBidDetailsToExecute) {
        if (err) {
          console.log("Error to find ask");
        }
        if (!allBidDetailsToExecute) {
          return res.json({
            "message": "No Bid Found!!",
            statusCode: 401
          });
        }
        if (allBidDetailsToExecute) {
          if (allBidDetailsToExecute.length >= 1) {
            return res.json({
              bidsBCH: allBidDetailsToExecute,
              statusCode: 200
            });
          } else {
            return res.json({
              "message": "No Bid Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskBCH: function(req, res) {
    console.log("Enter into ask api getAllBid :: ");
    AskBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          console.log("Error to find ask");
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Bid Found!!",
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
  }

};
