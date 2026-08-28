/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import Fastify                   from "fastify"
import fastifyWebsocket          from "@fastify/websocket"
import type { WebSocket }        from "ws"

import { literal, type Verbose } from "./specbook-verbose.js"

/*  the default listening address and port of the preview server  */
export const previewAddr = "127.0.0.1"
export const previewPort = 12345

/*  the options of the preview command  */
export interface PreviewOptions {
    addr:    string
    port:    number
    verbose: Verbose
}

/*  the running preview server, fed with every fresh HTML export  */
export interface PreviewServer {
    update: (html: Buffer) => void
}

/*  serve the live HTML preview: a plain GET on "/" answers with the
    most recent HTML export (or with 503 before the first successful
    one), while a WebSocket upgrade on "/" subscribes the client to the
    "RELOAD" command every fresh export broadcasts  */
export const servePreview = async (options: PreviewOptions): Promise<PreviewServer> => {
    let html: Buffer | undefined
    const clients = new Set<WebSocket>()
    const fastify = Fastify()
    await fastify.register(fastifyWebsocket)
    fastify.route({
        method: "GET",
        url:    "/",
        handler: (_request, reply) => {
            if (html === undefined)
                return reply.code(503).type("text/plain; charset=utf-8")
                    .send("no specification export available yet\n")
            return reply.type("text/html; charset=utf-8").send(html)
        },
        wsHandler: (socket) => {
            clients.add(socket)
            socket.on("close", () => { clients.delete(socket) })
        }
    })
    await fastify.listen({ host: options.addr, port: options.port })
    options.verbose(`listening on ${literal(`http://${options.addr}:${options.port}/`)}`, "notice")
    return {
        update: (buffer: Buffer) => {
            html = buffer
            options.verbose(`notifying ${literal(clients.size)} preview client(s)`)
            for (const client of clients)
                if (client.readyState === client.OPEN)
                    client.send("RELOAD")
        }
    }
}
