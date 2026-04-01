const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'index.html',
  'projects.html',
  'blog.html',
  'chat.html',
  'entertainment.html',
  'admin.html'
];

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Insert dark icon toggle
  const toggleBtnHtml = `<button id="themeToggle" class="btn-theme-toggle" aria-label="Toggle Theme" style="background:transparent; border:none; color: var(--text-primary, #333); font-size:1.2rem; cursor:pointer;"><i class="fas fa-moon"></i></button>`;

  if (!content.includes('id="themeToggle"')) {
    if (content.includes('<button class="btn-login"')) {
      content = content.replace('<button class="btn-login"', toggleBtnHtml + '\n                <button class="btn-login"');
    } else if (content.includes('<div class="auth-buttons')) {
       let strToReplace = '<div class="auth-buttons">';
       if(content.includes('<div class="auth-buttons d-flex align-items-center gap-2">')) strToReplace = '<div class="auth-buttons d-flex align-items-center gap-2">';
       content = content.replace(strToReplace, strToReplace + '\n                ' + toggleBtnHtml);
    }
  }

  // Update theme.css to have an ID so we can toggle it easily
  content = content.replace('<link rel="stylesheet" href="./theme.css">', '<link id="darkThemeStyle" rel="stylesheet" href="./theme.css">');
  content = content.replace('<link rel="stylesheet" href="theme.css">', '<link id="darkThemeStyle" rel="stylesheet" href="./theme.css">');

  // Inject early script for preventing FOUC (flash of unstyled content)
  const themeInitScript = `
    <script>
        // Apply theme early
        let savedTheme = localStorage.getItem('theme') || 'dark'; // DEFAULT IS DARK MODE based on user previous state
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            // We need to disable the theme.css dynamically if it's light mode
            // We use DOMContentLoaded because the link tag is below this script
            document.addEventListener("DOMContentLoaded", () => {
                const darkStyle = document.getElementById("darkThemeStyle");
                if(darkStyle) darkStyle.disabled = true;
                
                // Update icon
                const toggleBtn = document.getElementById("themeToggle");
                if(toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            });
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    </script>
`;

  if (!content.includes("localStorage.getItem('theme')")) {
    content = content.replace('</head>', themeInitScript + '</head>');
  }

  // Simple AOS additions
  content = content.replace(/<h2 class="section-title">/g, '<h2 class="section-title" data-aos="fade-up">');
  
  fs.writeFileSync(file, content);
  console.log(`Updated HTML structure for ${file}`);
});
