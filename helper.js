function getHijriDate(gregorianDate = new Date()) {
    // Intl for Hijri (Umm al-Qura calendar)
    const hijriFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "numeric",
        year: "numeric"
    });

    const parts = hijriFormatter.formatToParts(gregorianDate);
    const hijriParts = {};
    for (const p of parts) {
        if (p.type !== "literal") {
            hijriParts[p.type] = parseInt(p.value, 10);
        }
    }

    // Arabic Hijri month names
    const hijriMonthsAr = [
        "محرم",
        "صفر",
        "ربيع الأول",
        "ربيع الآخر",
        "جمادى الأولى",
        "جمادى الآخرة",
        "رجب",
        "شعبان",
        "رمضان",
        "شوال",
        "ذو القعدة",
        "ذو الحجة"
    ];

    return {
        year: hijriParts.year,
        month: hijriParts.month,
        month_name: hijriMonthsAr[hijriParts.month - 1],
        day: hijriParts.day
    };
}

function getSeasonID(season_name) {

}

function getSeasonStartDate(season_name) {
    let hij_date = getCurrentHijriDate();
    let past_month = hij_date.previousMonth();
    if (getLastDayOfMonth(past_month) == friday)
        return firstDayOfHijriMonth(hij_date);
    return getFirstSaturdayOfHijriMonth(current_hijri_month);
}

function getSeasonFromDate(date = new Date()) {
    let hijri = getHijriDate(date)

    // return `${getHijriDate()} ${getHijriDate()}`;
}

// Get current season
// TODO: Fix
function getCurrentSeason() {
    return 'محرم 1446';
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
        ideas = 15 + ((minutes - 15) * 1.15);
    } else {
        ideas = 15 + (15 * 1.15) + ((minutes - 30) * 1.2);
    }
    
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
                lastReadingDate: null,
                readingDays: new Set()
            };
        }
        
        stats[entry.email].totalIdeas += calculateIdeas(durationToMinutes(entry.hours)) || 0;
        stats[entry.email].totalMinutes += durationToMinutes(entry.hours) || 0;
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