export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.hostname = "incumbency.inkhel.workers.dev";
    url.protocol = "https:";
    url.port = "";

    const headers = new Headers(request.headers);
    headers.set("Host", "incumbency.inkhel.workers.dev");
    headers.set("X-Forwarded-Host", "incum.atloan.in");
    headers.set("X-Forwarded-Proto", "https");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const newReq = new Request(url.toString(), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });

    const response = await fetch(newReq);
    const newHeaders = new Headers(response.headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
