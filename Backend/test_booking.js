const http = require('http');

const data = JSON.stringify({
    id: 12345,
    customerName: 'Test',
    phone: '1234',
    rationCard: '123456789012',
    date: '2026-03-12',
    time: '8-9 AM',
    family_members: 4,
    selectedItems: ['rice']
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/bookings',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
