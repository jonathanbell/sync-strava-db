const fetch = require('node-fetch');
const mongoose = require('mongoose');
// https://github.com/Automattic/mongoose/issues/6880
mongoose.set('useFindAndModify', false);
const Auth = mongoose.model('Auth');
const moment = require('moment');
moment().format();
const nodemailer = require('nodemailer');

exports.getAccessToken = async () => {
  // Get the current authentication tokens from the database
  const currentAuth = await Auth.findOne({ client_id: process.env.CLIENT_ID });

  // If the current access token is still fresh, just return it
  if (
    moment(new Date()).isBefore(
      moment(currentAuth.expires_at).subtract(60, 'seconds')
    )
  ) {
    return currentAuth.access_token;
  }

  // Use the current `refresh_token` to request a new `access_token`
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `response_type=code&grant_type=refresh_token&client_id=${
      currentAuth.client_id
    }&client_secret=${currentAuth.client_secret}&refresh_token=${
      currentAuth.refresh_token
    }`
  }).catch(error => {
    console.error('Error while refreshing Strava auth token:', error);
    return false;
  });

  if (res.status >= 400) {
    console.error(
      `Bad response from server while refreshing the Strava API key. HTTP status: ${
        res.status
      }`
    );
    return false;
  }

  // New authorization data
  const auth = await res.json();

  // https://stackoverflow.com/a/847196/1171790
  auth.expires_at = new Date(auth.expires_at * 1000);
  auth.updated = new Date();
  auth.email_sent = false;

  // Write the new tokens back to the database.
  const newAuthKeys = await Auth.findOneAndUpdate(
    { client_id: currentAuth.client_id },
    auth,
    {
      new: true,
      // If the document isn't found, create a new one via `upsert` option:
      // https://mongoosejs.com/docs/api.html#model_Model.findOneAndUpdate
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return newAuthKeys.access_token;
};

exports.sendEmail = async text => {
  const auth = await Auth.findOne({ client_id: process.env.CLIENT_ID });
  if (auth.email_sent) {
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  const mailOptions = {
    from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
    to: process.env.MAIL_FROM_ADDRESS,
    subject: 'An error occured: Sync Strava Lambda function',
    text
  };

  try {
    // No callback, so `sendMail()` returns a promise
    // https://stackoverflow.com/a/47213128/1171790
    await transport.sendMail(mailOptions);
    await Auth.findOneAndUpdate(
      { client_id: process.env.CLIENT_ID },
      {
        email_sent: true
      },
      {
        new: true,
        upsert: false,
        setDefaultsOnInsert: false
      }
    );
  } catch (err) {
    console.error(`There was an error while sending email: ${err}`);
  }

  return;
};
