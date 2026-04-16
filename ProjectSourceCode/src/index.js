//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\
//#############################################################  CSCI 3308 - Software Development  #############################################################\\
//#############################################################  Group Project - "Challenge Loop"  #############################################################\\
//##########################################  Tahnee Xiong, Hunter Jamili, Jacob Pierson, Peter Hindes, Fynian Walker  #########################################\\
//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\


//-----------------------------------------------------------------------  Dependencies  -----------------------------------------------------------------------\\

// require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express'); //Use node express
const app = express();
const handlebars = require('express-handlebars'); //enable express to use handlebars
const Handlebars = require('handlebars'); //include templating engine for handlebars
const path = require('path');
const fs = require('fs');
const pgp = require('pg-promise')(); //use pg-promise for database queries
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { expressjwt: jwtVerify } = require('express-jwt');
const crypto = require('crypto');
const { Resend } = require('resend'); // email client
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}


// Check if the db is empty and if it is then run the init_data files
async function initDbIfEmpty(database) {
  try {
    const tableExists = await database.oneOrNone(
      `SELECT to_regclass('public.users') AS exists`
    );
    if (tableExists && tableExists.exists) {
      console.log('Database already initialized, skipping init_data.');
    } else {
      console.log('Database is empty — running init_data scripts...');
      const createSql = fs.readFileSync(path.join(__dirname, 'init_data', 'create.sql'), 'utf8');
      const insertSql = fs.readFileSync(path.join(__dirname, 'init_data', 'insert.sql'), 'utf8');
      await database.none(createSql);
      console.log('  ✔ create.sql executed');
      await database.none(insertSql);
      console.log('  ✔ insert.sql executed');
      console.log('Database initialization complete.');
    }

    // Ensure user_logouts exists even if DB was already initialized
    await database.none(`
      CREATE TABLE IF NOT EXISTS user_logouts (
          email VARCHAR(100) PRIMARY KEY,
          logout_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✔ user_logouts table ensured');
  } catch (err) {
    console.error('Database initialization failed:', err.message || err);
  }
}


//---------------------------------------------------------------------------  Setup  --------------------------------------------------------------------------\\

//***  Handlebars  ***\\

// Create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  helpers: {
    eq: function (a, b) { return a === b; },
    includes: function (arr, val) {
      if (!Array.isArray(arr)) return false;
      return arr.includes(val);
    },
    iconForCategory: function(cat) {
        if (cat === 'Fitness') return 'fa-dumbbell';
        if (cat === 'Productivity') return 'fa-briefcase';
        if (cat === 'Educational') return 'fa-book-open';
        return 'fa-star';
    },
    iconForType: function(type) {
        if (type === 'daily') return 'fa-sun';
        if (type === 'weekly') return 'fa-calendar-week';
        if (type === 'monthly') return 'fa-calendar';
        if (type === 'group') return 'fa-users';
        return 'fa-flag';
    },
    labelForType: function(type) {
        if (type === 'daily') return 'Daily';
        if (type === 'weekly') return 'Weekly';
        if (type === 'monthly') return 'Monthly';
        if (type === 'group') return 'Group';
        return type;
    },
    lt: function(a, b) { return Number(a) < Number(b); },
    lte: function(a, b) { return Number(a) <= Number(b); }
  }
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json({ limit: '5mb' })); // specify the usage of JSON for parsing request body.


//***  Database ***\\

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

//Connect to the database
const db = pgp(dbConfig);
db.connect()
  .then(async obj => {
    console.log('Database connection successful');
    obj.done();
    await initDbIfEmpty(db);
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });


//***  Session Variables  **\\

app.use(cookieParser());

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '5mb',
  })
);


//------------------------------------------------------------------------  API Routes  ------------------------------------------------------------------------\\

//Check session variable
// JWT Verification middleware
const requireAuth = jwtVerify({
  secret: process.env.SESSION_SECRET || 'supersecret',
  algorithms: ['HS256'],
  getToken: req => req.cookies.token,
  credentialsRequired: false // Handle strictly in our own custom middleware
});

//Check authentication variable
const auth = (req, res, next) => {
  requireAuth(req, res, async (err) => {
    if (err || !req.auth) {
      return res.redirect('/login');
    }

    // Check if token's user has logged out since it was issued
    const email = req.auth.email;
    const iat = req.auth.iat; // issued at (epoch seconds)
    if (email && iat) {
      try {
        const logoutRecord = await db.oneOrNone('SELECT EXTRACT(EPOCH FROM logout_at) AS logout_seconds FROM user_logouts WHERE email = $1', [email]);
        if (logoutRecord && logoutRecord.logout_seconds && iat < logoutRecord.logout_seconds) {
          res.clearCookie('token');
          return res.redirect('/login');
        }
      } catch (dbErr) {
        console.error('Error checking user logouts:', dbErr);
        return res.redirect('/login');
      }
    }

    // Assign auth object to mock existing session.user references to prevent further code changes
    req.session = req.session || {};
    req.session.user = req.auth;
    next();
  });
};

function reissueToken(res, userPayload) {
    const newToken = jwt.sign(userPayload, process.env.SESSION_SECRET || 'supersecret', { expiresIn: '7d' });
    res.cookie('token', newToken, { httpOnly: true });
}


app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/email-login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.redirect('/register?email=' + encodeURIComponent(email));
    }

    // Generate 6 digit code
    let code;
    if (email.endsWith('@example.com')) {
      code = '123456';
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    const pendingToken = jwt.sign({ action: 'login', email, codeHash }, process.env.SESSION_SECRET || 'supersecret', { expiresIn: '15m' });
    res.cookie('pending_token', pendingToken, { httpOnly: true });

    if (email.endsWith('@example.com')) {
       console.log(`[DEV] Skipped sending email for test user login.`);
    } else if (resend) {
      await resend.emails.send({
        from: 'onboarding@resend.abad.cc',
        to: email,
        subject: 'Your Sign In Code - Challenge Loop',
        html: `<h2>Welcome to Challenge Loop</h2><p>Your sign in code is: <strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>`
      });
    } else {
      console.log(`[DEV] Email login code for ${email}: ${code}`);
    }

    res.redirect('/verify-code');
  } catch (err) {
    console.log(err);
    res.render('pages/login', { loginError: 'Error sending email. Check your API key or limits.' });
  }
});

app.get('/verify-code', (req, res) => {
  if (!req.cookies.pending_token) return res.redirect('/login');
  res.render('pages/verify-code');
});

app.post('/verify-code', async (req, res) => {
  const { code } = req.body;
  if (!req.cookies.pending_token) {
    return res.redirect('/login');
  }

  try {
      const decoded = jwt.verify(req.cookies.pending_token, process.env.SESSION_SECRET || 'supersecret');
      const inputHash = crypto.createHash('sha256').update(code).digest('hex');

      if (inputHash === decoded.codeHash) {
          let user;
          if (decoded.action === 'register') {
              user = await db.one('INSERT INTO users(username, email) VALUES($1, $2) RETURNING id, username, email', [decoded.username, decoded.email]);
              user.profile_picture = null;
          } else {
              user = await db.one('SELECT * FROM users WHERE email = $1', [decoded.email]);
          }

          reissueToken(res, { username: user.username, email: user.email, id: user.id, profile_picture: user.profile_picture });
          res.clearCookie('pending_token');
          res.redirect('/home');
      } else {
          res.render('pages/verify-code', { error: 'Invalid code.' });
      }
  } catch (err) {
      console.error(err);
      res.render('pages/verify-code', { error: 'Session expired or error logging in.' });
  }
});

app.get('/register', (req, res) => {
  const email = req.query.email;
  if (!email) return res.redirect('/login');
  res.render('pages/register', { email });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email || typeof username !== 'string' || typeof email !== 'string') {
      throw new Error('Missing or invalid required fields');
    }

    const existingUsername = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUsername) {
      return res.render('pages/register', { email, registerError: 'Username is already taken. Please pick another one.' });
    }

    let code;
    if (email.endsWith('@example.com')) {
      code = '123456';
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    const pendingToken = jwt.sign({ action: 'register', email, username, codeHash }, process.env.SESSION_SECRET || 'supersecret', { expiresIn: '15m' });
    res.cookie('pending_token', pendingToken, { httpOnly: true });

    if (email.endsWith('@example.com')) {
       console.log(`[DEV] Skipped sending email for test user registration.`);
    } else if (resend) {
      await resend.emails.send({
        from: 'onboarding@resend.abad.cc',
        to: email,
        subject: 'Your Verification Code - Challenge Loop',
        html: `<h2>Welcome to Challenge Loop!</h2><p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>`
      });
    } else {
      console.log(`[DEV] Registration code for ${email}: ${code}`);
    }

    res.redirect('/verify-code');
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

// Helper: compute hours remaining until end of a challenge's end_date (23:59:59 local)
function hoursUntilEndOfDay(endDate) {
    const end = new Date(endDate);
    // Treat end_date as local midnight, challenge ends at 23:59:59 that day
    end.setHours(23, 59, 59, 999);
    return (end - new Date()) / (1000 * 60 * 60);
}

app.get('/home', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const active = await db.any(`SELECT c.*, COALESCE(up.progress, 0) as progress, COALESCE(up.total_days, 7) as total_days, uc.id as join_id FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) < 100`, [userId]);
    const completed = await db.any(`SELECT c.* FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) = 100`, [userId]);

    const reminders = [];
    for (const ch of active) {
        const hoursLeft = hoursUntilEndOfDay(ch.end_date);
        const endMs = (() => { const e = new Date(ch.end_date); e.setHours(23,59,59,999); return e.getTime(); })();
        ch.end_timestamp = endMs;
        ch.hours_remaining = Math.max(0, hoursLeft);

        if (hoursLeft > 0 && hoursLeft <= 1) {
            ch.reminder_level = '1h';
            reminders.push({ title: ch.title, id: ch.id, level: '1h', hoursLeft: hoursLeft });
        } else if (hoursLeft > 1 && hoursLeft <= 12) {
            ch.reminder_level = '12h';
            reminders.push({ title: ch.title, id: ch.id, level: '12h', hoursLeft: hoursLeft });
        } else if (hoursLeft > 12 && hoursLeft <= 24) {
            ch.reminder_level = '24h';
            reminders.push({ title: ch.title, id: ch.id, level: '24h', hoursLeft: hoursLeft });
        }
        ch.show_countdown = hoursLeft > 0 && hoursLeft <= 24;
    }

    res.render('pages/home', {
        user: req.session.user,
        active,
        reminders: reminders.length ? reminders : null,
        completedCount: completed.length,
        activeCount: active.length,
        today: new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error(err);
    res.render('pages/home', { user: req.session.user, active: [], completedCount: 0, activeCount: 0, today: new Date().toISOString().split('T')[0] });
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
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.get('/social', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const active = await db.any(`SELECT c.*, COALESCE(up.progress, 0) as progress, uc.id as join_id FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) < 100`, [userId]);
    const completed = await db.any(`SELECT c.* FROM challenges c JOIN user_challenges uc ON c.id=uc.challenge_id LEFT JOIN user_progress up ON uc.id=up.user_challenge_id WHERE uc.user_id=$1 AND COALESCE(up.progress, 0) = 100`, [userId]);

    res.render('pages/social', {
      layout: 'main',
      user: req.session.user,
      friendsLeaderboard: [],
      activeCount: active.length,
      completedCount: completed.length
    });
    
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.get('/create-challenge', auth, (req, res) => {
  res.render('pages/create-challenge', {
    user: req.session.user,
    today: new Date().toISOString().split('T')[0]
  });
});

app.post('/create-challenge', auth, async (req, res) => {
  try {
    let { category, title, description, start_date, end_date, entry_type, daily_target } = req.body;

    title = title ? title.trim() : '';
    description = description ? description.trim() : '';

    if (!category || !title || !start_date || !end_date || !entry_type) {
      return res.render('pages/create-challenge', {
        user: req.session.user,
        today: new Date().toISOString().split('T')[0],
        error: 'Please fill in all required fields.'
      });
    }

    if (end_date < start_date) {
      return res.render('pages/create-challenge', {
        user: req.session.user,
        today: new Date().toISOString().split('T')[0],
        error: 'End date must be on or after the start date.'
      });
    }

    daily_target = daily_target ? parseFloat(daily_target) : 1;

    if (daily_target <= 0) {
      return res.render('pages/create-challenge', {
        user: req.session.user,
        today: new Date().toISOString().split('T')[0],
        error: 'Daily target must be greater than 0.'
      });
    }

        await db.none(`
            INSERT INTO challenges (category, title, description, start_date, end_date, entry_type, daily_target, challenge_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            category,
            title,
            description,
            start_date,
            end_date,
            entry_type,
            daily_target || 1,
            challenge_type || 'weekly'
        ]);

    res.redirect('/discover');
  } catch (err) {
    console.error(err);
    res.render('pages/create-challenge', {
      user: req.session.user,
      today: new Date().toISOString().split('T')[0],
      error: 'Failed to create challenge.'
    });
  }
});

app.post('/update-preferences', auth, async (req, res) => {
  const userId = req.session.user.id;
  let categories = req.body.categories || [];
  if (!Array.isArray(categories)) categories = [categories];

  await db.none('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
  for (const cat of categories) {
    await db.none('INSERT INTO user_preferences (user_id, category) VALUES ($1, $2)', [userId, cat]);
  }
  res.redirect('/discover');
});

app.post('/join-challenge', auth, async (req, res) => {
  const userId = req.session.user.id;
  const challengeId = req.body.challenge_id;
  try {
    await db.none('INSERT INTO user_challenges (user_id, challenge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, challengeId]);
  } catch (err) {
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

    const comments = await db.any(`
      SELECT cc.id,
              cc.comment,
              cc.created_at,
              u.username,
              u.profile_picture
      FROM challenge_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.challenge_id = $1
      ORDER BY cc.created_at DESC
    `, [challengeId]);

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

        const endOfDay = new Date(challenge.end_date);
        endOfDay.setHours(23, 59, 59, 999);
        const totalDays = Math.round((new Date(challenge.end_date) - new Date(challenge.start_date)) / (1000 * 60 * 60 * 24)) + 1;
        const hoursLeft = hoursUntilEndOfDay(challenge.end_date);

        res.render('pages/challenge', {
            user: req.session.user,
            challenge,
            userChallenge,
            entries,
            leaderboard,
            comments,
            today: new Date().toISOString().split('T')[0],
            total_days: totalDays,
            end_timestamp: endOfDay.getTime(),
            hours_remaining: Math.max(0, hoursLeft),
            show_countdown: hoursLeft > 0 && hoursLeft <= 24
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
  } catch (err) {
    console.error(err);
    res.redirect('/challenge/' + req.params.id);
  }
});

app.post('/challenge/:id/comment', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;
    let { comment } = req.body;

    comment = comment ? comment.trim() : '';

    if (!comment) {
      return res.redirect('/challenge/' + challengeId);
    }

    const userChallenge = await db.oneOrNone(
      'SELECT id FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (!userChallenge) {
      return res.redirect('/challenge/' + challengeId);
    }

    await db.none(`
      INSERT INTO challenge_comments (challenge_id, user_id, comment)
      VALUES ($1, $2, $3)
    `, [challengeId, userId, comment]);

    res.redirect('/challenge/' + challengeId);
  } catch (err) {
    console.error(err);
    res.redirect('/challenge/' + req.params.id);
  }
});


app.get('/profile', auth, async (req, res) => {
  try {
    const user = await db.one('SELECT id, username, email, profile_picture, created_at FROM users WHERE id = $1', [req.session.user.id]);
    const counts = await db.oneOrNone(`
            SELECT
                COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) < 100) as active_count,
                COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) = 100) as completed_count
            FROM user_challenges uc
            LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
            WHERE uc.user_id = $1
        `, [user.id]);

    const errorMessages = {
      wrong_password: 'Current password is incorrect.',
      password_mismatch: 'New passwords do not match.',
      email_taken: 'That email is already in use.',
      no_image: 'Please select an image (JPEG, PNG, GIF, or WebP).',
      server: 'Something went wrong. Please try again.'
    };
    const successMessages = {
      password: 'Password changed successfully.',
      email: 'Email updated successfully.',
      picture: 'Profile picture updated.'
    };

    res.render('pages/profile', {
      user: req.session.user,
      profileUser: user,
      activeCount: counts ? counts.active_count : 0,
      completedCount: counts ? counts.completed_count : 0,
      flashError: errorMessages[req.query.error] || null,
      flashSuccess: successMessages[req.query.success] || null,
      openEdit: !!(req.query.error || req.query.success)
    });
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/profile/change-email', auth, async (req, res) => {
  try {
    const { new_email } = req.body;
    const userId = req.session.user.id;
    await db.none('UPDATE users SET email = $1 WHERE id = $2', [new_email, userId]);
    
    // Reissue token with new email
    const updatedUser = { ...req.session.user, email: new_email };
    reissueToken(res, updatedUser);
    
    res.redirect('/profile?success=email');
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=email_taken');
  }
});

app.post('/profile/upload-picture', auth, async (req, res) => {
  try {
    const { image_data } = req.body;
    if (!image_data || !image_data.startsWith('data:image/')) {
      return res.redirect('/profile?error=no_image');
    }
    await db.none('UPDATE users SET profile_picture = $1 WHERE id = $2', [image_data, req.session.user.id]);
    
    // Reissue token with new profile picture
    const updatedUser = { ...req.session.user, profile_picture: image_data };
    reissueToken(res, updatedUser);

    res.redirect('/profile?success=picture');
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=server');
  }
});

app.post('/profile/delete-account', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await db.none('DELETE FROM users WHERE id = $1', [userId]);

    res.clearCookie('token');
    res.redirect('/login?message=account_deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=server');
  }
});

app.get('/logout', async (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.email) {
        await db.none(`
          INSERT INTO user_logouts (email, logout_at) 
          VALUES ($1, CURRENT_TIMESTAMP) 
          ON CONFLICT (email) DO UPDATE SET logout_at = CURRENT_TIMESTAMP
        `, [decoded.email]);
      }
    } catch (err) {
      console.error('Error revoking token on logout:', err);
    }
  }
  res.clearCookie('token');
  res.redirect('/login');
});

app.get('/admin/send-reminders', async (req, res) => {
  // Send email based on database condition: challenge ending within 2 days
  try {
    const challengesEndingSoon = await db.any(`
            SELECT c.id as challenge_id, c.title, c.end_date, u.email, u.username
            FROM challenges c
            JOIN user_challenges uc ON c.id = uc.challenge_id
            JOIN users u ON uc.user_id = u.id
            WHERE c.end_date <= CURRENT_DATE + INTERVAL '2 days'
            AND c.end_date >= CURRENT_DATE
        `);

    let sentCount = 0;
    for (const row of challengesEndingSoon) {
      try {
        if (resend) {
          await resend.emails.send({
            from: 'onboarding@resend.abad.cc',
            to: row.email,
            subject: `Challenge Ending Soon: ${row.title}`,
            html: `<p>Hi ${row.username},</p><p>Your challenge "<strong>${row.title}</strong>" is ending on ${new Date(row.end_date).toLocaleDateString()}. Keep it up!</p>`
          });
        } else {
          console.log(`[DEV] Skipping reminder email to ${row.email} for challenge "${row.title}" (no RESEND_API_KEY set)`);
        }
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send to ${row.email}:`, emailErr);
      }
    }
    res.json({ success: true, emailsSent: sentCount, totalEndingSoon: challengesEndingSoon.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

// starting the server and keeping the connection open to listen for more requests

const server = app.listen(3000);
console.log('Server is listening on port 3000');

server.db = db;
server.pgp = pgp;
module.exports = server;
