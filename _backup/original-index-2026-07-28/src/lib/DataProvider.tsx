import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { loadCsv, loadJson, type LoadResult } from './loadCsv';
import {
  DemoRowSchema,
  DistrictRowSchema,
  GeoJsonSchema,
  LonelyDeathRowSchema,
  SingleDemoRowSchema,
  SourceSchema,
  TrendRowSchema,
  type BusanGeoJson,
  type DemoRow,
  type DistrictRow,
  type LonelyDeathRow,
  type SingleDemoRow,
  type Source,
  type TrendRow,
} from '@/data/schema';
import { z } from 'zod';

/**
 * 데이터 로딩 상태를 앱 전체에 공급한다. (React Context + useReducer, Redux 안 씀)
 *
 * 각 데이터셋은 독립적으로 성공/실패한다. 하나가 없어도 나머지 챕터는 정상 동작하고,
 * 없는 챕터만 '데이터 준비 중' 빈 상태를 보여준다.
 */

export interface DataState {
  loading: boolean;
  trend: LoadResult<TrendRow> | null;
  deaths: LoadResult<LonelyDeathRow> | null;
  districts: LoadResult<DistrictRow> | null;
  demo: LoadResult<DemoRow> | null;
  singleDemo: LoadResult<SingleDemoRow> | null;
  sources: LoadResult<Source> | null;
  geo: LoadResult<BusanGeoJson> | null;
}

type Action = { type: 'loaded'; payload: Omit<DataState, 'loading'> };

const initialState: DataState = {
  loading: true,
  trend: null,
  deaths: null,
  districts: null,
  demo: null,
  singleDemo: null,
  sources: null,
  geo: null,
};

function reducer(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'loaded':
      return { ...state, ...action.payload, loading: false };
    default:
      return state;
  }
}

const DataContext = createContext<DataState>(initialState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [trend, deaths, districts, demo, singleDemo, sources, geoRaw] = await Promise.all([
        loadCsv('01_trend_national_busan.csv', TrendRowSchema),
        loadCsv('02_lonely_death_trend.csv', LonelyDeathRowSchema),
        loadCsv('03_busan_districts.csv', DistrictRowSchema),
        loadCsv('04_lonely_death_demo.csv', DemoRowSchema),
        loadCsv('05_single_household_demo.csv', SingleDemoRowSchema),
        loadJson('sources.json', z.array(SourceSchema)),
        loadJson('busan_sgg.geojson', GeoJsonSchema),
      ]);

      if (cancelled) return;

      // sources.json 은 배열 하나가 통째로 들어오므로 평평하게 편다.
      const flatSources: LoadResult<Source> =
        sources.status === 'ok'
          ? { status: 'ok', rows: (sources.rows as Source[][])[0] }
          : (sources as LoadResult<Source>);

      dispatch({
        type: 'loaded',
        payload: {
          trend,
          deaths,
          districts,
          demo,
          singleDemo,
          sources: flatSources,
          geo: geoRaw as LoadResult<BusanGeoJson>,
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

/** 로드 결과에서 행 배열만 꺼낸다. 실패했으면 빈 배열. */
export const rowsOf = <T,>(r: LoadResult<T> | null): T[] => (r && r.status === 'ok' ? r.rows : []);
