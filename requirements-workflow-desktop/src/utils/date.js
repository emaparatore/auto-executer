function getCurrentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

export { getCurrentDateIso };
