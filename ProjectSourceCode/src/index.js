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

    if (username.length < 8) throw new Error('Username must be at least 8 characters.');
    if (!usernameRegex.test(username)) throw new Error('Invalid username.');
    if (!emailRegex.test(email)) throw new Error('Invalid email.');
    if (password.length < 8) throw new Error('Password too short.');
    if (!passwordRegex.test(password)) throw new Error('Weak password.');

    const hash = await bcrypt.hash(password, 10);

    const user = await db.one(
      'INSERT INTO users(username,email,password) VALUES($1,$2,$3) RETURNING id,username,email',
      [username, email, hash]
    );

    req.session.user = user;
    res.redirect('/home');

  } catch (err) {
    res.render('pages/login', {
      registerError: 'Registration failed. ' + err.message
    });
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

app.get('/profile/:username', auth, async (req, res) => {
  try {
    const profileUser = await db.oneOrNone(
      'SELECT * FROM users WHERE username=$1',
      [req.params.username]
    );

    if (!profileUser) return res.status(404).render('pages/404');

    const isMe = req.session.user.username === profileUser.username;

    res.render('pages/profile', {
      user: req.session.user,
      profileUser,
      isMe
    });

  } catch {
    res.redirect('/home');
  }
});

app.get('/profile', auth, (req, res) => {
  res.redirect(`/profile/${req.session.user.username}`);
});


//---------------- LOGOUT ----------------//

app.get('/logout', auth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

module.exports = app.listen(3000);
console.log('Server running on port 3000');