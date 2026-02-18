const output = document.getElementById("output");
const apiBaseInput = document.getElementById("apiBase");

const intentForm = document.getElementById("intentForm");
const documentForm = document.getElementById("documentForm");
const generateForm = document.getElementById("generateForm");
const validateForm = document.getElementById("validateForm");
const publishForm = document.getElementById("publishForm");
const listDocumentsForm = document.getElementById("listDocumentsForm");

const jobIdInput = document.getElementById("jobIdInput");
const docIdInput = document.getElementById("docIdInput");
const getJobBtn = document.getElementById("getJobBtn");
const getVersionsBtn = document.getElementById("getVersionsBtn");
const getPublicationsBtn = document.getElementById("getPublicationsBtn");

function api(path) {
  return `${apiBaseInput.value.replace(/\/$/, "")}${path}`;
}

function print(label, payload) {
  output.textContent = `${label}\n${JSON.stringify(payload, null, 2)}`;
}

async function request(method, path, body) {
  const response = await fetch(api(path), {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(JSON.stringify(json));
  }
  return json;
}

intentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(intentForm);
  try {
    const result = await request("POST", "/v1/intents", {
      title: data.get("title"),
      objective: data.get("objective"),
      audience: data.get("audience"),
      tone: data.get("tone")
    });
    print("Intent created", result);
  } catch (error) {
    print("Error", String(error));
  }
});

documentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(documentForm);
  const intentId = String(data.get("intentId") || "").trim();
  try {
    const result = await request("POST", "/v1/documents", {
      title: data.get("title"),
      ...(intentId ? { intentId } : {})
    });
    docIdInput.value = result.id;
    print("Document created", result);
  } catch (error) {
    print("Error", String(error));
  }
});

generateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(generateForm);
  const documentId = String(data.get("documentId"));
  try {
    const result = await request("POST", `/v1/documents/${documentId}/generate`, {
      mode: data.get("mode"),
      instructions: data.get("instructions")
    });
    if (result?.job?.id) {
      jobIdInput.value = result.job.id;
    }
    print("Generation started", result);
  } catch (error) {
    print("Error", String(error));
  }
});

validateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(validateForm);
  const versionId = String(data.get("versionId"));
  try {
    const result = await request("POST", `/v1/versions/${versionId}/validate`);
    print("Version validated", result);
  } catch (error) {
    print("Error", String(error));
  }
});

publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(publishForm);
  const versionId = String(data.get("versionId"));
  try {
    const result = await request("POST", `/v1/versions/${versionId}/publish`, {
      channel: data.get("channel"),
      variantKey: data.get("variantKey"),
      force: Boolean(data.get("force"))
    });
    print("Version published", result);
  } catch (error) {
    print("Error", String(error));
  }
});

listDocumentsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(listDocumentsForm);
  const search = String(data.get("search") || "").trim();
  const status = String(data.get("status") || "").trim();
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  try {
    const result = await request("GET", `/v1/documents?${query.toString()}`);
    print("Documents", result);
  } catch (error) {
    print("Error", String(error));
  }
});

getJobBtn.addEventListener("click", async () => {
  const jobId = jobIdInput.value.trim();
  if (!jobId) {
    print("Error", "Job ID required");
    return;
  }
  try {
    const result = await request("GET", `/v1/jobs/${jobId}`);
    print("Job", result);
  } catch (error) {
    print("Error", String(error));
  }
});

getVersionsBtn.addEventListener("click", async () => {
  const documentId = docIdInput.value.trim();
  if (!documentId) {
    print("Error", "Document ID required");
    return;
  }
  try {
    const result = await request("GET", `/v1/documents/${documentId}/versions`);
    print("Versions", result);
  } catch (error) {
    print("Error", String(error));
  }
});

getPublicationsBtn.addEventListener("click", async () => {
  const documentId = docIdInput.value.trim();
  if (!documentId) {
    print("Error", "Document ID required");
    return;
  }
  try {
    const result = await request("GET", `/v1/documents/${documentId}/publications`);
    print("Publications", result);
  } catch (error) {
    print("Error", String(error));
  }
});

