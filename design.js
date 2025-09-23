// Global variables
const CHART_BORDER_COLOR = '#20448eff';
const CHART_BACKGROUND_COLOR = '#152c5b';
const CHART_BORDER_COLOR2 = '#7c3fa3';
const CHART_BACKGROUND_COLOR2 = '#7c3fa3';

let allData = [];
let currentSeason = null;
let charts = {};
let adminWarnings = [];

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

// Update current results
function updateCurrentResults() {
    const seasonData = allData.filter(d => getSeasonFromDate(parseDate(d.timestamp)) === currentSeason);
    const participants = getParticipantsStats(seasonData);
    
    // console.log("Malaki", participants);

    // Ideas Chart
    updateIdeasChart(participants);
    
    // Streak Chart
    updateStreakChart(participants);
}

// Update Ideas Chart
function updateIdeasChart(participants) {
    const ctx = document.getElementById('ideasChart').getContext('2d');
    const sortedParticipants = participants.sort((a, b) => b.totalIdeas - a.totalIdeas).filter(p => p.totalIdeas > 0);
    
    if (charts.ideas) {
        charts.ideas.destroy();
    }
    // createChart(sortedParticipants.map(p => p.name), 'ideasChartMobile', '', sortedParticipants.map(p => p.totalIdeas), '');
    charts.ideas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedParticipants.map(p => p.name),
            datasets: [{
                label: 'إجمالي الأفكار',
                data: sortedParticipants.map(p => p.totalIdeas),
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
                            size: 16
                        }
                    }
                }
            },
            scales: {
                y: {
                    
                    beginAtZero: true,
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
                    type: 'logarithmic',
                    ticks: {
                        
                        font: {
                            family: 'Cairo',
                            
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
    const countdownData = participants.map(p => {
        const daysRemaining = Math.ceil(p.totalIdeas / 10);
        return {
            ...p,
            daysRemaining: Math.min(21, daysRemaining),
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