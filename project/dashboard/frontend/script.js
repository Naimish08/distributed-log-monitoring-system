async function loadLogs() {
    const res = await fetch("http://localhost:8000/logs");
    const data = await res.json();
    document.getElementById("output").innerText =
        JSON.stringify(data, null, 2);
}

async function loadErrors() {
    const res = await fetch("http://localhost:8000/errors");
    const data = await res.json();
    document.getElementById("output").innerText =
        JSON.stringify(data, null, 2);
}
