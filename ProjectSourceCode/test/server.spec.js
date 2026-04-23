// ********************** Initialize server **********************************

const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttpPlugin = require('chai-http').default || require('chai-http');
const { request } = require('chai-http');
const fs = require('fs');
const path = require('path');

chai.should();
chai.use(chaiHttpPlugin);
const {assert, expect} = chai;


describe('Core Authentication Operations', () => {

  before(async () => {
    if (server.ready) {
      await server.ready();
    }
  });

  after(async () => {
    if (server.shutdown) {
      await server.shutdown();
    } else {
      server.close();
    }
  });

  it('Returns the unified login page element', async () => {
    const res = await request.execute(server).get('/login');
    expect(res).to.have.status(200);
    assert.include(res.text, 'Enter the <span style="color: var(--primary);">Loop</span>');
  });



  it('Email-first JWT Authentication Workflow', async function() {
    this.timeout(15000);
    const agent = request.agent(server);
    const dynamicEmail = `test${Date.now()}@example.com`;
    
    // 1. Submit email (not existing) -> Should redirect to /register
    let res = await agent.post('/email-login').send({ email: dynamicEmail }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.include('/register');
    
    // 2. Submit username to register
    res = await agent.post('/register').send({ username: `testuser_${Date.now()}`, email: dynamicEmail }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.equal('/verify-code');
    
    // 3. Verify the static code 123456 to trigger Db insert
    res = await agent.post('/verify-code').send({ code: '123456' }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.equal('/home');
    
    // 4. Test normal login flow now that user exists
    res = await agent.post('/email-login').send({ email: dynamicEmail }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.equal('/verify-code');

    // 5. Verify the login code
    res = await agent.post('/verify-code').send({ code: '123456' }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.equal('/home');

    // 6. Verify Home Page Data
    res = await agent.get('/home');
    try {
      expect(res).to.have.status(200);
      assert.include(res.text, 'Active');
      assert.include(res.text, 'Challenges');
      assert.include(res.text, 'Your Stats');
    } catch (assertionErr) {
      console.log('Home page assertion failed!');
      console.log('Body snippet:', res.text.substring(0, 1000));
      throw assertionErr;
    }

    // 7. Verify Discover Page Data
    res = await agent.get('/discover');
    expect(res).to.have.status(200);
    assert.include(res.text, 'Welcome to Discover');
    
    // 7.5 Test Image Upload & Compression
    const validImage = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'funny_capybara.png')).toString('base64');
    console.log(`\n      [Image Compression Test] Original Image Size (Base64 length): ${validImage.length} characters`);
    
    res = await agent.post('/profile/upload-picture').send({ image_data: validImage }).redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.equal('/profile?success=picture');
    
    // 7.6 Verify the image format changed to compressed jpeg
    res = await agent.get('/profile');
    expect(res.text).to.include('data:image/jpeg;base64');
    expect(res.text).to.not.include('data:image/png;base64');
    
    // Extract the returned compressed image string
    const match = res.text.match(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/);
    if (match) {
      console.log(`      [Image Compression Test] Compressed Image Size (Base64 length): ${match[0].length} characters\n`);
    }
    
    // 8. Tear down via endpoint
    res = await agent.post('/profile/delete-account').redirects(0);
    expect(res).to.have.status(302);
    expect(res.header.location).to.include('/login');
  });
});

