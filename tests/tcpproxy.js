const TCPProxy = require('../');

const server = new TCPProxy({
    port: 10987,
    target: {
        port: 8181,
        host: '127.0.0.1'
    }
});
