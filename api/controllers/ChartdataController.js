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
      .sort('createTimeUTC DESC')
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
      .sort('createTimeUTC DESC')
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
      .sort('createTimeUTC DESC')
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
  },
  getBidsTotal: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
  },
  getBidsBCHSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    BidBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
            BidBCH.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountBCH')
              .exec(function(err, bidAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBCHSum",
                    statusCode: 401
                  });
                }
                BidBCH.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBCH: allAskDetailsToExecute,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAsksBCHSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskBCH.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
            AskBCH.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountBCH')
              .exec(function(err, askAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBCHSum",
                    statusCode: 401
                  });
                }
                AskBCH.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBCH: allAskDetailsToExecute,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBCH Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsEBTSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    BidEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskEBT.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
  getBidsGDSSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    BidGDS.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
            BidGDS.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountGDS')
              .exec(function(err, bidAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGDSSum",
                    statusCode: 401
                  });
                }
                BidGDS.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGDS: allAskDetailsToExecute,
                      bidAmountGDSSum: bidAmountGDSSum[0].bidAmountGDS,
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
  getAsksGDSSuccess: function(req, res) {
    console.log("Enter into ask api getAllSuccessfullAskEBT :: ");
    AskGDS.find({
        status: {
          'like': statusOne
        }
      })
      .sort('createTimeUTC DESC')
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
            AskGDS.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountGDS')
              .exec(function(err, askAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGDSSum",
                    statusCode: 401
                  });
                }
                AskGDS.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGDS: allAskDetailsToExecute,
                      askAmountGDSSum: askAmountGDSSum[0].askAmountGDS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
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
  getBidsBCHAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    BidBCH.find()
      .sort('createTimeUTC DESC')
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
            BidBCH.find()
              .sum('bidAmountBCH')
              .exec(function(err, bidAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBCHSum",
                    statusCode: 401
                  });
                }
                BidBCH.find()
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBCH: allAskDetailsToExecute,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAsksBCHAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    AskBCH.find()
      .sort('createTimeUTC DESC')
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
            AskBCH.find()
              .sum('askAmountBCH')
              .exec(function(err, askAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBCHSum",
                    statusCode: 401
                  });
                }
                AskBCH.find()
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBCH: allAskDetailsToExecute,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBCH Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsEBTAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    BidEBT.find()
      .sort('createTimeUTC DESC')
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
  getAsksEBTAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    AskEBT.find()
      .sort('createTimeUTC DESC')
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
  getBidsGDSAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    BidGDS.find()
      .sort('createTimeUTC DESC')
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
            BidGDS.find()
              .sum('bidAmountGDS')
              .exec(function(err, bidAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGDSSum",
                    statusCode: 401
                  });
                }
                BidGDS.find()
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGDS: allAskDetailsToExecute,
                      bidAmountGDSSum: bidAmountGDSSum[0].bidAmountGDS,
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
  getAsksGDSAll: function(req, res) {
    console.log("Enter into ask api getAllAllfullAskEBT :: ");
    AskGDS.find()
      .sort('createTimeUTC DESC')
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
            AskGDS.find()
              .sum('askAmountGDS')
              .exec(function(err, askAmountGDSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGDSSum",
                    statusCode: 401
                  });
                }
                AskGDS.find()
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGDSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGDS: allAskDetailsToExecute,
                      askAmountGDSSum: askAmountGDSSum[0].askAmountGDS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskGDS Found!!",
              statusCode: 401
            });
          }
        }
      });
  }

};