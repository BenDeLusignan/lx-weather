/**
 * The clubs a player can pick as their home club, or visit for an Away Game.
 *
 * Source (vision: "The clubs"): Ben's names, each searched on Google Maps as
 * "<name> tennis club" on 11 Oct 2026. `listedAs`, `address` and the
 * coordinates are what Google Maps showed for the place it found (coordinates
 * are the place's pin). Where that search did not land on the club itself, or
 * needed rewording to find the right town, `locationNote` says what was done
 * and why.
 *
 * NOT here yet: Belfast. Ben says it is about five clubs and has not said
 * which; the candidates are in the vision's Open questions. Adding Belfast is
 * adding its clubs to this list, nothing else.
 */
export interface Club {
  /** Stable key, used in URLs and in the database later. Never rename. */
  id: string;
  /** The name as Ben wrote it. */
  name: string;
  /** The place's name as Google Maps lists it. */
  listedAs: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Set only when the Google Maps result needed a check, a substitute or a reworded search. */
  locationNote?: string;
}

export const CLUBS: readonly Club[] = [
  {
    id: "enniskillen",
    name: "Enniskillen",
    listedAs: "Enniskillen Lawn Tennis Club",
    address: "1 Cooper Cres, Enniskillen BT74 6DQ",
    latitude: 54.3471114,
    longitude: -7.6272609,
  },
  {
    id: "irvinestown",
    name: "Irvinestown",
    listedAs: "Irvinestown Tennis Club",
    address: "Castle St, Irvinestown, Enniskillen BT94 1JG",
    latitude: 54.4690131,
    longitude: -7.6396602,
  },
  {
    id: "omagh",
    name: "Omagh",
    listedAs: "Omagh Lawn Tennis Club",
    address: "1 Crevenagh Rd, Omagh BT79 0EQ",
    latitude: 54.600412,
    longitude: -7.2895941,
  },
  {
    id: "limavady",
    name: "Limavady",
    listedAs: "Limavady Recreation Club",
    address: "54 Killane Rd, Limavady BT49 0TR",
    latitude: 55.0566486,
    longitude: -6.9387829,
    locationNote:
      "Google Maps has no separate Limavady tennis club; the Limavady Recreation Club runs the town's tennis (its site has an 'About Tennis' section).",
  },
  {
    id: "coleraine",
    name: "Coleraine",
    listedAs: "Coleraine Tennis Club",
    address: "Riversdale Rd, Coleraine BT52 1QX",
    latitude: 55.1351223,
    longitude: -6.6711764,
  },
  {
    id: "dungannon",
    name: "Dungannon",
    listedAs: "Dungannon Tennis Club",
    address: "Ranfurly Rd, Dungannon BT71 6EG",
    latitude: 54.5013113,
    longitude: -6.7627216,
  },
  {
    id: "ballymena",
    name: "Ballymena",
    listedAs: "Ballymena Lawn Tennis Club",
    address: "89 Galgorm Rd, Ballymena BT42 1AJ",
    latitude: 54.8653685,
    longitude: -6.2945254,
  },
  {
    id: "portadown",
    name: "Portadown",
    listedAs: "Portadown Tennis Club",
    address: "10 Bachelors Walk, Portadown BT63 5BQ",
    latitude: 54.4291079,
    longitude: -6.4272248,
  },
  {
    id: "banbridge",
    name: "Banbridge",
    listedAs: "Banbridge Leisure Centre",
    address: "15 Downshire Pl, Banbridge BT32 3JY",
    latitude: 54.352096,
    longitude: -6.2695432,
    locationNote:
      "Google Maps has no Banbridge tennis club listing. Banbridge Tennis Club's own website (banbridgetennisclub.com) says it has played at Banbridge Leisure Centre since 2017, so that is the location.",
  },
  {
    id: "downshire",
    name: "Downshire (Hillsborough)",
    listedAs: "Downshire Tennis Club",
    address: "18 Park St, Hillsborough BT26 6AL",
    latitude: 54.459741,
    longitude: -6.0838849,
  },
  {
    id: "hilden",
    name: "Hilden (Lisburn)",
    listedAs: "Hilden Tennis Academy",
    address: "36 Belfast Rd, Lisburn BT27 4AS",
    latitude: 54.517654,
    longitude: -6.033543,
    locationNote:
      "Google Maps lists this site as 'Hilden Tennis Academy'. Hilden Tennis Club's Facebook page gives the same address (36 Belfast Road, Lisburn), which is also Lisburn Racquets Club.",
  },
  {
    id: "larne",
    name: "Larne",
    listedAs: "Larne Bowling & Lawn Tennis Club",
    address: "112-120 Glenarm Rd, Larne BT40 1DZ",
    latitude: 54.8583833,
    longitude: -5.8098255,
  },
  {
    id: "whitehead",
    name: "Whitehead",
    listedAs: "Whitehead Tennis Club",
    address: "3 Castleview Rd, Whitehead, Carrickfergus BT38 9NA",
    latitude: 54.7558788,
    longitude: -5.7085706,
  },
  {
    id: "newcastle",
    name: "Newcastle",
    listedAs: "Newcastle Tennis Club",
    address: "54-56 Bryansford Rd, Newcastle BT33 0DP",
    latitude: 54.2106834,
    longitude: -5.8961247,
    locationNote: "Searched as 'Newcastle Co Down tennis club', to avoid the other Newcastles.",
  },
  {
    id: "bangor",
    name: "Bangor",
    listedAs: "Bangor Lawn Tennis Club",
    address: "Farnham Park, Bangor BT20 3SR",
    latitude: 54.6617898,
    longitude: -5.6824661,
    locationNote:
      "Google Maps' first result for 'Bangor tennis club' was Bangor in Wales (LL57). This is the Bangor, Co Down club, found by searching 'Bangor Co Down tennis club'.",
  },
  {
    id: "donaghadee",
    name: "Donaghadee",
    listedAs: "Donaghadee Lawn Tennis Club",
    address: "The Cmns, Donaghadee BT21 0JB",
    latitude: 54.634762,
    longitude: -5.5324148,
  },
  {
    id: "cloughey",
    name: "Cloughey",
    listedAs: "Cloughey & District Tennis Club",
    address: "250 Main Rd, Cloughey, Newtownards BT22 1JN",
    latitude: 54.4378669,
    longitude: -5.4679771,
  },
];
