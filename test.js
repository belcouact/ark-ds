const API_KEY = '3654c0c8-acfd-469e-a1a4-eca3a9a95a5e';
const WORKER_URL = 'https://ark-ds.5525899.workers.dev';

async function testWorker() {
    console.log('Testing Cloudflare Worker...\n');

    // Test 1: GET request to root endpoint
    console.log('Test 1: Testing GET request to root endpoint');
    try {
        const getResponse = await fetch(WORKER_URL);
        const getData = await getResponse.json();
        console.log('GET Response:', getData);
        console.log('GET Status:', getResponse.status);
        console.log('GET Test: ' + (getResponse.ok ? '✅ PASSED' : '❌ FAILED') + '\n');
    } catch (error) {
        console.log('GET Test: ❌ FAILED');
        console.log('Error:', error.message + '\n');
    }

    // Test 2: POST request without API key
    console.log('Test 2: Testing POST request without API key');
    try {
        const noKeyResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello!' }]
            })
        });
        const noKeyData = await noKeyResponse.json();
        console.log('No Key Response:', noKeyData);
        console.log('No Key Status:', noKeyResponse.status);
        console.log('No Key Test: ' + (noKeyResponse.status === 401 ? '✅ PASSED' : '❌ FAILED') + '\n');
    } catch (error) {
        console.log('No Key Test: ❌ FAILED');
        console.log('Error:', error.message + '\n');
    }

    // Test 3: POST request with API key
    console.log('Test 3: Testing POST request with API key');
    try {
        const postResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello!' }],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        const postData = await postResponse.json();
        console.log('POST Response:', postData);
        console.log('POST Status:', postResponse.status);
        console.log('POST Test: ' + (postResponse.ok ? '✅ PASSED' : '❌ FAILED') + '\n');
    } catch (error) {
        console.log('POST Test: ❌ FAILED');
        console.log('Error:', error.message + '\n');
    }
}

// Run the tests
testWorker(); 