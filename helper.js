function hijriToGregorian(hYear, hMonth, hDay) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
    });

    const getHijriParts = (date) => {
        const parts = formatter.formatToParts(date);
        return {
            year: parseInt(parts.find(p => p.type === 'year').value),
            month: parseInt(parts.find(p => p.type === 'month').value),
            day: parseInt(parts.find(p => p.type === 'day').value)
        };
    };

    const compareHijriDates = (parts, targetYear, targetMonth, targetDay) => {
        if (parts.year !== targetYear) return parts.year - targetYear;
        if (parts.month !== targetMonth) return parts.month - targetMonth;
        return parts.day - targetDay;
    };

    let low = new Date('2020-01-01T00:00:00.000Z');
    let high = new Date('2040-01-01T00:00:00.000Z');
    
    while (low <= high) {
        const mid = new Date(low.getTime() + Math.floor((high.getTime() - low.getTime()) / 2));
        const parts = getHijriParts(mid);
        const comparison = compareHijriDates(parts, hYear, hMonth, hDay);
        
        if (comparison === 0) {
            return mid;
        } else if (comparison < 0) {
            low = new Date(mid.getTime() + 1);
        } else {
            high = new Date(mid.getTime() - 1);
        }
    }
    
    throw new Error(`Hijri date ${hYear}-${hMonth}-${hDay} not found`);
}

function getFirstSaturdayOfHijriMonth(hijriYear, hijriMonth) {
    // Validate input parameters
    if (!Number.isInteger(hijriYear) || hijriYear < 1) {
        throw new Error('Hijri year must be a positive integer');
    }
    if (!Number.isInteger(hijriMonth) || hijriMonth < 1 || hijriMonth > 12) {
        throw new Error('Hijri month must be an integer between 1 and 12');
    }


    // The key insight: we can use Intl.DateTimeFormat.formatToParts to get detailed information
    const partsFormatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
        timeZone: 'UTC'
    });

    // Find the first day of the target Hijri month
    const firstDayOfMonth = hijriToGregorian(hijriYear, hijriMonth, 1);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const dayOfWeek = firstDayOfMonth.getUTCDay();
    
    // Calculate how many days to add to get to the first Saturday
    const daysToFirstSaturday = (6 - dayOfWeek) % 7;
    
    // Create the date of the first Saturday
    const firstSaturday = new Date(firstDayOfMonth.getTime() + (daysToFirstSaturday * 24 * 60 * 60 * 1000));
    
    // Use Intl.DateTimeFormat to get the Hijri day number of this Saturday
    const parts = partsFormatter.formatToParts(firstSaturday);
    const dayPart = parts.find(p => p.type === 'day');
    
    if (!dayPart) {
        throw new Error('Could not determine Hijri day for the first Saturday');
    }
    
    return parseInt(dayPart.value);
}

const HIJRI_TO_MONTHS = {
    1: "محرم",
    2: "صفر",
    3: "ربيع الأول",
    4: "ربيع الآخر",
    5: "جمادى الأولى",
    6: "جمادى الآخرة",
    7: "رجب",
    8: "شعبان",
    9: "رمضان",
    10: "شوال",
    11: "ذو القعدة",
    12: "ذو الحجة"
};

const HIJRI_MONTHS = {
    "محرم": 1,
    "صفر": 2,
    "ربيع الأول": 3,
    "ربيع الآخر": 4,
    "جمادى الأولى": 5,
    "جمادى الآخرة": 6,
    "رجب": 7,
    "شعبان": 8,
    "رمضان": 9,
    "شوال": 10,
    "ذو القعدة": 11,
    "ذو الحجة": 12
};

function dateToHijri(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
    });
  
  const parts = formatter.formatToParts(date);
  
  return {
    year: parseInt(parts.find(part => part.type === 'year').value),
    month: parseInt(parts.find(part => part.type === 'month').value),
    day: parseInt(parts.find(part => part.type === 'day').value)
  };
}
// Gregorian -> Hijri (Umm al-Qura-backed on Aladhan; adjustable)
async function gToH(gy, gm, gd, { adjustment = 0 } = {}) {
  const dd = String(gd).padStart(2, "0");
  const mm = String(gm).padStart(2, "0");
  const yyyy = String(gy);

  const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}?adjustment=${adjustment}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200 || !json.data?.hijri) throw new Error("Unexpected response");

  const h = json.data.hijri;
  return {
    hDay: Number(h.day),
    hMonth: h.month.number,
    hMonthNameAr: h.month.ar,
    hMonthNameEn: h.month.en,
    hYear: Number(h.year),
    weekdayAr: h.weekday.ar,
    weekdayEn: h.weekday.en,
    isoHijri: `${h.year}-${String(h.month.number).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
    source: "aladhan"
  };
}

// Hijri -> Gregorian
async function hToG(hy, hm, hd, { adjustment = 0 } = {}) {
  const dd = String(hd).padStart(2, "0");
  const mm = String(hm).padStart(2, "0");
  const yyyy = String(hy);

  const url = `https://api.aladhan.com/v1/hToG/${dd}-${mm}-${yyyy}?adjustment=${adjustment}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200 || !json.data?.gregorian) throw new Error("Unexpected response");

  const g = json.data.gregorian;
  return {
    gDay: Number(g.day),
    gMonth: g.month.number,
    gMonthNameEn: g.month.en,
    gYear: Number(g.year),
    weekdayEn: g.weekday.en,
    isoGregorian: `${g.year}-${String(g.month.number).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`,
    source: "aladhan"
  };
}


function getHijriDateDetails(gregorianDate = new Date()) {
    // Ensure the input is a valid Date object
    if (!(gregorianDate instanceof Date) || isNaN(gregorianDate)) {
        throw new Error("Invalid Date object provided");
    }

    try {
        // Attempt to format the date in the Islamic (Hijri) calendar
        const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            timeZone: 'UTC'
        });

        // Get formatted parts of the Hijri date
        const parts = formatter.formatToParts(gregorianDate);
        const year = parseInt(parts.find(part => part.type === 'year').value);
        const month = parseInt(parts.find(part => part.type === 'month').value);
        const day = parseInt(parts.find(part => part.type === 'day').value);


        // Return dictionary with required details
        return {
            year: year,
            month: month,
            day: day
        };
    } catch (error) {
        // Fallback if the Islamic calendar is not supported
        console.warn("Hijri calendar not supported in this environment's Intl.DateTimeFormat");
        throw new Error("Hijri calendar is not supported in this environment. Please use a library like hijri-date for accurate conversions.");
    }
}

const FIRST_YEAR = 1446;
const OLD_SEASONS_START_DATE = [
    "2024/07/20",
    "2024/08/03",
    "2024/08/31",
    "2024/09/28",
    "2024/10/26",
    "2024/11/30",
    "2025/01/04",
    "2025/02/01",
    "2025/03/01",
    "2025/03/29",
    "2025/05/03",
    "2025/05/31",
    "2025/06/29",
    "2025/07/27",
    "2025/08/24",
];
const OLD_SEASONS_END = "2025/09/27";
function getSeasonID(season_name) {
    let hij_year = parseInt(season_name.split(' ')[1]);
    let hij_month = parseInt(HIJRI_MONTHS[season_name.split(' ')[0]]);
    return (hij_year-FIRST_YEAR)*12 + hij_month;
}

function getSeasonStartDate(season_name) {
    let season_id = getSeasonID(season_name);
    if (season_id <= OLD_SEASONS_START_DATE.length)
        return OLD_SEASONS_START_DATE[season_id-1];
    let hij_year = parseInt(season_name.split(' ')[1]);
    let hij_month = parseInt(HIJRI_MONTHS[season_name.split(' ')[0]]);
    let hij_day = getFirstSaturdayOfHijriMonth(hij_year, hij_month);
    return hijriToGregorian(hij_year, hij_month, hij_day);
}

function getSeasonFromDate(date = new Date()) {
    if (date < new Date(OLD_SEASONS_END)) {
        let seasonId = OLD_SEASONS_START_DATE.length-1;
        for (let i = 1; i < OLD_SEASONS_START_DATE.length; i++) {
            if (date < new Date(OLD_SEASONS_START_DATE[i])) {
                seasonId = i - 1;
                break;
            }
        }
        let year = 1446 + Math.floor(seasonId / 12);
        let month = seasonId%12 + 1;
        return `${HIJRI_TO_MONTHS[month]} ${year}`;
    }
    let hijri = dateToHijri(date);
    let first_sat = getFirstSaturdayOfHijriMonth(hijri.year, hijri.month);
    
    if (first_sat > hijri.day) {
        // Return the previous 
        if (hijri.month == 1) {
            hijri.month = 12;
            hijri.year -= 1;
        } else hijri.month -= 1;
    }
    return `${HIJRI_TO_MONTHS[hijri.month]} ${hijri.year}`;
}

// Get current season
function getCurrentSeason() {
    return getSeasonFromDate();
}

// Get current week of the season
// TODO: Fix
function getCurrentWeek() {
    // Simplified calculation - in real implementation, calculate based on season start date
    return 2;
}


// End of functions that need to be fixed
// ======================


function calculateIdeas(minutes) {
    let ideas = 0;
    
    if (minutes <= 15) {
        ideas = minutes;
    } else if (minutes <= 30) {
        ideas = minutes * 1.15;
    } else {
        ideas = minutes * 1.2;
    }
    // Make it only 2 decimal places
    return Math.round(ideas * 100) / 100;
}

function durationToMinutes(duration) {
    let arr = duration.split(':');
    return parseInt(arr[0])*60 + parseInt(arr[1]) + parseInt(arr[2])/60;
}

// Format time from minutes to H:M:S
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins}:00`;
}

// Format date
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getParticipantsStats(data) {
    const stats = {};
    
    data.forEach(entry => {
        if (!stats[entry.email]) {
            stats[entry.email] = {
                name: emailToName(entry.email),
                totalIdeas: 0,
                totalMinutes: 0,
                streak: 0,
                currentStreak: 0,
                lastReadingDate: null,
                readingDays: new Set()
            };
        }

        let factor = 1;
        if (stats[entry.email].lastReadingDate < new Date(entry.timestamp))
            stats[entry.email].currentStreak++;
        else
            stats[entry.email].currentStreak = 0;

        if (stats[entry.email].currentStreak >= 2) factor = 1.15;
        if (stats[entry.email].currentStreak >= 3) factor = 1.2;

        stats[entry.email].totalIdeas += calculateIdeas(durationToMinutes(entry.hours));
        stats[entry.email].totalMinutes += durationToMinutes(entry.hours);
        stats[entry.email].readingDays.add(entry.timestamp);
        
        if (!stats[entry.email].lastReadingDate || new Date(entry.timestamp) > new Date(stats[entry.email].lastReadingDate)) {
            stats[entry.email].lastReadingDate = entry.timestamp;
        }
    });
    
    // Calculate streaks
    Object.keys(stats).forEach(email => {
        stats[email].streak = calculateStreak(stats[email].readingDays);
    });
    console.log(Object.values(stats));

    const filteredPeople = Object.fromEntries(
        Object.entries(stats).filter(([key, person]) => person.totalIdeas !== 0)
    );
    return Object.values(filteredPeople);
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        safe: 'آمن',
        warning: 'تحذير',
        danger: 'خطر'
    };
    return statusTexts[status] || 'غير محدد';
}

// Get participants statistics
// Calculate reading streak
function calculateStreak(readingDays) {
    const dates = Array.from(readingDays).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < dates.length; i++) {
        const currentDate = new Date(dates[i]);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        
        if (dates[i] === expectedDate.toISOString().split('T')[0]) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Utility functions
function formatArabicDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('ar-SA', options);
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'أمس';
    if (diffDays === 0) return 'اليوم';
    if (diffDays <= 7) return `منذ ${diffDays} أيام`;
    if (diffDays <= 30) return `منذ ${Math.ceil(diffDays / 7)} أسابيع`;
    return `منذ ${Math.ceil(diffDays / 30)} شهور`;
}