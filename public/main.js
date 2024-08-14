const apiUrl = "http://localhost:3000";

async function getWeatherSummary() {
  try {
    const response = await fetch(`${apiUrl}/weather_summary`);
    const data = await response.json();
    console.log("Weather Summary Data:", data); // Debugging line

    const tbody = document.getElementById("weather-summary");
    tbody.innerHTML = "";

    data.forEach((summary) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${summary.city}</td>
                <td>${new Date(summary.date).toLocaleDateString()}</td>
                <td>${summary.avg_temp.toFixed(2)}</td>
                <td>${summary.max_temp.toFixed(2)}</td>
                <td>${summary.min_temp.toFixed(2)}</td>
                <td>${summary.dominant_condition}</td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error fetching weather summary:", error); // Improved error logging
  }
}

// Call the function to load the data when the page loads
window.onload = getWeatherSummary;
