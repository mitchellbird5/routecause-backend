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

export function getNodeEnvironment(){
  const isProduction = process.env.APP_ENV === "production";
  console.log('App environment: ', process.env.APP_ENV);
  return isProduction
}