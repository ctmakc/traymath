// Demo caterer for the TrayMath proof of concept.
// Every name, price and label below is SAMPLE DATA for a fictional caterer.
// A real caterer would supply their own trays, labels and house rules.

export const CATERER = {
  name: 'Juniper Table',
  tagline: 'Party platters · demo caterer',
  email: 'orders@junipertable.example',
  currency: 'CAD',
  sampleNotice: 'Demo caterer. Menu, prices and labels are sample data.',
};

// Pieces each guest eats, by kind of party (the caterer's house rule).
// The auto-plan also keeps sweet trays to at most SWEET_SHARE of the pieces needed.
export const PARTY_TYPES = [
  { id: 'nibbles', label: 'Drinks & nibbles', hours: '1–2 h', piecesPerGuest: 6 },
  { id: 'cocktail', label: 'Cocktail party', hours: '2–3 h', piecesPerGuest: 10 },
  { id: 'grazing', label: 'Grazing meal', hours: 'replaces a meal', piecesPerGuest: 14 },
];

export const SWEET_SHARE = 0.3;

export const DIETS = [
  { id: 'vegetarian', label: 'Vegetarian', code: 'V' },
  { id: 'vegan', label: 'Vegan', code: 'VG' },
  { id: 'halal', label: 'Halal', code: 'H' },
];

// `free` is how a group that avoids the allergen is named ("Nut-free").
export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', free: 'Gluten-free', code: 'GF' },
  { id: 'dairy', label: 'Dairy', free: 'Dairy-free', code: 'DF' },
  { id: 'nuts', label: 'Nuts', free: 'Nut-free', code: 'NF' },
  { id: 'egg', label: 'Egg', free: 'Egg-free', code: 'EF' },
  { id: 'fish', label: 'Fish & shellfish', free: 'Fish-free', code: 'FSF' },
  { id: 'sesame', label: 'Sesame', free: 'Sesame-free', code: 'SSF' },
];

// diets: which diets the caterer certifies the tray for (vegan implies vegetarian).
// contains: allergens the caterer lists for the tray.
export const MENU = [
  { id: 'hummus-cups', name: 'Hummus & crudité cups', pieces: 12, price: 34, diets: ['vegan', 'halal'], contains: ['sesame'] },
  { id: 'fruit-skewers', name: 'Fruit skewers', pieces: 24, price: 38, diets: ['vegan', 'halal'], contains: [], sweet: true },
  { id: 'rice-rolls', name: 'Rice paper rolls, sweet chili', pieces: 16, price: 36, diets: ['vegan', 'halal'], contains: [] },
  { id: 'falafel', name: 'Falafel bites, tahini', pieces: 24, price: 40, diets: ['vegan', 'halal'], contains: ['sesame'] },
  { id: 'caprese', name: 'Caprese skewers', pieces: 24, price: 42, diets: ['vegetarian', 'halal'], contains: ['dairy'] },
  { id: 'mushroom-tartlets', name: 'Mushroom tartlets', pieces: 24, price: 42, diets: ['vegetarian'], contains: ['gluten', 'dairy', 'egg'] },
  { id: 'cheese-board', name: 'Cheese & grape board', pieces: 30, price: 58, diets: ['vegetarian'], contains: ['dairy', 'nuts'] },
  { id: 'chicken-satay', name: 'Chicken satay, peanut sauce', pieces: 24, price: 48, diets: ['halal'], contains: ['nuts'] },
  { id: 'beef-sliders', name: 'Mini beef sliders', pieces: 12, price: 44, diets: ['halal'], contains: ['gluten', 'dairy', 'sesame'] },
  { id: 'salmon-blinis', name: 'Smoked salmon blinis', pieces: 24, price: 52, diets: [], contains: ['fish', 'gluten', 'dairy', 'egg'] },
  { id: 'brownie-bites', name: 'Brownie bites', pieces: 24, price: 36, diets: ['vegetarian'], contains: ['gluten', 'dairy', 'egg'], sweet: true },
  { id: 'meringue-kisses', name: 'Lemon meringue kisses', pieces: 24, price: 30, diets: ['vegetarian'], contains: ['egg'], sweet: true },
];

// What a first-time visitor sees: a realistic office party.
export const SAMPLE_PARTY = {
  partyType: 'cocktail',
  guests: 30,
  groups: [
    { count: 3, diets: ['vegetarian'], avoid: [] },
    { count: 2, diets: ['vegan'], avoid: [] },
    { count: 1, diets: ['vegan'], avoid: ['gluten'] },
  ],
};

export const menuById = Object.fromEntries(MENU.map((m) => [m.id, m]));
export const partyTypeById = Object.fromEntries(PARTY_TYPES.map((p) => [p.id, p]));
export const dietById = Object.fromEntries(DIETS.map((d) => [d.id, d]));
export const allergenById = Object.fromEntries(ALLERGENS.map((a) => [a.id, a]));
