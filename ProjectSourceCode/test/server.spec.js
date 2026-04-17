// ********************** Initialize server **********************************

const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttpPlugin = require('chai-http').default || require('chai-http');
const { request } = require('chai-http');

chai.should();
chai.use(chaiHttpPlugin);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    request.execute(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************
describe('Testing Add User API', () => {
  it('positive : /register', done => {
    request.execute(server)
      .post('/register')
      .redirects(0) //This is necessary because the test returns status 200 otherwise. Idk why.
      .send({ username: `buhbuhbuh98`, email: 'boo@gmail.com', password: 'Beach2000!'})
      .end((err, res) => {
        expect(res).to.have.status(302); //Test that the response is positive by checking for a redirect code.
        done();
      });
  });
   it('Negative : /register. Checking invalid name', done => {
    request.execute(server)
      .post('/register')
      .send({ username: 20, email: 'bogus', password: 5 })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.include('Registration failed'); //Test that the negative response re-renders the page with the error message in hbs 
        done();
      });
  });
});

describe('Login/Auth', () => {
  it('Returns the login page', done => {
    request.execute(server)
      .get('/login')
      .end((err, res) => {
        expect(res).to.have.status(200);
        // Should show a valid login page
        // Contains "Enter the <span style="color: var(--primary);">Loop</span>"
        assert.include(res.text, 'Enter the <span style="color: var(--primary);">Loop</span>');
        done();
      });
  });
  it('Creates a test user, or login as testuser', (done) => {
    request.execute(server)
      .post('/login')
      .send({ username: 'testuser', password: 'Password1!' })
      .end((err, res) => {
        // Check if the response text contains the "Invalid username" error message
        if (res.text && res.text.includes('Invalid username.')) {
          // User doesn't exist, proceed to register
          request.execute(server)
            .post('/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'Password1!' })
            .end((err2, res2) => {
              expect(res2).to.have.status(200);
              done();
            });
        } else {
          // User managed to login properly (redirected to /home)
          expect(res).to.have.status(200);
          done();
        }
      });
  });
});
// ********************************************************************************