const API_BASE_URL = process.env.NEXT_PUBLIC_GOLEDGER_API_BASE_URL ?? "http://ec2-50-19-36-138.compute-1.amazonaws.com/api";
const CHANNEL_NAME = process.env.NEXT_PUBLIC_GOLEDGER_CHANNEL ?? "";
const CHAINCODE_NAME = process.env.NEXT_PUBLIC_GOLEDGER_CHAINCODE ?? "";
const BASIC_AUTH_USERNAME = process.env.NEXT_PUBLIC_GOLEDGER_BASIC_AUTH_USER ?? "";
const BASIC_AUTH_PASSWORD = process.env.NEXT_PUBLIC_GOLEDGER_BASIC_AUTH_PASSWORD ?? "";

function buildPath(path: string) {
  if (!CHANNEL_NAME || !CHAINCODE_NAME) {
    return path;
  }

  return `/${CHANNEL_NAME}/${CHAINCODE_NAME}${path}`;
}

function buildHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);

  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (BASIC_AUTH_USERNAME || BASIC_AUTH_PASSWORD) {
    headers.set("Authorization", `Basic ${btoa(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`)}`);
  }

  return headers;
}

export async function goledgerRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${buildPath(path)}`, {
    ...options,
    headers: buildHeaders(options.headers),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
