# New Zealand Cinema Operations Dashboard

A desktop-oriented operations dashboard prototype that embeds Kepler.gl as a read-only,
MapLibre-powered map inside a custom React application.

The example uses **deterministic synthetic data** for a fictional New Zealand cinema circuit.
Country and regional values are derived from the site fixtures in `src/data.ts`; no backend,
API token, or external credentials are required.

## Features

- Country-level hexagon performance map → region/city → cinema-site drill-down
- Synchronized map markers, ranked lists, breadcrumb navigation, and camera state
- Commercial KPIs, trends, regional and site rankings, concessions, alerts, and open tasks
- Site film performance and operational health
- NZD, percentage, and week-over-week formatting

## Run locally

From the repository root:

```sh
yarn start:cinema-dashboard
```

Or from this directory:

```sh
touch yarn.lock
yarn
yarn start
```

The app is served at [http://localhost:8086](http://localhost:8086).

## Validate

```sh
yarn test
yarn typecheck
yarn build
```
