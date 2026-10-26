// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {applyMiddleware, combineReducers, compose, createStore} from 'redux';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

import KeplerGl from '@kepler.gl/components';
import {
  addDataToMap,
  layerConfigChange,
  layerToggleVisibility,
  updateMap,
  wrapTo
} from '@kepler.gl/actions';
import {processRowObject} from '@kepler.gl/processors';
import keplerGlReducer, {enhanceReduxMiddleware} from '@kepler.gl/reducers';
import {initApplicationConfig} from '@kepler.gl/utils';

import {
  CinemaSite,
  HealthStatus,
  PerformanceSummary,
  RegionSummary,
  cinemaSites,
  countrySummary,
  getRegion,
  getSite,
  regions
} from './data';
import {formatCurrency, formatDelta, formatNumber, formatPercent} from './format';

initApplicationConfig({enableAnnotations: false});

const MAP_ID = 'cinema-operations';
const REGION_LAYER_ID = 'region-summary-points';
const SITE_LAYER_ID = 'cinema-site-points';
const MAP_HEIGHT = 430;

type ViewLevel = 'country' | 'region' | 'site';
type ClickedInfo = {
  picked?: boolean;
  index?: number;
  layer?: {id?: string};
  object?: {points?: Array<{index: number}>};
} | null;
type KeplerRootState = {
  keplerGl: Record<
    string,
    {
      visState: {
        clicked: ClickedInfo;
        layers: Array<{
          id: string;
          config: {visConfig: Record<string, unknown>};
        }>;
      };
    }
  >;
};

const reducers = combineReducers({
  keplerGl: keplerGlReducer.initialState({
    mapStyle: {styleType: 'dark-matter'},
    uiState: {readOnly: true, currentModal: null}
  })
});
const middleware = enhanceReduxMiddleware([]);
const enhancers = applyMiddleware(...middleware);
const composeEnhancers = (window as Window & {__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose})
  .__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducers, {}, composeEnhancers(enhancers));

const regionRows = regions.map(region => ({
  entityId: region.id,
  label: region.name,
  detail: `${region.siteCount} sites`,
  latitude: region.latitude,
  longitude: region.longitude,
  gross: region.gross,
  occupancy: region.occupancy
}));
const siteRows = cinemaSites.map(siteItem => ({
  entityId: siteItem.id,
  label: siteItem.name,
  detail: `${siteItem.screens} screens`,
  regionId: siteItem.regionId,
  latitude: siteItem.latitude,
  longitude: siteItem.longitude,
  gross: siteItem.gross,
  occupancy: siteItem.occupancy
}));

const mapConfig = {
  version: 'v1' as const,
  config: {
    visState: {
      layers: [
        {
          id: REGION_LAYER_ID,
          type: 'hexagon',
          config: {
            dataId: 'cinema-regions',
            label: 'Regional performance hexagons',
            color: [246, 181, 68] as [number, number, number],
            columns: {lat: 'latitude', lng: 'longitude'},
            isVisible: true,
            visConfig: {
              opacity: 0.86,
              worldUnitSize: 65,
              resolution: 5,
              colorRange: {
                name: 'Cinema gold',
                type: 'sequential',
                category: 'Custom',
                colors: ['#3A2030', '#713343', '#B6514E', '#E9854E', '#F6B544', '#FFE7A0']
              },
              coverage: 0.88,
              sizeRange: [0, 500],
              percentile: [0, 100],
              elevationPercentile: [0, 100],
              elevationScale: 10,
              colorAggregation: 'average',
              sizeAggregation: 'average',
              enable3d: true
            }
          },
          visualChannels: {
            colorField: {name: 'gross', type: 'integer'},
            colorScale: 'quantile',
            sizeField: {name: 'gross', type: 'integer'},
            sizeScale: 'linear'
          }
        },
        {
          id: SITE_LAYER_ID,
          type: 'hexagon',
          config: {
            dataId: 'cinema-sites',
            label: 'Cinema site hexagons',
            color: [239, 77, 113] as [number, number, number],
            columns: {lat: 'latitude', lng: 'longitude'},
            isVisible: false,
            visConfig: {
              opacity: 0.88,
              worldUnitSize: 2.5,
              resolution: 8,
              colorRange: {
                name: 'Cinema rose',
                type: 'sequential',
                category: 'Custom',
                colors: ['#351725', '#66213B', '#9C2D50', '#C83B60', '#EF4D71', '#FFADBF']
              },
              coverage: 0.86,
              sizeRange: [0, 500],
              percentile: [0, 100],
              elevationPercentile: [0, 100],
              elevationScale: 8,
              colorAggregation: 'average',
              sizeAggregation: 'average',
              enable3d: true
            }
          },
          visualChannels: {
            colorField: {name: 'gross', type: 'integer'},
            colorScale: 'quantile',
            sizeField: {name: 'gross', type: 'integer'},
            sizeScale: 'linear'
          }
        }
      ],
      interactionConfig: {
        tooltip: {
          fieldsToShow: {
            'cinema-regions': [
              {name: 'gross', format: null}
            ],
            'cinema-sites': [
              {name: 'gross', format: null},
              {name: 'occupancy', format: null}
            ]
          },
          enabled: true,
          compareMode: false,
          compareType: 'absolute' as const
        }
      },
      layerBlending: 'screen'
    },
    mapState: {
      latitude: -41.2,
      longitude: 172.7,
      zoom: 4.35,
      pitch: 35,
      bearing: 0
    },
    mapStyle: {styleType: 'dark-matter'}
  }
};

const mapDatasets = [
  {
    info: {label: 'Regional performance', id: 'cinema-regions'},
    data: processRowObject(regionRows)!
  },
  {
    info: {label: 'Cinema sites', id: 'cinema-sites'},
    data: processRowObject(siteRows)!
  }
];

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0]?.contentRect.width ?? 800));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return {ref, width};
}

function Sparkline({values}: {values: number[]}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 34 - ((value - min) / Math.max(max - min, 1)) * 28;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 100 40" aria-hidden="true">
      <polyline points={`0,40 ${points} 100,40`} className="spark-fill" />
      <polyline points={points} className="spark-line" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  detail,
  trend
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number;
}) {
  return (
    <article className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-detail">
        <span>{detail}</span>
        {trend !== undefined && (
          <span className={trend >= 0 ? 'delta-positive' : 'delta-negative'}>
            {formatDelta(trend)}
          </span>
        )}
      </div>
    </article>
  );
}

function KpiGrid({summary}: {summary: PerformanceSummary}) {
  return (
    <section className="kpi-grid" aria-label="Commercial performance">
      <KpiCard
        label="Weekly film gross"
        value={formatCurrency(summary.gross, true)}
        detail="vs prior week"
        trend={summary.grossDelta}
      />
      <KpiCard
        label="Admissions"
        value={formatNumber(summary.admissions)}
        detail={`${formatNumber(summary.sessions)} sessions`}
      />
      <KpiCard
        label="Spend per admit"
        value={formatCurrency(summary.averageSpend)}
        detail="ticket + concessions"
      />
      <KpiCard
        label="Average ticket"
        value={formatCurrency(summary.averageTicket)}
        detail={`${formatCurrency(summary.ticketRevenue, true)} ticket revenue`}
      />
      <KpiCard
        label="Concessions"
        value={formatCurrency(summary.concessionRevenue, true)}
        detail={`${summary.concessions[0]?.item ?? '—'} leads`}
      />
      <KpiCard
        label="Occupancy"
        value={formatPercent(summary.occupancy)}
        detail={`${summary.screens} screens in circuit`}
      />
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  aside
}: {
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {aside}
    </header>
  );
}

function RankingList({
  items,
  onSelect,
  circuitAverage
}: {
  items: Array<{id: string; name: string; gross: number; occupancy: number}>;
  onSelect: (id: string) => void;
  circuitAverage?: number;
}) {
  const max = Math.max(...items.map(item => item.gross));
  return (
    <div className="ranking-list">
      {[...items]
        .sort((a, b) => b.gross - a.gross)
        .map((item, index) => (
          <button className="ranking-row" key={item.id} onClick={() => onSelect(item.id)}>
            <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="rank-main">
              <span className="rank-label">{item.name}</span>
              <span className="rank-track">
                <span style={{width: `${(item.gross / max) * 100}%`}} />
              </span>
            </span>
            <span className="rank-value">
              {formatCurrency(item.gross, true)}
              <small>
                {formatPercent(item.occupancy)}
                {circuitAverage !== undefined &&
                  ` · ${formatDelta(item.gross / circuitAverage - 1)} avg`}
              </small>
            </span>
          </button>
        ))}
    </div>
  );
}

function ConcessionList({summary}: {summary: PerformanceSummary}) {
  return (
    <div className="product-list">
      {summary.concessions.slice(0, 4).map((item, index) => (
        <div className="product-row" key={item.item}>
          <span className="product-icon">{['🍿', '🍦', '🥤', '💧'][index]}</span>
          <span>
            <strong>{item.item}</strong>
            <small>{formatNumber(item.units)} sold</small>
          </span>
          <b>{formatCurrency(item.revenue, true)}</b>
        </div>
      ))}
    </div>
  );
}

function CountryPanels({onRegion}: {onRegion: (id: string) => void}) {
  return (
    <div className="panel-grid">
      <section className="panel panel-wide">
        <SectionHeader
          eyebrow="Circuit performance"
          title="Regional ranking"
          aside={<span className="live-chip"><i /> Week 34 live</span>}
        />
        <RankingList items={regions} onSelect={onRegion} />
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Food & beverage" title="Top concession items" />
        <ConcessionList summary={countrySummary} />
      </section>
      <section className="panel attention-panel">
        <SectionHeader eyebrow="Operational pulse" title="Needs attention" />
        <div className="attention-stats">
          <div><strong>{countrySummary.taskCount}</strong><span>Open tasks</span></div>
          <div><strong>{countrySummary.criticalCount}</strong><span>Critical checks</span></div>
          <div><strong>3</strong><span>Sites below 60%</span></div>
        </div>
        <p className="insight">
          Rotorua projector recovery and Northlands cleaning remain the circuit’s highest-priority
          actions today.
        </p>
      </section>
    </div>
  );
}

function StatusBadge({status}: {status: HealthStatus}) {
  return <span className={`status status-${status}`}>{status}</span>;
}

function RegionPanels({region, onSite}: {region: RegionSummary; onSite: (id: string) => void}) {
  const circuitAverage = countrySummary.gross / countrySummary.siteCount;
  const alerts = region.sites.flatMap(siteItem =>
    Object.entries(siteItem.health)
      .filter(([, status]) => status !== 'healthy')
      .map(([category, status]) => ({site: siteItem, category, status}))
  );
  return (
    <div className="panel-grid">
      <section className="panel panel-wide">
        <SectionHeader
          eyebrow={`${region.siteCount} locations · ${region.screens} screens`}
          title="Site ranking & outliers"
          aside={
            <span className={region.gross > circuitAverage * region.siteCount ? 'delta-positive' : 'delta-negative'}>
              {formatDelta(region.gross / (circuitAverage * region.siteCount) - 1)} vs circuit
            </span>
          }
        />
        <RankingList items={region.sites} onSelect={onSite} circuitAverage={circuitAverage} />
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Live operations" title="Alerts" />
        <div className="alert-list">
          {alerts.slice(0, 5).map(alert => (
            <button key={`${alert.site.id}-${alert.category}`} onClick={() => onSite(alert.site.id)}>
              <StatusBadge status={alert.status} />
              <span>
                <strong>{alert.site.name.replace('Silverline ', '')}</strong>
                <small>{alert.category.replace(/([A-Z])/g, ' $1')}</small>
              </span>
            </button>
          ))}
          {!alerts.length && <p className="empty-state">All operational checks are healthy.</p>}
        </div>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Action queue" title="Open tasks" />
        <div className="task-list compact">
          {region.sites
            .flatMap(siteItem => siteItem.tasks.map(taskItem => ({...taskItem, site: siteItem})))
            .slice(0, 5)
            .map(taskItem => (
              <button key={taskItem.id} onClick={() => onSite(taskItem.site.id)}>
                <span className={`priority-dot priority-${taskItem.priority}`} />
                <span><strong>{taskItem.title}</strong><small>{taskItem.site.city} · {taskItem.due}</small></span>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

function SitePanels({siteItem}: {siteItem: CinemaSite}) {
  const delta = siteItem.gross / siteItem.priorGross - 1;
  const healthEntries: Array<[string, HealthStatus]> = [
    ['Screens & projectors', siteItem.health.projectors],
    ['Staffing coverage', siteItem.health.staffing],
    ['Cleaning & maintenance', siteItem.health.cleaning],
    ['Customer experience', siteItem.health.customerExperience]
  ];
  return (
    <div className="panel-grid">
      <section className="panel panel-wide">
        <SectionHeader eyebrow="Film programme" title="Top films this week" />
        <div className="film-list">
          {siteItem.topFilms.map((film, index) => (
            <div className="film-row" key={film.title}>
              <span className="film-rank">{index + 1}</span>
              <span className="poster-swatch" style={{'--hue': `${338 - index * 25}`} as React.CSSProperties} />
              <span><strong>{film.title}</strong><small>{formatNumber(film.admissions)} admissions</small></span>
              <b>{formatCurrency(film.gross, true)}</b>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Site readiness" title="Operational health" />
        <div className="health-grid">
          {healthEntries.map(([label, status]) => (
            <div key={label}><span>{label}</span><StatusBadge status={status} /></div>
          ))}
        </div>
        <p className="insight">
          Gross is <strong className={delta >= 0 ? 'delta-positive' : 'delta-negative'}>{formatDelta(delta)}</strong>{' '}
          week on week, with {formatPercent(siteItem.occupancy)} occupancy across {siteItem.screens} screens.
        </p>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Site activity" title="Tasks & owners" />
        <div className="task-list">
          {siteItem.tasks.map(taskItem => (
            <div key={taskItem.id}>
              <span className={`priority-dot priority-${taskItem.priority}`} />
              <span><strong>{taskItem.title}</strong><small>{taskItem.owner} · Due {taskItem.due}</small></span>
              <span className={`task-status task-${taskItem.status}`}>{taskItem.status}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Food & beverage" title="Top concession items" />
        <ConcessionList
          summary={{
            ...countrySummary,
            concessions: siteItem.concessions,
            concessionRevenue: siteItem.concessionRevenue
          }}
        />
      </section>
    </div>
  );
}

function MapPanel({
  level,
  region,
  siteItem,
  onRegion,
  onSite
}: {
  level: ViewLevel;
  region?: RegionSummary;
  siteItem?: CinemaSite;
  onRegion: (id: string) => void;
  onSite: (id: string) => void;
}) {
  const dispatch = useDispatch();
  const clicked = useSelector(
    (state: KeplerRootState) => state.keplerGl[MAP_ID]?.visState?.clicked
  );
  const siteLayer = useSelector((state: KeplerRootState) =>
    state.keplerGl[MAP_ID]?.visState?.layers?.find(layer => layer.id === SITE_LAYER_ID)
  );
  const lastClick = useRef('');
  const {ref, width} = useElementWidth<HTMLDivElement>();

  useEffect(() => {
    dispatch(
      wrapTo(
        MAP_ID,
        addDataToMap({
          datasets: mapDatasets,
          config: mapConfig,
          options: {centerMap: false, keepExistingConfig: false}
        })
      )
    );
  }, [dispatch]);

  useEffect(() => {
    const showRegions = level === 'country';
    dispatch(wrapTo(MAP_ID, layerToggleVisibility(REGION_LAYER_ID, showRegions)));
    dispatch(wrapTo(MAP_ID, layerToggleVisibility(SITE_LAYER_ID, !showRegions)));
  }, [dispatch, level]);

  useEffect(() => {
    if (!siteLayer) return;
    const worldUnitSize = level === 'site' ? 0.35 : 2.5;
    const elevationScale = level === 'site' ? 0.45 : 8;
    if (
      siteLayer.config.visConfig.worldUnitSize === worldUnitSize &&
      siteLayer.config.visConfig.elevationScale === elevationScale
    ) {
      return;
    }
    dispatch(
      wrapTo(
        MAP_ID,
        layerConfigChange(siteLayer as Parameters<typeof layerConfigChange>[0], {
          visConfig: {...siteLayer.config.visConfig, worldUnitSize, elevationScale}
        } as Parameters<typeof layerConfigChange>[1])
      )
    );
  }, [dispatch, level, siteLayer]);

  useEffect(() => {
    const viewport =
      level === 'country'
        ? {latitude: -41.2, longitude: 172.7, zoom: 4.35, pitch: 35}
        : siteItem
          ? {latitude: siteItem.latitude, longitude: siteItem.longitude, zoom: 12.2, pitch: 40}
          : region
            ? {latitude: region.latitude, longitude: region.longitude, zoom: 8, pitch: 35}
            : null;
    if (viewport) {
      dispatch(wrapTo(MAP_ID, updateMap({...viewport, bearing: 0})));
    }
  }, [dispatch, level, region, siteItem]);

  useEffect(() => {
    if (!clicked?.picked || clicked.index === undefined) return;
    const key = `${clicked.layer?.id}-${clicked.index}`;
    if (lastClick.current === key) return;
    lastClick.current = key;
    if (clicked.layer?.id === REGION_LAYER_ID) {
      const regionIndex = clicked.object?.points?.[0]?.index ?? clicked.index;
      const selected = regions[regionIndex];
      if (selected) onRegion(selected.id);
    }
    if (clicked.layer?.id === SITE_LAYER_ID) {
      const siteIndex = clicked.object?.points?.[0]?.index ?? clicked.index;
      const selected = cinemaSites[siteIndex];
      if (selected && (!region || selected.regionId === region.id)) onSite(selected.id);
    }
  }, [clicked, onRegion, onSite, region]);

  return (
    <section className="map-card" ref={ref} aria-label="Interactive cinema performance map">
      <div className="map-overlay">
        <span className="map-kicker">{level === 'country' ? 'Regional network' : level === 'region' ? 'Cinema locations' : 'Selected site'}</span>
        <strong>{level === 'country' ? 'New Zealand' : siteItem?.name ?? region?.name}</strong>
        <span>Click a hexagon to drill into operations</span>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <span>
          <i className={level === 'country' ? 'legend-region' : 'legend-site'} />
          Hexagon color and height = weekly gross
        </span>
      </div>
      <KeplerGl mapboxApiAccessToken="" id={MAP_ID} width={width} height={MAP_HEIGHT} />
    </section>
  );
}

function Dashboard() {
  const [regionId, setRegionId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const region = getRegion(regionId);
  const siteItem = getSite(siteId);
  const level: ViewLevel = siteItem ? 'site' : region ? 'region' : 'country';
  const summary = siteItem
    ? {
        ...countrySummary,
        gross: siteItem.gross,
        priorGross: siteItem.priorGross,
        admissions: siteItem.admissions,
        ticketRevenue: siteItem.ticketRevenue,
        concessionRevenue: siteItem.concessionRevenue,
        occupancy: siteItem.occupancy,
        sessions: siteItem.sessions,
        siteCount: 1,
        screens: siteItem.screens,
        taskCount: siteItem.tasks.length,
        criticalCount: Object.values(siteItem.health).filter(value => value === 'critical').length,
        averageSpend: (siteItem.gross + siteItem.concessionRevenue) / siteItem.admissions,
        averageTicket: siteItem.ticketRevenue / siteItem.admissions,
        grossDelta: siteItem.gross / siteItem.priorGross - 1,
        concessions: siteItem.concessions
      }
    : region ?? countrySummary;

  const selectRegion = useCallback((id: string) => {
    setRegionId(id);
    setSiteId(null);
  }, []);
  const selectSite = useCallback((id: string) => {
    const selected = getSite(id);
    if (!selected) return;
    setRegionId(selected.regionId);
    setSiteId(id);
  }, []);
  const title =
    level === 'country'
      ? 'New Zealand circuit'
      : level === 'region'
        ? `${region?.name} operations`
        : siteItem?.name;
  const subtitle =
    level === 'country'
      ? 'A live commercial and operational view across 13 cinema locations'
      : level === 'region'
        ? `${region?.cityLabel} · ${region?.siteCount} cinema locations`
        : `${siteItem?.city} · ${siteItem?.screens} screens · ${siteItem?.sessions} weekly sessions`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>Silverline</strong><small>Cinema operations</small></span>
        </div>
        <div className="reporting-period">
          <span>Reporting period</span>
          <strong>12–18 August 2026</strong>
        </div>
        <div className="sync-status"><i /> Synced 2 min ago</div>
      </header>

      <div className="dashboard">
        <nav className="breadcrumbs" aria-label="Dashboard breadcrumb">
          <button onClick={() => {setRegionId(null); setSiteId(null);}}>New Zealand</button>
          {region && <><span>/</span><button onClick={() => selectRegion(region.id)}>{region.name}</button></>}
          {siteItem && <><span>/</span><span aria-current="page">{siteItem.name.replace('Silverline ', '')}</span></>}
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">{level === 'site' ? 'Site command centre' : 'Weekly operating overview'}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <button className="export-button" onClick={() => window.print()} aria-label="Print dashboard report">
            <span>↗</span> Export report
          </button>
        </section>

        <KpiGrid summary={summary} />
        <div className="overview-grid">
          <MapPanel
            level={level}
            region={region}
            siteItem={siteItem}
            onRegion={selectRegion}
            onSite={selectSite}
          />
          <section className="trend-card">
            <SectionHeader eyebrow="8 week trajectory" title="Revenue trend" />
            <div className="trend-total">{formatCurrency(summary.gross, true)}</div>
            <div className={summary.grossDelta >= 0 ? 'delta-positive' : 'delta-negative'}>
              {formatDelta(summary.grossDelta)} vs last week
            </div>
            <Sparkline values={[72, 76, 73, 82, 85, 81, 90, 96].map(value => value * summary.gross / 96)} />
            <div className="trend-breakdown">
              <span><i className="film-dot" />Film <b>{formatCurrency(summary.gross, true)}</b></span>
              <span><i className="food-dot" />Concessions <b>{formatCurrency(summary.concessionRevenue, true)}</b></span>
            </div>
          </section>
        </div>

        {level === 'country' && <CountryPanels onRegion={selectRegion} />}
        {level === 'region' && region && <RegionPanels region={region} onSite={selectSite} />}
        {level === 'site' && siteItem && <SitePanels siteItem={siteItem} />}
        <footer>
          Synthetic prototype data · Values are deterministic and internally aggregated from site level
        </footer>
      </div>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <Provider store={store}>
    <Dashboard />
  </Provider>
);
