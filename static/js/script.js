// Global variables
let currentTab = 'single';
let downloads = [];
let progressInterval = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    refreshDownloads();
    setInterval(refreshDownloads, 5000); // Refresh downloads every 5 seconds
});

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    currentTab = tabName;

    if (tabName === 'downloads') {
        refreshDownloads();
    }
}

        // Single download
        async function downloadSingle() {
            const url = document.getElementById('single-url').value.trim();
            const statusDiv = document.getElementById('single-status');
            const spinner = document.getElementById('single-spinner');
            const buttonText = document.getElementById('single-text');
            const button = document.querySelector('#single-tab .btn');
            const progressContainer = document.getElementById('progress-container');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');

            if (!url) {
                showStatus(statusDiv, 'Please enter a valid URL', 'error');
                return;
            }

            // Loading state
            spinner.style.display = 'block';
            buttonText.textContent = 'Downloading...';
            button.disabled = true;
            progressContainer.style.display = 'block';
            progressFill.style.width = '0%';
            progressText.textContent = 'Starting download...';

            try {
                const response = await fetch('/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                if (result.status === 'started') {
                    // Start progress monitoring
                    progressInterval = setInterval(async () => {
                        try {
                            const progressResponse = await fetch('/progress');
                            const progressData = await progressResponse.json();

                            progressFill.style.width = progressData.progress + '%';
                            progressText.textContent = progressData.status;

                            if (progressData.progress >= 100) {
                                clearInterval(progressInterval);
                                progressInterval = null;
                                showStatus(statusDiv, '✅ Download completed successfully!', 'success');
                                document.getElementById('single-url').value = '';
                                refreshDownloads();
                            }
                        } catch (error) {
                            console.error('Progress check failed:', error);
                        }
                    }, 1000);

                    // Stop monitoring after 5 minutes
                    setTimeout(() => {
                        if (progressInterval) {
                            clearInterval(progressInterval);
                            progressInterval = null;
                            showStatus(statusDiv, '⚠️ Download may still be in progress. Check downloads tab.', 'warning');
                        }
                    }, 300000);

                } else {
                    showStatus(statusDiv, `❌ ${result.message}`, 'error');
                    progressContainer.style.display = 'none';
                }
            } catch (error) {
                showStatus(statusDiv, `❌ Network error: ${error.message}`, 'error');
                progressContainer.style.display = 'none';
            } finally {
                spinner.style.display = 'none';
                buttonText.textContent = 'Download';
                button.disabled = false;
            }
        }

        // Bulk download
        async function downloadBulk() {
            const urlsText = document.getElementById('bulk-urls').value.trim();
            const statusDiv = document.getElementById('bulk-status');
            const spinner = document.getElementById('bulk-spinner');
            const buttonText = document.getElementById('bulk-text');
            const button = document.querySelector('#bulk-tab .btn');
            
            if (!urlsText) {
                showStatus(statusDiv, 'Please enter at least one URL', 'error');
                return;
            }
            
            const urls = urlsText.split('\n').filter(url => url.trim());
            
            if (urls.length === 0) {
                showStatus(statusDiv, 'Please enter valid URLs', 'error');
                return;
            }
            
            // Loading state
            spinner.style.display = 'block';
            buttonText.textContent = `Processing ${urls.length} URLs...`;
            button.disabled = true;
            
            try {
                const response = await fetch('/bulk-download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    let message = `✅ ${result.message}\n\n`;
                    result.results.forEach((res, index) => {
                        const icon = res.status === 'success' ? '✅' : '❌';
                        message += `${icon} URL ${index + 1}: ${res.message}\n`;
                    });
                    
                    showStatus(statusDiv, message, 'success');
                    document.getElementById('bulk-urls').value = '';
                } else {
                    showStatus(statusDiv, `❌ ${result.message}`, 'error');
                }
            } catch (error) {
                showStatus(statusDiv, `❌ Network error: ${error.message}`, 'error');
            } finally {
                spinner.style.display = 'none';
                buttonText.textContent = 'Download All';
                button.disabled = false;
            }
        }

        // Refresh downloads
        async function refreshDownloads() {
            const downloadsDiv = document.getElementById('downloads-list');
            
            try {
                const response = await fetch('/downloads');
                const result = await response.json();
                
                if (result.items && result.items.length > 0) {
                    let html = '<div class="downloads-grid">';
                    
                    result.items.forEach(item => {
                        const isFile = item.type === 'file';
                        const icon = isFile ? '📄' : '📁';
                        const size = isFile ? formatFileSize(item.size) : `${item.file_count} files`;
                        
                        html += `
                            <div class="download-item">
                                <h3 class="download-title">${item.name}</h3>
                                <p class="download-meta">${icon} ${size}</p>
                                <div class="download-actions">
                                    <button class="btn btn-small" onclick="${isFile ? `downloadFile('${item.name}')` : `downloadFolder('${item.name}')`}">
                                        ${isFile ? '⬇️ Download' : '📦 Download ZIP'}
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    downloadsDiv.innerHTML = html;
                } else {
                    downloadsDiv.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📁</div>
                            <p>No downloads yet. Start downloading some content!</p>
                        </div>
                    `;
                }
            } catch (error) {
                downloadsDiv.innerHTML = `<div class="status status-error">Error loading downloads: ${error.message}</div>`;
            }
        }

        // Download handlers
        function downloadFile(filename) {
            window.open(`/download-file/${encodeURIComponent(filename)}`, '_blank');
        }

        function downloadFolder(foldername) {
            window.open(`/download-folder/${encodeURIComponent(foldername)}`, '_blank');
        }

        // Clear downloads
        async function clearDownloads() {
            if (!confirm('Are you sure you want to clear all downloads?')) return;
            
            try {
                const response = await fetch('/clear-downloads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    alert('✅ All downloads cleared successfully!');
                    refreshDownloads();
                } else {
                    alert(`❌ Error: ${result.message}`);
                }
            } catch (error) {
                alert(`❌ Network error: ${error.message}`);
            }
        }

        // Utility functions
        function showStatus(container, message, type, append = false) {
            const statusHtml = `<div class="status status-${type}">${message.replace(/\n/g, '<br>')}</div>`;
            
            if (append) {
                container.innerHTML += statusHtml;
            } else {
                container.innerHTML = statusHtml;
            }
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Event listeners
        document.getElementById('single-url').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') downloadSingle();
        });

        // Platform detection
        document.getElementById('single-url').addEventListener('input', function(e) {
            const url = e.target.value.toLowerCase();
            const platforms = {
                'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
                'instagram.com': 'Instagram', 'tiktok.com': 'TikTok',
                'twitter.com': 'Twitter', 'x.com': 'Twitter',
                'facebook.com': 'Facebook', 'reddit.com': 'Reddit'
            };

            const platform = Object.keys(platforms).find(key => url.includes(key));

            if (platform && url.trim()) {
                const statusDiv = document.getElementById('single-status');
                showStatus(statusDiv, `🌐 Detected: ${platforms[platform]}`, 'loading');
            }
        });

        // Get formats function
        async function getFormats() {
            const url = document.getElementById('single-url').value.trim();
            const statusDiv = document.getElementById('single-status');
            const qualitySelect = document.getElementById('quality-select');

            if (!url) {
                showStatus(statusDiv, 'Please enter a URL first', 'error');
                return;
            }

            // Clear previous options
            qualitySelect.innerHTML = '<option value="">Loading formats...</option>';

            try {
                const response = await fetch('/get-formats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Clear and add default option
                    qualitySelect.innerHTML = '<option value="">Auto (Best Quality)</option>';

                    // Add format options
                    result.formats.forEach(format => {
                        const option = document.createElement('option');
                        option.value = format.format_id;
                        option.textContent = `${format.format_note || 'Unknown'} - ${format.ext} - ${format.resolution || 'N/A'} (${formatFileSize(format.filesize)})`;
                        qualitySelect.appendChild(option);
                    });

                    showStatus(statusDiv, `✅ Found ${result.formats.length} formats for "${result.title}" by ${result.uploader}`, 'success');
                } else {
                    qualitySelect.innerHTML = '<option value="">Auto (Best Quality)</option>';
                    showStatus(statusDiv, `❌ ${result.message}`, 'error');
                }
            } catch (error) {
                qualitySelect.innerHTML = '<option value="">Auto (Best Quality)</option>';
                showStatus(statusDiv, `❌ Network error: ${error.message}`, 'error');
            }
        }

        // Initialize particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 10 + 's';
                particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
                particlesContainer.appendChild(particle);
            }
        }


