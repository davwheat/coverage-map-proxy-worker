import B2EndpointGenerator from './B2EndpointGenerator';
import BlankTile from './BlankTile';

import Error400 from './views/400.html';
import Error502 from './views/502.html';

/*
X-Bz-Content-Sha1:
unverified:f58ff85b43b2d09a6dae0a6b2e169919a92042d9
X-Bz-File-Id:
4_zb795fe950f898c2b8a780716_f1044ad0878e668d7_d20230417_m024212_c003_v0312000_t0000_u01677936370717
X-Bz-File-Name:
256_blank_tile.png
X-Bz-Info-S3b-Last-Modified:
20230304T132544Z
X-Bz-Info-Sha256:
b457592fb400acc1bc429a67c98d96231b9cd227e9ebe042bf38d9d9e0193929
X-Bz-Replication-Status:
REPLICA
X-Bz-Upload-Timestamp:
1677936370717
*/

const GLOBAL_RESPONSE_HEADERS = {
  'Cache-Control': 'public, max-age=86400',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const GLOBAL_REQUEST_CF_OPTIONS = {
  cacheTtlByStatus: { '200-299': 86400, 404: 120, '500-599': 0 },
  cacheEverything: true,
};

const handler: ExportedHandler = {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const { url } = request;

    const b2Endpoint = B2EndpointGenerator.getB2Endpoint(url);

    if (!b2Endpoint) {
      // Default to 400 error if we can't generate a B2 endpoint from the request URI
      return new Response(Error400, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    const tileResponse = await fetch(b2Endpoint, { method: 'HEAD', cf: GLOBAL_REQUEST_CF_OPTIONS });

    if (tileResponse.ok) {
      // Well it's a valid tile!
      const usingEtags = request.headers.has('If-None-Match');
      const b2Sha1 = tileResponse.headers.get('X-Bz-Content-Sha1');

      if (!usingEtags) {
        // If the client hasn't provided any ETag related headers, we can just return the tile
        // along with its SHA1 as an ETag
        return new Response(await (await fetch(b2Endpoint, { cf: GLOBAL_REQUEST_CF_OPTIONS })).blob(), {
          status: 200,
          headers: !b2Sha1 ? { ...GLOBAL_RESPONSE_HEADERS } : { ...GLOBAL_RESPONSE_HEADERS, ETag: b2Sha1 },
        });
      } else {
        // Client has provided an ETag, so we need to check if it matches the B2 SHA1
        if (!b2Sha1) {
          // No hash from B2 for some reason! Just return the tile.
          return new Response(await (await fetch(b2Endpoint, { cf: GLOBAL_REQUEST_CF_OPTIONS })).blob(), {
            status: 200,
            headers: { ...GLOBAL_RESPONSE_HEADERS },
          });
        }

        if (b2Sha1 === request.headers.get('If-None-Match')) {
          // ETag matches, so we can return a 304 with no content
          return new Response(null, {
            status: 304,
            headers: {
              ETag: b2Sha1,
              ...GLOBAL_RESPONSE_HEADERS,
            },
          });
        } else {
          // ETag doesn't match, so we can return the tile along with its new ETag
          return new Response(await (await fetch(b2Endpoint, { cf: GLOBAL_REQUEST_CF_OPTIONS })).blob(), {
            status: 200,
            headers: {
              ETag: b2Sha1,
              ...GLOBAL_RESPONSE_HEADERS,
            },
          });
        }
      }
    }

    // Something has gone wrong fetching the tile from B2
    const status = tileResponse.status;

    switch (status) {
      case 404: {
        // If it's a 404, we should just return the blank tile PNG
        const ETAG = 'blank-tile-v1';

        if (request.headers.get('If-None-Match') === ETAG) {
          return new Response(null, { status: 304, headers: { ETag: ETAG } });
        } else {
          return new Response(BlankTile.getBlankTile(), {
            status: 404,
            headers: {
              'Content-Type': 'image/png',
              ETag: ETAG,
              ...GLOBAL_RESPONSE_HEADERS,
            },
          });
        }
      }

      default: {
        // If it's anything else, return 502 Bad Gateway and hope it's fixed soon
        const ETAG = '502-v1';

        if (request.headers.get('If-None-Match') === ETAG) {
          return new Response(null, { status: 304, headers: { ETag: ETAG } });
        } else {
          return new Response(Error502, {
            status: 502,
            headers: {
              'Content-Type': 'text/html',
              ETag: ETAG,
              ...GLOBAL_RESPONSE_HEADERS,
            },
          });
        }
      }
    }
  },
};

export default handler;
