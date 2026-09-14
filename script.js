console.log("JavaScript Connected!");
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const CITY_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const weatherNames = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Foggy", "🌫️"],
    51: ["Drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    71: ["Snow", "🌨️"],
    73: ["Snow", "❄️"],
    75: ["Heavy snow", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Heavy showers", "🌧️"],
    95: ["Thunderstorm", "⛈️"]
};

const $ = (id) => document.getElementById(id);

function getWeatherInfo(code) {
    return weatherNames[code] || ["Unknown", "🌡️"];
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(value) {
    return new Date(value).toLocaleDateString([], {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getDayName(value) {
    return new Date(value).toLocaleDateString([], {
        weekday: "short"
    });
}

async function findCity(cityName) {

    const url =
        CITY_URL +
        "?name=" + encodeURIComponent(cityName) +
        "&count=1&language=en&format=json";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not search for the city.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found.");
    }

    return data.results[0];
}

async function getWeather(latitude, longitude) {

    const url =
        WEATHER_URL +
        "?latitude=" + latitude +
        "&longitude=" + longitude +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,pressure_msl,cloud_cover,weather_code" +
        "&hourly=temperature_2m,weather_code" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
        "&timezone=auto";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Weather data unavailable.");
    }

    return await response.json();
}

async function getAirQuality(latitude, longitude) {

    const url =
        AIR_URL +
        "?latitude=" + latitude +
        "&longitude=" + longitude +
        "&current=european_aqi,pm10,pm2_5" +
        "&timezone=auto";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Air quality unavailable.");
    }

    return await response.json();
}

function displayCurrentWeather(weather, place) {

    const current = weather.current;
    const info = getWeatherInfo(current.weather_code);

    $("city").textContent =
        place.name + ", " + place.country_code;

    $("date").textContent =
        formatDate(current.time);

    $("temp").textContent =
        Math.round(current.temperature_2m);

    $("condition").textContent =
        info[0];

    $("feels").textContent =
        Math.round(current.apparent_temperature);

    $("weatherSymbol").textContent =
        info[1];

    $("humidity").textContent =
        current.relative_humidity_2m;

    $("wind").textContent =
        Math.round(current.wind_speed_10m);

    $("pressure").textContent =
        Math.round(current.pressure_msl);

    $("cloud").textContent =
        current.cloud_cover;

    $("sunrise").textContent =
        formatTime(weather.daily.sunrise[0]);

    $("sunset").textContent =
        formatTime(weather.daily.sunset[0]);
}

function displayHourly(weather) {

    const box = $("hourly");

    const times = weather.hourly.time;
    const temps = weather.hourly.temperature_2m;
    const codes = weather.hourly.weather_code;

    let index = times.findIndex(
        time => time >= weather.current.time
    );

    if (index === -1) {
        index = 0;
    }

    let html = "";

    for (
        let i = index;
        i < index + 5 && i < times.length;
        i++
    ) {

        const info = getWeatherInfo(codes[i]);

        html += `
            <div class="hour-card">
                <p>${i === index ? "Now" : formatTime(times[i])}</p>

                <div class="icon">
                    ${info[1]}
                </div>

                <strong>
                    ${Math.round(temps[i])}°
                </strong>

                <p>
                    ${info[0]}
                </p>
            </div>
        `;
    }

    box.innerHTML = html;
}

function displayDaily(weather) {

    const box = $("daily");
    const daily = weather.daily;

    let html = "";

    for (let i = 0; i < 5; i++) {

        const info =
            getWeatherInfo(daily.weather_code[i]);

        const day =
            i === 0
                ? "Today"
                : getDayName(daily.time[i]);

        html += `
            <div class="day-row">

                <strong>${day}</strong>

                <span class="icon">
                    ${info[1]}
                </span>

                <span>
                    ${info[0]}
                </span>

                <b>
                    ${Math.round(daily.temperature_2m_max[i])}°
                    /
                    ${Math.round(daily.temperature_2m_min[i])}°
                </b>

            </div>
        `;
    }

    box.innerHTML = html;
}

function displayAirQuality(air) {

    $("aqi").textContent =
        air.current.european_aqi ?? "--";

    $("pm25").textContent =
        air.current.pm2_5 ?? "--";

    $("pm10").textContent =
        air.current.pm10 ?? "--";
}

async function loadWeather(city) {

    const button =
        document.querySelector("#searchForm button");

    try {

        button.disabled = true;
        button.textContent = "Loading...";

        $("city").textContent = "Loading...";
        $("condition").textContent =
            "Please wait...";

        const place =
            await findCity(city);

        const weather =
            await getWeather(
                place.latitude,
                place.longitude
            );

        displayCurrentWeather(
            weather,
            place
        );

        displayHourly(weather);

        displayDaily(weather);

        try {

            const air =
                await getAirQuality(
                    place.latitude,
                    place.longitude
                );

            displayAirQuality(air);

        } catch (error) {

            $("aqi").textContent = "--";
            $("pm25").textContent = "--";
            $("pm10").textContent = "--";
        }

    } catch (error) {

        $("city").textContent = "Error";
        $("condition").textContent =
            error.message;

    } finally {

        button.disabled = false;
        button.textContent = "Search";
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const form = $("searchForm");
    const input = $("cityInput");

    form.addEventListener("submit", (event) => {

        event.preventDefault();

        const city = input.value.trim();

        if (city !== "") {
            loadWeather(city);
        }
    });

});