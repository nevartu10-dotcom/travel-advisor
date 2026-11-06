// Map tab: trip pins, tap-to-add.
import * as L from '../vendor/leaflet/src/Leaflet.js';
import { flagEmoji } from './api/country.js';
import { isPast, dateRange, tripTitle, esc } from './ui.js';
import { t, countryName } from './i18n.js';

let map;
let pinLayer;
let pendingPopup;
let fittedOnce = false;
let homeMarker = null;
let homeLatLng = null;

export function initMap({ onOpenCard, onAddAt }) {
  map = L.map('map', { zoomControl: false, worldCopyJump: true, tapTolerance: 15 }).setView([50, 15], 3);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  pinLayer = L.featureGroup().addTo(map);

  map.on('click', (e) => {
    const { lat, lng } = e.latlng.wrap();
    const box = document.createElement('div');
    box.className = 'new-here';
    box.innerHTML = `<p>${esc(t('map.planHere'))}</p><button class="btn btn-primary" type="button">${esc(t('map.newCard'))}</button>`;
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
      html: `<div class="pin-label${isPast(c) ? ' past' : ''}">${esc(tripTitle(c))}</div><div class="pin${isPast(c) ? ' past' : ''}"><span>${flagEmoji(c.countryCode)}</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 48],
    });
    L.marker([c.lat, c.lon], {
      icon,
      cardId: c.id,
      title: c.name ? `${c.name}: ${c.city}, ${countryName(c.countryCode, c.countryName)}` : `${c.city}, ${countryName(c.countryCode, c.countryName)}`,
      alt: `${tripTitle(c)}, ${c.city}, ${countryName(c.countryCode, c.countryName)}, ${dateRange(c.arrival, c.departure)}`,
      keyboard: true,
    }).addTo(pinLayer);
  }
  if (!fittedOnce && cards.length) {
    fittedOnce = true;
    fitAll(cards);
  }
}

const HOUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5"/></svg>';

/** House marker at the home address from the profile (removed when there is none). */
export function renderHome(home) {
  if (!map) return;
  homeMarker?.remove();
  homeMarker = null;
  homeLatLng = null;
  if (!home || !Number.isFinite(home.lat) || !Number.isFinite(home.lon) || (!home.lat && !home.lon)) return;
  homeLatLng = [home.lat, home.lon];
  const place = [home.city, countryName(home.countryCode, home.countryName)].filter(Boolean).join(', ');
  homeMarker = L.marker(homeLatLng, {
    icon: L.divIcon({
      className: '',
      html: `<div class="pin-label home-label">${esc(t('map.home'))}</div><div class="home-pin">${HOUSE}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    }),
    title: `${t('map.home')}: ${place}`,
    alt: `${t('map.home')}: ${place}`,
    keyboard: true,
    zIndexOffset: -100, // trips stay on top when they overlap
  })
    .bindPopup(`<div class="new-here"><p>${esc(t('map.home'))}</p><small>${esc(place)}</small></div>`)
    .addTo(map);
}

/** Frame all trips, plus home when it is set. */
export function fitAll(cards) {
  const points = cards.map((c) => [c.lat, c.lon]);
  if (homeLatLng) points.push(homeLatLng);
  if (!points.length) return;
  if (points.length === 1) {
    map.setView(points[0], 6);
    return;
  }
  map.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 8 });
}

let searchMarker;

/** Show a searched place with a pin and a "New trip card" button. */
export function showPlace(place, onAdd) {
  searchMarker?.remove();
  const box = document.createElement('div');
  box.className = 'new-here';
  box.innerHTML = `<p></p><small></small><button class="btn btn-primary" type="button">${esc(t('map.newCard'))}</button>`;
  box.querySelector('p').textContent = place.city || place.name;
  box.querySelector('small').textContent = place.label;
  box.querySelector('button').addEventListener('click', () => {
    map.closePopup();
    searchMarker?.remove();
    onAdd(place);
  });
  searchMarker = L.marker([place.lat, place.lon], {
    icon: L.divIcon({ className: '', html: '<div class="search-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] }),
    keyboard: false,
  }).addTo(map);
  map.setView([place.lat, place.lon], Math.max(map.getZoom(), 13));
  searchMarker.bindPopup(box, { autoPanPaddingTopLeft: [12, 80] }).openPopup();
}

export function focusCard(card) {
  map?.setView([card.lat, card.lon], Math.max(map.getZoom(), 6));
}

export function refreshSize() {
  map?.invalidateSize();
}

