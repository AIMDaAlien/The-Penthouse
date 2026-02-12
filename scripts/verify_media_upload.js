const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://127.0.0.1:3000';

function makeRequest(method, path, headers, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);
        const options = {
            method: method,
            headers: headers,
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Request failed: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

function createMultipartBody(fields, files, boundary) {
    let body = Buffer.alloc(0);

    // Fields
    for (const [key, value] of Object.entries(fields)) {
        body = Buffer.concat([
            body,
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`),
            Buffer.from(`${value}\r\n`)
        ]);
    }

    // Files
    for (const [key, file] of Object.entries(files)) {
        body = Buffer.concat([
            body,
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${file.filename}"\r\n`),
            Buffer.from(`Content-Type: ${file.contentType}\r\n\r\n`),
            file.content,
            Buffer.from('\r\n')
        ]);
    }

    body = Buffer.concat([
        body,
        Buffer.from(`--${boundary}--\r\n`)
    ]);

    return body;
}

async function verifyMediaUpload() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginData = await makeRequest('POST', '/auth/login', {
            'Content-Type': 'application/json'
        }, JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        }));

        const token = loginData.token;
        console.log('Logged in.');

        // 2. Create dummy files
        const boundary = '--------------------------' + Date.now().toString(16);
        const imageContent = Buffer.from('fake image content');
        const voiceContent = Buffer.from('fake audio content');

        // 3. Test File Upload (as Image)
        console.log('Testing File Upload...');
        const fileBody = createMultipartBody({}, {
            file: { filename: 'test_image.png', contentType: 'image/png', content: imageContent }
        }, boundary);

        const uploadData = await makeRequest('POST', '/media/upload', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fileBody.length
        }, fileBody);

        console.log('Upload Response:', uploadData);
        if (uploadData.type === 'image' && uploadData.url) {
            console.log('SUCCESS: File uploaded as image.');
        } else {
            console.error('FAILURE: Unexpected upload response.');
        }

        // 4. Test Voice Upload
        console.log('Testing Voice Upload...');
        const voiceBody = createMultipartBody({
            duration: '5'
        }, {
            voice: { filename: 'voice.m4a', contentType: 'audio/m4a', content: voiceContent }
        }, boundary);

        const voiceData = await makeRequest('POST', '/media/voice', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': voiceBody.length
        }, voiceBody);

        console.log('Voice Response:', voiceData);
        if (voiceData.url && voiceData.params && voiceData.params.duration == 5) {
            console.log('SUCCESS: Voice uploaded with duration.');
        } else {
            console.error('FAILURE: Unexpected voice response.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyMediaUpload();
