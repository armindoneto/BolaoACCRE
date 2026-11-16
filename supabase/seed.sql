-- Seed: Brasileirão 2026 (times, níveis e regras). Pode rodar mais de uma vez.

insert into bolao.competitions (name) values ('Brasileirão Série A')
on conflict (name) do nothing;

insert into bolao.teams (name, short_name, code, color, color2) values
  ('Flamengo', 'Flamengo', 'FLA', '#C8102E', '#111111'),
  ('Palmeiras', 'Palmeiras', 'PAL', '#006437', '#FFFFFF'),
  ('Cruzeiro', 'Cruzeiro', 'CRU', '#0A3A8C', '#FFFFFF'),
  ('Mirassol', 'Mirassol', 'MIR', '#F7C600', '#0B6B3A'),
  ('Fluminense', 'Fluminense', 'FLU', '#7A1437', '#00613C'),
  ('Botafogo', 'Botafogo', 'BOT', '#111111', '#FFFFFF'),
  ('Bahia', 'Bahia', 'BAH', '#0057B8', '#E30613'),
  ('São Paulo', 'São Paulo', 'SAO', '#E30613', '#111111'),
  ('Grêmio', 'Grêmio', 'GRE', '#0D80BF', '#111111'),
  ('Red Bull Bragantino', 'Bragantino', 'RBB', '#FFFFFF', '#D40032'),
  ('Atlético Mineiro', 'Atlético-MG', 'CAM', '#111111', '#FFFFFF'),
  ('Santos', 'Santos', 'SAN', '#FFFFFF', '#111111'),
  ('Corinthians', 'Corinthians', 'COR', '#111111', '#FFFFFF'),
  ('Vasco da Gama', 'Vasco', 'VAS', '#111111', '#FFFFFF'),
  ('Vitória', 'Vitória', 'VIT', '#E30613', '#111111'),
  ('Internacional', 'Inter', 'INT', '#E30613', '#FFFFFF'),
  ('Coritiba', 'Coritiba', 'CFC', '#00544D', '#FFFFFF'),
  ('Athletico-PR', 'Athletico', 'CAP', '#C8102E', '#111111'),
  ('Chapecoense', 'Chapecoense', 'CHA', '#009B3A', '#FFFFFF'),
  ('Remo', 'Remo', 'REM', '#0B1F4B', '#FFFFFF')
on conflict (name) do nothing;

insert into bolao.editions (competition_id, season, name, status, rules)
select c.id, 2026, 'Brasileirão 2026', 'running', $rules$
{
  "periods": [
    {
      "id": "T1",
      "name": "1º turno",
      "rounds": [
        1,
        19
      ]
    },
    {
      "id": "T2",
      "name": "2º turno",
      "rounds": [
        20,
        38
      ]
    }
  ],
  "matchRules": [
    {
      "type": "win",
      "points": 3
    },
    {
      "type": "draw",
      "points": 1
    },
    {
      "type": "win_by_margin",
      "minMargin": 3,
      "points": 2
    },
    {
      "type": "away_win",
      "points": 0.5
    },
    {
      "type": "win_vs_tiers",
      "teamTiers": [
        9,
        10
      ],
      "opponentTiers": [
        1,
        2
      ],
      "points": 1
    },
    {
      "type": "loss_by_margin",
      "minMargin": 3,
      "points": -2
    }
  ],
  "periodEndRules": [
    {
      "type": "standing_position",
      "positions": [
        1
      ],
      "points": 3,
      "label": "Campeão do turno"
    },
    {
      "type": "standing_position",
      "positions": [
        2
      ],
      "points": 1,
      "label": "Vice do turno"
    },
    {
      "type": "standing_position",
      "positions": [
        1,
        2,
        3,
        4
      ],
      "teamTiers": [
        9,
        10
      ],
      "points": 2,
      "label": "Nível 9/10 no G4"
    },
    {
      "type": "standing_position",
      "positions": "last4",
      "points": -3,
      "label": "Rebaixado no turno"
    }
  ],
  "tiebreakers": [
    {
      "type": "total_points"
    },
    {
      "type": "tier_points_sequence",
      "tiers": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ]
    }
  ],
  "fullTieBehavior": "share_position",
  "prizes": {
    "scope": "per_period",
    "positions": [
      1,
      2,
      3,
      "last"
    ],
    "ranking": "dense",
    "tieBehavior": "split"
  }
}
$rules$::jsonb
from bolao.competitions c
where c.name = 'Brasileirão Série A'
  and not exists (select 1 from bolao.editions e where e.season = 2026 and e.name = 'Brasileirão 2026');

insert into bolao.edition_teams (edition_id, team_id, tier)
select e.id, t.id, v.tier
from (values
  ('Flamengo', 1),
  ('Palmeiras', 1),
  ('Cruzeiro', 2),
  ('Mirassol', 2),
  ('Fluminense', 3),
  ('Botafogo', 3),
  ('Bahia', 4),
  ('São Paulo', 4),
  ('Grêmio', 5),
  ('Red Bull Bragantino', 5),
  ('Atlético Mineiro', 6),
  ('Santos', 6),
  ('Corinthians', 7),
  ('Vasco da Gama', 7),
  ('Vitória', 8),
  ('Internacional', 8),
  ('Coritiba', 9),
  ('Athletico-PR', 9),
  ('Chapecoense', 10),
  ('Remo', 10)
) as v (name, tier)
join bolao.teams t on t.name = v.name
join bolao.editions e on e.season = 2026 and e.name = 'Brasileirão 2026'
on conflict (edition_id, team_id) do nothing;

-- Depois de criar sua conta no site (/entrar), torne-se administrador:
--   insert into bolao.admins (user_id)
--   select id from auth.users where email = 'SEU_EMAIL_AQUI';
