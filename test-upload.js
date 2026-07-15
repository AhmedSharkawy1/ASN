const fs = require('fs');

async function testUpload() {
  try {
    // 1. Create a dummy image file
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync('test_upload_integration.png', buffer);

    // 2. Create FormData
    const blob = new Blob([buffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'test_upload_integration.png');
    formData.append('path', 'test/path');

    // 3. Hit the local API
    console.log('Sending request to http://localhost:3000/api/upload-image...');
    const response = await fetch('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData
    });

    const status = response.status;
    const text = await response.text();

    console.log(`HTTP Status: ${status}`);
    console.log(`Response Text: ${text}`);

    if (status !== 200) {
      console.error('Test Failed!');
      process.exit(1);
    } else {
      console.log('Test Succeeded!');
    }
  } catch (error) {
    console.error('Test Exception:', error);
    process.exit(1);
  } finally {
    if (fs.existsSync('test_upload_integration.png')) {
      fs.unlinkSync('test_upload_integration.png');
    }
  }
}

testUpload();
