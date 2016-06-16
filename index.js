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
            console.log(`TCP Server listen at ${this.port}`);
        });
    }
    /**
     * destroy proxy
     */
    destroy() {
        if (this._server) {
            this._server.close();
            this.proxySocket && this.proxySocket.end();
            this.serviceSocket && this.serviceSocket.end();
            console.log(`TCP Server(port=${this.port}) closed.`);
        }
    }
    /**
     * @private
     */
    _socketHandler(proxySocket) {
        console.log('New socket connect');

        let connected = false;
        let buffers = [];
        let serviceSocket = new net.Socket();
        serviceSocket.connect(this.target.port, this.target.host, () => {
            connected = true;
            if (buffers.length > 0) {
                for (let i = 0; i < buffers.length; i++) {
                    serviceSocket.write(buffers[i]);
                }
            }
        });
        proxySocket.on("error", error => {
            serviceSocket.end();
            this.emit('error', error);
        });
        serviceSocket.on("error", error => {
            console.error(`Could not connect to service at host ${this.target.host}:${this.target.port}`);
            proxySocket.end();
            this.emit('error', error);
        });
        proxySocket.on("data", data => {
            if (connected) {
                serviceSocket.write(data);
            } else {
                buffers.push(data);
            }
        });
        serviceSocket.on("data", data => {
            proxySocket.write(data);
        });
        proxySocket.on("close", error => {
            console.log('Client socket closed.');
            serviceSocket.end();
            this.emit('close', error);
        });
        serviceSocket.on("close", error => {
            console.log('Service socket closed.');
            proxySocket.end();
            this.emit('close', error);
        });
        this.proxySocket = proxySocket;
        this.serviceSocket = serviceSocket;
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