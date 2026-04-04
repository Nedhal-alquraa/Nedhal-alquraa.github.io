// ========== SCREENSHOT FUNCTIONALITY ==========
// Add this to the end of design_enhanced.js, or include as a separate <script> after design_enhanced.js

function captureRecords() {
    var btn = document.getElementById('recordsScreenshotBtn');
    var card = btn.closest('.card');

    // Hide the button during capture
    btn.classList.add('capturing');
    btn.style.display = 'none';

    html2canvas(card, {
        scale: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#ffffff',
        useCORS: true,
        logging: false
    }).then(function(canvas) {
        // Create download link
        var link = document.createElement('a');
        link.download = 'الأرقام-القياسية.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore button
        btn.style.display = '';
        btn.classList.remove('capturing');
    }).catch(function(err) {
        console.error('Screenshot error:', err);
        btn.style.display = '';
        btn.classList.remove('capturing');
    });
}