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

// Runs ALTER TABLE / CREATE TABLE IF NOT EXISTS for new judging columns on existing databases
async function runMigrations(database) {
  try {
    await database.none(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS creator_id INT REFERENCES users(id) ON DELETE SET NULL`);
    await database.none(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS enable_judging BOOLEAN DEFAULT false`);
    await database.none(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS photo_data TEXT`);
    await database.none(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS judge_status VARCHAR(20) DEFAULT 'pending'`);
    await database.none(`
      CREATE TABLE IF NOT EXISTS judge_assignments (
        id SERIAL PRIMARY KEY,
        challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        judge_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_id, judge_id)
      )
    `);
    // Recreate the view so it uses the new judging-aware logic
    await database.none(`DROP VIEW IF EXISTS user_progress`);
    await database.none(`
      CREATE VIEW user_progress AS
      WITH daily_sums AS (
        SELECT
          ce.user_challenge_id,
          ce.entry_date,
          c.enable_judging,
          c.entry_type,
          c.daily_target,
          SUM(CASE WHEN NOT COALESCE(c.enable_judging, false) OR ce.judge_status = 'approved' THEN ce.amount ELSE 0 END) AS approved_amount,
          BOOL_OR(ce.is_completed AND (NOT COALESCE(c.enable_judging, false) OR ce.judge_status = 'approved')) AS approved_done
        FROM challenge_entries ce
        JOIN user_challenges uc ON ce.user_challenge_id = uc.id
        JOIN challenges c ON uc.challenge_id = c.id
        GROUP BY ce.user_challenge_id, ce.entry_date, c.enable_judging, c.entry_type, c.daily_target
      ),
      successful_days AS (
        SELECT ds.user_challenge_id, count(*) AS success_count
        FROM daily_sums ds
        WHERE (ds.entry_type = 'amount' AND ds.approved_amount >= ds.daily_target)
           OR (ds.entry_type = 'checkbox' AND ds.approved_done)
        GROUP BY ds.user_challenge_id
      )
      SELECT uc.id AS user_challenge_id, uc.user_id, uc.challenge_id,
             COALESCE(sd.success_count, 0) AS successful_days,
             (c.end_date - c.start_date + 1) AS total_days,
             LEAST(ROUND((COALESCE(sd.success_count, 0)::numeric / NULLIF((c.end_date - c.start_date + 1)::numeric, 0)) * 100), 100) AS progress
      FROM user_challenges uc
      LEFT JOIN successful_days sd ON uc.id = sd.user_challenge_id
      JOIN challenges c ON uc.challenge_id = c.id
    `);
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
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

db.connect()
  .then(async obj => {
    console.log('Database connected');
    obj.done();
    await initDbIfEmpty(db);
    await runMigrations(db);
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

    if (username.length < 8) {
      throw new Error('Username must be at least 8 characters long.');
    } else if (!usernameRegex.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores.');
    }

    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    } else if (!passwordRegex.test(password)) {
      throw new Error('Password must include uppercase, lowercase, and a number.');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await db.one('INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email', [username, email, hash]);

    req.session.user = { username: user.username, email: user.email, id: user.id };
    req.session.save(() => res.redirect('/home'));
  } catch (err) {
    res.render('pages/login', { registerError: ('Registration failed. ' + err.message) || 'Registration failed. Username or email might already be taken.' });
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
    const userId = req.session.user.id;
    await db.none('UPDATE users SET email = $1 WHERE id = $2', [new_email, userId]);
    req.session.user.email = new_email;
    req.session.save(() => res.redirect('/profile?success=email'));
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=email_taken');
  }
});


//---------------- LOGOUT ----------------//

app.get('/logout', auth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});


//-----------------------------------------------------------------------  Start Server  -----------------------------------------------------------------------\\

module.exports = app.listen(3000);
console.log('Server running on port 3000');
