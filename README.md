# Sync Strava Lambda Function (sync-strava-db)

It's an AWS Lambda function that gets the data from my Strava activities and stores them into a Mongo DB. OAuth API credentials are also stored in said DB.

Feel free to fork but there is no warranty.

## Uses:

- AWS Lambda
- Node/ES6
- node fetch (NPM package)
- Mongoose

## Local Installation

1. `cp .env.example .env`
1. Add your email credentials to the appropriate spots in `.env`
1. [Sign up](https://www.strava.com/settings/api) for a "personal API application" on Strava
1. Add `localhost:3000` as a callback URL to your Strava API application
1. Copy your Client ID from [this page](https://www.strava.com/settings/api)
1. Send a `GET` request to: `https://www.strava.com/oauth/authorize?client_id=123&redirect_uri=http://localhost:3000&response_type=code&approval_prompt=force&scope=read,activity:read_all` (replace the client ID `123` with your own)
1. After you agree to authorize your app, Strava tries to redirect your browser to localhost:3000 with a `code` parameter. Unless you have a web server running on `localhost:3000`, the page will not be found. That's OK - copy the `code` parameter (we will use it to make our `POST` request).
1. Using your favorite API testing tool (like Postman), send a `POST` request to: `https://www.strava.com/oauth/token` with the header `'Content-Type': 'application/x-www-form-urlencoded'` and the body: `response_type=code&grant_type=authorization_code&client_id=123&client_secret=123&code=123&scope=read,activity:read_all` where `client_id` is the Client ID you copied from your API page and `client_secret` is your Client Secret (available on [your personal API page](https://www.strava.com/settings/api)) and `code` is the value of the `code` parameter mentioned above.
1. If it all goes well, Strava will return our new `access_token` and `refresh_token` in the body of our `POST` request response. Add these values to the `.env` file in the appropriate spots.

We are now ready to run our Lambda function for the first time: `node -e 'require("./start").syncStravaToDb()'`

A Strava API access token generally expires after 6 hours while a refresh token lasts a lot longer. We use the refresh token to request a new access token. We use the access token to make requests (generally, as a `GET` header) against the Strava API. We manage our access and refresh tokens by storing them (generally for a short amount of time) inside the database.

## AWS Installation

The first time you get all of your Strava activities, you may want to change `SYNC_LAST_120_DAYS_ONLY` to `false` inside your `.env` file. Changing it back to `true` means that the Lambda function will only sync the last ~120 days worth of activities. This will save on your Strava API limit, database usage, and CPU usage too.

1. Create a new function here: <https://us-west-2.console.aws.amazon.com/lambda>
1. Add environment variables from your `.env` file
1. Zip and upload this Lambda function
1. Be sure to edit the `Handler` field in the Function Code section of the AWS console. It follows a pattern like: `module-name.export` as declared in your function. For example, "index.handler" calls exports.handler in index.js. Use the value inside the field: `start.syncStravaToDb`
1. [Setup a CloudWatch event](https://docs.aws.amazon.com/lambda/latest/dg/with-scheduled-events.html) to fire your function every X number of hours

Since AWS calls your Node function in such a way, it's best [to test it](https://stackoverflow.com/questions/30782693/run-function-in-script-from-command-line-node-js#comment62731260_36480927) with: `node -e 'require("./start").syncStravaToDb()'` while working/testing locally.
