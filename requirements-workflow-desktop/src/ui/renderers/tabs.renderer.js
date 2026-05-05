function setTabVisibility(tabName, visible) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (!tab) return;
  tab.classList.toggle('hidden', !visible);
}

function activateTabByName(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('show'));
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (tab && !tab.classList.contains('hidden')) {
    tab.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('show');
  }
}

export { setTabVisibility, activateTabByName };
