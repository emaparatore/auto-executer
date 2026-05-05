async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `Request failed (${response.status})`);
  }
  return response.json();
}

function getJson(url, options = {}) {
  return requestJson(url, { ...options, method: options.method || 'GET' });
}

function postJson(url, body, options = {}) {
  return requestJson(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: body == null ? undefined : JSON.stringify(body)
  });
}

function patchJson(url, body, options = {}) {
  return requestJson(url, {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: body == null ? undefined : JSON.stringify(body)
  });
}

function deleteJson(url, options = {}) {
  return requestJson(url, { ...options, method: 'DELETE' });
}

export { requestJson, getJson, postJson, patchJson, deleteJson };
