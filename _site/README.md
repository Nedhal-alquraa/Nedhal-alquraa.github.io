# Nedhal Alquraa

URL: https://nedhal-alquraa.github.io/

## Idea (for AI prompts)
This website was created for encouraging the organization members "Nedhal Alquraa" (نضال القراء) to read books.

The organization has "seasons", where each season takes a whole Hijri month staring from Saturday.

At each season, the members compete to get the best results.

The results is a cumulative score which is called "Total Ideas", the ideas calculation depends on the streak, so if you have 1 day streak the total minutes gets a multiplication factor by 1.15 for example, and higher streaks results in higher multiplication factor.

There is an extra ideas that a user can submit if he did one of the things which gives him more "Ideas", like sharing a note on the Whatsapp group.

The website mainly depends on user to record on a Google Form the amount of minutes he read.

Google Forms records this into a Google Sheet, this Google Sheet is linked with a Google Script.

The Google Scripts just returns the rows which has the following:
- `timestamp`: The time of the submission
- `email`: The email of the user
- `hours`: In format `hh:MM:ss`
- `extra`: The amount of extra ideas if he got any

There is a disqualification method if a member is inactive, which is they get a deduciton of 10 ideas for each day without reading.

The website is designed mainly to have 5 tabs:
- Current Results: Shows standings for members ideas in this season only and the current streak
- Expelled counters: Shows how many days and get expelled for each member
- Expelled members: Shows the expelled students names along with the reason, used for admins to remove the member from the Whatsapp group
- Records: Shows the members who achieved a distinct records in the amounts of reading and streak
- Seasons comparison: Numbers of average minutes and ideas along with graph that compares the seasons
- Total results: Shows standings for all members ideas summed up along all seasons

At file `names.js` there is a mapping between the email and the name.

The website is simple, static, with a little calculations and data maniplulation.

Some helper functions of Hijri/Gregorian calender formats and conversion and seasons are defiend in `helper.js`.

The important information about each season dates:
- Minimum of 4 weeks (28 days), could be longer until the next seasons saturday
- Each season takes the majority of a whole hijri month
- The first day of the season is always the first Saturday of that Hijri month

Some definitions:
- Season ID: a unique integer for each season starting from 1
- Season Name: a unique name for each season which is "{HIJRI_MONTH_NAME} {HIJRI_YEAR_NUM}"
- Protected week: the first week of season there are no deductions 

## Files
- `helper.js`: Contains main functionality and calculations for: dates, seasons, ideas, streaks, and also for cookies management
- `design.js`: Contains API functionality along with colors, graphs, direct HTML update
- `names.js`: A mapping file between the email and the name for faster loading time instead of using an API

## API work
The current architicture uses Google Sheets as a database, and loads the data using a Google Script API plugged in the Google Sheet.

Mainly it is the bottleneck for loading time, with response time between 3-5 seconds.

## Calculations
The main function `getParticipantsStats` which gets some rows of the database and calculates for each person exist in those rows the following information:
- `streak`
- `maxStreak`