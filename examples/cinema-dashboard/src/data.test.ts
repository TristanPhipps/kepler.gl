import assert from 'node:assert/strict';
import {cinemaSites, countrySummary, regions, summarizeSites} from './data.ts';

assert.equal(regions.reduce((sum, region) => sum + region.gross, 0), countrySummary.gross);
assert.equal(regions.reduce((sum, region) => sum + region.admissions, 0), countrySummary.admissions);
assert.equal(
  regions.reduce((sum, region) => sum + region.concessionRevenue, 0),
  countrySummary.concessionRevenue
);
assert.equal(countrySummary.siteCount, cinemaSites.length);
assert.deepEqual(summarizeSites(cinemaSites), countrySummary);
assert.ok(countrySummary.averageSpend > countrySummary.averageTicket);
assert.ok(regions.every(region => region.sites.every(site => site.regionId === region.id)));

console.info('Cinema dashboard aggregation tests passed');
