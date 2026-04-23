-- Pre-baked Categories: Fitness, Productivity, Educational
-- ============================================================
-- WEEKLY CHALLENGES
-- ============================================================
INSERT INTO challenges (category, title, description, start_date, end_date, entry_type, daily_target, challenge_type) VALUES

-- Fitness - Weekly
('Fitness', '10K Steps a Day', 'Walk 10,000 steps every day for a week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10000, 'weekly'),
('Fitness', 'Drink 2L of Water', 'Stay hydrated by drinking at least 2 liters of water daily (enter in liters).', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 2, 'weekly'),
('Fitness', 'Morning Yoga', 'Do 15 minutes of yoga every morning.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', '100 Push-Ups a Day', 'Knock out 100 push-ups every day this week — break them up however you like.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 100, 'weekly'),
('Fitness', 'Run 5K Daily', 'Lace up and run 5 kilometers every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', '7-Day Stretch Streak', 'Spend at least 10 minutes stretching every day to improve flexibility.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', 'Jump Rope 500 Reps', 'Hit 500 jump rope reps each day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 500, 'weekly'),
('Fitness', 'Daily Plank Hold', 'Hold a plank for at least 60 seconds every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', 'No Junk Food Week', 'Cut out all junk food and fast food for the entire week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', 'Cycle 10 Miles', 'Ride your bike at least 10 miles every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10, 'weekly'),
('Fitness', 'Swim 20 Laps', 'Swim 20 laps in the pool each day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 20, 'weekly'),
('Fitness', 'Early Morning Workout', 'Complete a workout before 8am every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', '8 Hours of Sleep', 'Get a full 8 hours of sleep every night this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', 'No Alcohol Week', 'Go the full week without any alcohol.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', '50 Squats a Day', 'Do 50 bodyweight squats every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 50, 'weekly'),
('Fitness', 'Walk After Every Meal', 'Take a 10-minute walk after each meal — breakfast, lunch, and dinner.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Fitness', 'Daily Core Workout', 'Complete a 15-minute core routine every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),

-- Productivity - Weekly
('Productivity', 'Zero Inbox', 'Clear out your email inbox and keep it at zero.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Pomodoro Mastery', 'Use the Pomodoro technique for 4 hours of work daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 4, 'weekly'),
('Productivity', 'Digital Detox', 'No phone usage 1 hour before bed.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Daily Journaling', 'Write at least one full page in your journal every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'No Social Media Before Noon', 'Keep your phone and apps closed until noon each day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Make Your Bed Every Morning', 'Start each day with a win — make your bed right after waking up.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', '3 Priorities a Day', 'Write down and complete your top 3 priorities every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'No Netflix on Weekdays', 'Skip the streaming and invest that time in something productive.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Weekly Budget Review', 'Log every expense daily and review your budget each evening.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Inbox Zero by 9am', 'Process and clear all emails before starting your workday.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Declutter 10 Items', 'Find and donate or toss 10 items from your home every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10, 'weekly'),
('Productivity', 'Plan Tomorrow Tonight', 'Each evening, write out your schedule for the next day before bed.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'One Random Act of Kindness', 'Do something kind for someone else every single day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', 'Cook Every Meal at Home', 'No restaurants or takeout — cook all your meals from scratch this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Productivity', '2-Hour Deep Work Block', 'Block off and protect a 2-hour distraction-free work session daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 2, 'weekly'),

-- Educational - Weekly
('Educational', 'Read 50 Pages', 'Read at least 50 pages of a non-fiction book.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 50, 'weekly'),
('Educational', 'Learn a New Concept', 'Watch an educational video or read an article on a new topic daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Code for 1 Hour', 'Spend one uninterrupted hour learning a new programming language or framework.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', '10 New Vocab Words', 'Learn 10 new vocabulary words every day and write each in a sentence.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 10, 'weekly'),
('Educational', 'Daily Spanish Practice', 'Spend 20 minutes on Duolingo or another language app every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Watch a Documentary', 'Watch one educational documentary or TED Talk every day this week.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Write 500 Words', 'Write at least 500 words of original content — blog, story, or essay — daily.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 500, 'weekly'),
('Educational', 'Practice Typing Speed', 'Do a 10-minute typing speed drill every day to improve your WPM.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Listen to an Educational Podcast', 'Listen to at least one full educational podcast episode every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Solve 5 Math Problems', 'Keep your mental math sharp — solve 5 problems from a math app each day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'amount', 5, 'weekly'),
('Educational', 'Daily Chess Puzzle', 'Solve at least one chess puzzle on Chess.com or Lichess every day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),
('Educational', 'Learn a Historical Event', 'Research and write 3 key facts about a different historical event each day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, 'checkbox', 1, 'weekly'),

-- ============================================================
-- DAILY CHALLENGES
-- ============================================================

('Fitness', 'Daily Push-Up Challenge', 'Do 50 push-ups at any point today.', CURRENT_DATE, CURRENT_DATE, 'amount', 50, 'daily'),
('Fitness', '1-Mile Run', 'Lace up and run at least 1 mile today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Fitness', 'Drink 3L of Water Today', 'Push your hydration — drink a full 3 liters of water today.', CURRENT_DATE, CURRENT_DATE, 'amount', 3, 'daily'),
('Fitness', 'No Sugar Today', 'Cut out all added sugars for the entire day.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Fitness', '100 Jumping Jacks', 'Knock out 100 jumping jacks today — all at once or spread throughout the day.', CURRENT_DATE, CURRENT_DATE, 'amount', 100, 'daily'),
('Fitness', 'Meditate for 10 Minutes', 'Sit quietly and focus on your breath for at least 10 minutes today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Productivity', 'Daily Deep Work', 'Complete one focused 90-minute deep work session today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Productivity', 'Write a Gratitude List', 'Write down 5 things you are genuinely grateful for today.', CURRENT_DATE, CURRENT_DATE, 'amount', 5, 'daily'),
('Productivity', 'Clear Your Desk', 'Fully organize and declutter your workspace before you start work today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Productivity', 'Call a Friend or Family Member', 'Pick up the phone and have a real conversation with someone you care about today.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Educational', 'Daily Vocab Builder', 'Learn 5 new vocabulary words and use each in a sentence today.', CURRENT_DATE, CURRENT_DATE, 'amount', 5, 'daily'),
('Educational', 'Read for 30 Minutes', 'Put down the phone and read a book for at least 30 uninterrupted minutes.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Educational', 'Complete an Online Lesson', 'Finish at least one lesson on Coursera, Khan Academy, or any learning platform.', CURRENT_DATE, CURRENT_DATE, 'checkbox', 1, 'daily'),
('Educational', 'Write in a Second Language', 'Write 100 words in a language you are learning — journal entry, email, anything.', CURRENT_DATE, CURRENT_DATE, 'amount', 100, 'daily'),

-- ============================================================
-- MONTHLY CHALLENGES
-- ============================================================

('Fitness', 'Monthly Step Marathon', 'Accumulate 300,000 steps this month — about 10K per day.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'amount', 10000, 'monthly'),
('Fitness', '30-Day No Junk Food', 'Go the entire month without junk food, fast food, or soda.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Fitness', '30-Day Push-Up Ladder', 'Start at 10 push-ups on day 1, add 5 more each week — build the habit and the strength.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Fitness', 'Run Every Day This Month', 'Run at least 1 mile every single day — no excuses, no days off.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Fitness', 'Daily Meditation Month', 'Meditate for at least 10 minutes every day this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Fitness', 'Sleep Before Midnight All Month', 'Build a healthier sleep routine by getting to bed before midnight every night.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Fitness', 'Workout 5 Days a Week', 'Hit the gym or do a home workout at least 5 days every week this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Productivity', 'Monthly Reading Sprint', 'Read for at least 30 minutes every day this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Productivity', 'No-Spend Month', 'Only buy essentials — groceries, bills, transport. No discretionary spending.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Productivity', 'Journal Every Day', 'Write in your journal every single day this month — morning or night.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Productivity', 'No Social Media Month', 'Delete or log out of all social media apps for the entire month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Productivity', 'Wake Up at 6am Every Day', 'Reset your body clock — get up at 6am every single morning this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Educational', 'Monthly Coding Streak', 'Write code every single day this month — no days off.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Educational', 'Finish an Online Course', 'Complete at least one full online course this month on any topic.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Educational', 'Read One Book This Month', 'Commit to finishing one full book before the month is over.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'checkbox', 1, 'monthly'),
('Educational', 'Learn 200 Foreign Words', 'Build real vocabulary — learn 200 words in a new language this month.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'amount', 200, 'monthly'),
('Educational', 'Write a Short Story', 'Write at least 300 words of your story every day — finish a complete short story by month end.', DATE_TRUNC('month', CURRENT_DATE)::DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 'amount', 300, 'monthly'),

-- ============================================================
-- GROUP CHALLENGES
-- ============================================================

('Fitness', 'Group Fitness Blitz', 'Team up and each complete a workout every day for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Fitness', 'Group Step Competition', 'Who can rack up the most steps? Log your daily steps and see who comes out on top.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'amount', 10000, 'group'),
('Fitness', 'Group No Junk Food Pact', 'Hold each other accountable — the whole group avoids junk food for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Fitness', 'Group Morning Run Club', 'Commit to running every morning together — log your run each day.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Productivity', 'Group Accountability Sprint', 'Keep each other accountable: log at least 2 hours of focused work daily for 2 weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'amount', 2, 'group'),
('Productivity', 'Group No-Phone Challenge', 'The group stays off their phones from 9am–12pm every day for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Productivity', 'Group Wake Up at 6am', 'Start your days strong together — everyone wakes up at 6am for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Educational', 'Group Book Club', 'Read and discuss 20 pages a day together for two weeks.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'amount', 20, 'group'),
('Educational', 'Group Coding Sprint', 'Everyone codes for at least one hour a day — share what you built at the end.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Educational', 'Group Language Learning', 'Pick a language and all learn together — hit your daily lesson and share new words with the group.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group'),
('Educational', 'Group TED Talk a Day', 'Watch one TED Talk every day and post your biggest takeaway for the group.', DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '13 days')::DATE, 'checkbox', 1, 'group');
