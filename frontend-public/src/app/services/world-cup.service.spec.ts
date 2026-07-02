import { TestBed } from '@angular/core/testing';
import { WorldCupService } from './world-cup.service';
import { vi } from 'vitest';

describe('WorldCupService', () => {
  let service: WorldCupService;

  const mockTeams = {
    teams: [
      { id: '1', name_en: 'Argentina', flag: 'arg.png', fifa_code: 'ARG', iso2: 'AR', groups: 'A' },
      { id: '2', name_en: 'Mexico', flag: 'mex.png', fifa_code: 'MEX', iso2: 'MX', groups: 'A' },
      { id: '3', name_en: 'France', flag: 'fra.png', fifa_code: 'FRA', iso2: 'FR', groups: 'B' }
    ]
  };

  const mockGames = {
    games: [
      {
        _id: 'g1',
        id: '1',
        home_team_id: '1',
        away_team_id: '2',
        home_score: '2',
        away_score: '1',
        home_scorers: '{"Messi 10\'"}',
        away_scorers: '{"Chicharito 80\'"}',
        group: 'A',
        matchday: '1',
        local_date: '06/24/2026 18:00',
        finished: 'TRUE',
        time_elapsed: 'finished',
        type: 'group'
      }
    ]
  };

  const mockGroups = {
    groups: [
      {
        _id: 'gr2',
        name: 'Group B',
        teams: [
          { team_id: '3', mp: '1', w: '1', l: '0', d: '0', pts: '3', gf: '2', ga: '0', gd: '2' }
        ]
      },
      {
        _id: 'gr1',
        name: 'Group A',
        teams: [
          { team_id: '1', mp: '1', w: '1', l: '0', d: '0', pts: '3', gf: '2', ga: '1', gd: '1' },
          { team_id: '2', mp: '1', w: '0', l: '1', d: '0', pts: '0', gf: '1', ga: '2', gd: '-1' }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorldCupService]
    });
    service = TestBed.inject(WorldCupService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTeams', () => {
    it('should fetch and cache teams', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockTeams)
        } as Response)
      );

      const teams = await service.getTeams();
      expect(fetchSpy).toHaveBeenCalledWith('https://worldcup26.ir/get/teams');
      expect(teams.length).toBe(3);
      expect(teams[0].name_en).toBe('Argentina');

      // Second call should return cached teams without calling fetch again
      const cachedTeams = await service.getTeams();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(cachedTeams).toEqual(teams);
    });

    it('should handle fetch error gracefully and return empty list', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      const teams = await service.getTeams();
      expect(teams).toEqual([]);
    });
  });

  describe('getGames', () => {
    it('should fetch games and map team names and flags', async () => {
      let callCount = 0;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        callCount++;
        let data = {};
        if (typeof url === 'string' && url.includes('/get/teams')) {
          data = mockTeams;
        } else if (typeof url === 'string' && url.includes('/get/games')) {
          data = mockGames;
        }
        return Promise.resolve({
          json: () => Promise.resolve(data)
        } as Response);
      });

      const games = await service.getGames();
      expect(games.length).toBe(1);
      expect(games[0].home_flag).toBe('arg.png');
      expect(games[0].away_flag).toBe('mex.png');
      expect(games[0].home_team_name_en).toBe('Argentina');
      expect(games[0].away_team_name_en).toBe('Mexico');

      // Second call should use cache
      const cachedGames = await service.getGames();
      expect(cachedGames).toEqual(games);
    });

    it('should handle fetch error and return empty array', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      const games = await service.getGames();
      expect(games).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should fetch groups, map names/flags, sort teams and groups', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        let data = {};
        if (typeof url === 'string' && url.includes('/get/teams')) {
          data = mockTeams;
        } else if (typeof url === 'string' && url.includes('/get/groups')) {
          data = mockGroups;
        }
        return Promise.resolve({
          json: () => Promise.resolve(data)
        } as Response);
      });

      const groups = await service.getGroups();
      expect(groups.length).toBe(2);
      
      // Groups should be sorted alphabetically by name
      expect(groups[0].name).toBe('Group A');
      expect(groups[1].name).toBe('Group B');

      // Group A teams should be mapped
      const grpATeams = groups[0].teams;
      expect(grpATeams[0].team_name).toBe('Argentina');
      expect(grpATeams[0].team_flag).toBe('arg.png');
      expect(grpATeams[1].team_name).toBe('Mexico');
      expect(grpATeams[1].team_flag).toBe('mex.png');
    });

    it('should handle fetch error and return empty array', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      const groups = await service.getGroups();
      expect(groups).toEqual([]);
    });
  });
});
