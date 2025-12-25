// Paste this in browser console (F12) to debug visualizer issues

console.log('=== VISUALIZER DEBUG ===');

// Check canvas element
const canvas = document.getElementById('webgl');
console.log('Canvas element:', canvas);
if (canvas) {
  const styles = window.getComputedStyle(canvas);
  console.log('Canvas styles:', {
    display: styles.display,
    position: styles.position,
    zIndex: styles.zIndex,
    opacity: styles.opacity,
    width: styles.width,
    height: styles.height,
    top: styles.top,
    left: styles.left
  });
}

// Check body classes
console.log('Body classes:', document.body.className);

// Check if on visualizer page
const isVisualizerPage = window.location.hash === '#/visualizer';
console.log('Is on visualizer page:', isVisualizerPage);

// Check visualizer page element
const vizPage = document.querySelector('.visualizer-page');
console.log('Visualizer page element:', vizPage);
if (vizPage) {
  console.log('Visualizer page display:', window.getComputedStyle(vizPage).display);
}

// Check Three.js scene
console.log('Check for Three.js errors in console above');

// Force show canvas (temporary fix to test)
console.log('\n=== ATTEMPTING TO FORCE SHOW CANVAS ===');
if (canvas) {
  canvas.style.zIndex = '0';
  canvas.style.opacity = '1';
  console.log('Canvas forced visible');
  console.log('If you see the grid now, the CSS body class is not being set correctly');
}

console.log('\n=== DEBUG COMPLETE ===');
