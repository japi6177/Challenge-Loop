//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\
//#############################################################  CSCI 3308 - Software Development  #############################################################\\
//#############################################################  Group Project - "Challenge Loop"  #############################################################\\
//##########################################  Tahnee Xiong, Hunter Jamili, Jacob Pierson, Peter Hindes, Fynian Walker  #########################################\\
//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\


//-----------------------------------------------------------------------  Dependencies  -----------------------------------------------------------------------\\

const express = require('express');
const app = express();
const session = require('express-session');
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}


//-----------------------------------------------------------------------  DB Init  -----------------------------------------------------------------------\\

async function initDbIfEmpty(database) {
  try {
    const tableExists = await database.oneOrNone(
      `SELECT to_regclass('public.users') AS exists`
    );

    if (tableExists && tableExists.exists) {
      console.log('Database already initialized.');
      return;
    }

    console.log('Running init scripts...');
    const createSql = fs.readFileSync(path.join(__dirname, 'init_data', 'create.sql'), 'utf8');
    const insertSql = fs.readFileSync(path.join(__dirname, 'init_data', 'insert.sql'), 'utf8');

    await database.none(createSql);
    await database.none(insertSql);

    console.log('DB initialized.');
  } catch (err) {
    console.error('DB init failed:', err);
  }
}


//---------------------------------------------------------------------------  Setup  --------------------------------------------------------------------------\\

// Handlebars
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  helpers: {
    eq: (a, b) => a === b,
    includes: (arr, val) => Array.isArray(arr) && arr.includes(val),
    iconForCategory: cat => {
      if (cat === 'Fitness') return 'fa-dumbbell';
      if (cat === 'Productivity') return 'fa-briefcase';
      if (cat === 'Educational') return 'fa-book-open';
      return 'fa-star';
    }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));


// Database
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

const db = pgp(dbConfig);

db.connect()
  .then(async obj => {
    console.log('Database connected');
    obj.done();
    await initDbIfEmpty(db);
  })
  .catch(err => console.error(err));


// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false
}));


//-----------------------------------------------------------------------  Auth Middleware  -----------------------------------------------------------------------\\

const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};


//-----------------------------------------------------------------------  Routes  -----------------------------------------------------------------------\\

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('pages/login');
});


app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});


//---------------- LOGIN ----------------//

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE username=$1', [username]);

    if (!user) return res.render('pages/login', { loginError: 'Invalid username.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('pages/login', { loginError: 'Invalid password.' });

    req.session.user = user;
    req.session.save(() => res.redirect('/home'));

  } catch (err) {
    res.render('pages/login', { loginError: 'Login error.' });
  }
});


//---------------- EMAIL LOGIN ----------------//

app.post('/email-login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE email=$1', [email]);

    if (!user) {
      return res.render('pages/login', { loginError: 'Email not found.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.emailCode = code;
    req.session.emailCodeEmail = email;

    if (resend) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Login Code',
        html: `<h2>${code}</h2>`
      });
    } else {
      console.log(`[DEV CODE]: ${code}`);
    }

    res.redirect('/verify-code');

  } catch (err) {
    res.render('pages/login', { loginError: 'Email error.' });
  }
});

app.get('/verify-code', (req, res) => {
  if (!req.session.emailCodeEmail) return res.redirect('/login');
  res.render('pages/verify-code');
});

app.post('/verify-code', async (req, res) => {
  if (req.body.code === req.session.emailCode) {
    const user = await db.one('SELECT * FROM users WHERE email=$1', [req.session.emailCodeEmail]);
    req.session.user = user;
    res.redirect('/home');
  } else {
    res.render('pages/verify-code', { error: 'Invalid code.' });
  }
});


//---------------- REGISTER ----------------//


app.post('/register', async (req, res) => {
  
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new Error('Missing required fields');
    }

    //Validate username
    if (username.length < 8) {
      throw new Error('Username must be at least 8 characters long.');
    }
    else if (!usernameRegex.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores.');
    }

    //validate email
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    //validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    else if (!passwordRegex.test(password)) {
      throw new Error('Password must include uppercase, lowercase, and a number.');
    }


    const hash = await bcrypt.hash(password, 10);
    const user = await db.one('INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email', [username, email, hash]);
    
    req.session.user = { username: user.username, email: user.email, id: user.id };
    req.session.save(() => res.redirect('/home'));
  } catch (err) {
    // console.log(err);
    //I had to tack on the "registration failed" bit to every error message for the mocha tests. Be careful if you change it.
    res.render('pages/login', { registerError: ('Registration failed. ' + err.message) ||'Registration failed. Username or email might already be taken.' });
  }
});


//---------------- HOME ----------------//

app.get('/home', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const active = await db.any(`SELECT * FROM challenges c 
      JOIN user_challenges uc ON c.id=uc.challenge_id
      WHERE uc.user_id=$1`, [userId]);

    res.render('pages/home', {
      user: req.session.user,
      active,
      activeCount: active.length,
      today: new Date().toISOString().split('T')[0]
    });

  } catch {
    res.render('pages/home', { user: req.session.user, active: [] });
  }
});


//---------------- PROFILE ----------------//

//Overhauled /profile method to allow users to view any profile, based on the username in the URL.
//Viewing a different person's profile doesn't allow you to edit it. Obviously.
//Also, if there's no username provided, it defaults to your profile, per the standard /profile route below this one.
app.get('/profile/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    
    const profileUser = await db.oneOrNone(
      'SELECT id, username, email, profile_picture, created_at FROM users WHERE username = $1',
      [username]
    );

    //If no such user is found
    if (!profileUser) {
      return res.status(404).render('pages/404');
    }

    //This variable controls your permissions on this page. 
    //This prevents you from editing other people's profiles
    //Please don't mess with it unless you need to.
    const isMe = req.session.user.username === profileUser.username;
    console.log(isMe);

    //Query to return challenges associated with the user
    const counts = await db.oneOrNone(`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) < 100) as active_count,
        COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) = 100) as completed_count
      FROM user_challenges uc
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1
    `, [profileUser.id]);

    //Error messages for modifying your account.
    const errorMessages = {
      wrong_password: 'Current password is incorrect.',
      password_mismatch: 'New passwords do not match.',
      email_taken: 'That email is already in use.',
      no_image: 'Please select an image (JPEG, PNG, GIF, or WebP).',
      server: 'Something went wrong. Please try again.'
    };
    //Non-error messages for doing that
    const successMessages = {
      password: 'Password changed successfully.',
      email: 'Email updated successfully.',
      picture: 'Profile picture updated.'
    };

    res.render('pages/profile', {
      user: req.session.user,              // logged-in user
      profileUser,                         // profile being viewed
      isMe,                        // key flag for the UI
      activeCount: counts ? counts.active_count : 0,
      completedCount: counts ? counts.completed_count : 0,
      flashError: isMe ? errorMessages[req.query.error] || null : null,
      flashSuccess: isMe ? successMessages[req.query.success] || null : null,
      openEdit: isMe && !!(req.query.error || req.query.success)
    });

  } catch (err) {
    console.error(err);
>>>>>>> 463127a (issues resolved)
    res.redirect('/home');
  }
});

app.get('/profile', auth, (req, res) => {
  const username = req.session.user.username;
  res.redirect(`/profile/${username}`);
});

app.post('/profile/change-email', auth, async (req, res) => {
  try {
    const { new_email } = req.body;
    const userId = req.session.user.id;
    await db.none('UPDATE users SET email = $1 WHERE id = $2', [new_email, userId]);
    req.session.user.email = new_email;
    req.session.save(() => res.redirect('/profile?success=email'));
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=email_taken');
  }
>>>>>>> 463127a (issues resolved)
});


//---------------- LOGOUT ----------------//

app.get('/logout', auth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

module.exports = app.listen(3000);
console.log('Server running on port 3000');