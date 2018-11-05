require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(
  process.env.DATABASE,
  { useNewUrlParser: true }
);

// Import our models
const Activity = require('./models/Activity');
const Auth = require('./models/Auth');

// Import controllers
const authController = require('./controllers/authController');
const activityController = require('./controllers/activityController');

exports.syncStravaToDb = async () => {
  try {
    const access_token = await authController.getAccessToken();
    await activityController.syncActivities(access_token);
  } catch (err) {
    await authController.sendEmail(
      `There was an error while syncing your Strava activities. You should take a look at your AWS Sync Strava Lambda function (something might be wrong). Here's the error that the serverless function encountered: ${err}`
    );
    console.error(err);
  }

  return 'Complete.';

  // Technically un-reachable code but allows the command line to exit out
  // gracefully when testing locally.
  process.exit();
};
