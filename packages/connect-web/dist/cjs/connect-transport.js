"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectTransport = void 0;
const protobuf_1 = require("@bufbuild/protobuf");
const connect_1 = require("@connectrpc/connect");
const protocol_1 = require("@connectrpc/connect/protocol");
const protocol_connect_1 = require("@connectrpc/connect/protocol-connect");
const assert_fetch_api_js_1 = require("./assert-fetch-api.js");
/**
 * Create a Transport for the Connect protocol, which makes unary and
 * server-streaming methods available to web browsers. It uses the fetch
 * API to make HTTP requests.
 */
function createConnectTransport(options) {
    var _a;
    (0, assert_fetch_api_js_1.assertFetchApi)();
    const useBinaryFormat = (_a = options.useBinaryFormat) !== null && _a !== void 0 ? _a : false;
    return {
        async unary(service, method, signal, timeoutMs, header, message) {
            var _a;
            const { serialize, parse } = (0, protocol_1.createClientMethodSerializers)(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
            return await (0, protocol_1.runUnaryCall)({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service,
                    method,
                    url: (0, protocol_1.createMethodUrl)(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: (_a = options.credentials) !== null && _a !== void 0 ? _a : "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: (0, protocol_connect_1.requestHeader)(method.kind, useBinaryFormat, timeoutMs, header),
                    message,
                },
                next: async (req) => {
                    var _a;
                    const useGet = options.useHttpGet === true &&
                        method.idempotency === protobuf_1.MethodIdempotency.NoSideEffects;
                    let body = null;
                    if (useGet) {
                        req = (0, protocol_connect_1.transformConnectPostToGetRequest)(req, serialize(req.message), useBinaryFormat);
                    }
                    else {
                        body = serialize(req.message);
                    }
                    const fetch = (_a = options.fetch) !== null && _a !== void 0 ? _a : globalThis.fetch;
                    const response = await fetch(req.url, Object.assign(Object.assign({}, req.init), { headers: req.header, signal: req.signal, body }));
                    const { isUnaryError, unaryError } = (0, protocol_connect_1.validateResponse)(method.kind, response.status, response.headers);
                    if (isUnaryError) {
                        throw (0, protocol_connect_1.errorFromJson)((await response.json()), (0, connect_1.appendHeaders)(...(0, protocol_connect_1.trailerDemux)(response.headers)), unaryError);
                    }
                    const [demuxedHeader, demuxedTrailer] = (0, protocol_connect_1.trailerDemux)(response.headers);
                    return {
                        stream: false,
                        service,
                        method,
                        header: demuxedHeader,
                        message: useBinaryFormat
                            ? parse(new Uint8Array(await response.arrayBuffer()))
                            : method.O.fromJson((await response.json()), (0, protocol_1.getJsonOptions)(options.jsonOptions)),
                        trailer: demuxedTrailer,
                    };
                },
            });
        },
        async stream(service, method, signal, timeoutMs, header, input) {
            var _a;
            const { serialize, parse } = (0, protocol_1.createClientMethodSerializers)(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
            function parseResponseBody(body, trailerTarget) {
                return __asyncGenerator(this, arguments, function* parseResponseBody_1() {
                    const reader = (0, protocol_1.createEnvelopeReadableStream)(body).getReader();
                    let endStreamReceived = false;
                    for (;;) {
                        const result = yield __await(reader.read());
                        if (result.done) {
                            break;
                        }
                        const { flags, data } = result.value;
                        if ((flags & protocol_connect_1.endStreamFlag) === protocol_connect_1.endStreamFlag) {
                            endStreamReceived = true;
                            const endStream = (0, protocol_connect_1.endStreamFromJson)(data);
                            if (endStream.error) {
                                throw endStream.error;
                            }
                            endStream.metadata.forEach((value, key) => trailerTarget.set(key, value));
                            continue;
                        }
                        yield yield __await(parse(data));
                    }
                    if (!endStreamReceived) {
                        throw "missing EndStreamResponse";
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
                return (0, protocol_1.encodeEnvelope)(0, serialize(r.value));
            }
            return await (0, protocol_1.runStreamingCall)({
                interceptors: options.interceptors,
                timeoutMs,
                signal,
                req: {
                    stream: true,
                    service,
                    method,
                    url: (0, protocol_1.createMethodUrl)(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: (_a = options.credentials) !== null && _a !== void 0 ? _a : "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: (0, protocol_connect_1.requestHeader)(method.kind, useBinaryFormat, timeoutMs, header),
                    message: input,
                },
                next: async (req) => {
                    var _a;
                    const fetch = (_a = options.fetch) !== null && _a !== void 0 ? _a : globalThis.fetch;
                    const fRes = await fetch(req.url, Object.assign(Object.assign({}, req.init), { headers: req.header, signal: req.signal, body: await createRequestBody(req.message) }));
                    (0, protocol_connect_1.validateResponse)(method.kind, fRes.status, fRes.headers);
                    if (fRes.body === null) {
                        throw "missing response body";
                    }
                    const trailer = new Headers();
                    const res = Object.assign(Object.assign({}, req), { header: fRes.headers, trailer, message: parseResponseBody(fRes.body, trailer) });
                    return res;
                },
            });
        },
    };
}
exports.createConnectTransport = createConnectTransport;
