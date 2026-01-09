const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// ... Keep all the previous imports and classes ...

class APULAWebServer extends APULAServer {
    constructor() {
        super();
        
        // Override setupMiddleware to serve web files
        this.setupWebMiddleware();
        this.setupWebSocket();
    }
    
    setupWebMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Serve main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        // API routes (keep from original)
        this.setupRoutes();
    }
    
    setupWebSocket() {
        const wss = new WebSocket.Server({ server: this.server });
        
        wss.on('connection', (ws) => {
            console.log('Web client connected');
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('Web client disconnected');
            });
        });
    }
    
    handleWebSocketMessage(ws, data) {
        switch(data.type) {
            case 'connect-camera':
                this.handleWebCameraConnect(ws, data);
                break;
            case 'activate-water':
                this.waterControl.activate(data.pressure, data.duration);
                ws.send(JSON.stringify({
                    type: 'water-activated',
                    payload: { pressure: data.pressure }
                }));
                break;
            case 'deactivate-water':
                this.waterControl.deactivate();
                break;
            case 'set-sensitivity':
                this.fireDetection.setSensitivity(data.value / 100);
                break;
        }
    }
    
    async handleWebCameraConnect(ws, data) {
        try {
            let streamUrl = data.streamUrl;
            
            // For webcam, we'll handle it differently
            if (data.cameraType === 'webcam') {
                ws.send(JSON.stringify({
                    type: 'camera-connected',
                    payload: { 
                        id: 'webcam_1',
                        type: 'webcam',
                        status: 'connected'
                    }
                }));
                return;
            }
            
            const camera = await this.cameraManager.connectCamera(
                data.cameraType === 'rtsp' ? 'rtsp' : 'http',
                streamUrl,
                {}
            );
            
            ws.send(JSON.stringify({
                type: 'camera-connected',
                payload: camera
            }));
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: error.message }
            }));
        }
    }
}

const server = new APULAWebServer();
server.start();
