// Global variables
const CHART_BORDER_COLOR = '#20448eff';
const CHART_BACKGROUND_COLOR = '#152c5b';
const CHART_BORDER_COLOR2 = '#7c3fa3';
const CHART_BACKGROUND_COLOR2 = '#7c3fa3';

// Heatmap color constants
const HEATMAP_COLORS = {
    EMPTY: '#f0f0f0',
    LEVEL_1: '#c6f6d5',  // Light green (1-50 ideas)
    LEVEL_2: '#9ae6b4',  // Medium green (51-100 ideas)
    LEVEL_3: '#68d391',  // Darker green (101-150 ideas)
    LEVEL_4: '#48bb78',  // Strong green (151-200 ideas)
    LEVEL_5: '#38a169',  // Very strong green (201+ ideas)
    BORDER: '#e2e8f0'
};

let allData = [];
let currentSeason = null;
let charts = {};
let adminWarnings = [];

// Track current view mode in Current Results tab
let currentResultsViewMode = 'total'; // 'total' or 'individual'
let selectedParticipantEmail = null;

const GOOGLE_APP_SCRIPT_API_VERSION = 'AKfycbyS7Gc6LUC6XuI5wKSrTviq88wU38JpJFZ2uixtkClbx0zuS6cl8GG0uLQ_Jh3dh3_tfA';
const GOOGLE_APP_SCRIPT_URL = `https://script.google.com/macros/s/${GOOGLE_APP_SCRIPT_API_VERSION}/exec`;

async function loadRawResponses() {
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL);
        const result = await response.json();
        if (!result.success) {
            console.error('Error:', result);
            alert("Error in loading data from Google, refresh the website again");
        }
        return result.data;
    } catch (error) {
        console.error('Error:', error);
        alert("Error in loading data from Google, refresh the website again");
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setInterval(loadData, 5 * 60 * 1000); // Update every 5 minutes
});

// Load data from Google Sheets
async function loadData() {
    try {
        const startLoading = new Date();
        allData = await loadRawResponses();
        const endRequest = new Date();
        console.log("Loading AppScript took:", (endRequest-startLoading)/1000);
        allData = allData.sort((a, b) => parseDate(a.timestamp) < parseDate(b.timestamp));
        console.log(`Loaded ${allData.length} rows`);
        currentSeason = getCurrentSeason();
        
        // Checking data
        checkData();

        updateCurrentResults();
        updateCountdown();
        updateExpelled();
        updateRecords();
        updateseasonsComparisonStats();
        const endLoading = new Date();
        console.log("Total loading:", (endLoading - startLoading)/1000);
        document.getElementById('nedhalIcon').style.animation = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function checkData() {
    const tbody = document.getElementById('adminWarnings');
    tbody.innerHTML = '';
    allData.forEach((entry, index) => {
        if (durationToMinutes(entry.hours) > 300) {
            tbody.innerHTML = `<tr>
                <td>${entry.timestamp}</td>
                <td>${emailToName(entry.email)}</td>
                <td>${entry.hours}</td>
            </tr>` + tbody.innerHTML;
            adminWarnings.push({index, entry});
            if (durationToMinutes(entry.hours) > 1440) {
                let hh = entry.hours.split(':')[0];
                entry.hours = `0:${hh}:00`;
            }
        }
    });
}

// Show specific page
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected page and activate button
    document.getElementById(pageId).classList.add('active');
    event.target.classList.add('active');
}

// Toggle between total and individual results views
function toggleResultsView(mode) {
    currentResultsViewMode = mode;
    
    // Update toggle button states
    document.getElementById('totalViewBtn').classList.toggle('active', mode === 'total');
    document.getElementById('individualViewBtn').classList.toggle('active', mode === 'individual');
    
    // Show/hide appropriate sections
    document.getElementById('totalResultsView').style.display = mode === 'total' ? 'block' : 'none';
    document.getElementById('individualResultsView').style.display = mode === 'individual' ? 'block' : 'none';
    
    if (mode === 'individual') {
        renderIndividualResultsSelector();
    }
}

// Render individual results participant selector
function renderIndividualResultsSelector() {
    const container = document.getElementById('individualResultsView');
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    const sortedParticipants = participants.sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = `
        <div class="card">
            <h2><i class="fas fa-user"></i> اختر اسمك</h2>
            <div style="margin-bottom: 2rem;">
                <select id="participantSelector" class="participant-selector">
                    <option value="">-- اختر المشارك --</option>
                    ${sortedParticipants.map(p => `
                        <option value="${p.name}">${p.name}</option>
                    `).join('')}
                </select>
            </div>
            <div id="participantDetails"></div>
        </div>
    `;
    
    // Add event listener
    document.getElementById('participantSelector').addEventListener('change', function(e) {
        const participantName = e.target.value;
        if (participantName) {
            displayIndividualResults(participantName);
        } else {
            document.getElementById('participantDetails').innerHTML = '';
        }
    });
}

// Display individual results for selected participant
function displayIndividualResults(participantName) {
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    const participant = participants.find(p => p.name === participantName);
    
    if (!participant) return;
    
    // Calculate days without reading
    const seasonStart = getSeasonStartDate(currentSeason);
    const protectedEndDate = new Date(seasonStart);
    protectedEndDate.setDate(seasonStart.getDate() + 7);
    const today = new Date();
    
    let daysWithoutReading = 0;
    for (let d = new Date(seasonStart); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const minutesRead = participant.dailyMinutes[dateStr] || 0;
        if (minutesRead < 3) {
            daysWithoutReading++;
        }
    }
    
    // Calculate average reading per day
    const readingDaysCount = Object.keys(participant.dailyMinutes).filter(date => participant.dailyMinutes[date] >= 3).length;
    const avgReadingPerDay = readingDaysCount > 0 ? participant.totalMinutes / readingDaysCount : 0;
    
    // Calculate invoice components
    const readingIdeas = participant.totalIdeas + participant.subtraction - participant.extraIdeas;
    const readingIdeasBeforeFactor = readingIdeas / (participant.maxStreak >= 3 ? 1.2 : participant.maxStreak >= 2 ? 1.15 : 1);
    
    const detailsContainer = document.getElementById('participantDetails');
    detailsContainer.innerHTML = `
        <div class="individual-results-container">
            <!-- General Info -->
            <div class="individual-info-section">
                <h3 class="participant-name">${participantName}</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">أيام بدون قراءة</span>
                        <span class="info-value ${daysWithoutReading > 0 ? 'danger-text' : 'success-text'}">${daysWithoutReading}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">متوسط القراءة يومياً</span>
                        <span class="info-value">${formatTime(Math.round(avgReadingPerDay))}</span>
                    </div>
                </div>
            </div>
            
            <!-- Invoice -->
            <div class="invoice-section">
                <h3><i class="fas fa-file-invoice"></i> فاتورة الأفكار</h3>
                <div class="invoice-table">
                    <div class="invoice-row">
                        <span class="invoice-label">أفكار القراءة (قبل عامل الاستمرارية)</span>
                        <span class="invoice-value">${readingIdeasBeforeFactor.toFixed(2)}</span>
                    </div>
                    <div class="invoice-row">
                        <span class="invoice-label">الأفكار الإضافية</span>
                        <span class="invoice-value success-text">+${participant.extraIdeas.toFixed(2)}</span>
                    </div>
                    <div class="invoice-row">
                        <span class="invoice-label">الخصم (${daysWithoutReading} × 10)</span>
                        <span class="invoice-value danger-text">-${participant.subtraction.toFixed(2)}</span>
                    </div>
                    <div class="invoice-row invoice-subtotal">
                        <span class="invoice-label">المجموع الفرعي</span>
                        <span class="invoice-value">${(readingIdeasBeforeFactor + participant.extraIdeas - participant.subtraction).toFixed(2)}</span>
                    </div>
                    <div class="invoice-row">
                        <span class="invoice-label">عامل الاستمرارية</span>
                        <span class="invoice-value">×${participant.maxStreak >= 3 ? '1.20' : participant.maxStreak >= 2 ? '1.15' : '1.00'}</span>
                    </div>
                    <div class="invoice-row invoice-total">
                        <span class="invoice-label"><strong>الإجمالي النهائي</strong></span>
                        <span class="invoice-value"><strong>${participant.totalIdeas.toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
            
            <!-- Calendar Heatmap -->
            <div class="calendar-section">
                <h3><i class="fas fa-calendar-alt"></i> خريطة القراءة الشهرية</h3>
                ${renderCalendarHeatmap(participant, currentSeason)}
            </div>
        </div>
    `;
}

// Render calendar heatmap for the Hijri month
function renderCalendarHeatmap(participant, seasonName) {
    const seasonStart = getSeasonStartDate(seasonName);
    const hijriDate = dateToHijri(seasonStart);
    
    // Get number of days in this Hijri month (approximate 29-30 days)
    const nextMonthStart = hijriToGregorian(
        hijriDate.month === 12 ? hijriDate.year + 1 : hijriDate.year,
        hijriDate.month === 12 ? 1 : hijriDate.month + 1,
        1
    );
    const daysInMonth = Math.round((nextMonthStart - seasonStart) / (24 * 60 * 60 * 1000));
    
    // Build calendar grid starting from Saturday
    let html = '<div class="calendar-heatmap">';
    html += '<div class="calendar-weekdays">';
    ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].forEach(day => {
        html += `<div class="weekday-label">${day}</div>`;
    });
    html += '</div>';
    
    html += '<div class="calendar-grid">';
    
    // Find what day of week the month starts on (0=Saturday in our calendar)
    const firstDayOfWeek = (seasonStart.getDay() + 1) % 7; // Convert Sunday=0 to Saturday=0
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-cell empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(seasonStart);
        currentDate.setDate(seasonStart.getDate() + (day - 1));
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const minutes = participant.dailyMinutes[dateStr] || 0;
        const ideas = minutes > 0 ? calculateIdeas(minutes) : 0;
        
        const color = getHeatmapColor(ideas);
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        html += `
            <div class="calendar-cell ${isToday ? 'today' : ''}" style="background-color: ${color};">
                <div class="cell-day">${day}</div>
                ${minutes > 0 ? `
                    <div class="cell-ideas">${ideas.toFixed(0)}</div>
                    <div class="cell-minutes">${Math.round(minutes)}د</div>
                ` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    html += '</div>';
    
    // Add legend
    html += `
        <div class="calendar-legend">
            <span>أقل</span>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.EMPTY};"></div>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.LEVEL_1};"></div>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.LEVEL_2};"></div>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.LEVEL_3};"></div>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.LEVEL_4};"></div>
            <div class="legend-color" style="background-color: ${HEATMAP_COLORS.LEVEL_5};"></div>
            <span>أكثر</span>
        </div>
    `;
    
    return html;
}

// Get heatmap color based on ideas count
function getHeatmapColor(ideas) {
    if (ideas === 0) return HEATMAP_COLORS.EMPTY;
    if (ideas <= 50) return HEATMAP_COLORS.LEVEL_1;
    if (ideas <= 100) return HEATMAP_COLORS.LEVEL_2;
    if (ideas <= 150) return HEATMAP_COLORS.LEVEL_3;
    if (ideas <= 200) return HEATMAP_COLORS.LEVEL_4;
    return HEATMAP_COLORS.LEVEL_5;
}

let pub_currentResultsParticipants;
// Update current results
function updateCurrentResults() {
    // OPTIMIZE: reduce parseDate, prefilter
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    pub_currentResultsParticipants = participants;

    // Ideas Chart
    updateIdeasChart(participants);
    
    // Streak Chart
    updateStreakChart(participants);
    
    // If individual view is active, refresh it
    if (currentResultsViewMode === 'individual') {
        renderIndividualResultsSelector();
    }
}

// Update Ideas Chart
function updateIdeasChart(participants) {
    const ctx = document.getElementById('ideasChart').getContext('2d');
    const sortedParticipants = participants.sort((a, b) => b.totalIdeas - a.totalIdeas).filter(p => p.totalIdeas > 0);
    
    if (charts.ideas) {
        charts.ideas.destroy();
    }
    // Register the plugin
    Chart.register(ChartDataLabels);

    charts.ideas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedParticipants.map(p => p.name),
            datasets: [{
                label: 'إجمالي الأفكار',
                data: sortedParticipants.map(p => p.totalIdeas),
                backgroundColor: CHART_BACKGROUND_COLOR,
                // barThickness: 30,    
                barPercentage: 1.0, // Increase bar width (0.8 means 80% of the allocated space per bar)
                categoryPercentage: 0.7, // Reduce to increase spacing between bars (70% of the category width)
                borderColor: CHART_BORDER_COLOR,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 16
                        }
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end', // Position labels at the end of the bars
                    // align: 'end', // Align labels outside the bars
                    offset: 0, // Distance from the end of the bar
                    font: {
                        family: 'Cairo',
                        size: 12
                    },
                    formatter: (value) => Math.round(value) // Display the raw value
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    // barThickness: 30,
                    // barPercentage: 1.0, // Increase bar width (0.8 means 80% of the allocated space per bar)
                    // categoryPercentage: 0.1, // Reduce to increase spacing between bars (70% of the category width)
                    ticks: {
                        display: true,
                        autoSkip: false,
                        font: {
                            family: 'Cairo',
                            size: 15
                        }
                    }
                },
                x: {
                    // barThickness: 30,
                    type: 'logarithmic', // Note: Logarithmic scale may affect label positioning
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// Update Streak Chart
function updateStreakChart(participants) {
    const ctx = document.getElementById('streakChart').getContext('2d');
    const sortedParticipants = participants.sort((a, b) => b.streak - a.streak).filter(p => p.streak > 0);
    
    if (charts.streak) {
        charts.streak.destroy();
    }
    
    charts.streak = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedParticipants.map(p => p.name),
            datasets: [{
                label: 'الأيام المتتالية',
                data: sortedParticipants.map(p => p.streak),
                backgroundColor: CHART_BACKGROUND_COLOR,
                borderColor: CHART_BORDER_COLOR,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 14
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Cairo'
                        },
                        // stepSize: 1,
                        // beginAtZero: true,
                        // precision: 0
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// Update countdown table
function updateCountdown() {
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    const tbody = document.getElementById('countdownBody');
    // console.log(participants);
    // Calculate days remaining for each participant
    let endOfProtectedWeekThisSeason = getSeasonStartDate(currentSeason);
    endOfProtectedWeekThisSeason.setDate(endOfProtectedWeekThisSeason.getDate() + 7);
    let endOfProtectedWeekNextSeason = getSeasonStartDate(nameBySeasonID(getSeasonID(currentSeason)+1));
    endOfProtectedWeekNextSeason.setDate(endOfProtectedWeekNextSeason.getDate() + 7);
    const maxDays = Math.floor((endOfProtectedWeekNextSeason - (new Date())) /(1000*60*60*24) ); 
    const minDays = Math.floor((endOfProtectedWeekThisSeason - (new Date())) /(1000*60*60*24) ); 
    const countdownData = participants.map(p => {
        const daysRemaining = Math.ceil(p.totalIdeas / 10);
        return {
            ...p,
            daysRemaining: Math.min(maxDays, Math.max(daysRemaining, minDays)),
            status: daysRemaining > 5 ? 'safe' : daysRemaining > 3 ? 'warning' : 'danger'
        };
    }).sort((a, b) => a.totalIdeas - b.totalIdeas).filter(p => p.totalIdeas > 0);
    
    tbody.innerHTML = '';
    countdownData.forEach((participant, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${participant.name}</td>
            <td>
            <div class="countdown ${participant.status}">
            <i class="fas fa-clock"></i>
            ${participant.daysRemaining} يوم
            </div>
            </td>
            <td><span class="status-indicator status-${participant.status}">${getStatusText(participant.status)}</span></td>
            <td>${participant.totalIdeas.toFixed(1)}</td>
        `;
    });
}

// Update expelled participants
function updateExpelled() {
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    const content = document.getElementById('expelledContent');
    const dayMs = 24*60*60*1000;
    // Find participants eligible for expulsion
    const expelled = participants.filter(p => 
        (p.totalIdeas <= 0) || (getCurrentWeek() >= 3 && p.totalIdeas < 100)
    ).map(p => ({
        ...p,
        reason: p.totalIdeas <= 0 ? 'وصول الأفكار للصفر' : 'عدم تحقيق 100 فكرة بنهاية الأسبوع الثالث',
        expulsionDate: p.deserveDisqual
    })).filter(p => (new Date()) - (new Date(p.expulsionDate)) <= dayMs*8);
    
    if (expelled.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--success);">
                <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>لا يوجد مشاركون مستحقون للطرد حالياً</h3>
                <p>جميع المشاركين يحافظون على مستوى جيد من القراءة!</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم المشارك</th>
                            <th>تاريخ الاستحقاق</th>
                            <th>سبب الطرد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expelled.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.expulsionDate}</td>
                                <td>${p.reason}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Update records
function updateRecords() {
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    const grid = document.getElementById('recordsGrid');
    
    // Most consistent participants
    const topStreak = participants
        .sort((a, b) => b.maxStreak - a.maxStreak)
        .slice(0, 3);
    
    // Highest total ideas
    let topDuration = [];
    participants.forEach(person => {
        topDuration.push({
            name: person.name,
            minutes: Math.max(...Object.values(person.dailyMinutes))
        });
    });
    topDuration = topDuration.sort((a, b) => b.minutes - a.minutes).slice(0, 3);
    console.log(topDuration);
    const topIdeas = participants
        .sort((a, b) => b.totalIdeas - a.totalIdeas)
        .slice(0, 3);

    grid.innerHTML = `
        <div class="record-card">
            <h3><i class="fas fa-star"></i> أكثر قراءة في يوم واحد</h3>
            ${topDuration.map((record, index) => `
                <div class="record-item">
                    <span><span class="rank-badge ${index < 3 ? 'rank-' + (index + 1) : 'rank-other'}">${index + 1}</span> ${record.name}</span>
                    <span>${formatTime(record.minutes)} ساعة</span>
                </div>
            `).join('')}
        </div>
        
        <div class="record-card">
            <h3><i class="fas fa-fire"></i> أكثر استمرارية</h3>
            ${topStreak.map((record, index) => `
                <div class="record-item">
                    <span><span class="rank-badge ${index < 3 ? 'rank-' + (index + 1) : 'rank-other'}">${index + 1}</span> ${record.name}</span>
                    <span>${record.maxStreak} يوم متتالي</span>
                </div>
            `).join('')}
        </div>
        
        <div class="record-card">
            <h3><i class="fas fa-trophy"></i> أعلى إجمالي أفكار</h3>
            ${topIdeas.map((record, index) => `
                <div class="record-item">
                    <span><span class="rank-badge ${index < 3 ? 'rank-' + (index + 1) : 'rank-other'}">${index + 1}</span> ${record.name}</span>
                    <span>${Math.round(record.totalIdeas)} فكرة</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Update seasonsComparison statistics
function updateseasonsComparisonStats() {
    const seasons = [...new Set(allData.map(d => getSeasonFromDate(parseDate(d.timestamp))))];
    const participants = [...new Set(allData.map(d => emailToName(d.email)))];
    const participantsStats = getParticipantsStats(allData);
    const totalIdeas = participantsStats.reduce((sum, d) => sum + (d.totalIdeas || 0), 0);
    const avgIdeas = totalIdeas / participants.length;
    
    const seasonStats = seasons.map(season => {
        const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === season);
        const participantsStats = getParticipantsStats(seasonData);
        const totalIdeas = participantsStats.reduce((sum, d) => sum + (d.totalIdeas || 0), 0);
        const totalMinutes = seasonData.reduce((sum, d) => sum + (durationToMinutes(d.hours) || 0), 0);
        const countExpelled = participantsStats.reduce((sum, d) => sum + (d.deserveDisqual !== null ? 1 : 0), 0);
        const uniqueParticipants = new Set(seasonData.map(d => emailToName(d.email))).size;
        
        return {
            season,
            totalIdeas,
            totalMinutes,
            countExpelled,
            participants: uniqueParticipants,
            avgMinutes: totalMinutes / uniqueParticipants || 0,
            avgIdeas: totalIdeas / uniqueParticipants || 0
        };
    });

    const statsContainer = document.getElementById('seasonsComparisonStats');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>${participants.length}</h3>
            <p>إجمالي المشاركين</p>
        </div>
        <div class="stat-card">
            <h3>${totalIdeas.toFixed(1)}</h3>
            <p>إجمالي الأفكار المحققة</p>
        </div>
        <div class="stat-card">
            <h3>${avgIdeas.toFixed(1)}</h3>
            <p>متوسط الأفكار لكل مشارك</p>
        </div>
        <div class="stat-card">
            <h3>${seasons.length}</h3>
            <p>عدد المواسم</p>
        </div>
    `;

    // Update seasons comparison chart
    updateSeasonsChart(seasonStats);

    // Updating the table
    const tbody = document.getElementById('seasonsTableBody');
    tbody.innerHTML = "";
    seasonStats.forEach((season, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${season.season}</td>
            <td>${season.participants}</td>
            <td>${season.countExpelled}</td>
        `;
    });
}

// Update seasons comparison chart
function updateSeasonsChart(seasonStats) {
    const ctx = document.getElementById('seasonsChart').getContext('2d');
    if (charts.seasons) {
        charts.seasons.destroy();
    }
    charts.seasons = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: seasonStats.map(s => s.season),
            datasets: [
                {
                    label: 'متوسط دقائق القراءة',
                    data: seasonStats.map(s => s.avgMinutes),
                    backgroundColor: CHART_BACKGROUND_COLOR2,
                    borderColor: CHART_BORDER_COLOR2,
                    borderWidth: 2
                }
                // ,
                // {
                //     label: 'إجمالي الأفكار',
                //     data: seasonStats.map(s => s.totalIdeas),
                //     backgroundColor: 'rgba(112, 33, 141, 0.8)',
                //     borderColor: 'rgba(124, 31, 113, 1)',
                //     borderWidth: 2
                // }
            ]
        },
        options: {
            indexAxis: 'x',
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 14
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// Add loading states
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner"></i>
            <p>جاري تحميل البيانات...</p>
        </div>
    `;
}

// Add error handling
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--danger);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>حدث خطأ في تحميل البيانات</h3>
            <p>${message}</p>
            <button onclick="loadData()" class="nav-btn" style="margin-top: 1rem;">
                <i class="fas fa-sync-alt"></i> إعادة المحاولة
            </button>
        </div>
    `;
}

// Add data validation
function validateData(data) {
    if (!Array.isArray(data)) {
        throw new Error('البيانات المستلمة غير صحيحة');
    }
    
    const requiredFields = ['name', 'season', 'minutePoints'];
    const invalidEntries = data.filter(entry => 
        !requiredFields.every(field => entry.hasOwnProperty(field))
    );
    
    if (invalidEntries.length > 0) {
        console.warn('بعض البيانات غير مكتملة:', invalidEntries);
    }
    
    return data.filter(entry => 
        requiredFields.every(field => entry.hasOwnProperty(field))
    );
}

// Add real-time updates notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--success);
        color: white;
        padding: 1rem 2rem;
        border-radius: 25px;
        box-shadow: var(--shadow);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    notification.innerHTML = '<i class="fas fa-check"></i> تم تحديث البيانات بنجاح';
    
    document.body.appendChild(notification);
    setTimeout(() => notification.style.opacity = '1', 100);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Enhanced mobile responsiveness
function handleMobileView() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Adjust chart heights for mobile
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.height = '250px';
        });
        
        // Make tables horizontally scrollable
        document.querySelectorAll('.table-container').forEach(container => {
            container.style.overflowX = 'auto';
        });
    }
}

// Add event listeners for responsive design
window.addEventListener('resize', handleMobileView);
window.addEventListener('orientationchange', () => {
    setTimeout(handleMobileView, 100);
});

// Initialize mobile view
handleMobileView();

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
        const activeButton = document.querySelector('.nav-btn.active');
        const currentIndex = navButtons.indexOf(activeButton);
        
        let newIndex;
        if (e.key === 'ArrowLeft') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : navButtons.length - 1;
        } else {
            newIndex = currentIndex < navButtons.length - 1 ? currentIndex + 1 : 0;
        }
        
        navButtons[newIndex].click();
        e.preventDefault();
    }
});

// Add accessibility improvements
document.querySelectorAll('.nav-btn').forEach((btn, index) => {
    btn.setAttribute('role', 'tab');
    btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
});

// Add print styles
const printStyles = `
    @media print {
        .nav, .header { display: none !important; }
        .page:not(.active) { display: block !important; }
        .card { break-inside: avoid; margin-bottom: 1rem; }
        .chart-container { height: 300px !important; }
        body { background: white !important; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = printStyles;
document.head.appendChild(styleSheet);