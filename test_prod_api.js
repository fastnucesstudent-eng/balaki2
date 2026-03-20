import axios from 'axios';

async function test() {
    try {
        const response = await axios.post('https://backend.tarzify.com/api/banners/notify-admin', {
            merchantName: 'Test Merchant',
            merchantEmail: 'test@example.com',
            bannerUrl: 'https://via.placeholder.com/150'
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        console.error('ERROR:', error.response?.data || error.message);
    }
}

test();
