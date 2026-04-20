import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClimbFilters } from '../create-climb-filters';
import type { BoardRouteParams, ClimbSearchParams } from '../types';

const params: BoardRouteParams = {
  board_name: 'kilter',
  layout_id: 1,
  size_id: 10,
  set_ids: [1, 20],
  angle: 40,
};

const baseSearch: ClimbSearchParams = {};

describe('createClimbFilters: projectsOnly', () => {
  it('produces no projectsOnly condition by default', () => {
    const f = createClimbFilters(params, baseSearch);
    assert.equal(f.projectsOnlyConditions.length, 0);
  });

  it('produces one projectsOnly condition when the flag is set', () => {
    const f = createClimbFilters(params, { projectsOnly: true });
    assert.equal(f.projectsOnlyConditions.length, 1);
  });

  it('adds the projectsOnly condition to the climb WHERE conditions', () => {
    const baselineCount = createClimbFilters(params, baseSearch).getClimbWhereConditions().length;
    const withProjects = createClimbFilters(params, { projectsOnly: true }).getClimbWhereConditions();
    assert.equal(withProjects.length, baselineCount + 1);
  });

  it('skips the minAscents stats condition when projectsOnly is on (prevents contradictory SQL)', () => {
    const f = createClimbFilters(params, { projectsOnly: true, minAscents: 10 });
    assert.equal(f.climbStatsConditions.length, 0);
  });

  it('applies the minAscents stats condition when projectsOnly is off', () => {
    const f = createClimbFilters(params, { projectsOnly: false, minAscents: 10 });
    assert.equal(f.climbStatsConditions.length, 1);
  });

  it('keeps stats conditions empty so the stats-driven INNER JOIN path is not selected by projectsOnly alone', () => {
    // search-climbs uses `climbStatsConditions.length > 0` to pick the INNER JOIN
    // fast path. projectsOnly must live outside climbStatsConditions so climbs
    // with no stats row are not dropped by the INNER JOIN.
    const f = createClimbFilters(params, { projectsOnly: true });
    assert.equal(f.climbStatsConditions.length, 0);
  });
});
