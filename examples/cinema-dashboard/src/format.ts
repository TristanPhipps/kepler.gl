// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

export const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard'
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-NZ', {maximumFractionDigits: 0}).format(value);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-NZ', {style: 'percent', maximumFractionDigits: 1}).format(value);

export const formatDelta = (value: number) =>
  `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('en-NZ', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value)}`;
