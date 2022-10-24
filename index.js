const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  { check, validationResult } = require('express-validator');


const app = express();

const Movies = Models.Movie;
const Users = Models.User;

// local database
//mongoose.connect('mongodb://localhost:27017/movieDB', {useNewUrlParser: true, useUnifiedTopology: true});
// online database
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// MIDDLEWARE
app.use(bodyParser.json());
// CORS
const cors = require('cors');
// all origins allowed:
app.use(cors());

// certain origins allowed:
// let allowedOrigins = ['http://localhost:8080', 'http://testsite.com']
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true); // i don't understand this line
//     if (allowedOrigins.indexOf(origin) === -1){ // specific origin not in allowedOrigins list
//       let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
//       return callback(new Error(message), false);
//     }
//     return callback(null, true);
//   }
// }));

// authentication
require('./auth')(app);
const passport = require('passport');
require('./passport');
//Logs
app.use(morgan('common'));
app.use(express.static('public'));


// CREATE //
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
    const hashedPassword = Users.hashPassword(req.body.Password);
    
    Users.findOne({Username: req.body.Username}) // Search to see if a user with the requested username already exists
    .then((user) => {
      if(user) {
        //If the user is found, send a response that it already exists
        return res.status(400).send(user);
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

app.post('/users/:Username/movies/:MovieID',  (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true },
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// READ //
app.get('/', (req, res) => {
  res.send("Welcome to MyFlixApp!");
});

app.get('/users',  (req, res) => {
  Users.find()
    .then((users) => {
      
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});

app.get('/users/:Username', (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

app.get('/movies', (req, res) => {
  Movies.find()
    .then((movies) => {
      
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});

app.get('/movies/:Title',  (req, res) => {
  Movies.findOne({Title: req.params.Title })
    .then((movie) => {
      
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});


// app.get('/genres/:Genre', passport.authenticate('jwt', { session: false }), (req, res) => {
//   Movies.find({ "Genre.Name": req.params.Genre })
//     .then((movies) => {
//       res.send(movies);
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(400).send('Error: ' + err);
//     })
// });

// app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
//   Movies.find()
//     .then((movies) => {
//       res.status(201).json(movies);
//     })
//     .catch((error) => {
//       console.error(error);
//       res.status(500).send('Error: ' + error);
//     });
// });

// Returns the description of a Genre (of the first one found)
app.get('/genre/:genreName',  (req, res) => {
  Movies.findOne({ genreName: req.params.Genre })
    .then((movie) => {
      res.send(movie.Genre.Description);
    })
    .catch((err) => {
      console.error(err);
      res.status(400).send('Error: ' + err);
    })
});

app.get('/director/:directorName',  (req, res) => {
   Movies.findOne({ directorName: req.params.directorName })
  .then((movie) => {
    res.json(movie.Director);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// UPDATE //

app.put('/users/:Username', 

// [ check("Username", "Username is required").isLength({ min: 5 }),
//   check(
//     "Username",
//     "Username contains non alphanumeric characters - not allowed."
//   ).isAlphanumeric(),
//   check("Password", "Password is required").not().isEmpty(),
//   check("Email", "Email does not appear to be valid").isEmail(),
// ],
(req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      // Password: req.body.Password,
      Password: hashedPassword,
      Email: req.body.Email,
      Birthday: req.body.Birthday,
      FavoriteMovies: req.body.FavoriteMovies
    }
  },
  { new: true },
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
      res.json(updatedUser);
    }
  });
});

// DELETE//
app.delete('/users/:Username/movies/:MovieID',  (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $pull: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, 
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

app.delete('/users/:Username',  (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });






// Error handling middleware function//
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Widened accesibility from port 8080 only //
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});