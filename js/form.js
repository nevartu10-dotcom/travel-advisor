// New trip form: country + city/address, arrival and departure dates.
import { searchPlace, reversePlace } from './api/geocode.js';
import { flagEmoji } from './api/country.js';
import { addCard } from './store.js';
import { esc, openSheet, closeSheet } from './ui.js';

const $ = (id) => document.getElementById(id);
let selected = null;
let matches = [];
let onCreated = () => {};

export function initForm({ created }) {
  onCreated = created;
  const sheet = $('form-sheet');
  sheet.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet));
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(sheet);
  });

  for (const id of ['f-country', 'f-place']) {
    $(id).addEventListener('input', () => {
      selected = null;
      matches = [];
      renderMatches();
    });
  }
  $('f-arrival').addEventListener('change', () => {
    $('f-departure').min = $('f-arrival').value;
    if ($('f-departure').value && $('f-departure').value < $('f-arrival').value) $('f-departure').value = $('f-arrival').value;
  });
  $('f-find').addEventListener('click', find);
  $('f-matches').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    selected = matches[Number(btn.dataset.i)];
    renderMatches();
  });
  $('trip-form').addEventListener('submit', submit);
}

export async function openForm(at) {
  const form = $('trip-form');
  form.reset();
  selected = null;
  matches = [];
  setError('');
  renderMatches();
  openSheet($('form-sheet'));

  if (at?.place) {
    const place = at.place;
    $('f-country').value = place.countryName;
    $('f-place').value = place.city || place.name;
    matches = [place];
    selected = place;
    renderMatches();
    $('f-arrival').focus();
  } else if (at) {
    $('f-matches').innerHTML = '<p class="match-note">Looking up the place you tapped…</p>';
    try {
      const place = await reversePlace(at.lat, at.lon);
      if (!place) throw new Error('Nothing found there');
      $('f-country').value = place.countryName;
      $('f-place').value = place.city;
      matches = [place];
      selected = place;
      renderMatches();
      $('f-arrival').focus();
    } catch (err) {
      $('f-matches').innerHTML = `<p class="match-note">Couldn’t name that spot (${esc(err.message)}). Type the country and city instead.</p>`;
      $('f-country').focus();
    }
  } else {
    $('f-country').focus();
  }
}

function setError(msg) {
  $('f-error').textContent = msg;
}

function renderMatches() {
  const box = $('f-matches');
  if (!matches.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML =
    (matches.length > 1 ? '<p class="match-note">Pick the right place:</p>' : '') +
    matches
      .map(
        (m, i) => `<button type="button" class="match" data-i="${i}" aria-pressed="${m === selected}">
          <span aria-hidden="true">${flagEmoji(m.countryCode)}</span>
          <span>${esc(m.city || m.name)}, ${esc(m.countryName)}<small>${esc(m.label)}</small></span>
        </button>`
      )
      .join('');
}

async function find() {
  const country = $('f-country').value.trim();
  const place = $('f-place').value.trim();
  if (!country || !place) {
    setError('Enter a country and a city or address first.');
    return null;
  }
  setError('');
  $('f-matches').innerHTML = '<p class="match-note">Searching…</p>';
  try {
    matches = await searchPlace(country, place);
  } catch (err) {
    matches = [];
    $('f-matches').innerHTML = '';
    setError(`Search failed: ${err.message}. Check your connection and try again.`);
    return null;
  }
  if (!matches.length) {
    $('f-matches').innerHTML = '';
    setError(`No place called “${place}” found in ${country}. Check the spelling or try a nearby city.`);
    return null;
  }
  selected = matches[0];
  renderMatches();
  return selected;
}

async function submit(e) {
  e.preventDefault();
  const arrival = $('f-arrival').value;
  const departure = $('f-departure').value;
  const btn = $('f-submit');
  if (!$('f-country').value.trim() || !$('f-place').value.trim()) return setError('Enter a country and a city or address.');
  if (!arrival || !departure) return setError('Add both arrival and departure dates.');
  if (departure < arrival) return setError('Departure can’t be before arrival.');

  btn.disabled = true;
  try {
    const place = selected || (await find());
    if (!place) return;
    const card = addCard({
      city: place.city || place.name,
      address: $('f-place').value.trim(),
      region: place.region,
      countryName: place.countryName,
      countryCode: place.countryCode,
      lat: Number(place.lat.toFixed(5)),
      lon: Number(place.lon.toFixed(5)),
      label: place.label,
      arrival,
      departure,
    });
    closeSheet($('form-sheet'));
    onCreated(card);
  } finally {
    btn.disabled = false;
  }
}
