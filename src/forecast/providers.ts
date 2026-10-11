// The five providers (vision, Team convention 2), all served by Open-Meteo.
// `model` is the Open-Meteo model id sent in the `models` query parameter and
// appended to each variable name in the response (e.g. temperature_2m_ukmo_seamless).

export const PROVIDERS = [
  { id: "ukmo", label: "Met Office (UKMO)", model: "ukmo_seamless" },
  { id: "ecmwf", label: "ECMWF", model: "ecmwf_ifs025" },
  { id: "icon", label: "DWD ICON", model: "icon_seamless" },
  { id: "gfs", label: "NOAA GFS", model: "gfs_seamless" },
  { id: "gem", label: "Environment Canada GEM", model: "gem_seamless" },
] as const;

export type Provider = (typeof PROVIDERS)[number];
export type ProviderId = Provider["id"];

/** How many providers an aggregate can be built from ("n of 5"). */
export const PROVIDER_TOTAL = PROVIDERS.length;
