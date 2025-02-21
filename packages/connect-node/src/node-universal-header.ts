// Copyright 2021-2023 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type * as http from "http";
import type * as http2 from "http2";

/**
 * Convert a Node.js header object to a fetch API Headers object.
 *
 * This function works for Node.js incoming and outgoing headers, and for the
 * http and the http2 package.
 *
 * HTTP/2 pseudo-headers (:method, :path, etc.) are stripped.
 */
export function nodeHeaderToWebHeader(
  nodeHeaders:
    | http.OutgoingHttpHeaders
    | http.IncomingHttpHeaders
    | http2.IncomingHttpHeaders
    | http.IncomingMessage["trailers"],
): Headers {
  const header = new Headers();
  for (const [k, v] of Object.entries(nodeHeaders)) {
    if (k.startsWith(":")) {
      continue;
    }
    if (v === undefined) {
      continue;
    }
    if (typeof v == "string") {
      header.append(k, v);
    } else if (typeof v == "number") {
      header.append(k, String(v));
    } else {
      for (const e of v) {
        header.append(k, e);
      }
    }
  }
  return header;
}

/**
 * Convert a fetch API Headers object to a Node.js headers object.
 */
export function webHeaderToNodeHeaders(
  headersInit: HeadersInit,
): http.OutgoingHttpHeaders;
export function webHeaderToNodeHeaders(
  headersInit: HeadersInit | undefined,
): http.OutgoingHttpHeaders | undefined;
export function webHeaderToNodeHeaders(
  headersInit: HeadersInit | undefined,
): http.OutgoingHttpHeaders | undefined {
  if (headersInit === undefined) {
    return undefined;
  }
  const o = Object.create(null) as http.OutgoingHttpHeaders;
  const append = (key: string, value: string): void => {
    key = key.toLowerCase();
    const existing = o[key];
    if (typeof existing == "string") {
      o[key] = [existing, value];
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      o[key] = value;
    }
  };
  if (Array.isArray(headersInit)) {
    for (const [key, value] of headersInit) {
      append(key, value);
    }
  } else if ("forEach" in headersInit) {
    if (typeof headersInit.forEach == "function") {
      headersInit.forEach((value, key) => {
        append(key, value);
      });
    }
  } else {
    for (const [key, value] of Object.entries<string>(headersInit)) {
      append(key, value);
    }
  }
  return o;
}
