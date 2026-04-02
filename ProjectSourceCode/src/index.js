//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\
//#############################################################  CSCI 3308 - Software Development  #############################################################\\
//#############################################################  Group Project - "Challenge Loop"  #############################################################\\
//##########################################  Tahnee Xiong, Hunter Jamili, Jacob Pierson, Peter Hindes, Fynian Walker  #########################################\\
//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\


//-----------------------------------------------------------------------  Dependencies  -----------------------------------------------------------------------\\

const express = require('express'); //Use node express
const app = express();
const session = require('express-session'); //create session object
const handlebars = require('express-handlebars'); //enable express to use handlebars
const Handlebars = require('handlebars'); //include templating engine for handlebars
const path = require('path');
const pgp = require('pg-promise')(); //use pg-promise for database queries
const bodyParser = require('body-parser'); 
const bcrypt = require('bcryptjs'); //password encryption
const axios = require('axios'); //send HTTP requests


//---------------------------------------------------------------------------  Setup  --------------------------------------------------------------------------\\

//***  Handlebars  ***\\

// Create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.


//***  Database ***\\

// Database configuration
const dbConfig = {
  host: 'db',
  port: 5432, 
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER, 
  password: process.env.POSTGRES_PASSWORD 
};

//Connect to the database
const db = pgp(dbConfig);
db.connect()
  .then(obj => {
    console.log('Database connection successful'); 
    obj.done();
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
});


//***  Session Variables  **\\

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


//------------------------------------------------------------------------  API Routes  ------------------------------------------------------------------------\\

//Check session variable
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};


app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      return res.render('pages/login', { error: 'Invalid username.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('pages/login', { error: 'Invalid password.' });
    }
    req.session.user = { username: user.username, email: user.email, id: user.id };
    req.session.save(() => res.redirect('/home'));
  } catch (err) {
    console.log(err);
    res.render('pages/login', { error: 'An error occurred during login.' });
  }
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.none('INSERT INTO users(username, email, password) VALUES($1, $2, $3)', [username, email, hash]);
    res.redirect('/login');
  } catch (err) {
    console.log(err);
    res.render('pages/register', { error: 'Registration failed. Username or email might already be taken.' });
  }
});

app.get('/home', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const active = await db.any(`SELECT c.*, uc.progress, uc.id as join_id FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id WHERE uc.user_id=$1 AND uc.progress < 100`, [userId]);
    const completed = await db.any(`SELECT c.* FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id WHERE uc.user_id=$1 AND uc.progress = 100`, [userId]);
    res.render('pages/home', { user: req.session.user, active, completedCount: completed.length, activeCount: active.length });
  } catch(err) {
    console.error(err);
    res.render('pages/home', { user: req.session.user, active:[], completedCount: 0, activeCount: 0 });
  }
});

app.get('/discover', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const prefs = await db.any('SELECT category FROM user_preferences WHERE user_id = $1', [userId]);
    const preferredCategories = prefs.map(p => p.category);

    const popularity = await db.any(`
      SELECT c.category, COUNT(uc.id) as popular_score 
      FROM challenges c 
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id 
      GROUP BY c.category 
      ORDER BY popular_score DESC, c.category ASC
    `);
    const allCategories = popularity.map(p => p.category);

    const completed = await db.any(`
      SELECT c.* FROM challenges c 
      JOIN user_challenges uc ON c.id = uc.challenge_id 
      WHERE uc.user_id = $1 AND uc.progress = 100
    `, [userId]);

    let recommended = [];
    if (preferredCategories.length > 0) {
      recommended = await db.any(`
        SELECT c.* FROM challenges c 
        WHERE c.category = ANY($1) AND c.id NOT IN (
          SELECT challenge_id FROM user_challenges WHERE user_id = $2
        ) LIMIT 10
      `, [preferredCategories, userId]);
    } else {
       recommended = await db.any(`
        SELECT c.* FROM challenges c 
        WHERE c.id NOT IN (
          SELECT challenge_id FROM user_challenges WHERE user_id = $1
        ) LIMIT 10
      `, [userId]);
    }

    res.render('pages/discover', { 
      user: req.session.user,
      allCategories,
      preferredCategories,
      recommended,
      completed
    });
  } catch(err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/update-preferences', auth, async (req, res) => {
    const userId = req.session.user.id;
    let categories = req.body.categories || [];
    if (!Array.isArray(categories)) categories = [categories];

    await db.none('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    for(const cat of categories) {
        await db.none('INSERT INTO user_preferences (user_id, category) VALUES ($1, $2)', [userId, cat]);
    }
    res.redirect('/discover');
});

app.post('/join-challenge', auth, async (req, res) => {
    const userId = req.session.user.id;
    const challengeId = req.body.challenge_id;
    try {
      await db.none('INSERT INTO user_challenges (user_id, challenge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, challengeId]);
    } catch(err) {
      console.error(err);
    }
    res.redirect('/home');
});


app.get('/logout', auth, (req, res) => {

  req.session.destroy(result => { console.log(result); });
  const message = 'Logout successful!';
  res.render('pages/logout', { message })

});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');