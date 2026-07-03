const API = "https://ocean-culture.onrender.com/organizations";
const map = L.map('map').setView([-35.5, -71.0], 5);

L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:'© OpenStreetMap contributors'
    }
).addTo(map);


fetch(API)
.then(response => response.json())
.then(data => {

    data.forEach(org => {

        if(org.latitude == null || org.longitude == null)
            return;

        let popup = `
            <b>${org.organization}</b><br><br>

            <b>City:</b> ${org.city}<br>

            <b>Type:</b> ${org.actor_type}<br><br>
        `;

        if(org.website){
            popup += `<a href="${org.website}" target="_blank">
            Website
            </a><br>`;
        }

        if(org.instagram_url){
            popup += `<a href="${org.instagram_url}" target="_blank">
            Instagram
            </a>`;
        }

        L.marker([org.latitude, org.longitude])
            .addTo(map)
            .bindPopup(popup);

    });

})
.catch(error => {
    console.error(error);
});

const container = document.querySelector(".map-container");
const button = document.getElementById("fullscreen-btn");

button.addEventListener("click", async () => {

    if (!document.fullscreenElement) {
        await container.requestFullscreen();
    } else {
        await document.exitFullscreen();
    }

    map.invalidateSize();
});

document.addEventListener("fullscreenchange", () => {
    map.invalidateSize();
});