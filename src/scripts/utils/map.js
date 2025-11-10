import L, { Icon, icon, marker, popup } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export default class Map {
    constructor() {
        this.instance = null;
    }

    initMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Elemen #${containerId} tidak ditemukan`);

        if (this.instance) {
            this.instance.remove();
        }

        this.instance = L.map(containerId, {
            center: options.center || [0, 0],
            zoom: options.zoom || 5,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(this.instance);

        return this.instance;
    }

    createIcon(options = {}) {
        return icon({
            ...Icon.Default.prototype.options,
            iconRetinaUrl: markerIcon2x,
            iconUrl: markerIcon,
            shadowUrl: markerShadow,
            ...options,
        });
    }

    addMarker(coordinates, markerOptions = {}, popupOptions = null) {
        const newMarker = marker(coordinates, {
            icon: this.createIcon(),
            ...markerOptions,
        });

        if (popupOptions && popupOptions.content) {
            const newPopup = popup(popupOptions);
            newMarker.bindPopup(newPopup);
        }

        newMarker.addTo(this.instance);
        return newMarker;
    }

    fitToMarkers(markers = []) {
        if (!this.instance || markers.length === 0) return;
        const group = L.featureGroup(markers);
        this.instance.fitBounds(group.getBounds().pad(0.2));
    }

    removeAllMarkers(markers = []) {
        if (!this.instance) return;
        markers.forEach((m) => this.instance.removeLayer(m));
    }
}
