# tcpproxy
A tiny TCP proxy

## Install
```
npm install node-tcpproxy
```

## Usage
```javascript
const TcpProxy = require('node-tcpproxy');

let proxy = new TcpProxy({
    port: 1717,
    target: {
        port: 80,
        host: '192.168.1.11'
    }
});
```
