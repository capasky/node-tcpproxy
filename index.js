/**
 * TCP Proxy
 * @author  Capasky(capasky@live.com)
 */

'use strict';

const tls = require('tls');
const net = require('net');
const EventEmitter = require('events');

/**
 * A tiny TCP proxy
 */
class TCPProxy extends EventEmitter {
    /**
     * @param   {Object}    options     options to init a TCPProxy
     * @param   {Number}    options.port    proxy linsten port
     * @param   {Number}    options.target.port  proxy target port
     * @param   {String}    options.target.host  proxy target host ip
     * @param   {Boolean}   options.ssl whether to use ssl
     */
    constructor(options) {
        super();
        this.port = options.port;
        this.target = options.target;
        this.ssl = options.ssl;
        this.clientSockets = new Set();
        this.serverSockets = new Set();
        this.createServer();
    }
    /**
     * Create a socket server to provide a proxy
     */
    createServer() {
        if (this._server) {
            return;
        }
        this._server = this.ssl
            ? tls.createServer(this.ssl, this._socketHandler.bind(this))
            : net.createServer(this._socketHandler.bind(this));
        this.on('error', this._onError);
        this._server.listen(this.port, () => {
            console.log('TCP Server listen at %s', this.port);
        });
    }
    /**
     * Close socket server and destroy the proxy
     */
    closeServer() {
        if (this._server) {
            for (let socket of this.clientSockets) {
                !socket.destroyed && socket.destroy();
            }
            for (let socket of this.serverSockets) {
                !socket.destroyed && socket.destroy();
            }
            this._server.close(() => {
                console.log(`TCP Server(port=${this.port}) closed.`);
                this._server = null;
            });
        }
    }
    /**
     * @private
     */
    _socketHandler(clientSocket) {
        console.log(`Receive new socket connection from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

        let clientSocketConnected = true;
        let serverSocketConnected = false;

        clientSocket.setKeepAlive(true);
        this.clientSockets.add(clientSocket);
        const buffers = [];
        const serverSocket = new net.createConnection({
            port: this.target.port,
            host: this.target.host
        }, () => {
            serverSocketConnected = true;
            this.serverSockets.add(serverSocket)
            try {
                buffers.forEach(buffer => {
                    serverSocket.write(buffer);
                });
            } catch (error) {
                serverSocket.destroy(error);
            }
        });

        clientSocket.on('end', () => clientSocketConnected = false);
        serverSocket.on('end', () => serverSocketConnected = false);

        clientSocket.on("error", error => {
            clientSocketConnected = false;
            !serverSocket.destroyed && serverSocket.destroy(error);
            console.error(`Client socket error`);
            this.emit('error', error);
        });
        serverSocket.on("error", error => {
            serverSocketConnected = false;
            !clientSocket.destroyed && clientSocket.destroy(error);
            console.error(`Could not connect to service at host ${this.target.host}:${this.target.port}`);
            this.emit('error', error);
        });

        clientSocket.on("data", data => {
            if (serverSocketConnected) {
                try {
                    serverSocket.write(data);
                } catch (error) {
                    this.emit('error', error);
                }
            } else {
                buffers.push(data);
            }
        });
        serverSocket.on("data", data => {
            if (clientSocketConnected) {
                try {
                    clientSocket.write(data);
                } catch (error) {
                    this.emit('error', error);
                }
            }
        });

        clientSocket.on("close", error => {
            console.log('Client socket closed.');
            this.clientSockets.has(clientSocket) && this.clientSockets.delete(clientSocket);
            this.emit('close', error);
        });
        serverSocket.on("close", error => {
            console.log('Server socket closed.');
            this.serverSockets.has(serverSocket) && this.serverSockets.delete(serverSocket);
            this.emit('close', error);
        });
    }
    /**
     * @private
     */
    _onError(err) {
        console.error(err);
        this._server.emit('error', err);
    }
}

module.exports = TCPProxy;