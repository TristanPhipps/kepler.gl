// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

export type HealthStatus = 'healthy' | 'watch' | 'critical';
export type TaskStatus = 'open' | 'in-progress' | 'blocked';
export type TaskPriority = 'high' | 'medium' | 'low';
export type FilmPerformance = {title: string; gross: number; admissions: number};
export type ConcessionPerformance = {item: string; revenue: number; units: number};
export type CinemaTask = {
  id: string;
  title: string;
  owner: string;
  due: string;
  priority: TaskPriority;
  status: TaskStatus;
};

export type CinemaSite = {
  id: string;
  regionId: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  screens: number;
  gross: number;
  priorGross: number;
  admissions: number;
  ticketRevenue: number;
  concessionRevenue: number;
  occupancy: number;
  sessions: number;
  topFilms: FilmPerformance[];
  concessions: ConcessionPerformance[];
  health: {
    projectors: HealthStatus;
    staffing: HealthStatus;
    cleaning: HealthStatus;
    customerExperience: HealthStatus;
  };
  tasks: CinemaTask[];
};

export type RegionDefinition = {
  id: string;
  name: string;
  cityLabel: string;
  latitude: number;
  longitude: number;
};

export type PerformanceSummary = {
  gross: number;
  priorGross: number;
  admissions: number;
  ticketRevenue: number;
  concessionRevenue: number;
  occupancy: number;
  sessions: number;
  siteCount: number;
  screens: number;
  taskCount: number;
  criticalCount: number;
  averageSpend: number;
  averageTicket: number;
  grossDelta: number;
  concessions: ConcessionPerformance[];
};

export type RegionSummary = RegionDefinition & PerformanceSummary & {sites: CinemaSite[]};

const filmTitles = [
  'Harbour Lights',
  'Southern Cross',
  'The Long White Cloud',
  'Midnight on K Road',
  'Alpine Signal'
];
const concessionNames = [
  'Classic popcorn',
  'Choc-top ice cream',
  'Postmix combo',
  'Sparkling water'
];

const makeFilms = (seed: number, gross: number): FilmPerformance[] =>
  [0.34, 0.25, 0.19, 0.13, 0.09].map((share, index) => ({
    title: filmTitles[(index + seed) % filmTitles.length],
    gross: Math.round(gross * share),
    admissions: Math.round((gross * share) / (15.3 + index * 0.4))
  }));

const makeConcessions = (seed: number, revenue: number): ConcessionPerformance[] =>
  [0.39, 0.28, 0.2, 0.13].map((share, index) => ({
    item: concessionNames[(index + seed) % concessionNames.length],
    revenue: Math.round(revenue * share),
    units: Math.round((revenue * share) / (6.4 + index * 1.2))
  }));

const task = (
  id: string,
  title: string,
  owner: string,
  due: string,
  priority: TaskPriority,
  status: TaskStatus = 'open'
): CinemaTask => ({id, title, owner, due, priority, status});

type SiteInput = Omit<CinemaSite, 'topFilms' | 'concessions'>;
const site = (values: SiteInput, seed: number): CinemaSite => ({
  ...values,
  topFilms: makeFilms(seed, values.gross),
  concessions: makeConcessions(seed, values.concessionRevenue)
});

export const regionDefinitions: RegionDefinition[] = [
  {
    id: 'auckland',
    name: 'Auckland',
    cityLabel: 'Tāmaki Makaurau',
    latitude: -36.8485,
    longitude: 174.7633
  },
  {
    id: 'waikato',
    name: 'Waikato',
    cityLabel: 'Hamilton',
    latitude: -37.787,
    longitude: 175.2793
  },
  {
    id: 'wellington',
    name: 'Wellington',
    cityLabel: 'Te Whanganui-a-Tara',
    latitude: -41.2866,
    longitude: 174.7756
  },
  {
    id: 'canterbury',
    name: 'Canterbury',
    cityLabel: 'Christchurch',
    latitude: -43.5321,
    longitude: 172.6362
  },
  {
    id: 'otago',
    name: 'Otago',
    cityLabel: 'Dunedin / Queenstown',
    latitude: -45.42,
    longitude: 169.93
  },
  {
    id: 'bay-of-plenty',
    name: 'Bay of Plenty',
    cityLabel: 'Tauranga / Rotorua',
    latitude: -37.82,
    longitude: 176.5
  }
];

export const cinemaSites: CinemaSite[] = [
  site(
    {
      id: 'queen-street',
      regionId: 'auckland',
      name: 'Silverline Queen Street',
      city: 'Auckland',
      latitude: -36.8509,
      longitude: 174.7645,
      screens: 10,
      gross: 292400,
      priorGross: 271800,
      admissions: 16820,
      ticketRevenue: 257100,
      concessionRevenue: 84300,
      occupancy: 0.72,
      sessions: 426,
      health: {
        projectors: 'healthy',
        staffing: 'watch',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [
        task('q1', 'Close Friday usher gap', 'Mia', 'Today, 4:00 pm', 'high', 'in-progress'),
        task('q2', 'Calibrate Screen 7 audio', 'Noah', 'Thu', 'medium')
      ]
    },
    0
  ),
  site(
    {
      id: 'newmarket',
      regionId: 'auckland',
      name: 'Silverline Newmarket',
      city: 'Auckland',
      latitude: -36.8692,
      longitude: 174.7784,
      screens: 8,
      gross: 241800,
      priorGross: 248600,
      admissions: 14140,
      ticketRevenue: 213700,
      concessionRevenue: 73400,
      occupancy: 0.66,
      sessions: 356,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'watch',
        customerExperience: 'healthy'
      },
      tasks: [task('n1', 'Deep clean premium lounge', 'Aroha', 'Tomorrow', 'medium', 'in-progress')]
    },
    1
  ),
  site(
    {
      id: 'albany',
      regionId: 'auckland',
      name: 'Silverline Albany',
      city: 'Auckland',
      latitude: -36.7287,
      longitude: 174.7081,
      screens: 9,
      gross: 225600,
      priorGross: 213900,
      admissions: 13580,
      ticketRevenue: 198200,
      concessionRevenue: 70100,
      occupancy: 0.64,
      sessions: 374,
      health: {
        projectors: 'watch',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'watch'
      },
      tasks: [
        task('a1', 'Replace projector lamp 4', 'Theo', 'Today', 'high', 'blocked'),
        task('a2', 'Review NPS callbacks', 'Leilani', 'Fri', 'low')
      ]
    },
    2
  ),
  site(
    {
      id: 'hamilton-central',
      regionId: 'waikato',
      name: 'Silverline Hamilton Central',
      city: 'Hamilton',
      latitude: -37.7878,
      longitude: 175.2822,
      screens: 8,
      gross: 188300,
      priorGross: 177400,
      admissions: 11890,
      ticketRevenue: 164500,
      concessionRevenue: 63800,
      occupancy: 0.68,
      sessions: 332,
      health: {
        projectors: 'healthy',
        staffing: 'watch',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [
        task('h1', 'Confirm weekend casual roster', 'Isla', 'Tomorrow', 'high', 'in-progress')
      ]
    },
    3
  ),
  site(
    {
      id: 'te-rapa',
      regionId: 'waikato',
      name: 'Silverline Te Rapa',
      city: 'Hamilton',
      latitude: -37.7468,
      longitude: 175.2391,
      screens: 6,
      gross: 132900,
      priorGross: 139500,
      admissions: 8610,
      ticketRevenue: 115800,
      concessionRevenue: 45200,
      occupancy: 0.57,
      sessions: 274,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'watch',
        customerExperience: 'watch'
      },
      tasks: [task('t1', 'Inspect foyer HVAC', 'Wiremu', 'Fri', 'medium')]
    },
    4
  ),
  site(
    {
      id: 'courtenay',
      regionId: 'wellington',
      name: 'Silverline Courtenay Place',
      city: 'Wellington',
      latitude: -41.2933,
      longitude: 174.7816,
      screens: 9,
      gross: 236700,
      priorGross: 219100,
      admissions: 14320,
      ticketRevenue: 207400,
      concessionRevenue: 74800,
      occupancy: 0.74,
      sessions: 352,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [task('c1', 'Prepare festival session plan', 'Sophie', 'Mon', 'medium', 'in-progress')]
    },
    0
  ),
  site(
    {
      id: 'lower-hutt',
      regionId: 'wellington',
      name: 'Silverline Lower Hutt',
      city: 'Lower Hutt',
      latitude: -41.211,
      longitude: 174.908,
      screens: 7,
      gross: 151200,
      priorGross: 156400,
      admissions: 9610,
      ticketRevenue: 132300,
      concessionRevenue: 51100,
      occupancy: 0.59,
      sessions: 296,
      health: {
        projectors: 'watch',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'watch'
      },
      tasks: [
        task('l1', 'Investigate Screen 2 flicker', 'Ethan', 'Today', 'high'),
        task('l2', 'Coach front desk upsell', 'Hana', 'Tue', 'low')
      ]
    },
    1
  ),
  site(
    {
      id: 'riccarton',
      regionId: 'canterbury',
      name: 'Silverline Riccarton',
      city: 'Christchurch',
      latitude: -43.529,
      longitude: 172.598,
      screens: 10,
      gross: 251600,
      priorGross: 236700,
      admissions: 15370,
      ticketRevenue: 220800,
      concessionRevenue: 80900,
      occupancy: 0.7,
      sessions: 401,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [task('r1', 'Sign off emergency lighting test', 'Oliver', 'Thu', 'medium')]
    },
    2
  ),
  site(
    {
      id: 'northlands',
      regionId: 'canterbury',
      name: 'Silverline Northlands',
      city: 'Christchurch',
      latitude: -43.4923,
      longitude: 172.6127,
      screens: 7,
      gross: 162800,
      priorGross: 169200,
      admissions: 10240,
      ticketRevenue: 142100,
      concessionRevenue: 54800,
      occupancy: 0.6,
      sessions: 301,
      health: {
        projectors: 'healthy',
        staffing: 'watch',
        cleaning: 'critical',
        customerExperience: 'watch'
      },
      tasks: [
        task('no1', 'Resolve washroom closure', 'Charlotte', 'Today', 'high', 'in-progress'),
        task('no2', 'Fill Saturday duty manager shift', 'Jack', 'Tomorrow', 'high')
      ]
    },
    3
  ),
  site(
    {
      id: 'dunedin',
      regionId: 'otago',
      name: 'Silverline Dunedin',
      city: 'Dunedin',
      latitude: -45.8742,
      longitude: 170.5036,
      screens: 8,
      gross: 174900,
      priorGross: 162800,
      admissions: 10980,
      ticketRevenue: 152800,
      concessionRevenue: 57900,
      occupancy: 0.67,
      sessions: 312,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [task('d1', 'Complete university promo setup', 'Amelia', 'Fri', 'low', 'in-progress')]
    },
    4
  ),
  site(
    {
      id: 'queenstown',
      regionId: 'otago',
      name: 'Silverline Queenstown',
      city: 'Queenstown',
      latitude: -45.0312,
      longitude: 168.6626,
      screens: 5,
      gross: 141300,
      priorGross: 128200,
      admissions: 8240,
      ticketRevenue: 126100,
      concessionRevenue: 49300,
      occupancy: 0.76,
      sessions: 238,
      health: {
        projectors: 'healthy',
        staffing: 'watch',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [task('qt1', 'Approve school holiday roster', 'Liam', 'Tomorrow', 'medium')]
    },
    0
  ),
  site(
    {
      id: 'tauranga',
      regionId: 'bay-of-plenty',
      name: 'Silverline Tauranga Crossing',
      city: 'Tauranga',
      latitude: -37.733,
      longitude: 176.124,
      screens: 8,
      gross: 196500,
      priorGross: 183400,
      admissions: 12040,
      ticketRevenue: 171800,
      concessionRevenue: 65700,
      occupancy: 0.69,
      sessions: 326,
      health: {
        projectors: 'healthy',
        staffing: 'healthy',
        cleaning: 'healthy',
        customerExperience: 'healthy'
      },
      tasks: [task('tg1', 'Reconcile kiosk stock variance', 'Mere', 'Thu', 'medium', 'in-progress')]
    },
    1
  ),
  site(
    {
      id: 'rotorua',
      regionId: 'bay-of-plenty',
      name: 'Silverline Rotorua',
      city: 'Rotorua',
      latitude: -38.1368,
      longitude: 176.2497,
      screens: 6,
      gross: 128700,
      priorGross: 134800,
      admissions: 8290,
      ticketRevenue: 111900,
      concessionRevenue: 43800,
      occupancy: 0.55,
      sessions: 266,
      health: {
        projectors: 'critical',
        staffing: 'healthy',
        cleaning: 'watch',
        customerExperience: 'watch'
      },
      tasks: [
        task('ro1', 'Restore Screen 5 projector', 'James', 'Today', 'high', 'blocked'),
        task('ro2', 'Respond to queue-time feedback', 'Maia', 'Tomorrow', 'medium')
      ]
    },
    2
  )
];

export function summarizeSites(sites: CinemaSite[]): PerformanceSummary {
  const total = (
    field: keyof Pick<
      CinemaSite,
      | 'gross'
      | 'priorGross'
      | 'admissions'
      | 'ticketRevenue'
      | 'concessionRevenue'
      | 'sessions'
      | 'screens'
    >
  ) => sites.reduce((sum, item) => sum + item[field], 0);
  const admissions = total('admissions');
  const gross = total('gross');
  const concessionRevenue = total('concessionRevenue');
  const sessions = total('sessions');
  const priorGross = total('priorGross');
  const concessionsByItem = new Map<string, ConcessionPerformance>();

  sites.flatMap(item => item.concessions).forEach(item => {
    const current = concessionsByItem.get(item.item) ?? {item: item.item, revenue: 0, units: 0};
    concessionsByItem.set(item.item, {
      ...current,
      revenue: current.revenue + item.revenue,
      units: current.units + item.units
    });
  });

  return {
    gross,
    priorGross,
    admissions,
    ticketRevenue: total('ticketRevenue'),
    concessionRevenue,
    occupancy: sites.reduce((sum, item) => sum + item.occupancy * item.sessions, 0) / sessions,
    sessions,
    siteCount: sites.length,
    screens: total('screens'),
    taskCount: sites.reduce(
      (sum, item) => sum + item.tasks.filter(taskItem => taskItem.status !== 'in-progress').length,
      0
    ),
    criticalCount: sites.reduce(
      (sum, item) => sum + Object.values(item.health).filter(value => value === 'critical').length,
      0
    ),
    averageSpend: (gross + concessionRevenue) / admissions,
    averageTicket: total('ticketRevenue') / admissions,
    grossDelta: gross / priorGross - 1,
    concessions: [...concessionsByItem.values()].sort((a, b) => b.revenue - a.revenue)
  };
}

export const regions: RegionSummary[] = regionDefinitions.map(region => {
  const sites = cinemaSites.filter(item => item.regionId === region.id);
  return {...region, sites, ...summarizeSites(sites)};
});

export const countrySummary = summarizeSites(cinemaSites);
export const getRegion = (id: string | null) => regions.find(region => region.id === id);
export const getSite = (id: string | null) => cinemaSites.find(item => item.id === id);
