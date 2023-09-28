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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
import { Message } from "@bufbuild/protobuf";
import { createClientMethodSerializers, createEnvelopeReadableStream, createMethodUrl, encodeEnvelope, runStreamingCall, runUnaryCall, } from "@connectrpc/connect/protocol";
import { requestHeader, trailerFlag, trailerParse, validateResponse, validateTrailer, } from "@connectrpc/connect/protocol-grpc-web";
import { assertFetchApi } from "./assert-fetch-api.js";
/**
 * Create a Transport for the gRPC-web protocol. The protocol encodes
 * trailers in the response body and makes unary and server-streaming
 * methods available to web browsers. It uses the fetch API to make
 * HTTP requests.
 *
 * Note that this transport does not implement the grpc-web-text format,
 * which applies base64 encoding to the request and response bodies to
 * support reading streaming responses from an XMLHttpRequest.
 */
export function createGrpcWebTransport(options) {
    var _a;
    assertFetchApi();
    const useBinaryFormat = (_a = options.useBinaryFormat) !== null && _a !== void 0 ? _a : true;
    return {
        async unary(service, method, signal, timeoutMs, header, message) {
            var _a;
            const { serialize, parse } = createClientMethodSerializers(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
            return await runUnaryCall({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service,
                    method,
                    url: createMethodUrl(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: (_a = options.credentials) !== null && _a !== void 0 ? _a : "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: requestHeader(useBinaryFormat, timeoutMs, header),
                    message,
                },
                next: async (req) => {
                    var _a;
                    const fetch = (_a = options.fetch) !== null && _a !== void 0 ? _a : globalThis.fetch;
                    const response = await fetch(req.url, Object.assign(Object.assign({}, req.init), { headers: req.header, signal: req.signal, body: encodeEnvelope(0, serialize(req.message)) }));
                    validateResponse(response.status, response.headers);
                    if (!response.body) {
                        throw "missing response body";
                    }
                    const reader = createEnvelopeReadableStream(response.body).getReader();
                    let trailer;
                    let message;
                    for (;;) {
                        const r = await reader.read();
                        if (r.done) {
                            break;
                        }
                        const { flags, data } = r.value;
                        if (flags === trailerFlag) {
                            if (trailer !== undefined) {
                                throw "extra trailer";
                            }
                            // Unary responses require exactly one response message, but in
                            // case of an error, it is perfectly valid to have a response body
                            // that only contains error trailers.
                            trailer = trailerParse(data);
                            continue;
                        }
                        if (message !== undefined) {
                            throw "extra message";
                        }
                        message = parse(data);
                    }
                    if (trailer === undefined) {
                        throw "missing trailer";
                    }
                    validateTrailer(trailer);
                    if (message === undefined) {
                        throw "missing message";
                    }
                    return {
                        stream: false,
                        header: response.headers,
                        message,
                        trailer,
                    };
                },
            });
        },
        async stream(service, method, signal, timeoutMs, header, input) {
            var _a;
            const { serialize, parse } = createClientMethodSerializers(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
            function parseResponseBody(body, foundStatus, trailerTarget) {
                return __asyncGenerator(this, arguments, function* parseResponseBody_1() {
                    const reader = createEnvelopeReadableStream(body).getReader();
                    if (foundStatus) {
                        // A grpc-status: 0 response header was present. This is a "trailers-only"
                        // response (a response without a body and no trailers).
                        //
                        // The spec seems to disallow a trailers-only response for status 0 - we are
                        // lenient and only verify that the body is empty.
                        //
                        // > [...] Trailers-Only is permitted for calls that produce an immediate error.
                        // See https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
                        if (!(yield __await(reader.read())).done) {
                            throw "extra data for trailers-only";
                        }
                        return yield __await(void 0);
                    }
                    let trailerReceived = false;
                    for (;;) {
                        const result = yield __await(reader.read());
                        if (result.done) {
                            break;
                        }
                        const { flags, data } = result.value;
                        if ((flags & trailerFlag) === trailerFlag) {
                            if (trailerReceived) {
                                throw "extra trailer";
                            }
                            trailerReceived = true;
                            const trailer = trailerParse(data);
                            validateTrailer(trailer);
                            trailer.forEach((value, key) => trailerTarget.set(key, value));
                            continue;
                        }
                        if (trailerReceived) {
                            throw "extra message";
                        }
                        yield yield __await(parse(data));
                        continue;
                    }
                    if (!trailerReceived) {
                        throw "missing trailer";
                    }
                });
            }
            async function createRequestBody(input) {
                if (!TransformStream) {
                    throw "The fetch API does not support streaming request bodies";
                }
                const r = await input[Symbol.asyncIterator]().next();
                if (r.done == true) {
                    throw "missing request message";
                }
                return encodeEnvelope(0, serialize(r.value));
            }
            return runStreamingCall({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: true,
                    service,
                    method,
                    url: createMethodUrl(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: (_a = options.credentials) !== null && _a !== void 0 ? _a : "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: requestHeader(useBinaryFormat, timeoutMs, header),
                    message: input,
                },
                next: async (req) => {
                    var _a;
                    const fetch = (_a = options.fetch) !== null && _a !== void 0 ? _a : globalThis.fetch;
                    const fRes = await fetch(req.url, Object.assign(Object.assign({}, req.init), { headers: req.header, signal: req.signal, body: await createRequestBody(req.message) }));
                    const { foundStatus } = validateResponse(fRes.status, fRes.headers);
                    if (!fRes.body) {
                        throw "missing response body";
                    }
                    const trailer = new Headers();
                    const res = Object.assign(Object.assign({}, req), { header: fRes.headers, trailer, message: parseResponseBody(fRes.body, foundStatus, trailer) });
                    return res;
                },
            });
        },
    };
}
