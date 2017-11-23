/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........
var request = require('request');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var mergeJSON = require("merge-json");
var validator = require('validator');
var crypto = require("crypto");
//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: sails.config.company.clientBTChost,
  port: sails.config.company.clientBTCport,
  user: sails.config.company.clientBTCuser,
  pass: sails.config.company.clientBTCpass
});
//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
//EBT Wallet Details
var bitcoinEBT = require('bitcoin');
var clientEBT = new bitcoinEBT.Client({
  host: sails.config.company.clientEBThost,
  port: sails.config.company.clientEBTport,
  user: sails.config.company.clientEBTuser,
  pass: sails.config.company.clientEBTpass
});
//GDS Wallet Details
var bitcoinGDS = require('bitcoin');
var clientGDS = new bitcoinGDS.Client({
  host: sails.config.company.clientGDShost,
  port: sails.config.company.clientGDSport,
  user: sails.config.company.clientGDSuser,
  pass: sails.config.company.clientGDSpass
});

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: sails.config.common.supportEmailId,
    pass: sails.config.common.supportEmailIdpass
  }
});

var projectURL = sails.config.common.projectURL;

module.exports = {
  getNewGDSAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId)
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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

      if (user.userGDSAddress)
        return res.json({
          "message": "address already exists",
          statusCode: 401
        });

      clientGDS.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from gds server",
            statusCode: 400
          });

        console.log('gds address generated', address);
        User.update({
          email: userMailId
        }, {
          userGDSAddress: address
        }, function(err, response) {
          if (err)
            return res.json({
              "message": "Failed to update new address in database",
              statusCode: 401
            });

          res.json({
            "message": "Address has been generated and saved in database",
            statusCode: 200
          });
        })
      });
    });
  },
  getNewEBTAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId)
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      if (user.userEBTAddress)
        return res.json({
          "message": "address already exists",
          statusCode: 401
        });
      clientEBT.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from ebt server",
            statusCode: 400
          });

        console.log('ebt address generated', address);
        User.update({
          email: userMailId
        }, {
          userEBTAddress: address
        }, function(err, response) {
          if (err)
            return res.json({
              "message": "Failed to update new address in database",
              statusCode: 401
            });

          res.json({
            "message": "Address has been generated and saved in database",
            statusCode: 200
          });
        })
      });
    });
  },
  getNewBTCAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId)
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      if (user.userBTCAddress)
        return res.json({
          "message": "address already exists",
          statusCode: 401
        });
      clientBTC.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from btc server",
            statusCode: 400
          });

        console.log('btc address generated', address);
        User.update({
          email: userMailId
        }, {
          userBTCAddress: address
        }, function(err, response) {
          if (err)
            return res.json({
              "message": "Failed to update new address in database",
              statusCode: 401
            });

          res.json({
            "message": "Address has been generated and saved in database",
            statusCode: 200
          });
        })
      });
    });
  },
  getNewBCHAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId)
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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


      if (user.userBCHAddress)
        return res.json({
          "message": "address already exists",
          statusCode: 401
        });


      clientBCH.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from bch server",
            statusCode: 400
          });

        console.log('bch address generated', address);
        User.update({
          email: userMailId
        }, {
          userBCHAddress: address
        }, function(err, response) {
          if (err)
            return res.json({
              "message": "Failed to update new address in database",
              statusCode: 401
            });

          res.json({
            "message": "Address has been generated and saved in database",
            statusCode: 200
          });
        })
      });
    });
  },
  createNewUser: function(req, res) {
    console.log("Enter into createNewUser :: " + req.body.email);
    var useremailaddress = req.body.email;
    var userpassword = req.body.password;
    var userconfirmPassword = req.body.confirmPassword;
    var userspendingpassword = req.body.spendingpassword;
    var userconfirmspendingpassword = req.body.confirmspendingpassword;
    var googlesecreatekey = req.body.googlesecreatekey;
    if (!validator.isEmail(useremailaddress)) {
      return res.json({
        "message": "Please Enter valid email id",
        statusCode: 400
      });
    }
    if (!useremailaddress || !userpassword || !userconfirmPassword || !userspendingpassword || !googlesecreatekey || !userconfirmspendingpassword) {
      console.log("User Entered invalid parameter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userpassword !== userconfirmPassword) {
      console.log("Password and confirmPassword doesn\'t match!");
      return res.json({
        "message": 'Password and confirmPassword doesn\'t match!',
        statusCode: 400
      });
    }

    if (userspendingpassword !== userconfirmspendingpassword) {
      console.log("spendingpassword and confirmspendingpassword doesn\'t match!");
      return res.json({
        "message": 'spendingpassword and confirmspendingpassword doesn\'t match!',
        statusCode: 400
      });
    }

    User.findOne({
      email: useremailaddress
    }, function(err, user) {
      if (err) {
        console.log("Error to find user from database");
        return res.json({
          "message": "Error to find User",
          statusCode: 400
        });
      }
      if (user && !user.verifyEmail) {
        console.log("Use email exit But but not verified ");
        return res.json({
          "message": 'Email already exit but not varifed please login and verify',
          statusCode: 400
        });
      }
      if (user) {
        console.log("Use email exit and return ");
        return res.json({
          "message": 'email already exit',
          statusCode: 400
        });
      }
      if (!user) {

        clientBTC.cmd('getnewaddress', useremailaddress, function(err, newBTCAddressForUser, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server",
              statusCode: 400
            });
          }
          console.log('New address created from newBTCAddressForUser :: ', newBTCAddressForUser);
          clientBCH.cmd('getnewaddress', useremailaddress, function(err, newBCHAddressForUser, resHeaders) {
            if (err) {
              console.log("Error from sendFromBCHAccount:: ");
              if (err.code && err.code == "ECONNREFUSED") {
                return res.json({
                  "message": "BCH Server Refuse to connect App",
                  statusCode: 400
                });
              }
              if (err.code && err.code < 0) {
                return res.json({
                  "message": "Problem in BCH server",
                  statusCode: 400
                });
              }
              return res.json({
                "message": "Error in BCH Server",
                statusCode: 400
              });
            }
            console.log('New address created from BCHServer :: ', newBCHAddressForUser);
            clientEBT.cmd('getnewaddress', useremailaddress, function(err, newEBTAddressForUser, resHeaders) {
              if (err) {
                console.log("Error from sendFromBCHAccount:: ");
                if (err.code && err.code == "ECONNREFUSED") {
                  return res.json({
                    "message": "BCH Server Refuse to connect App",
                    statusCode: 400
                  });
                }
                if (err.code && err.code < 0) {
                  return res.json({
                    "message": "Problem in BCH server",
                    statusCode: 400
                  });
                }
                return res.json({
                  "message": "Error in BCH Server",
                  statusCode: 400
                });
              }
              console.log('New address created from newEBTAddressForUser :: ', newEBTAddressForUser);
              clientGDS.cmd('getnewaddress', useremailaddress, function(err, newGDSAddressForUser, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBCHAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BCH Server Refuse to connect App",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BCH server",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BCH Server",
                    statusCode: 400
                  });
                }
                console.log('New address created from newEBTAddressForUser :: ', newGDSAddressForUser);
                console.log('New address created from BCHServer :: ', newBCHAddressForUser);
                bcrypt.hash(userspendingpassword, 10, function(err, hashspendingpassword) {
                  if (err) {
                    console.log("Error To bcrypt spendingpassword");
                    return res.json({
                      "message": err,
                      statusCode: 500
                    });
                  }
                  var otpForEmail = crypto.randomBytes(20).toString('hex');;
                  console.log("otpForEmail :: " + otpForEmail);
                  bcrypt.hash(otpForEmail.toString(), 10, function(err, hash) {
                    if (err) return next(err);
                    var encOtpForEmail = hash;
                    var userObj = {
                      email: useremailaddress,
                      password: userpassword,
                      encryptedSpendingpassword: hashspendingpassword,
                      userBTCAddress: newBTCAddressForUser,
                      userBCHAddress: newBCHAddressForUser,
                      userEBTAddress: newEBTAddressForUser,
                      userGDSAddress: newGDSAddressForUser,
                      encryptedEmailVerificationOTP: encOtpForEmail,
                      googlesecreatekey: googlesecreatekey
                    }
                    User.create(userObj).exec(function(err, userAddDetails) {
                      if (err) {
                        console.log("Error to Create New user !!!");
                        console.log(err);
                        return res.json({
                          "message": "Error to create New User",
                          statusCode: 400
                        });
                      }
                      console.log("User Create Succesfully...........");

                      var verificationURL = projectURL + "/user/verifyEmailAddress?email=" + useremailaddress + "&otp=" + otpForEmail;
                      console.log("verificationURL ::: " + verificationURL);
                      var mailOptions = {
                        from: sails.config.common.supportEmailId,
                        to: useremailaddress,
                        subject: 'Please verify email !!!',
                        html: `
                        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                        <html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                        <head>
                          <meta name="viewport" content="width=device-width" />
                          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                          <title>Actionable emails e.g. reset password</title>


                          <style type="text/css">
                            img {
                              max-width: 100%;
                            }

                            body {
                              -webkit-font-smoothing: antialiased;
                              -webkit-text-size-adjust: none;
                              width: 100% !important;
                              height: 100%;
                              line-height: 1.6em;
                            }

                            body {
                              background-color: #f6f6f6;
                            }

                            @media only screen and (max-width: 640px) {
                              body {
                                padding: 0 !important;
                              }
                              h1 {
                                font-weight: 800 !important;
                                margin: 20px 0 5px !important;
                              }
                              h2 {
                                font-weight: 800 !important;
                                margin: 20px 0 5px !important;
                              }
                              h3 {
                                font-weight: 800 !important;
                                margin: 20px 0 5px !important;
                              }
                              h4 {
                                font-weight: 800 !important;
                                margin: 20px 0 5px !important;
                              }
                              h1 {
                                font-size: 22px !important;
                              }
                              h2 {
                                font-size: 18px !important;
                              }
                              h3 {
                                font-size: 16px !important;
                              }
                              .container {
                                padding: 0 !important;
                                width: 100% !important;
                              }
                              .content {
                                padding: 0 !important;
                              }
                              .content-wrap {
                                padding: 10px !important;
                              }
                              .invoice {
                                width: 100% !important;
                              }
                            }
                          </style>
                        </head>

                        <body itemscope itemtype="http://schema.org/EmailMessage" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100% !important; height: 100%; line-height: 1.6em; background-color: #f6f6f6; margin: 0;"
                          bgcolor="#f6f6f6">

                          <table class="body-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; background-color: #f6f6f6; margin: 0;" bgcolor="#f6f6f6">
                            <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                              <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                              <td class="container" width="600" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; display: block !important; max-width: 600px !important; clear: both !important; margin: 0 auto;"
                                valign="top">
                                <div class="content" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; max-width: 600px; display: block; margin: 0 auto; padding: 20px;">
                                  <table class="main" width="100%" cellpadding="0" cellspacing="0" itemprop="action" itemscope itemtype="http://schema.org/ConfirmAction" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; border-radius: 3px; background-color: #fff; margin: 0; border: 1px solid #e9e9e9;"
                                    bgcolor="#fff">
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 20px;" valign="top">
                                        <meta itemprop="name" content="Confirm Email" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;" />
                                        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                          <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                            <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                              Please confirm your email address by clicking the link below.
                                            </td>
                                          </tr>
                                          <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                            <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                              We may need to send you critical information about our service and it is important that we have an accurate email address.
                                            </td>
                                          </tr>
                                          <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                            <td class="content-block" itemprop="handler" itemscope itemtype="http://schema.org/HttpActionHandler" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;"
                                              valign="top">
                                              <a href=${verificationURL} class="btn-primary" itemprop="url" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; color: #FFF; text-decoration: none; line-height: 2em; font-weight: bold; text-align: center; cursor: pointer; display: inline-block; border-radius: 5px; text-transform: capitalize; background-color: #348eda; margin: 0; border-color: #348eda; border-style: solid; border-width: 10px 20px;">Confirm email address</a>
                                            </td>
                                          </tr>
                                          <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                            <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                              &mdash; The Mailgunners
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <div class="footer" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; clear: both; color: #999; margin: 0; padding: 20px;">
                                    <table width="100%" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                        <td class="aligncenter content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; vertical-align: top; color: #999; text-align: center; margin: 0; padding: 0 0 20px;" align="center"
                                          valign="top">Follow <a href="http://twitter.com/mail_gun" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; color: #999; text-decoration: underline; margin: 0;">@Mail_Gun</a> on Twitter.</td>
                                      </tr>
                                    </table>
                                  </div>
                                </div>
                              </td>
                              <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                            </tr>
                          </table>
                        </body>

                        </html>`
                      };
                      transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                          console.log(error);
                        } else {
                          console.log('Email sent: ' + info.response);
                          return res.json(200, {
                            "message": "We send link on your email address please verify link!!!",
                            "userMailId": useremailaddress,
                            statusCode: 200
                          });
                        }
                      });
                    });
                  });
                });
              });
            });
          });
        });

      }
    });
  },
  verifyEmailAddress: function(req, res, next) {
    console.log("Enter into verifyEmailAddress");
    var userMailId = req.param('email');
    var otp = req.param('otp');
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.verifyEmail) {
        return res.redirect('http://zenithnex.com/');
        // return res.json({
        //   "message": "Email already verified !!",
        //   statusCode: 401
        // });
      }
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "OTP is incorrect!!",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update passoword!",
                  statusCode: 401
                });
              }
              console.log("Update passoword succesfully!!!");
              return res.redirect('http://zenithnex.com/');
              // res.json(200, {
              //   "message": "Email verified succesfully",
              //   "userMailId": userMailId,
              //   statusCode: 200
              // });
            });
        }
      });
    });
  },
  sendEmail: function(req, res, next) {
    console.log("Enter into sendEmailTest::: " + JSON.stringify(req.body));
    // var transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: 'wallet.bcc@gmail.com',
    //     pass: 'boosters@123'
    //   }
    // });
    var mailOptions = {
      from: sails.config.common.supportEmailId,
      to: 'bccwalletsuport@gmail.com',
      subject: 'Sending Email using Node.js',
      text: 'That was easy!'
    };
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
        res.json(200, "Message Send Succesfully");
      }
    });
  },
  sentOtpToEmailForgotPassword: function(req, res, next) {

    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      // var transporter = nodemailer.createTransport({
      //   service: 'gmail',
      //   auth: {
      //     user: 'wallet.bcc@gmail.com',
      //     pass: 'boosters@123'
      //   }
      // });
      var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
      console.log("newCreatedPassword :: " + newCreatedPassword);
      var mailOptions = {
        from: sails.config.common.supportEmailId,
        to: userMailId,
        subject: 'Please reset your password',
        text: 'We heard that you lost your BccPay password. Sorry about that! ' +
          '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(newCreatedPassword + 'Email sent: ' + info.response);
          //res.json(200,"Message Send Succesfully");
          console.log("createing encryptedPassword ....");
          bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedForgotPasswordOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP forgot update succesfully!!!");
                return res.json({
                  "message": "Otp sent on user mail id",
                  "userMailId": userMailId,
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  verifyOtpToEmailForgotPassord: function(req, res, next) {

    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      User.compareForgotpasswordOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          res.json(200, {
            "message": "OTP is varified succesfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotPassordAfterVerify: function(req, res, next) {
    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !newPassword || !confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "New Password and Confirm New Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
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
      bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedPassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword succesfully!!!");
            return res.json({
              "message": "Your passoword updated succesfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateCurrentPassword: function(req, res, next) {
    console.log("Enter into updateCurrentPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentPassword || !newPassword || !confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (currentPassword == newPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Current password is not same as newPassword",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "New Password and Confirm New Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt passoword",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedPassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update passoword!",
                    statusCode: 401
                  });
                }
                console.log("Update current passoword succesfully!!!");
                return res.json({
                  "message": "Your passoword updated succesfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  updateCurrentSpendingPassword: function(req, res, next) {
    console.log("Enter into updateCurrentSpendingPassword");
    var userMailId = req.body.userMailId;
    var currentSpendingPassword = req.body.currentSpendingPassword;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmNewSpendingPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentSpendingPassword || !newSpendingPassword || !confirmNewSpendingPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (currentSpendingPassword == newSpendingPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Current password is not same as newSpendingPassword",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmNewSpendingPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "New SpendingPassword and Confirm New SpendingPassword not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
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
      User.compareSpendingpassword(currentSpendingPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentSpendingPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewSpendingPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt passoword",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedSpendingpassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update passoword!",
                    statusCode: 401
                  });
                }
                console.log("Update current passoword succesfully!!!");
                return res.json({
                  "message": "Your passoword updated succesfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  sentOtpToUpdateSpendingPassword: function(req, res, next) {
    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    if (!userMailId || !currentPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct Password",
            statusCode: 401
          });
        } else {
          // var transporter = nodemailer.createTransport({
          //   service: 'gmail',
          //   auth: {
          //     user: sails.config.common.supportEmailId,
          //     pass: 'boosters@123'
          //   }
          // });
          var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
          console.log("newCreatedPassword :: " + newCreatedPassword);
          var mailOptions = {
            from: sails.config.common.supportEmailId,
            to: userMailId,
            subject: 'Please reset your spending password',
            text: 'We heard that you lost your BccPay spending password. Sorry about that! ' +
              '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
          };
          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log(newCreatedPassword + 'Email sent: ' + info.response);
              //res.json(200,"Message Send Succesfully");
              console.log("createing encryptedPassword ....");
              bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
                if (err) return next(err);
                var newEncryptedPass = hash;
                User.update({
                    email: userMailId
                  }, {
                    encryptedForgotSpendingPasswordOTP: newEncryptedPass
                  })
                  .exec(function(err, updatedUser) {
                    if (err) {
                      return res.serverError(err);
                    }
                    console.log("OTP forgot update succesfully!!!");
                    return res.json({
                      "message": "Otp sent on user mail id",
                      "userMailId": userMailId,
                      statusCode: 200
                    });
                  });
              });
            }
          });
        }
      });

    });
  },
  verifyOtpToEmailForgotSpendingPassord: function(req, res, next) {
    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      User.compareEmailVerificationOTPForSpendingPassword(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          res.json(200, {
            "message": "OTP for spending passoword is varified succesfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotSpendingPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgotSpendingPassordAfterVerif");
    var userMailId = req.body.userMailId;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmSpendingPassword = req.body.confirmSpendingPassword;
    if (!userMailId || !newSpendingPassword || !confirmSpendingPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmSpendingPassword) {
      console.log("New Password and Confirm New Password not match");
      return res.json({
        "message": "New Spending Password and Confirm Spending Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
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
      bcrypt.hash(newSpendingPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedSpendingpassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword succesfully!!!");
            return res.json({
              "message": "Your spending passoword updated succesfully",
              statusCode: 200
            });
          });
      });
    });
  },
  sentOtpToEmailVerificatation: function(req, res, next) {

    console.log("Enter into sentOtpToEmailVerificatation");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      var createNewOTP = Math.floor(100000 + Math.random() * 900000);
      console.log("createNewOTP :: " + createNewOTP);
      var mailOptions = {
        from: sails.config.common.supportEmailId,
        to: user.email,
        subject: 'Please verify your email',
        text: 'Your otp to varify email ' + createNewOTP
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(createNewOTP + 'Email sent: ' + info.response);
          console.log("createing encryptedPassword ....");
          bcrypt.hash(createNewOTP.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedEmailVerificationOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP  update encryptedEmailVerificationOTP succesfully!!!");
                return res.json({
                  "message": "Otp sent on mail id",
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  updateUserVerifyEmail: function(req, res, next) {

    console.log("Enter into updateUserVerifyEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update passoword!",
                  statusCode: 401
                });
              }
              console.log("Update current SpendingPassword succesfully!!!");

              User.findOne({
                email: userMailId
              }).exec(function(err, userDetailsReturn) {
                if (err) {
                  return res.json({
                    "message": "Error to find user",
                    statusCode: 401
                  });
                }
                if (!userDetailsReturn) {
                  return res.json({
                    "message": "Invalid email!",
                    statusCode: 401
                  });
                }
                return res.json(200, {
                  user: userDetailsReturn,
                  statusCode: 200
                });
              });
            });
        }
      });
    });
  },
  getAllDetailsOfUser: function(req, res, next) {
    console.log("Enter into getAllDetailsOfUser");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
        email: userMailId
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
        } else {
          return res.json({
            user: user,
            statusCode: 200
          });
        }

      });
  },
  enableTFA: function(req, res, next) {
    console.log("Enter into enableTFA");
    var userMailId = req.body.userMailId;

    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }

    User.findOne({
      email: userMailId
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
      User.update({
          email: userMailId
        }, {
          tfastatus: true
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update passoword!",
              statusCode: 401
            });
          }
          console.log("TFA and googlesecreatekey updated succesfully!!!");
          User.findOne({
              email: userMailId
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
              } else {
                return res.json({
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  },
  disableTFA: function(req, res, next) {
    console.log("Enter into disableTFA");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }

    User.findOne({
      email: userMailId
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
      User.update({
          email: userMailId
        }, {
          tfastatus: false
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update passoword!",
              statusCode: 401
            });
          }
          console.log("TFA disabled succesfully!!!");
          User.findOne({
              email: userMailId
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
              } else {
                return res.json({
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  }
};