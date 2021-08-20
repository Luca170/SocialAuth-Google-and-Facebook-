require("dotenv").config()
const express= require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const {ObjectId} = require("mongodb")
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook")
const {ensureLoggedIn} = require("connect-ensure-login")
const passport = require("passport")
const session = require("express-session")
const LocalStrategy = require("passport-local")
const app=express()

app.use(express.json())
app.use(express.urlencoded({extended:false}))
const URI = "mongodb+srv://ciao:ciao@cluster0.ogg8o.mongodb.net/mydb?retryWrites=true&w=majority" ;
mongoose.connect(URI, {useNewUrlParser:true, useUnifiedTopology:true})
app.use(express.static("public"))
app.set("view engine", "ejs")
app.use(session({
    secret:"Your secret key",
    resave:true,
    saveUninitialized:true,
}))
let facebookSchema = new mongoose.Schema({
    facebookId:String,
    name:String
})
let googleSchema = new mongoose.Schema({
    name:String,
    googleId: String
})
let userSchema =new mongoose.Schema({
    name:String,
    facebookId:{required:false, type:String},
    googleId:{required:false, type:String}
})
userSchema.plugin(findOrCreate)
googleSchema.plugin(findOrCreate)
facebookSchema.plugin(findOrCreate)
let User = mongoose.model("User", userSchema)
let Guser = mongoose.model("Guser", googleSchema)
let FUser = mongoose.model("FUser", facebookSchema)
app.use(passport.initialize())
app.use(passport.session())
passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    // console.log(`id: ${id}`);
    User.findById(id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        console.log(`Error: ${error}`);
      });
    Guser.findById(id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        console.log(`Error: ${error}`);
      });
  });
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:8000/auth/facebook/callback",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        const name = profile.displayName
         let new_user = new User({
            name:name
          })
          if(!User.findOne({facebookId: profile.id})){
              new_user.save()
          }
        return cb(err,user)
    });
  }
  ));

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret:process.env.GOOGLE_SECRET,
    callbackURL: "http://localhost:8000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    Guser.findOrCreate({ googleId: profile.id }, function (err, user) {
        // const name = profile.displayName
        // console.log(name)
        // let googleUser = new User({
        //     name: profile.displayName,
        //     googleId:profile.id
        // },{collection:"auths"})
        // if(!User.findOne({googleId: profile.id})){
        //     googleUser.save()
        // }
        // console.log(user)
        return cb(err, user);
    });
  }
));

function ensureAuthenticated(req,res,next){
    if(req.isAuthenticated()) {
       next()
    }
    else{
       res.redirect("/")
    }
}

app.get("/", (req,res) => {
    res.render("home.ejs")
})
app.get("/error", (req,res) => {
    res.send("Some errors occurred...")
})
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log(req)
    res.redirect("/logged");
  });


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log(req)
    res.render("loggedIn.ejs")
  });
app.get("/logged",ensureAuthenticated, (req,res) => {
    res.render("logged.ejs")
})
  app.get("/logout", (req,res) => {
      req.logout()
      res.redirect("/")
  })
app.listen(8000)