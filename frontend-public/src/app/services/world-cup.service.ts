import { Injectable } from '@angular/core';

export interface WorldCupTeam {
  id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

export interface WorldCupGame {
  _id: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_scorers: string; // "{\"Scorer 10'\", ...}" or "null" or json string
  away_scorers: string;
  group: string;
  matchday: string;
  local_date: string; // "MM/DD/YYYY HH:mm"
  persian_date?: string;
  stadium_id: string;
  finished: string; // "TRUE" or "FALSE"
  time_elapsed: string; // "finished", "notstarted", "Finished", etc.
  type: string; // "group", "r32", "r16", "qf", "sf", "third", "final"
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
  home_flag?: string;
  away_flag?: string;
  stadium_name?: string;
  comments?: any[];
  loadingComments?: boolean;
  clicks?: number;
  totalLikes?: number;
  totalDislikes?: number;
  userVote?: 'like' | 'dislike' | null;
}

export interface WorldCupGroupTeam {
  team_id: string;
  mp: string; // played
  w: string; // wins
  l: string; // losses
  d: string; // draws
  pts: string; // points
  gf: string; // goals for
  ga: string; // goals against
  gd: string; // goal difference
  team_name?: string;
  team_flag?: string;
}

export interface WorldCupGroup {
  _id: string;
  name: string;
  teams: WorldCupGroupTeam[];
}

const STADIUMS_MAP: Record<string, string> = {
  '1': 'Estadio Azteca, Ciudad de México (México)',
  '2': 'Estadio Akron, Guadalajara (México)',
  '3': 'Estadio BBVA, Monterrey (México)',
  '4': 'Estadio AT&T, Dallas (EE. UU.)',
  '5': 'Estadio NRG, Houston (EE. UU.)',
  '6': 'Arrowhead Stadium, Kansas City (EE. UU.)',
  '7': 'Estadio Mercedes-Benz, Atlanta (EE. UU.)',
  '8': 'Hard Rock Stadium, Miami (EE. UU.)',
  '9': 'Gillette Stadium, Boston (EE. UU.)',
  '10': 'Lincoln Financial Field, Filadelfia (EE. UU.)',
  '11': 'MetLife Stadium, Nueva Jersey (EE. UU.)',
  '12': 'BMO Field, Toronto (Canadá)',
  '13': 'BC Place, Vancouver (Canadá)',
  '14': 'Lumen Field, Seattle (EE. UU.)',
  '15': 'Levi\'s Stadium, San Francisco (EE. UU.)',
  '16': 'SoFi Stadium, Los Ángeles (EE. UU.)'
};

async function fetchWithTimeout(resource: string, options: any = {}): Promise<Response> {
  const { timeout = 2500 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

@Injectable({ providedIn: 'root' })
export class WorldCupService {
  private gamesCache: WorldCupGame[] = [];
  private groupsCache: WorldCupGroup[] = [];
  private teamsCache: WorldCupTeam[] = [];

  constructor() {}

  async getTeams(): Promise<WorldCupTeam[]> {
    try {
      const res = await fetchWithTimeout(`https://worldcup26.ir/get/teams?t=${Date.now()}`);
      const data = await res.json();
      this.teamsCache = data.teams || [];
      return this.teamsCache;
    } catch (e) {
      console.error('Error fetching World Cup teams:', e);
      return this.teamsCache || [];
    }
  }

  async getGames(): Promise<WorldCupGame[]> {
    try {
      const [teams, gamesRes] = await Promise.all([
        this.getTeams(),
        fetchWithTimeout(`https://worldcup26.ir/get/games?t=${Date.now()}`)
      ]);
      const data = await gamesRes.json();
      const rawGames: WorldCupGame[] = data.games || [];
      
      // Map flags and clean names
      const teamsMap = new Map(teams.map(t => [t.id, t]));
      this.gamesCache = rawGames.map(game => {
        const home = teamsMap.get(game.home_team_id);
        const away = teamsMap.get(game.away_team_id);
        return {
          ...game,
          home_flag: home?.flag || '',
          away_flag: away?.flag || '',
          // Fallbacks for knockout labels
          home_team_name_en: game.home_team_name_en || home?.name_en || game.home_team_label || 'TBD',
          away_team_name_en: game.away_team_name_en || away?.name_en || game.away_team_label || 'TBD',
          stadium_name: STADIUMS_MAP[game.stadium_id] || `Estadio ${game.stadium_id}`
        };
      });
      return this.gamesCache;
    } catch (e) {
      console.error('Error fetching World Cup games:', e);
      return this.gamesCache || [];
    }
  }

  async getGroups(): Promise<WorldCupGroup[]> {
    try {
      const [teams, groupsRes] = await Promise.all([
        this.getTeams(),
        fetchWithTimeout(`https://worldcup26.ir/get/groups?t=${Date.now()}`)
      ]);
      const data = await groupsRes.json();
      const rawGroups: WorldCupGroup[] = data.groups || [];
      
      const teamsMap = new Map(teams.map(t => [t.id, t]));
      this.groupsCache = rawGroups.map(grp => {
        const mappedTeams = (grp.teams || []).map(t => {
          const teamDetails = teamsMap.get(t.team_id);
          return {
            ...t,
            team_name: teamDetails?.name_en || `Team ${t.team_id}`,
            team_flag: teamDetails?.flag || ''
          };
        });
        // Sort teams in group by points (desc), goal difference (desc), goals for (desc)
        mappedTeams.sort((a, b) => {
          const ptsDiff = parseInt(b.pts) - parseInt(a.pts);
          if (ptsDiff !== 0) return ptsDiff;
          const gdDiff = parseInt(b.gd) - parseInt(a.gd);
          if (gdDiff !== 0) return gdDiff;
          return parseInt(b.gf) - parseInt(a.gf);
        });
        return {
          ...grp,
          teams: mappedTeams
        };
      });
      // Sort groups A to L alphabetically
      this.groupsCache.sort((a, b) => a.name.localeCompare(b.name));
      return this.groupsCache;
    } catch (e) {
      console.error('Error fetching World Cup groups:', e);
      return this.groupsCache || [];
    }
  }
}
