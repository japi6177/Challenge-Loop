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
  helpers: {
    eq: function (a, b) { return a === b; },
    includes: function(arr, val) {
       if(!Array.isArray(arr)) return false;
       return arr.includes(val);
    },
    iconForCategory: function(cat) {
        if (cat === 'Fitness') return 'fa-dumbbell';
        if (cat === 'Productivity') return 'fa-briefcase';
        if (cat === 'Educational') return 'fa-book-open';
        return 'fa-star';
    }
  }
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
      return res.render('pages/login', { loginError: 'Invalid username.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('pages/login', { loginError: 'Invalid password.' });
    }
    req.session.user = { username: user.username, email: user.email, id: user.id };
    req.session.save(() => res.redirect('/home'));
  } catch (err) {
    console.log(err);
    res.render('pages/login', { loginError: 'An error occurred during login.' });
  }
});

app.get('/register', (req, res) => {
  res.redirect('/login');
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await db.one('INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email', [username, email, hash]);
    
    req.session.user = { username: user.username, email: user.email, id: user.id };
    req.session.save(() => res.redirect('/home'));
  } catch (err) {
    console.log(err);
    res.render('pages/login', { registerError: 'Registration failed. Username or email might already be taken.' });
  }
});

app.get('/home', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const active = await db.any(`SELECT c.*, COALESCE(up.progress, 0) as progress, uc.id as join_id FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) < 100`, [userId]);
    const completed = await db.any(`SELECT c.* FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) = 100`, [userId]);
    res.render('pages/home', { 
        user: req.session.user, 
        active, 
        completedCount: completed.length, 
        activeCount: active.length,
        today: new Date().toISOString().split('T')[0]
    });
  } catch(err) {
    console.error(err);
    res.render('pages/home', { user: req.session.user, active:[], completedCount: 0, activeCount: 0, today: new Date().toISOString().split('T')[0] });
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
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1 AND COALESCE(up.progress, 0) = 100
    `, [userId]);

    let recommended = [];
    if (preferredCategories.length > 0) {
      recommended = await db.any(`
        SELECT c.*, COUNT(uc.challenge_id) as popularity 
        FROM challenges c
        LEFT JOIN user_challenges uc ON c.id = uc.challenge_id
        WHERE c.category = ANY($1) AND c.id NOT IN (SELECT challenge_id FROM user_challenges WHERE user_id = $2)
        GROUP BY c.id
        ORDER BY popularity DESC, c.id ASC
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

app.get('/challenge/:id', auth, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.session.user.id;
        
        const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (!challenge) return res.redirect('/home');
        
        const userChallenge = await db.oneOrNone('SELECT * FROM user_challenges WHERE user_id = $1 AND challenge_id = $2', [userId, challengeId]);
        
        let entries = [];
        if (userChallenge) {
            entries = await db.any('SELECT TO_CHAR(entry_date, \'YYYY-MM-DD\') as entry_date, amount, is_completed FROM challenge_entries WHERE user_challenge_id = $1 ORDER BY entry_date DESC', [userChallenge.id]);
        }

        const leaderboard = await db.any(`
            WITH today_entries AS (
                SELECT user_challenge_id, SUM(amount) as today_amount, BOOL_OR(is_completed) as today_done
                FROM challenge_entries 
                WHERE entry_date = CURRENT_DATE
                GROUP BY user_challenge_id
            )
            SELECT u.username, 
                   COALESCE(up.progress, 0) as progress,
                   COALESCE(up.successful_days, 0) as successful_days,
                   CASE 
                       WHEN c.entry_type = 'checkbox' THEN 
                           CASE WHEN COALESCE(te.today_done, false) THEN 100 ELSE 0 END
                       ELSE 
                           LEAST(ROUND((COALESCE(te.today_amount, 0)::numeric / c.daily_target::numeric) * 100), 100)
                   END as today_progress
            FROM user_challenges uc 
            JOIN users u ON u.id = uc.user_id 
            JOIN challenges c ON c.id = uc.challenge_id
            LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
            LEFT JOIN today_entries te ON uc.id = te.user_challenge_id
            WHERE uc.challenge_id = $1 
            ORDER BY successful_days DESC, today_progress DESC
            LIMIT 10
        `, [challengeId]);

        res.render('pages/challenge', { 
            user: req.session.user, 
            challenge, 
            userChallenge, 
            entries,
            leaderboard,
            today: new Date().toISOString().split('T')[0]
        });
    } catch(err) {
        console.error(err);
        res.redirect('/home');
    }
});

app.post('/challenge/:id/log', auth, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.session.user.id;
        const { date, amount, completed } = req.body;
        
        const userChallenge = await db.oneOrNone('SELECT id FROM user_challenges WHERE user_id = $1 AND challenge_id = $2', [userId, challengeId]);
        if (!userChallenge) return res.redirect('/home');

        const isCompleted = completed === 'on';
        const numAmount = amount ? parseFloat(amount) : 0;

        await db.none(`
            INSERT INTO challenge_entries (user_challenge_id, entry_date, amount, is_completed)
            VALUES ($1, $2, $3, $4)
        `, [userChallenge.id, date, numAmount, isCompleted]);

        res.redirect('/challenge/' + challengeId);
    } catch(err) {
        console.error(err);
        res.redirect('/challenge/' + req.params.id);
    }
});


app.get('/profile', auth, async (req, res) => {
    try {
        const user = await db.one('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const counts = await db.oneOrNone(`
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) < 100) as active_count,
                COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) = 100) as completed_count
            FROM user_challenges uc
            LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
            WHERE uc.user_id = $1
        `, [user.id]);

        res.render('pages/profile', { 
            user: req.session.user, 
            profileUser: user,
            activeCount: counts ? counts.active_count : 0,
            completedCount: counts ? counts.completed_count : 0
        });
    } catch(err) {
        console.error(err);
        res.redirect('/home');
    }
});

app.get('/logout', auth, (req, res) => {

  req.session.destroy(result => { console.log(result); });
  const message = 'Logout successful!';
  res.redirect('/login');

});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');