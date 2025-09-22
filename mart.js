function createChart(data, chartId, mobileId, valueKey, unit) {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    const minValue = Math.min(...data.map(item => item[valueKey]));
    
    // Desktop Chart
    const chartContainer = document.getElementById(chartId);
    chartContainer.innerHTML = data.map(item => {
        const height = (item[valueKey] / maxValue) * 280;
        
        return `
            <div class="chart-bar">
                <div class="bar" style="height: ${height}px">
                    <div class="bar-value">${item[valueKey]}</div>
                </div>
                <div class="bar-label">${item.name}<br>${item[valueKey]}</div>
            </div>
        `;
    }).join('');

    // Mobile View - Calculate minimum width needed for shortest name
    const mobileContainer = document.getElementById(mobileId);
    
    // Find the minimum width needed for the person with lowest score
    const personWithMinValue = data.find(item => item[valueKey] === minValue);
    const minRequiredWidth = personWithMinValue.name.length * 10 + 80; // 10px per character + 80px for padding and score
    
    mobileContainer.innerHTML = data.map(item => {
        // Calculate proportional width based on value
        const proportionalWidth = (item[valueKey] / maxValue) * 100;
        
        // Scale the width: shortest gets minRequiredWidth, longest gets 100%
        const scaledWidth = ((proportionalWidth / 100) * (100 - (minRequiredWidth / 3))) + (minRequiredWidth / 3);
        
        const rankClass = getRankCardClass(item.rank);
        
        return `
            <div class="leader-card ${rankClass}" style="width: ${scaledWidth}%;">
                <div class="card-content">
                    <div class="card-name">${item.name}</div>
                    <div class="card-score">${item[valueKey]}</div>
                </div>
            </div>
        `;
    }).join('');
}
