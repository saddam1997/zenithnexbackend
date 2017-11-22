/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  logout: function(req, res) {
    req.session.destroy()
    res.json(200, {
      message: 'Logout Successfully'
    });
  },
  authentcate: function(req, res) {
    console.log("Enter into authentcate!!!" + req.body.email);
    var useremail = req.param('email');
    var password = req.param('password');
    if (!useremail || !password) {
      console.log("email and password required");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    console.log("Finding user....");
    User.findOne({
        email: useremail
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
            "message": "Please enter registered email!",
            statusCode: 401
          });
        }
        if (!user.verifyEmail) {
          return res.json({
            "message": "We already sent email verification link please verify your email !!",
            statusCode: 401
          });
        }
        console.log("Compare passs");
        User.comparePassword(password, user, function(err, valid) {
          if (err) {
            console.log("Error to compare password");
            return res.json({
              "message": "Error to compare password",
              statusCode: 401
            });
          }
          if (!valid) {
            return res.json({
              "message": "Please enter correct password",
              statusCode: 401
            });
          } else {
            console.log("User is valid return user details !!!");
            if (user.tfastatus) {
              console.log("Enter into this user.tfastatus");
              res.json({
                user: user,
                statusCode: 201,
                message: "Google Authenticattion Enabled For this user!!!",
                token: jwToken.issue({
                  id: user.id
                })
              });
            } else {
              console.log("Returnin user detailsss");
              res.json({
                user: user,
                statusCode: 200,
                token: jwToken.issue({
                  id: user.id
                })
              });
            }
          }
        });
      });
  }
};