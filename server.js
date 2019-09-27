const express = require("express");
const bodyParser = require("body-parser");
const decorator = require("./database/decorator");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");
const redis = require("redis");
const RedisStore = require("connect-redis")(session);
const exphbs = require("express-handlebars");
const methodOverride = require("method-override");
const path = require("path");

const PORT = 8080;
const saltRounds = 12;
const User = require("./database/models/User");

require("dotenv").config();

const client = redis.createClient({ url: process.env.REDIS_URL });
const app = express();

app.use(express.static(path.join(__dirname, "/public")));
app.use(methodOverride("_method"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(decorator);
app.engine(".hbs", exphbs({ extname: ".hbs" })); //creates engine
app.set("view engine", ".hbs"); //use engine

app.use(
  session({
    store: new RedisStore({ client }),
    secret: process.env.REDIS_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login.html");
  }
}

passport.use(
  new LocalStrategy(function(username, password, done) {
    return new User({ username: username })
      .fetch()
      .then(user => {
        console.log("passport use user", user);

        if (user === null) {
          return done(null, false, { message: "bad username or password" });
        } else {
          user = user.toJSON();

          bcrypt.compare(password, user.password).then(res => {
            // Happy route: username exists, password matches
            if (res) {
              return done(null, user); //this is the user that goes to serialize
            }
            // Error Route: Username exists, password does not match
            else {
              return done(null, false, { message: "bad username or password" });
            }
          });
        }
      })
      .catch(err => {
        console.log("error: ", err);
        return done(err);
      });
  })
);

passport.serializeUser(function(user, done) {
  console.log("serializing");

  return done(null, { id: user.id, username: user.username });
});

passport.deserializeUser(function(user, done) {
  console.log("deserializing");
  console.log("user", user);
  return done(null, user);
});

app.use(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/gallery",
    failureRedirect: "/login.html"
  })
);

app.post("/register", (req, res) => {
  bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      console.log(err);
    } // return 500

    bcrypt.hash(req.body.password, salt, (err, hash) => {
      if (err) {
        console.log(err);
      } // return 500

      return new User({
        username: req.body.username,
        password: hash
      })
        .save()
        .then(user => {
          console.log("register pathway user", user);
          return res.redirect("/login.html");
        })
        .catch(err => {
          console.log(err);
          return res.render("register", {
            message: "Error creating account"
          });
        });
    });
  });
});

app.get("/gallery/:id/edit", (req, res) => {
  return new req.database.Gallery({ id: req.params.id })
    .fetch()
    .then(results => {
      res.status(200).render("edit", results.toJSON());
    })
    .catch(err => {
      res.status(404).json({ message: "Post Not Found" });
    });
});

app.get("/gallery/new", isAuthenticated, (req, res) => {
  res.status(200).render("new");
});

app.get("/gallery/:id", (req, res) => {
  return new req.database.Gallery({ id: req.params.id })
    .fetch({ withRelated: ["users"] })
    .then(results => {
      res.status(200).render("single", results.toJSON());
    })
    .catch(err => {
      res.status(404).json({ message: "Post Not Found" });
    });
});

//put is edit, DONE
app.put("/gallery/:id", isAuthenticated, (req, res) => {
  return req.database.Gallery.where({ id: req.params.id, user_id: req.user.id })
    .fetch()
    .then(() => {
      new req.database.Gallery({ id: req.params.id })
        .save(
          {
            description: req.body.description,
            link: req.body.link,
            user_id: req.user.id
          },
          { patch: false }
        )
        .then(() => {
          res.status(200).redirect(`/gallery/${req.params.id}`);
        });
    })
    .catch(err => {
      return new req.database.Gallery({ id: req.params.id })
        .fetch({ withRelated: ["users"] })
        .then(results => {
          console.log(results.toJSON().users.username);
          res.status(500).render(`single`, {
            description: results.toJSON().description,
            link: results.toJSON().link,
            users: { username: results.toJSON().users.username },
            message: "ERROR: Unable to edit post that you did not create."
          });
        });
    });
});

//delete done
app.delete("/gallery/:id", isAuthenticated, (req, res) => {
  return req.database.Gallery.where({ id: req.params.id, user_id: req.user.id })
    .destroy()
    .then(() => {
      res.status(200).redirect("/");
    })
    .catch(err => {
      return new req.database.Gallery({ id: req.params.id })
        .fetch({ withRelated: ["users"] })
        .then(results => {
          console.log(results.toJSON().users.username);
          res.status(500).render(`single`, {
            description: results.toJSON().description,
            link: results.toJSON().link,
            users: { username: results.toJSON().users.username },
            message: "ERROR: Unable to delete post that you did not create."
          });
        });
    });
});

app.get("/gallery", (req, res) => {
  return req.database.Gallery.fetchAll({ withRelated: ["users"] })
    .then(results => {
      console.log(results.toJSON());
      res.status(200).render("gallery", {
        gallery: results.toJSON()
      });
    })
    .catch(err => {
      res.status(500).json({ message: "Error" });
    });
});

//post is create new, DONE
app.post("/gallery", isAuthenticated, (req, res) => {
  if (req.body.description === "" || req.body.link === "") {
    res.status(500).render("new", { errorMsg: "ERROR: Both fields required." });
  } else {
    return req.database.Gallery.forge({
      description: req.body.description,
      link: req.body.link,
      user_id: req.user.id
    })
      .save()
      .then(() => {
        res.status(200).redirect("/gallery");
      })
      .catch(err => {
        console.log(err);
        res.status(500);
      });
  }
});

app.get("/register", (req, res) => {
  res.status(200).render("register");
});

app.get("/", (req, res) => {
  return req.database.Gallery.fetchAll({ withRelated: ["users"] })
    .then(results => {
      res.status(200).render("gallery", { gallery: results.toJSON() });
    })
    .catch(err => {
      res.status(500).json({ message: "Error" });
    });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server started on PORT: ${PORT}`);
});
