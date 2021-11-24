require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const alert = require('alert');
const _ = require('lodash');
const bcrypt = require('bcrypt');

const app = express();
const saltRounds = 10;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/bitsurveyDB');

const questionSchema = new mongoose.Schema({
    question: String,
    reward: Number,
    answer1: String,
    answer2: String,
    answer3: String,
    answer4: String,
    answers: [{
        userId: String,
        answer: String
    }]
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    firstName: String,
    lastName: String,
    numberAnswered: {
        type: Number,
        default: 0
    },
    wallet: {
        mnemonic: String,
        hdPrivateKey: String,
        hdPublicKey: String
    }
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("user", userSchema);
const Question = new mongoose.model("question", questionSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/bitsurvey",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            googleId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.route("/auth/google").get(passport.authenticate("google", {
    scope: ["profile"]
}));

app.route("/auth/google/bitsurvey").get(passport.authenticate("google", {
    failureRedirect: "/login"
}), function (req, res) {
    res.redirect("/dashboard");
});

app.route('/').get(function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/dashboard");
    } else {
        res.render("home");
    };
});

app.route("/register").get(function (req, res) {
    res.render("register");
}).post(function (req, res) {

    User.findOne({
        username: req.body.username
    }, function (err, foundUser) {
        if (foundUser) {
            alert("User already exists with this email")
        } else {
            User.register({
                username: req.body.username,
                firstName: req.body.firstName,
                lastName: req.body.lastName
            }, req.body.password, function (err, user) {
                if (err) {
                    console.log(err);
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, function () {
                        res.redirect("/dashboard");
                    });
                };
            });
        }
    })
});

var qForPost = {};

app.route('/earn').get(function (req, res) {
    if (req.isAuthenticated()) {
        User.findOne({
            _id: req.user._id
        }, function (err, foundUser) {
            if (!err) {
                if (foundUser.wallet.mnemonic === null || foundUser.wallet.mnemonic === undefined) {
                    res.redirect("/new-wallet");
                } else {
                    Question.find({
                            "answers.userId": {
                                $ne: req.user.id
                            }
                        },
                        function (err, results) {
                            if (!err) {
                                if (results.length === 0) {
                                    res.redirect("/dashboard");
                                    alert("No More Questions");
                                } else {
                                    const randIndex = Math.floor(Math.random() * results.length)
                                    const randQuestion = results[randIndex]
                                    qForPost = randQuestion;
                                    res.render("earn", {
                                        question: randQuestion.question,
                                        answer1: randQuestion.answer1,
                                        answer2: randQuestion.answer2,
                                        answer3: randQuestion.answer3,
                                        answer4: randQuestion.answer4,
                                        reward: randQuestion.reward
                                    });
                                }
                            } else {
                                console.log(err);
                            };
                        });
                }
            }
        });
    } else {
        res.redirect("/");
    };
}).post(function (req, res) {
    if (req.isAuthenticated()) {
        if (req.body.answer[0] === "S") {
            alert("None Selected!");
            res.status(204).send();
        } else {
            Question.findById(qForPost.id, function (err, foundQuestion) {
                if (err) {
                    console.log(err);
                } else {
                    if (foundQuestion) {
                        const given_answer = {
                            userId: req.user.id,
                            answer: req.body.answer[0]
                        };
                        Question.updateOne({
                            _id: qForPost.id
                        }, {
                            $push: {
                                answers: given_answer
                            }
                        }, function (err) {
                            if (!err) {
                                User.updateOne({
                                    _id: req.user._id
                                }, {
                                    $inc: {
                                        numberAnswered: 1
                                    }
                                }, function (err) {
                                    if (!err) {
                                        res.redirect("/earn");
                                    };
                                });
                            } else {
                                console.log(err);
                                res.redirect("/earn");
                            }
                        });
                    }
                }
            });
        }
    }
});

app.route("/wallet").get(function (req, res) {
    if (req.isAuthenticated()) {
        User.findOne({
            _id: req.user._id
        }, function (err, foundUser) {
            if (!err) {
                if (foundUser.wallet.mnemonic === null || foundUser.wallet.mnemonic === undefined) {
                    res.redirect("/new-wallet");
                } else {
                    res.render("wallet", {
                        mnemonic: foundUser.wallet.mnemonic
                    });
                }
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/");
    }
})

app.route("/new-wallet").get(function (req, res) {
    if (req.isAuthenticated()) {
        res.render("new-wallet");
    } else {
        res.redirect("/");
    }
}).post(function (req, res) {
    User.updateOne({
        _id: req.user._id
    }, {
        $set: {
            wallet: {
                mnemonic: req.body.mnemonic
            }
        }
    }, function (err) {
        if (err) {
            console.log(err)
        } else {
            res.redirect("/wallet");
        }
    });
});



app.route("/dashboard").get(function (req, res) {
    if (req.isAuthenticated()) {
        User.findOne({
            _id: req.user._id
        }, function (err, foundUser) {
            if (!err) {
                res.render("dashboard", {
                    numberAnswered: foundUser.numberAnswered,
                    userFirstName: _.capitalize(foundUser.firstName)
                });
            }
        });
    } else {
        res.redirect("/");
    }
});

app.route("/logout").get(function (req, res) {
    req.logout();
    res.redirect("/");
});

app.route('/login').get(function (req, res) {
    res.render('login');
}).post(function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/")
        } else {
            passport.authenticate("local",{failureRedirect: "/"})(req, res, function () {
                        res.redirect("/dashboard");
                }
            );
        }
    });
});


app.route('/about').get(function (req, res) {
    res.render('about');
});

app.route("/compose").get(function (req, res) {
    res.render("compose");
}).post(function (req, res) {
    const question = new Question({
        question: req.body.question,
        reward: Number(req.body.reward),
        answer1: req.body.answer1,
        answer2: req.body.answer2,
        answer3: req.body.answer3,
        answer4: req.body.answer4
    });
    question.save(function (err) {
        if (!err) {
            res.redirect("/compose");
        } else {
            console.log(err);
            res.redirect("/")
        }
    });
});

app.listen(3000, function () {
    console.log('Server started on port 3000.');
});
