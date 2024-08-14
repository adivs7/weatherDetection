const express = require("express"); // Ensure express is imported
const axios = require("axios");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");

const app = express(); // Initialize the express application
const PORT = 3000;

const API_KEY = "your_openweathermap_api_key";
const CITIES = [
  "Delhi",
  "Mumbai",
  "Chennai",
  "Bangalore",
  "Kolkata",
  "Hyderabad",
];

// MongoDB schema
const weatherSchema = new mongoose.Schema({
  city: String,
  date: { type: Date, default: Date.now },
  temp: Number,
  feels_like: Number,
  condition: String,
});

const Weather = mongoose.model("Weather", weatherSchema);

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/weatherdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Fetch weather data for each city
async function fetchWeatherData() {
  for (const city of CITIES) {
    const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      const temp = data.main.temp - 273.15; // Convert from Kelvin to Celsius
      const feels_like = data.main.feels_like - 273.15;
      const condition = data.weather[0].main;

      const weather = new Weather({ city, temp, feels_like, condition });
      await weather.save();

      console.log(`Saved weather data for ${city}`);
    } catch (error) {
      console.error(
        `Error fetching weather data for ${city}: ${error.message}`
      );
    }
  }
}

// Schedule the fetchWeatherData function to run every 5 minutes
cron.schedule("*/5 * * * *", fetchWeatherData);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Route to get weather summary
app.get("/weather_summary", async (req, res) => {
  try {
    const summaries = await Weather.aggregate([
      {
        $group: {
          _id: {
            city: "$city",
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
          },
          avg_temp: { $avg: "$temp" },
          max_temp: { $max: "$temp" },
          min_temp: { $min: "$temp" },
          conditions: { $push: "$condition" },
        },
      },
      {
        $addFields: {
          dominant_condition: {
            $arrayElemAt: [
              {
                $slice: [
                  {
                    $map: {
                      input: { $setUnion: ["$conditions"] },
                      as: "condition",
                      in: {
                        condition: "$$condition",
                        count: {
                          $size: {
                            $filter: {
                              input: "$conditions",
                              as: "cond",
                              cond: { $eq: ["$$cond", "$$condition"] },
                            },
                          },
                        },
                      },
                    },
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          city: "$_id.city",
          date: "$_id.date",
          avg_temp: 1,
          max_temp: 1,
          min_temp: 1,
          dominant_condition: "$dominant_condition.condition",
        },
      },
    ]);

    console.log("Weather Summaries:", summaries); // Debugging line

    res.json(summaries);
  } catch (error) {
    console.error("Error fetching weather summary:", error); // Improved error logging
    res.status(500).json({ error: "Failed to fetch weather summary" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
