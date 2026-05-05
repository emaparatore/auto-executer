function loadLegacyAppScript() {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-legacy-app="true"]');
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load legacy app.js bridge.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/app.js';
    script.defer = true;
    script.type = 'module';
    script.dataset.legacyApp = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load legacy app.js bridge.')), { once: true });
    document.body.appendChild(script);
  });
}

async function bootstrapApp() {
  window.__appBootstrapBridge = {
    mode: 'legacy-app-js',
    entrypoint: 'src/main.js',
    loadedAt: new Date().toISOString()
  };

  await loadLegacyAppScript();

  return {
    initialized: true,
    bridgeMode: window.__appBootstrapBridge.mode
  };
}

bootstrapApp().catch((error) => {
  const loaderText = document.querySelector('.boot-loader-text');
  if (loaderText) {
    loaderText.textContent = `Errore bootstrap: ${error.message}`;
  }
  throw error;
});

export { bootstrapApp };
