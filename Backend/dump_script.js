const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9229/json', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        const parsedData = JSON.parse(rawData);
        const wsUrl = parsedData[0].webSocketDebuggerUrl;
        console.log("Connecting to", wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            console.log("Connected");
            ws.send(JSON.stringify({ id: 1, method: 'Debugger.enable' }));
            // Also explicitly ask for scripts
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.method === 'Debugger.scriptParsed') {
                const url = msg.params.url;
                console.log("Script:", url);
                if (url.endsWith('server.js') || url.includes('server.js')) {
                    console.log('Found script!', msg.params.scriptId, url);
                    ws.send(JSON.stringify({ 
                        id: Number(msg.params.scriptId) + 1000, 
                        method: 'Debugger.getScriptSource', 
                        params: { scriptId: msg.params.scriptId } 
                    }));
                }
            } else if (msg.id >= 1000) {
                console.log('Writing source to recovered_server.js');
                fs.writeFileSync('recovered_server.js', msg.result.scriptSource);
                process.exit(0);
            }
        });
        
        setTimeout(() => {
            console.log("Timeout reached.");
            process.exit(0);
        }, 3000);
    });
});
