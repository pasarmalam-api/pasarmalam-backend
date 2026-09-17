# Buyer address selection

Set GOOGLE_MAPS_BROWSER_KEY on the Render backend. This is a browser-visible key, not a server secret. Never reuse a server API key here.

Restrict the key to Maps JavaScript API, Places API (New), and Geocoding API, with these HTTP referrers:

- https://www.pasarmalamapp.com/*
- https://pasarmalamapp.com/*
- https://tomato-germain-74.tiiny.site/*

Use a separate restricted development key for localhost. Do not broaden the production key for testing. Configure quotas and billing alerts in Google Cloud to manage usage.

Checkout loads the buyer profile default first. Google autocomplete is restricted to Malaysia and selected place details are checked for country MY. Current location is reverse-geocoded only after the buyer clicks the location button and grants browser permission. The default address is resolved using Malaysia-restricted geocoding; ambiguous or partial matches require manual selection. Unit/floor is separate while editing and included in the order address.

Selecting an address invalidates the delivery quote and requires recipient-location confirmation. Updating checkout does not change the saved default unless Save as default address is clicked. Manual address and coordinate controls remain available when Google is unavailable.

Deploy the backend config endpoint before updating the buyer site. Live Google requests, billing, and referrer acceptance must be verified after configuration; mocked tests do not prove these work.
