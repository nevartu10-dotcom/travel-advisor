// Map tab: trip pins, tap-to-add.
import * as L from '../vendor/leaflet/src/Leaflet.js';
import { flagEmoji } from './api/country.js';
import { isPast, dateRange } from './ui.js';

let map;
let pinLayer;
let pendingPopup;
let fittedOnce = false;

export function initMap({ onOpenCard, onAddAt }) {
  map = L.map('map', { zoomControl: true, worldCopyJump: true, tapTolerance: 15 }).setView([50, 15], 3);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  pinLayer = L.featureGroup().addTo(map);

  map.on('click', (e) => {
    const { lat, lng } = e.latlng.wrap();
    const box = document.createElement('div');
    box.className = 'new-here';
    box.innerHTML = `<p>Plan a trip here?</p><button class="btn btn-primary" type="button">New trip card</button>`;
    box.querySelector('button').addEventListener('click', () => {
      map.closePopup();
      onAddAt(lat, lng);
    });
    pendingPopup = L.popup({ closeButton: true, autoPan: true }).setLatLng(e.latlng).setContent(box).openOn(map);
  });

  pinLayer.on('click', (e) => onOpenCard(e.layer.options.cardId));
  return map;
}

export function renderPins(cards) {
  if (!map) return;
  pinLayer.clearLayers();
  for (const c of cards) {
    const icon = L.divIcon({
      className: '',
      html: `<div class="pin${isPast(c) ? ' past' : ''}"><span>${flagEmoji(c.countryCode)}</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 48],
    });
    L.marker([c.lat, c.lon], {
      icon,
      cardId: c.id,
      title: `${c.city}, ${c.countryName}`,
      alt: `${c.city}, ${c.countryName}, ${dateRange(c.arrival, c.departure)}`,
      keyboard: true,
    }).addTo(pinLayer);
  }
  if (!fittedOnce && cards.length) {
    fittedOnce = true;
    fitAll(cards);
  }
}

export function fitAll(cards) {
  if (!cards.length) return;
  const b = L.latLngBounds(cards.map((c) => [c.lat, c.lon]));
  map.fitBounds(b.pad(0.3), { maxZoom: 8 });
}

export function focusCard(card) {
  map?.setView([card.lat, card.lon], Math.max(map.getZoom(), 6));
}

export function refreshSize() {
  map?.invalidateSize();
}

