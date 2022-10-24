//importing express and morgan
const express = require('express'),
app = express(),
morgan = require('morgan'),
bodyParser = require('body-parser'),
 uuid = require('uuid');
const { check, validationResult } = require('express-validator');
 //Mongoose and model imports
const mongoose = require('mongoose');
const Models = require('./models.js');
//importing Movie and User
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;
//Database connection
// mongoose.connect('mongodb://localhost:27017/myFlixDB', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());
app.use(morgan('common'));

app.use(bodyParser.urlencoded({ extended: true }));

// allows all domains access
const cors = require('cors');
app.use(cors());
// allows only certain domains to access
// const cors = require('cors');
// let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];

// app.use(cors({
//   origin: (origin, callback) => {
//     if(!origin) return callback(null, true);
//     if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
//       let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
//       return callback(new Error(message ), false);
//     }
//     return callback(null, true);
//   }
// }));

let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');


  // GET requests
  // default text response when at /
app.get("/",(req,res) => {
  res.send("Welcome to MyFlix!");
});

// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  console.log("params", req.params)
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

  // app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  //   Movies.find()
  //   .then((movies) => {
  //     res.status(201).json(movies);
  //   })
  //   .catch((err) => {
  //     console.error(err);
  //     res.status(500).send("Error:" + err);
  //   });

  // });

  app.get("/movies", function (req, res) {
    Movies.find()
      .then(function (movies) {
        res.status(201).json(movies);
      })
      .catch(function (error) {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  });

  app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), (req, res) => {
   Movies.findOne({Title: req.params.Title})
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' +err);
    });
  });

  app.get('/genres/:Name', passport.authenticate('jwt', { session: false }), (req, res) => {
    Genres.findOne({Name: req.params.Name})
    .then((genre) => {
      res.json(genre.Description);
    })
     .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' +err);
    });
  });

  app.get('/directors/:Name', passport.authenticate('jwt', { session: false }), (req, res) => {
    Directors.findOne({Name: req.params.Name})
    .then ((director) => {
      res.json(director);
    })
     .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
  });

  //allow users to register
  app.post('/users',
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req,res) =>{
    // check the validation object for errors
   let errors = validationResult(req);

   if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
   }
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({Username: req.body.Username}) // Search to see if a user with the requested username already exists
    .then((user) => {
      if(user) {
        //If the user is found, send a response that it already exists
        return res.status(400).send(req.body.Username + 'already exists');
      }
      else{
        Users.create({
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birth: req.body.Birth,
        })
        .then ((user) => {
          res.status(201).json(user);
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error:' + error);
        });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error:' + error);
    });
  });
  //create favorite movie to use

  app.post('/users/:Username/movies/:Movie', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOneAndUpdate (
      {Username: req.params.Username},
      {
        $push: { FavouriteMovies: req.params.Movie },
      },
      { new: true},
      (err, updatedUser) => {
        if(err) {
          console.error(err);
          res.status(500).send('Error:' + err);
        }
        else {
          res.json(updatedUser);
        }
      }
  );
});
  //update user info
  app.put('/users/:Username', passport.authenticate('jwt', { session: false }),
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      {Username: req.params.Username},
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birth:req.body.Birth,
        },
      },
      {new: true},
      (err, updatedUser) => {
        if(err) {
          console.error(err);
          res.status(500).send('Error:' + err);
        }
        else {
          res.json(updatedUser);
        }
      }
      );
  });
  //delete
  app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOneAndRemove({Username: req.params.Username})
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + 'was not found');
      } else {
        res.status(200).send(req.params.Username + 'was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
  });
  //delete fav movie
  app.delete('/users/:Username/movies/:Movie', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $pull: { FavouriteMovies: req.params.Movie }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});


   app.use(express.static('public'));

   //error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
  // listen for requests
  // app.listen(8080, () => {
  //   console.log('Your app is listening on port 8080.');
  // });
  const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});