// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React, {useRef, useState} from 'react';
import {act, fireEvent, screen} from '@testing-library/react';
import {MapStateActions, VisStateActions} from '@kepler.gl/actions';
import {INITIAL_MAP_STATE} from '@kepler.gl/reducers';
import {CameraBookmark, CameraTour} from '@kepler.gl/types';
import {evaluateCameraTour} from '@kepler.gl/utils';
import {renderWithTheme, IntlWrapper} from 'test/helpers/component-jest-utils';
import {MapViewStateContext} from '../../map-view-state-context';
import {RootContext} from '../../context';
import CameraTourConfig from './camera-tour-config';
import CameraBookmarks from './camera-bookmarks';

const camera = {longitude: 10, latitude: 20, zoom: 6, bearing: 30, pitch: 45};
const tour: CameraTour = {
  stops: [
    {id: 'home', name: 'Home', camera, holdDurationMs: 1000, travelDurationMs: 2000},
    {
      id: 'work',
      name: 'Work',
      camera: {...camera, longitude: 50, zoom: 10},
      holdDurationMs: 1000,
      travelDurationMs: 9999
    }
  ]
};

function setup(
  initial: CameraTour | null = tour,
  options: {
    bookmarks?: CameraBookmark[];
    mapState?: typeof INITIAL_MAP_STATE;
    liveCamera?: typeof camera;
  } = {}
) {
  const updateMap = jest.fn();
  const commit = jest.fn();
  const mapState = options.mapState || {...INITIAL_MAP_STATE, ...camera};
  function Harness() {
    const root = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState(initial);
    return (
      <RootContext.Provider value={root}>
        <div ref={root}>
          <div className="maps">
            <button type="button">Map surface</button>
          </div>
          <div className="geocoder-panel">
            <input aria-label="Search map" />
          </div>
          <CameraBookmarks
            bookmarks={[{id: 'saved', name: 'Saved view', camera}]}
            mapState={mapState}
            mapStateActions={{...MapStateActions, updateMap}}
            visStateActions={VisStateActions}
          />
          <CameraTourConfig
            tour={value}
            bookmarks={options.bookmarks}
            mapState={mapState}
            mapStateActions={{...MapStateActions, updateMap}}
            visStateActions={{
              ...VisStateActions,
              setCameraTour: Object.assign((next: CameraTour | null) => {
                commit(next);
                setValue(next);
                return VisStateActions.setCameraTour(next);
              }, VisStateActions.setCameraTour)
            }}
          />
        </div>
      </RootContext.Provider>
    );
  }
  const rendered = renderWithTheme(
    <IntlWrapper>
      <MapViewStateContext.Provider
        value={{
          getInternalViewState: () => options.liveCamera || mapState,
          setInternalViewState: jest.fn()
        }}
      >
        <Harness />
      </MapViewStateContext.Provider>
    </IntlWrapper>
  );
  fireEvent.click(screen.getByRole('button', {name: 'Camera animation'}));
  return {...rendered, updateMap, commit};
}

let callbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;
beforeEach(() => {
  callbacks = new Map();
  nextFrame = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    callbacks.set(++nextFrame, callback);
    return nextFrame;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    callbacks.delete(id);
  });
  jest.spyOn(performance, 'now').mockReturnValue(0);
});
afterEach(() => jest.restoreAllMocks());

function frame(time: number) {
  const pending = [...callbacks.values()];
  callbacks.clear();
  act(() => pending.forEach(callback => callback(time)));
}

test('captures the live view, renames it and removes the last stop without datasets', () => {
  const liveCamera = {...camera};
  const {commit} = setup(null, {liveCamera});
  expect(screen.getByText('Add views to create a camera tour.')).toBeInTheDocument();
  liveCamera.zoom = 12;
  fireEvent.click(screen.getByRole('button', {name: 'Add current view'}));
  expect(commit.mock.lastCall[0].stops[0].camera).toEqual(liveCamera);
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('2 s');
  fireEvent.change(screen.getByRole('textbox', {name: 'Stop name'}), {target: {value: 'New view'}});
  expect(commit.mock.lastCall[0].stops[0].name).toBe('New view');
  fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
  expect(commit.mock.lastCall[0]).toBeNull();
});

test('copies bookmarks and updates a stop from the current view without modifying the bookmark', () => {
  const bookmark = {id: 'bookmark', name: 'Saved view', camera: {...camera}};
  const liveCamera = {...camera, bearing: 80, pitch: 60};
  const {commit} = setup(null, {bookmarks: [bookmark], liveCamera});
  fireEvent.change(screen.getByRole('combobox', {name: 'Add from bookmark'}), {
    target: {value: bookmark.id}
  });
  const saved = commit.mock.lastCall[0].stops[0];
  expect(saved.name).toBe('Saved view');
  expect(saved.camera).toEqual(bookmark.camera);
  expect(saved.camera).not.toBe(bookmark.camera);
  bookmark.camera.zoom = 20;
  expect(saved.camera.zoom).toBe(6);
  liveCamera.pitch = 70;
  fireEvent.click(screen.getByRole('button', {name: 'Update view'}));
  expect(commit.mock.lastCall[0].stops[0].camera).toEqual(liveCamera);
  expect(bookmark.camera.pitch).toBe(45);
});

test('duplicates, reorders and deletes selected stops while updating total duration', () => {
  const {commit} = setup();
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('4 s');
  expect(screen.getByRole('button', {name: 'Up'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Duplicate'}));
  const duplicate = commit.mock.lastCall[0].stops[1];
  expect(duplicate.id).not.toBe('home');
  expect(duplicate.camera).toEqual(camera);
  expect(duplicate.camera).not.toBe(camera);
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('7 s');
  fireEvent.click(screen.getByRole('button', {name: 'Down'}));
  expect(commit.mock.lastCall[0].stops.map(stop => stop.id)).toEqual([
    'home',
    'work',
    duplicate.id
  ]);
  expect(screen.getByRole('button', {name: 'Down'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Up'}));
  fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
  expect(commit.mock.lastCall[0]).toEqual(tour);
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('4 s');
});

test('edits hold and travel in seconds and rejects invalid or unsafe total durations', () => {
  const {commit} = setup();
  fireEvent.change(screen.getByRole('spinbutton', {name: 'Hold (seconds)'}), {
    target: {value: '1.5'}
  });
  fireEvent.change(screen.getByRole('spinbutton', {name: 'Travel to next (seconds)'}), {
    target: {value: '3.5'}
  });
  expect(commit.mock.lastCall[0].stops[0]).toMatchObject({
    holdDurationMs: 1500,
    travelDurationMs: 3500
  });
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('6 s');
  commit.mockClear();
  for (const value of ['-1', '', '9007199254740']) {
    fireEvent.change(screen.getByRole('spinbutton', {name: 'Hold (seconds)'}), {target: {value}});
  }
  expect(commit).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Tour duration')).toHaveTextContent('6 s');
  fireEvent.click(screen.getByRole('button', {name: '2. Work'}));
  expect(screen.queryByRole('spinbutton', {name: 'Travel to next (seconds)'})).toBeNull();
});

test('scrubbing and playback evaluate the same camera at the same timestamp', () => {
  const {updateMap} = setup();
  fireEvent.change(screen.getByRole('slider', {name: 'Camera tour time'}), {
    target: {value: '1500'}
  });
  const expected = {...evaluateCameraTour(tour, 1500), transitionDuration: 0};
  expect(updateMap).toHaveBeenLastCalledWith(expected);
  fireEvent.click(screen.getByRole('button', {name: 'Restart'}));
  expect(updateMap).toHaveBeenLastCalledWith({...camera, transitionDuration: 0});
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  frame(1500);
  expect(updateMap).toHaveBeenLastCalledWith(expected);
  expect(screen.getByLabelText('Elapsed time')).toHaveTextContent('1.5 s');
  fireEvent.click(screen.getByRole('button', {name: 'Pause'}));
  updateMap.mockClear();
  frame(2000);
  expect(updateMap).not.toHaveBeenCalled();
  expect(callbacks.size).toBe(0);
});

test('resumes elapsed time, finishes exactly at the end, and replays from the beginning', () => {
  const {updateMap} = setup();
  fireEvent.change(screen.getByRole('slider'), {target: {value: '1500'}});
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  frame(500);
  expect(updateMap).toHaveBeenLastCalledWith({
    ...evaluateCameraTour(tour, 2000),
    transitionDuration: 0
  });
  frame(5000);
  expect(updateMap).toHaveBeenLastCalledWith({...tour.stops[1].camera, transitionDuration: 0});
  expect(screen.getByLabelText('Elapsed time')).toHaveTextContent('4 s');
  expect(screen.getByRole('button', {name: 'Play'})).toBeInTheDocument();
  expect(callbacks.size).toBe(0);
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  expect(updateMap).toHaveBeenLastCalledWith({...camera, transitionDuration: 0});
});

test('timeline markers select the stop and scrub to its start with current-stop indication', () => {
  const {updateMap} = setup();
  fireEvent.click(screen.getByRole('button', {name: 'Go to stop 2: Work'}));
  expect(screen.getByRole('button', {name: '2. Work'})).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', {name: 'Go to stop 2: Work'})).toHaveAttribute(
    'aria-current',
    'step'
  );
  expect(screen.getByRole('slider')).toHaveValue('3000');
  expect(updateMap).toHaveBeenLastCalledWith({...tour.stops[1].camera, transitionDuration: 0});
});

test.each(['pointerDown', 'wheel', 'keyDown'] as const)(
  'manual map %s pauses playback before more frames',
  event => {
    const {updateMap} = setup();
    fireEvent.click(screen.getByRole('button', {name: 'Play'}));
    const staleCallback = [...callbacks.values()][0];
    fireEvent[event](screen.getByRole('button', {name: 'Map surface'}));
    expect(screen.getByRole('button', {name: 'Play'})).toBeInTheDocument();
    updateMap.mockClear();
    act(() => staleCallback(1000));
    expect(updateMap).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
  }
);

test('search navigation pauses playback while unrelated sidebar pointer events do not', () => {
  setup();
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  fireEvent.pointerDown(screen.getByRole('textbox', {name: 'Stop name'}));
  expect(screen.getByRole('button', {name: 'Pause'})).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('textbox', {name: 'Search map'}), {key: 'Enter'});
  expect(screen.getByRole('button', {name: 'Play'})).toBeInTheDocument();
});

test('editing, collapsing and unmounting cancel playback', () => {
  const {unmount} = setup();
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Stop name'}), {target: {value: 'Changed'}});
  expect(callbacks.size).toBe(0);
  expect(screen.getByLabelText('Elapsed time')).toHaveTextContent('0 s');
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  fireEvent.click(screen.getByRole('button', {name: 'Camera animation'}));
  expect(callbacks.size).toBe(0);
  fireEvent.click(screen.getByRole('button', {name: 'Camera animation'}));
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  unmount();
  expect(callbacks.size).toBe(0);
});

test('zero-duration tours disable playback but can jump to their evaluated camera', () => {
  const instant = {
    stops: tour.stops.map(stop => ({...stop, holdDurationMs: 0, travelDurationMs: 0}))
  };
  const {updateMap} = setup(instant);
  expect(screen.getByRole('button', {name: 'Play'})).toBeDisabled();
  expect(screen.getByRole('slider')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Restart'}));
  expect(updateMap).toHaveBeenLastCalledWith({...tour.stops[1].camera, transitionDuration: 0});
});

test.each([
  {...INITIAL_MAP_STATE, isSplit: true},
  {...INITIAL_MAP_STATE, globe: {...INITIAL_MAP_STATE.globe!, enabled: true}}
])('unsupported map modes do not expose tour editing or playback', mapState => {
  setup(tour, {mapState});
  expect(screen.getByText('Use a single 2D or 3D map to edit camera views.')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Play'})).toBeNull();
  expect(screen.queryByRole('button', {name: 'Add current view'})).toBeNull();
});

test('navigating to a saved bookmark pauses the tour before the next frame', () => {
  const {updateMap} = setup();
  fireEvent.click(screen.getByRole('button', {name: 'Bookmarks'}));
  fireEvent.click(screen.getByRole('button', {name: 'Play'}));
  fireEvent.click(screen.getByRole('button', {name: 'Go to'}));
  expect(screen.getByRole('button', {name: 'Play'})).toBeInTheDocument();
  expect(updateMap).toHaveBeenLastCalledWith(expect.objectContaining({transitionDuration: 1000}));
  updateMap.mockClear();
  frame(1500);
  expect(updateMap).not.toHaveBeenCalled();
});
