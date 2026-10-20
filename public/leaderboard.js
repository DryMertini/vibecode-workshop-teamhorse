const $ = id => document.getElementById(id);

async function loadStats() {
  try {
    const response = await fetch('/api/board');
    if (!response.ok) throw new Error();
    const { upcoming, past } = await response.json();
    const runs = [...upcoming, ...past];
    const km = runs.reduce((sum, run) => sum + (Number(run.distance) || 0), 0);
    $('stat-runs').textContent = runs.length;
    $('stat-upcoming').textContent = upcoming.length;
    $('stat-joins').textContent = runs.reduce((sum, run) => sum + run.count, 0);
    $('stat-km').textContent = Math.round(km * 10) / 10;
  } catch {
    $('stats-message').textContent = 'Club stats are unavailable right now. Try again shortly.';
  }
}

loadStats();
