import type { BinaryReadOptions, BinaryWriteOptions, JsonReadOptions, JsonWriteOptions } from "@bufbuild/protobuf";
import type { Interceptor, Transport } from "@connectrpc/connect";
/**
 * Options used to configure the Connect transport.
 *
 * See createConnectTransport().
 */
export interface ConnectTransportOptions {
    /**
     * Base URI for all HTTP requests.
     *
     * Requests will be made to <baseUrl>/<package>.<service>/method
     *
     * Example: `baseUrl: "https://example.com/my-api"`
     *
     * This will make a `POST /my-api/my_package.MyService/Foo` to
     * `example.com` via HTTPS.
     *
     * If your API is served from the same domain as your site, use
     * `baseUrl: window.location.origin` or simply "/".
     */
    baseUrl: string;
    /**
     * By default, connect-web clients use the JSON format.
     */
    useBinaryFormat?: boolean;
    /**
     * Controls what the fetch client will do with credentials, such as
     * Cookies. The default value is "same-origin". For reference, see
     * https://fetch.spec.whatwg.org/#concept-request-credentials-mode
     */
    credentials?: RequestCredentials;
    /**
     * Interceptors that should be applied to all calls running through
     * this transport. See the Interceptor type for details.
     */
    interceptors?: Interceptor[];
    /**
     * Options for the JSON format.
     * By default, unknown fields are ignored.
     */
    jsonOptions?: Partial<JsonReadOptions & JsonWriteOptions>;
    /**
     * Options for the binary wire format.
     */
    binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>;
    /**
     * Optional override of the fetch implementation used by the transport.
     */
    fetch?: typeof globalThis.fetch;
    /**
     * Controls whether or not Connect GET requests should be used when
     * available, on side-effect free methods. Defaults to false.
     */
    useHttpGet?: boolean;
}
/**
 * Create a Transport for the Connect protocol, which makes unary and
 * server-streaming methods available to web browsers. It uses the fetch
 * API to make HTTP requests.
 */
export declare function createConnectTransport(options: ConnectTransportOptions): Transport;
