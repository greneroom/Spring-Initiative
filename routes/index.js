var express = require('express');
var path = require('path');
var routes = {};
var path = require('path');
var passport = require('passport');
var sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME,
                                   process.env.SENDGRID_PASSWORD);

var User = require(path.join(__dirname, '../models/user'));
var FormDB = require(path.join(__dirname, '../models/form'));
var Cohort = require(path.join(__dirname, '../models/cohort'));
var Student = require(path.join(__dirname, '../models/student'));

routes.GETallStudents = function(req, res) {
  Student.find({}, function(err, allStudents) {
    res.json(allStudents);
  });
}

routes.POSTlogin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err)
      return res.status(500).send(err.message);
    if (!user)
      return res.status(401).send(info.message);
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      return res.sendStatus(200);
    });
  })(req, res, next);
}

routes.POSTlogout = function(req, res){
  console.log("logged out")
  req.logout();
  res.sendStatus(200);
}

routes.POSTregister = function(req, res, next) {
  User.register(new User({
      email: req.body.username
    }), req.body.password,
    function(err, user) {
      if (err) {
        return res.status(403).send(err.message);
      }

      // Get admin emails
      User.find({isAdmin: true}, {email: 1, _id: 0}, function(err, admins) {
        // send email verification
        var authenticationURL = 'http://' + req.headers.host +
          '/verify?authToken=' + user.authToken +
          '&email=' + user.email;
        var email = new sendgrid.Email();

        for (var i = 0; i < admins.length; i++) {
          email.addTo(admins[i].email);
        };

        email.setFrom('SpringInitiative@olinjs.com');
        email.setSubject(user.email + ' wants to register for Spring Initiative\'s website.');
        email.setHtml('<a target=_blank href=\"' + authenticationURL +
          '\">Confirm their registration.</a>' +
          '<br>This is an automated response. Do not reply.');
        sendgrid.send(email);

        console.log("Email verification sent");
        res.sendStatus(200);

      });

    });
}

routes.GETemailver = function(req, res) {
  User.verifyEmail(req.query.authToken, function(err, existingAuthToken) {
    if (err) {
      console.log('Email ver err:', err);
      res.sendStatus(500);
    }
    else {
      var email = new sendgrid.Email();
      email.addTo(req.query.email);
      email.setFrom('SpringInitiative@olinjs.com');
      email.setSubject('Registration complete for Spring Initiative');
      email.setHtml('You\'ve been registered for Spring Initiative\'s website.' +
                    '<br>This is an automated response. Do not reply.');
      sendgrid.send(email);

      console.log("Email alert sent");
      res.redirect('/')
    }
  });
}

routes.GETstudent = function(req, res, next) {
  Student.findOne({
    _id: req.params._id
  }, function(err, currentStudent) {
    if (err) {
      res.send(err)
    }
    Student.find({}, function(err, allStudents) {
      if (err) {
        res.send(err)
      }
      res.json({
        currentStudent: currentStudent,
        allStudents: allStudents
      });
    })
  })
}

routes.POSTeditstudent = function(req, res, next) {

  var studentName = req.body.name;
  var studentProgram = req.body.program;
  var studentArchived = req.body.archived;
  var studentID = req.params._id;

  Student.update({
    _id: studentID
  }, {
    name: studentName,
    program: studentProgram,
    archived: studentArchived
  }, function(err, record) {
    Student.find({}, function(err, allStudents) {
      if (err) {
        res.send(err)
        return res.status(200).json({msg: 'Error editing student data'});
      }
      Student.findOne({_id: studentID}, function(err, currentStudent) {
        res.json({allStudents:allStudents, currentStudent: currentStudent, msg: 'Student data edited successfully!'})
      })
    })
  })
  
}

routes.POSTaddstudent = function(req, res, next) {
  var studentName = req.body.name;
  var studentProgram = req.body.program;
  var studentArchived = req.body.archived;

  Student.create({
    name: studentName,
    program: studentProgram,
    archived: studentArchived
  }, function(err, newStudent) {
    if (err) {
      res.send(err)
      return res.status(500).json({msg: 'Error adding student'});
    }
    Student.find({}, function(err, allStudents) {
      res.json({
        allStudents: allStudents,
        newStudent: newStudent,

      });
    })
  return res.status(200).json({msg: 'Student added successfully!'});
  });
}

routes.POSTnewEntry = function(req, res, next) {
  var studentID = req.params._id;
  var date = req.body.date;
  var period = req.body.period;
  var attendance = req.body.attendance;
  var behaviorText = req.body.behaviorText;
  var actionSteps = req.body.actionSteps;
  var readingLevels = req.body.readingLevels;
  var teacherFeedback = req.body.teacherFeedback;
  var warnings = req.body.warnings;
  var stars = req.body.stars;
  FormDB.create({
    _studentID: studentID,
    date: date,
    period: period,
    attendance: attendance,
    behaviorText: behaviorText,
    warnings: warnings,
    stars: stars,
    actionSteps: actionSteps,
    readingLevels: readingLevels,
    teacherFeedback: teacherFeedback
  }, function(err, newEntryObj) {
    if (err) {
      console.log(err)
      res.send(err)
      return res.status(500).json({msg: 'Error submitting entry'});
    }
    console.log("new form entry", newEntryObj)
    console.log(studentID, date, period, attendance, warnings, behaviorText, stars, warnings, actionSteps, teacherFeedback)

    res.json(newEntryObj, {msg: 'Entry submitted successfully!'});
  })
};


routes.POSTnewCohortEntry = function(req, res, next) {
  var cohortName = req.body.name;
  var cohortComment = req.body.comment;

  Cohort.create({
    name: cohortName,
    comment: cohortComment
  }, function(err, newCohortEntryObj) {
    if (err) {
      res.send(err)
    }
    console.log("new cohort entry", newCohortEntryObj)
    res.json(newCohortEntryObj)
  })
};

routes.GETarchive = function(req, res, next) {
  Student.find({
    archived: true
  }, function(err, archivedStudents) {
    res.json(archivedStudents);
  })
}

routes.GETallUsers = function(req, res) {
  User.find({}, function(err, allUsers) {
    res.json(allUsers);
  })
}

routes.POSTchangeAdmin = function(req, res) {
  userid = req.params._id;
  User.findOne({_id:userid}, function (err, user) {
    user.isAdmin = !user.isAdmin;
    user.save(function (err) {
      if(err) {
        console.log(err);
      }
    })
    res.json(user);
  });
}

routes.POSTchangePassword = function(req, res) {
  userid = req.params._id;
  newPasswordString = req.body.password;
  User.findOne({_id:userid}, function (err, user) {
    user.setPassword(newPasswordString, function(){
      user.save(function (err) {
        if(err) {
          console.log(err);
          return res.status(500).json({msg: 'Password reset unsuccessful'})
        }
      });
      return res.status(200).json({msg: 'Password reset successful'});
    });
  });
}

module.exports = routes;
