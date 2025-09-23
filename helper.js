function parseDate(dateString) {
  const [datePart, timePart] = dateString.split(" ");
  const [day, month, year] = datePart.split("/");
  const [hours, minutes, seconds] = timePart.split(":");
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

Date.prototype.toYMD = function() {
  const year = this.getFullYear();
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const day = String(this.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};


function hijriToGregorian(hYear, hMonth, hDay) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Riyadh'
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

    let low = new Date('2023-01-01T00:00:00.000Z');
    let high = new Date('2030-01-01T00:00:00.000Z');
    
    while (low <= high) {
        const mid = new Date(low.getTime() + Math.floor((high.getTime() - low.getTime()) / 2));
        const parts = getHijriParts(mid);
        const comparison = compareHijriDates(parts, hYear, hMonth, hDay);
        
        if (comparison === 0) {
            mid.setHours(0, 0, 0, 0);
            return mid;
        } else if (comparison < 0) {
            low = new Date(mid.getTime() + 1);
        } else {
            high = new Date(mid.getTime() - 1);
        }
    }
    
    throw new Error(`Hijri date ${hYear}-${hMonth}-${hDay} not found`);
}

function dateToHijri(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Riyadh'
    });
  
  const parts = formatter.formatToParts(date);
  
  return {
    year: parseInt(parts.find(part => part.type === 'year').value),
    month: parseInt(parts.find(part => part.type === 'month').value),
    day: parseInt(parts.find(part => part.type === 'day').value)
  };
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
        timeZone: 'Asia/Riyadh'
    });

    // Find the first day of the target Hijri month
    const firstDayOfMonth = hijriToGregorian(hijriYear, hijriMonth, 1);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const dayOfWeek = (firstDayOfMonth.getUTCDay()+8)%7;
    
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
    // "2025/08/24",
];
const OLD_SEASONS_END = "2025/08/29";
function getSeasonID(season_name) {
    let spl = season_name.split(' ');
    let hij_year = parseInt(spl[spl.length-1]);
    let hij_month = parseInt(HIJRI_MONTHS[season_name.slice(0, season_name.length-5)]);
    return (hij_year-FIRST_YEAR)*12 + hij_month;
}

function nameBySeasonID(season_id) {
    return `${HIJRI_TO_MONTHS[1+(season_id-1)%12]} ${1446+Math.floor(season_id/12)}`;
}

function getSeasonStartDate(season_name) {
    let season_id = getSeasonID(season_name);
    if (season_id <= OLD_SEASONS_START_DATE.length)
        return new Date(OLD_SEASONS_START_DATE[season_id-1]);
    let spl = season_name.split(' ');
    let hij_year = parseInt(spl[spl.length-1]);
    let hij_month = parseInt(HIJRI_MONTHS[season_name.slice(0, season_name.length-5)]);
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
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

const EXTRA_IDEAS = {
    'مراجعة كتاب': 40,
    'مشاركة فائدة': 5,
    'جلسة كتاب': 40,
    'اللقاء الافتتاحي': 50,
    'قراءة الدستور': 20,
    'الجلسة النقاشية': 60
};

function getParticipantsStats(data) {
    if (!data || data.length === 0) return [];
    
    const dayMs = 24 * 60 * 60 * 1000;

    const seasonStart = getSeasonStartDate(currentSeason);
    const seasonEnd = new Date(getSeasonStartDate(nameBySeasonID(getSeasonID(currentSeason)+1))-dayMs);
    const protectedEndDate = new Date(seasonStart); // First 7 days
    protectedEndDate.setDate(seasonStart.getDate() + 7);
    
    // Initialize stats map
    const stats = {};
    data = data.sort((a, b) => (parseDate(a.timestamp)) - (parseDate(b.timestamp)));
    // Main processing loop
    for (let i = 0; i < data.length; i++) {
        const entry = data[i];
        const email = emailToName(entry.email);
        
        if (!stats[email]) {
            stats[email] = {
                name: emailToName(email),
                totalIdeas: 0,
                totalMinutes: 0,
                streak: 0,
                maxStreak: 0,
                currentStreak: 0,
                lastReadingDate: null,
                lastReadingMinutes: 0,
                extraIdeas: 0,
                readingDays: new Set(),
                dailyMinutes: {}, // Track minutes per day for subtraction calculation
                subtraction: 0,
                deserveDisqual: null
            };
        }
        
        const stat = stats[email];
        const entryDate = parseDate(entry.timestamp).toYMD();
        const entryDateObj = new Date(entryDate);
        const prevDate = new Date(entryDate);
        prevDate.setHours(0, 0, 0, 0);
        prevDate.setDate(prevDate.getDate()-1);
        entryDateObj.setHours(0, 0, 0, 0);
        const minutes = durationToMinutes(entry.hours);
        
        // Track daily minutes (accumulate if multiple entries per day)
        if (!stat.dailyMinutes[entryDate])
            stat.dailyMinutes[entryDate] = 0;
        stat.dailyMinutes[entryDate] += minutes;
        
        // Calculate streak factor
        
        let asdf = stat.lastReadingDate ? stat.lastReadingDate.toISOString() : '';
        if (prevDate.toISOString() == asdf && stat.lastReadingMinutes > 3) {
            stat.lastReadingMinutes = minutes;
            stat.currentStreak++;
        } else if (entryDateObj.toISOString() != asdf) {
            stat.currentStreak = 1;
            stat.lastReadingMinutes = minutes;
        } else {
            stat.lastReadingMinutes += minutes;
        }
        stat.maxStreak = Math.max(stat.maxStreak, stat.currentStreak);
        // Update last reading date
        stat.lastReadingDate = entryDateObj;
        
        let factor = 1;
        if (stat.currentStreak >= 2) factor = 1.15;
        if (stat.currentStreak >= 3) factor = 1.2;
        // Update totals
        stat.totalIdeas += calculateIdeas(minutes)*factor + (EXTRA_IDEAS[entry.extra] || 0);
        stat.extraIdeas += (EXTRA_IDEAS[entry.extra] || 0);
        stat.totalMinutes += minutes;
        stat.readingDays.add(entryDate);
        
        
    }
    
    // Calculate streaks and subtractions
    
    const asdf = new Date();
    asdf.setDate(asdf.getDate()-1);
    const yesterdayStrDate = asdf.toYMD();
    Object.keys(stats).forEach(email => {
        const stat = stats[email];
        
        // Calculate streak
        stat.streak = (stat.dailyMinutes[yesterdayStrDate] || 0  >= 3) ? stat.currentStreak : 0; //calculateStreak(stat.readingDays);
        
        const dateToday = new Date();
        dateToday.setDate(dateToday.getDate() + 1);
        dateToday.setHours(0, 0, 0, 0);
        // Iterate through all days from first to last reading day for this participant
        for (let d = new Date(seasonStart); d <= dateToday; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            
            // Skip if within protected week
            if (d <= protectedEndDate) continue;
            
            
            // Check if user read less than 3 minutes on this day
            const minutesRead = stat.dailyMinutes[dateStr] || 0;
            if (minutesRead < 3) {
                stat.subtraction += 10;
            }

            if (stat.deserveDisqual == null && stat.totalIdeas < stat.subtraction) {
                stat.deserveDisqual = d.toISOString().split('T')[0];
            }
        }
        
        // Apply subtraction to total ideas
        stat.totalIdeas = Math.max(0, stat.totalIdeas - stat.subtraction);
        
        // Clean up temporary data
        // delete stat.dailyMinutes;
    });
    // console.log(stats);
    
    // Filter out participants with 0 ideas
    return Object.values(stats);
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

// -- Cookie Utils --
function setCookie(name, value, daysToExpire) {
    let expires = "";
    if (daysToExpire) {
        const date = new Date();
        date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function applyAdminMode() {
    document.querySelectorAll('.admin-only').forEach(div => {
        div.classList.remove('admin-only');
    });
}

// if (getCookie('MunadhelIsHere') == '1') {
//     applyAdminMode();
// }

let asdfClicksCount = 0;
document.querySelector('#nedhalIcon').addEventListener('click', function() {
    asdfClicksCount++;
    if (asdfClicksCount == 6) {
        applyAdminMode();
        setCookie('MunadhelIsHere', '1', 71);
        alert('تم تفعيل وضع الإدارة');
    }
});