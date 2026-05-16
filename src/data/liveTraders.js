// Pool of fake user names used to populate the Live Trades sidebar feed.
// Pick first + last from these arrays at random for an evergreen sample.

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Mia', 'Liam', 'Olivia', 'Noah', 'Emma', 'Aiden', 'Sophia', 'Kai',
  'Lucas', 'Zoe', 'Ethan', 'Ava', 'Mason', 'Lily', 'Caleb', 'Maya', 'Daniel', 'Nora',
  'Isaac', 'Chloe', 'Leo', 'Riley', 'Evan', 'Hannah', 'Nathan', 'Layla', 'Owen', 'Ruby',
  'Oscar', 'Stella', 'Henry', 'Ivy', 'Theo', 'Iris', 'Jasper', 'Vera', 'Felix', 'Nina',
]

const LAST_NAMES = [
  'Stone', 'Rivera', 'Holt', 'Park', 'Mendez', 'Vance', 'Cole', 'Reyes', 'Brooks', 'Grant',
  'Lopez', 'Carter', 'Hayes', 'Wells', 'Castro', 'Diaz', 'Pierce', 'Frost', 'Black', 'Quinn',
  'Vega', 'Lane', 'Voss', 'Knight', 'Cross', 'Drake', 'Bell', 'Hart', 'Clark', 'Foster',
]

export function randomTraderName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  return `${f} ${l}`
}
