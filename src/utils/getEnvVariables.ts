export function getOrsApiKey() {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey)
    throw new Error("ORS_API_KEY not defined in production environment");
  return apiKey
};

export function getGeocodeBaseUrl(){
  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");
  return baseUrl
}

export function getRouteBaseUrl(){
  const baseUrl = process.env.ROUTER_URL!;
  if (!baseUrl)
    throw new Error("ROUTER_URL not defined in production environment");
  return baseUrl
}

export function getGeoSnapBaseUrl(){
  const snapUrl = process.env.GEOSNAP_URL!;
  if (!snapUrl)
    throw new Error("GEOSNAP_URL not defined in production environment");
  return snapUrl
}