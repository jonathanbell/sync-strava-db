const fetch = require('node-fetch');
const mongoose = require('mongoose');
// https://github.com/Automattic/mongoose/issues/6880
mongoose.set('useFindAndModify', false);
const Activity = mongoose.model('Activity');
const moment = require('moment');
moment().format();

// forEach promises:
// https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
const asyncForEach = async function(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getActivitiesByPage = async (access_token, page = 1, per_page = 200) => {
  console.log(`Getting page ${page}.`);
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${page}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    }
  ).catch(error => {
    console.error('Error while getting Strava activities:', error);
    return;
  });

  // Activities! Write em to the DB. :)
  const activities = await response.json();
  await writeActivitiesToDb(activities);

  let fourMonthsAgo = moment().subtract(999, 'years');
  if (process.env.SYNC_LAST_120_DAYS_ONLY) {
    fourMonthsAgo = moment().subtract(120, 'days');
  }

  if (
    activities.length >= per_page &&
    moment(activities[activities.length - 1].start_date).isAfter(fourMonthsAgo)
  ) {
    page++;
    await getActivitiesByPage(access_token, page, per_page);
  }
};

const writeActivitiesToDb = async activities => {
  // More human readable names.
  // I tried to do this with `activitySchema.pre('findOneAndUpdate', function(next) {})`, but:
  // https://stackoverflow.com/questions/31823820/mongoose-pre-findoneandupdate-hook-issues
  activities.forEach(activity => {
    let type = activity.type;

    switch (activity.type) {
      case 'WeightTraining':
        type = 'Strength Training';
        break;
      case 'Workout':
        type = 'Fingerboard Training';
        break;
      case 'RockClimbing':
        type = 'Rock Climbing';
        break;
      case 'Hike':
        type = 'Hiking';
        break;
      case 'AlpineSki':
        type = 'Resort Skiing';
        break;
      case 'BackcountrySki':
      case 'NordicSki':
        type = 'Backcountry Skiing';
        break;
      default:
        type = activity.type;
    }

    activity.type = type;
  });

  // Write a page of activities to the databse
  await asyncForEach(activities, async activity => {
    await Activity.findOneAndUpdate({ id: activity.id }, activity, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });
    console.log(`Updated Strava ID ${activity.id} in database.`);
  });
};

exports.syncActivities = async access_token => {
  await getActivitiesByPage(access_token);
  console.log("Sync'd Strava activities to database.");
};
