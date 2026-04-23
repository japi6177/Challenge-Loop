//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\
//#############################################################  CSCI 3308 - Software Development  #############################################################\\
//#############################################################  Group Project - "Challenge Loop"  #############################################################\\
//##########################################  Tahnee Xiong, Hunter Jamili, Jacob Pierson, Peter Hindes, Fynian Walker  #########################################\\
//--------------------------------------------------------------------------------------------------------------------------------------------------------------\\


//-----------------------------------------------------------------------  Dependencies  -----------------------------------------------------------------------\\

const express = require('express');
const app = express();
const handlebars = require('express-handlebars'); //enable express to use handlebars
const Handlebars = require('handlebars'); //include templating engine for handlebars
const path = require('path');
const fs = require('fs');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { expressjwt: jwtVerify } = require('express-jwt');
const crypto = require('crypto');
const { Resend } = require('resend'); // email client
const Groq = require('groq-sdk');
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const { GoogleGenAI } = require('@google/genai');
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}


const { runMigrations } = require('./migration');



//---------------------------------------------------------------------------  Setup  --------------------------------------------------------------------------\\

// Handlebars
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  helpers: {
    eq: (a, b) => a === b,
    lt: (a, b) => a < b,
    includes: (arr, val) => Array.isArray(arr) && arr.includes(val),
    iconForCategory: cat => {
      if (cat === 'Fitness') return 'fa-dumbbell';
      if (cat === 'Productivity') return 'fa-briefcase';
      if (cat === 'Educational') return 'fa-book-open';
      return 'fa-star';
    },
    iconForType: type => {
      if (type === 'daily') return 'fa-sun';
      if (type === 'weekly') return 'fa-calendar-week';
      if (type === 'monthly') return 'fa-calendar';
      if (type === 'group') return 'fa-users';
      return 'fa-star';
    },
    labelForType: type => {
      if (type === 'daily') return 'Daily';
      if (type === 'weekly') return 'Weekly';
      if (type === 'monthly') return 'Monthly';
      if (type === 'group') return 'Group';
      return type || '';
    }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


// Database
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

const db = pgp(dbConfig);

const migrationPromise = db.connect()
  .then(async obj => {
    console.log('Database connected');
    obj.done();
    await runMigrations(db, process.env.DB_MIGRATION_STRATEGY || 0);
  })
  .catch(err => console.error(err));



app.use(cookieParser());

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '5mb',
  })
);

//-----------------------------------------------------------------------  Auth Middleware  -----------------------------------------------------------------------\\

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
      console.log('[Auth] Invalid or missing token:', err ? err.message : 'No token payload');
      res.clearCookie('token');
      return res.redirect('/login');
    }

    // Check if token's user has logged out since it was issued
    const email = req.auth.email;
    const iat = req.auth.iat; // issued at (epoch seconds)
    
    if (!email || !iat) {
      console.log('[Auth] Token missing email or iat payload');
      res.clearCookie('token');
      return res.redirect('/login');
    }

    try {
      const userRecord = await db.oneOrNone(`
        SELECT u.id, EXTRACT(EPOCH FROM ul.logout_at) AS logout_seconds 
        FROM users u 
        LEFT JOIN user_logouts ul ON u.email = ul.email 
        WHERE u.email = $1
      `, [email]);
      
      if (!userRecord || (userRecord.logout_seconds && iat < userRecord.logout_seconds)) {
        if (!userRecord) {
          console.log(`[Auth] User not found for email: ${email}`);
        } else {
          console.log(`[Auth] Token revoked for email: ${email} (issued before logout)`);
        }
        res.clearCookie('token');
        return res.redirect('/login');
      }
    } catch (dbErr) {
      console.error('Error checking user logouts:', dbErr);
      return res.redirect('/login');
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


//-----------------------------------------------------------------------  Routes  -----------------------------------------------------------------------\\

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/email-login', async (req, res) => {
  try {
    const { email } = req.body;

    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (email && email.endsWith('@example.com') && !isLocal) {
      return res.render('pages/login', { loginError: 'Test accounts are only permitted from local connections.' });
    }

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
        subject: 'Your Login Code - Challenge Loop',
        html: `Your login code is ${code}`
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

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

  try {
    const { username, email } = req.body;
    if (!username || !email || typeof username !== 'string' || typeof email !== 'string') {
      throw new Error('Missing or invalid required fields');
    }

    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (email.endsWith('@example.com') && !isLocal) {
      return res.render('pages/register', { email, registerError: 'Test accounts are only permitted from local connections.' });
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
        subject: 'Your Sign-up Code for Challenge Loop',
        html: `Your sign-up code is: ${code}`
      });
    } else {
      console.log(`[DEV] Sign-up code for ${email}: ${code}`);
    }

    res.redirect('/verify-code');
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});


//---------------- HOME ----------------//

app.get('/home', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const active = await db.any(`
      SELECT c.*, uc.id as user_challenge_id
      FROM challenges c
      JOIN user_challenges uc ON c.id = uc.challenge_id
      WHERE uc.user_id = $1
    `, [userId]);

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


//---------------- DISCOVER ----------------//

app.get('/discover', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const allCategories = ['Fitness', 'Productivity', 'Educational'];

    const prefs = await db.any('SELECT category FROM user_preferences WHERE user_id=$1', [userId]);
    const preferredCategories = prefs.map(p => p.category);

    let recommended = [];
    let completed = [];

    if (preferredCategories.length) {
      recommended = await db.any(`
        SELECT c.* FROM challenges c
        WHERE c.category = ANY($1::text[])
          AND c.id NOT IN (SELECT challenge_id FROM user_challenges WHERE user_id=$2)
        ORDER BY c.id DESC LIMIT 8
      `, [preferredCategories, userId]);

      completed = await db.any(`
        SELECT c.title FROM challenges c
        JOIN user_challenges uc ON c.id = uc.challenge_id
        JOIN user_progress up ON uc.id = up.user_challenge_id
        WHERE uc.user_id=$1 AND up.progress = 100
      `, [userId]);
    }

    res.render('pages/discover', {
      user: req.session.user,
      preferredCategories,
      allCategories,
      recommended,
      completed
    });
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/update-preferences', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const categories = req.body.categories ? [].concat(req.body.categories) : [];

    await db.none('DELETE FROM user_preferences WHERE user_id=$1', [userId]);
    for (const cat of categories) {
      await db.none('INSERT INTO user_preferences(user_id, category) VALUES($1,$2)', [userId, cat]);
    }
    res.redirect('/discover');
  } catch (err) {
    console.error(err);
    res.redirect('/discover');
  }
});


//---------------- CREATE CHALLENGE ----------------//

app.post('/generate-challenge', auth, async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API not configured' });
    }
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Based on the following user description, generate a complete challenge specification in JSON format.
Current date: ${today}. Calculate start_date and end_date intelligently based on the description (e.g. "tomorrow", "for a week"). If unspecified, start_date is today and end_date is today + 7 days.

User description: "${description}"`;

    const schema = {
      type: "OBJECT",
      properties: {
        category: { type: "STRING", enum: ["Fitness", "Productivity", "Educational"] },
        title: { type: "STRING", description: "Short, catchy title for the challenge" },
        description: { type: "STRING", description: "A refined and detailed version of the user's description" },
        entry_type: { type: "STRING", enum: ["checkbox", "amount"] },
        daily_target: { type: "NUMBER", description: "The target amount per day (default 1 for checkbox)" },
        start_date: { type: "STRING", description: "YYYY-MM-DD" },
        end_date: { type: "STRING", description: "YYYY-MM-DD" },
        challenge_type: { type: "STRING", enum: ["daily", "weekly", "monthly", "group"] },
        enable_judging: { type: "BOOLEAN", description: "Whether photos/judging should be required" }
      },
      required: ["category", "title", "description", "entry_type", "daily_target", "start_date", "end_date", "challenge_type", "enable_judging"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text);
    res.json(result);
  } catch (err) {
    console.error('Error generating challenge:', err);
    res.status(500).json({ error: 'Failed to generate challenge' });
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
    const { category, title, description, entry_type, daily_target, start_date, end_date, challenge_type, enable_judging } = req.body;
    const userId = req.session.user.id;

    const challenge = await db.one(
      `INSERT INTO challenges(category, title, description, entry_type, daily_target, start_date, end_date, challenge_type, creator_id, enable_judging)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [category, title, description || '', entry_type, daily_target || 1, start_date, end_date, challenge_type, userId, enable_judging === 'on']
    );

    // Auto-join the creator
    await db.none('INSERT INTO user_challenges(user_id, challenge_id) VALUES($1,$2)', [userId, challenge.id]);

    res.redirect(`/challenge/${challenge.id}`);
  } catch (err) {
    console.error(err);
    res.render('pages/create-challenge', {
      user: req.session.user,
      error: 'Failed to create challenge.',
      today: new Date().toISOString().split('T')[0]
    });
  }
});


//---------------- JOIN CHALLENGE ----------------//

app.post('/join-challenge', auth, async (req, res) => {
  try {
    const { challenge_id } = req.body;
    const userId = req.session.user.id;

    await db.none(
      'INSERT INTO user_challenges(user_id, challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [userId, challenge_id]
    );
    res.redirect(`/challenge/${challenge_id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/discover');
  }
});


//---------------- CHALLENGE DETAIL ----------------//

app.get('/challenge/:id', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;

    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id=$1', [challengeId]);
    if (!challenge) return res.redirect('/home');

    const userChallenge = await db.oneOrNone(
      'SELECT * FROM user_challenges WHERE user_id=$1 AND challenge_id=$2',
      [userId, challengeId]
    );

    let entries = [];
    if (userChallenge) {
      entries = await db.any(
        'SELECT * FROM challenge_entries WHERE user_challenge_id=$1 ORDER BY entry_date DESC LIMIT 10',
        [userChallenge.id]
      );
    }

    // Leaderboard — includes judge flag per user
    const leaderboard = await db.any(`
      SELECT u.username,
             COALESCE(up.successful_days, 0) AS successful_days,
             EXISTS(
               SELECT 1 FROM judge_assignments ja
               WHERE ja.challenge_id = $1 AND ja.judge_id = u.id
             ) AS is_judge,
             CASE
               WHEN c.entry_type = 'amount' THEN
                 LEAST(
                   ROUND(
                     COALESCE((
                       SELECT SUM(
                         CASE WHEN NOT COALESCE(c.enable_judging, false) OR ce2.judge_status = 'approved'
                              THEN ce2.amount ELSE 0 END
                       )
                       FROM challenge_entries ce2
                       WHERE ce2.user_challenge_id = uc.id AND ce2.entry_date = CURRENT_DATE
                     ), 0)::numeric / NULLIF(c.daily_target, 0) * 100
                   ), 100
                 )
               ELSE
                 CASE WHEN EXISTS(
                   SELECT 1 FROM challenge_entries ce3
                   WHERE ce3.user_challenge_id = uc.id
                     AND ce3.entry_date = CURRENT_DATE
                     AND ce3.is_completed = true
                     AND (NOT COALESCE(c.enable_judging, false) OR ce3.judge_status = 'approved')
                 ) THEN 100 ELSE 0 END
             END AS today_progress
      FROM user_challenges uc
      JOIN users u ON uc.user_id = u.id
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      JOIN challenges c ON c.id = uc.challenge_id
      WHERE uc.challenge_id = $1
      ORDER BY COALESCE(up.successful_days, 0) DESC
      LIMIT 10
    `, [challengeId]);

    // Comments
    const comments = await db.any(`
      SELECT cc.*, u.username FROM challenge_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.challenge_id = $1
      ORDER BY cc.created_at DESC
    `, [challengeId]);

    const isJudge = !!(await db.oneOrNone(
      'SELECT 1 FROM judge_assignments WHERE challenge_id=$1 AND judge_id=$2',
      [challengeId, userId]
    ));
    const isCreator = challenge.creator_id === userId;

    // Participants list for the creator's judge-assignment panel
    let participants = [];
    if (isCreator && challenge.enable_judging) {
      participants = await db.any(`
        SELECT u.id, u.username,
               EXISTS(
                 SELECT 1 FROM judge_assignments ja
                 WHERE ja.challenge_id = $1 AND ja.judge_id = u.id
               ) AS is_judge
        FROM user_challenges uc
        JOIN users u ON uc.user_id = u.id
        WHERE uc.challenge_id = $1
      `, [challengeId]);
    }

    // Pending submissions for judges to review
    let submissions = [];
    if (isJudge) {
      submissions = await db.any(`
        SELECT ce.id, ce.entry_date, ce.photo_data, ce.amount, ce.is_completed, ce.judge_status,
               u.username
        FROM challenge_entries ce
        JOIN user_challenges uc ON ce.user_challenge_id = uc.id
        JOIN users u ON uc.user_id = u.id
        WHERE uc.challenge_id = $1
          AND ce.judge_status = 'pending'
          AND ce.photo_data IS NOT NULL
        ORDER BY ce.entry_date DESC
      `, [challengeId]);
    }

    // Countdown
    const now = new Date();
    const endDate = new Date(challenge.end_date + 'T23:59:59');
    const diffMs = endDate - now;
    const hoursRemaining = diffMs / (1000 * 60 * 60);
    const showCountdown = hoursRemaining > 0 && hoursRemaining <= 24;

    const totalDays = Math.floor(
      (new Date(challenge.end_date) - new Date(challenge.start_date)) / (1000 * 60 * 60 * 24)
    ) + 1;

    const photoError = req.query.error === 'photo_required';

    res.render('pages/challenge', {
      user: req.session.user,
      challenge,
      userChallenge,
      entries,
      leaderboard,
      comments,
      total_days: totalDays,
      show_countdown: showCountdown,
      hours_remaining: Math.floor(hoursRemaining),
      end_timestamp: endDate.getTime(),
      today: new Date().toISOString().split('T')[0],
      isJudge,
      isCreator,
      participants,
      submissions,
      photoError
    });

  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});


//---------------- LOG ENTRY ----------------//

app.post('/challenge/:id/log', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;
    const { date, amount, completed, photo_data } = req.body;

    const challenge = await db.one('SELECT * FROM challenges WHERE id=$1', [challengeId]);

    if (challenge.enable_judging && !photo_data) {
      return res.redirect(`/challenge/${challengeId}?error=photo_required`);
    }

    const userChallenge = await db.oneOrNone(
      'SELECT * FROM user_challenges WHERE user_id=$1 AND challenge_id=$2',
      [userId, challengeId]
    );
    if (!userChallenge) return res.redirect(`/challenge/${challengeId}`);

    const isCompleted = completed === 'on';
    const judgeStatus = challenge.enable_judging ? 'pending' : null;

    const existing = await db.oneOrNone(
      'SELECT * FROM challenge_entries WHERE user_challenge_id=$1 AND entry_date=$2',
      [userChallenge.id, date]
    );

    if (existing) {
      await db.none(
        `UPDATE challenge_entries
         SET amount=$1, is_completed=$2, photo_data=$3, judge_status=$4
         WHERE id=$5`,
        [amount || 0, isCompleted, photo_data || existing.photo_data || null,
         judgeStatus !== null ? judgeStatus : existing.judge_status, existing.id]
      );
    } else {
      await db.none(
        `INSERT INTO challenge_entries(user_challenge_id, entry_date, amount, is_completed, photo_data, judge_status)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [userChallenge.id, date, amount || 0, isCompleted, photo_data || null, judgeStatus]
      );
    }

    res.redirect(`/challenge/${challengeId}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/challenge/${req.params.id}`);
  }
});


//---------------- COMMENT ----------------//

app.post('/challenge/:id/comment', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;
    const { comment } = req.body;

    const uc = await db.oneOrNone(
      'SELECT 1 FROM user_challenges WHERE user_id=$1 AND challenge_id=$2',
      [userId, challengeId]
    );
    if (!uc) return res.redirect(`/challenge/${challengeId}`);

    await db.none(
      'INSERT INTO challenge_comments(challenge_id, user_id, comment) VALUES($1,$2,$3)',
      [challengeId, userId, comment]
    );
    res.redirect(`/challenge/${challengeId}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/challenge/${req.params.id}`);
  }
});


//---------------- EDIT / DELETE CHALLENGE ----------------//

app.get('/challenge/:id/edit', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;

    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id=$1', [challengeId]);
    if (!challenge || challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    const today = new Date().toISOString().split('T')[0];
    const judgingLocked = challenge.start_date <= today;

    res.render('pages/edit-challenge', {
      user: req.session.user,
      challenge,
      today,
      judgingLocked
    });
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/challenge/:id/edit', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;

    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id=$1', [challengeId]);
    if (!challenge || challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    const { category, title, description, entry_type, daily_target, start_date, end_date, challenge_type, enable_judging } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const judgingLocked = challenge.start_date <= today;
    const newJudging = judgingLocked ? challenge.enable_judging : (enable_judging === 'on');

    await db.none(
      `UPDATE challenges
       SET category=$1, title=$2, description=$3, entry_type=$4, daily_target=$5,
           start_date=$6, end_date=$7, challenge_type=$8, enable_judging=$9
       WHERE id=$10`,
      [category, title, description || '', entry_type, daily_target || 1,
       start_date, end_date, challenge_type, newJudging, challengeId]
    );

    res.redirect(`/challenge/${challengeId}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/challenge/${req.params.id}/edit`);
  }
});

app.get('/challenge/:id/delete', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;

    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id=$1', [challengeId]);
    if (!challenge || challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    res.render('pages/delete-challenge', { user: req.session.user, challenge });
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/challenge/:id/delete', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;

    const challenge = await db.oneOrNone('SELECT * FROM challenges WHERE id=$1', [challengeId]);
    if (!challenge || challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    await db.none('DELETE FROM challenges WHERE id=$1', [challengeId]);
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});


//---------------- JUDGING — ASSIGN / REMOVE ----------------//

app.post('/challenge/:id/assign-judge', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;
    const { judge_id } = req.body;

    const challenge = await db.one('SELECT creator_id FROM challenges WHERE id=$1', [challengeId]);
    if (challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    await db.none(
      'INSERT INTO judge_assignments(challenge_id, judge_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [challengeId, judge_id]
    );
    res.redirect(`/challenge/${challengeId}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/challenge/${req.params.id}`);
  }
});

app.post('/challenge/:id/remove-judge', auth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.user.id;
    const { judge_id } = req.body;

    const challenge = await db.one('SELECT creator_id FROM challenges WHERE id=$1', [challengeId]);
    if (challenge.creator_id !== userId) return res.redirect(`/challenge/${challengeId}`);

    await db.none(
      'DELETE FROM judge_assignments WHERE challenge_id=$1 AND judge_id=$2',
      [challengeId, judge_id]
    );
    res.redirect(`/challenge/${challengeId}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/challenge/${req.params.id}`);
  }
});


//---------------- JUDGING — APPROVE / REJECT ENTRY ----------------//

app.post('/entry/:id/approve', auth, async (req, res) => {
  try {
    const entryId = req.params.id;
    const userId = req.session.user.id;

    const entry = await db.one(`
      SELECT ce.id, uc.challenge_id
      FROM challenge_entries ce
      JOIN user_challenges uc ON ce.user_challenge_id = uc.id
      WHERE ce.id = $1
    `, [entryId]);

    const isJudge = await db.oneOrNone(
      'SELECT 1 FROM judge_assignments WHERE challenge_id=$1 AND judge_id=$2',
      [entry.challenge_id, userId]
    );
    if (!isJudge) return res.redirect('/home');

    await db.none('UPDATE challenge_entries SET judge_status=$1 WHERE id=$2', ['approved', entryId]);
    res.redirect(`/challenge/${entry.challenge_id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/entry/:id/reject', auth, async (req, res) => {
  try {
    const entryId = req.params.id;
    const userId = req.session.user.id;

    const entry = await db.one(`
      SELECT ce.id, uc.challenge_id
      FROM challenge_entries ce
      JOIN user_challenges uc ON ce.user_challenge_id = uc.id
      WHERE ce.id = $1
    `, [entryId]);

    const isJudge = await db.oneOrNone(
      'SELECT 1 FROM judge_assignments WHERE challenge_id=$1 AND judge_id=$2',
      [entry.challenge_id, userId]
    );
    if (!isJudge) return res.redirect('/home');

    await db.none('UPDATE challenge_entries SET judge_status=$1 WHERE id=$2', ['rejected', entryId]);
    res.redirect(`/challenge/${entry.challenge_id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});


//---------------- PROFILE ----------------//

app.get('/profile/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;

    const profileUser = await db.oneOrNone(
      'SELECT id, username, email, profile_picture, created_at FROM users WHERE username = $1',
      [username]
    );

    if (!profileUser) {
      return res.status(404).render('pages/404');
    }

    const isMe = req.session.user.username === profileUser.username;

    const counts = await db.oneOrNone(`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) < 100) as active_count,
        COUNT(*) FILTER (WHERE COALESCE(up.progress, 0) = 100) as completed_count
      FROM user_challenges uc
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1
    `, [profileUser.id]);

    const activeChallenges = await db.any(`
      SELECT c.*, COALESCE(up.progress, 0) AS progress
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1 AND COALESCE(up.progress, 0) < 100
      ORDER BY c.end_date ASC
    `, [profileUser.id]);

    const completedChallenges = await db.any(`
      SELECT c.*, COALESCE(up.progress, 0) AS progress
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1 AND COALESCE(up.progress, 0) = 100
      ORDER BY c.end_date DESC
    `, [profileUser.id]);

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
      profileUser,
      isMe,
      activeCount: counts ? counts.active_count : 0,
      completedCount: counts ? counts.completed_count : 0,
      activeChallenges,
      completedChallenges,
      flashError: isMe ? errorMessages[req.query.error] || null : null,
      flashSuccess: isMe ? successMessages[req.query.success] || null : null,
      openEdit: isMe && !!(req.query.error || req.query.success)
    });

  } catch (err) {
    console.error(err);
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

    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (new_email && new_email.endsWith('@example.com') && !isLocal) {
      return res.redirect('/profile?error=email_taken');
    }

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


//---------------- AI RECOMMENDER ----------------//

app.get('/ai/recommend', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const challenges = await db.any(`
      SELECT c.title, c.category, c.challenge_type, c.entry_type, c.daily_target,
             COALESCE(up.successful_days, 0) AS successful_days,
             up.total_days,
             COALESCE(up.progress, 0) AS progress
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1
      ORDER BY uc.joined_at DESC
    `, [userId]);

    res.render('pages/ai-recommend', {
      user: req.session.user,
      hasChallenges: challenges.length > 0,
      recommendation: null,
      today: new Date().toISOString().split('T')[0],
      error: null
    });
  } catch (err) {
    console.error(err);
    res.redirect('/home');
  }
});

app.post('/ai/recommend', auth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!process.env.GROQ_API_KEY) {
      return res.render('pages/ai-recommend', {
        user: req.session.user,
        hasChallenges: true,
        recommendation: null,
        error: 'AI recommendations require a GROQ_API_KEY in your environment variables.'
      });
    }

    const challenges = await db.any(`
      SELECT c.title, c.category, c.challenge_type, c.entry_type, c.daily_target,
             COALESCE(up.successful_days, 0) AS successful_days,
             up.total_days,
             COALESCE(up.progress, 0) AS progress
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      LEFT JOIN user_progress up ON uc.id = up.user_challenge_id
      WHERE uc.user_id = $1
      ORDER BY uc.joined_at DESC
    `, [userId]);

    if (!challenges.length) {
      return res.render('pages/ai-recommend', {
        user: req.session.user,
        hasChallenges: false,
        recommendation: null,
        error: null
      });
    }

    const challengeSummary = challenges.map(c =>
      `- "${c.title}" (${c.category}, ${c.challenge_type}): ${c.successful_days}/${c.total_days || '?'} days completed (${c.progress}% progress)`
    ).join('\n');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a personal challenge coach for Challenge Loop, a habit tracking app.
Users track daily habits across three categories: Fitness, Productivity, and Educational.
Challenge types are: daily (1 day), weekly (7 days), monthly (30 days), or group (custom).
Entry types are: checkbox (did it or not) or amount (track a number like steps or pages).

Based on a user's challenge history, recommend ONE new challenge that would suit them.
Respond with ONLY valid JSON in this exact format, no extra text:
{
  "title": "short challenge title (max 60 chars)",
  "description": "one or two sentence description of the challenge",
  "category": "Fitness or Productivity or Educational",
  "challenge_type": "daily or weekly or monthly or group",
  "entry_type": "checkbox or amount",
  "daily_target": 1,
  "reasoning": "2-3 sentences explaining why this challenge suits this user based on their history"
}`
        },
        {
          role: 'user',
          content: `Here is my challenge history:\n${challengeSummary}\n\nPlease recommend a new challenge for me.`
        }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const raw = completion.choices[0].message.content.trim();

    let recommendation;
    try {
      recommendation = JSON.parse(raw);
    } catch {
      return res.render('pages/ai-recommend', {
        user: req.session.user,
        hasChallenges: true,
        recommendation: null,
        error: 'The AI returned an unexpected response. Please try again.'
      });
    }

    res.render('pages/ai-recommend', {
      user: req.session.user,
      hasChallenges: true,
      recommendation,
      today: new Date().toISOString().split('T')[0],
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render('pages/ai-recommend', {
      user: req.session.user,
      hasChallenges: true,
      recommendation: null,
      error: 'Something went wrong talking to the AI. Please try again.'
    });
  }
});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

// starting the server and keeping the connection open to listen for more requests

const server = app.listen(3000);
console.log('Server is listening on port 3000');

server.shutdown = async () => {
  await migrationPromise;
  return new Promise((resolve) => {
    server.close(() => {
      pgp.end();
      resolve();
    });
  });
};

server.ready = () => migrationPromise;

module.exports = server;
