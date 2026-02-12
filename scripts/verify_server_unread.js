const API_URL = 'http://127.0.0.1:3000';

async function verifyServerUnread() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        
        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.statusText}`);
        }
        
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Logged in.');

        // 2. Get Servers
        console.log('Fetching servers...');
        const serversRes = await fetch(`${API_URL}/servers`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const serversData = await serversRes.json();
        
        if (serversData.length === 0) {
            console.log('No servers found. Create one first.');
            return;
        }

        const serverId = serversData[0].id;
        console.log(`Checking server ${serverId}...`);

        // 3. Get Server Details
        const detailsRes = await fetch(`${API_URL}/servers/${serverId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const detailsData = await detailsRes.json();
        const channels = detailsData.channels;
        console.log('Channels:', JSON.stringify(channels, null, 2));

        const hasUnreadField = channels.every(c => 'unreadCount' in c);
        if (hasUnreadField) {
            console.log('SUCCESS: All channels have unreadCount field.');
        } else {
            console.error('FAILURE: Some channels are missing unreadCount field.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyServerUnread();
