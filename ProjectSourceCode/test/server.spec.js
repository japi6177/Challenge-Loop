// ********************** Initialize server **********************************

<<<<<<< HEAD
const server = require('../src/index');
=======
const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added
>>>>>>> b73a949 (Lab 10 finished, db wireframe added to milestones folder)

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
<<<<<<< HEAD
const chaiHttpPlugin = require('chai-http').default || require('chai-http');
const { request } = require('chai-http');
chai.should();
chai.use(chaiHttpPlugin);
=======
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
>>>>>>> b73a949 (Lab 10 finished, db wireframe added to milestones folder)
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
<<<<<<< HEAD
    request.execute(server)
=======
    chai
      .request(server)
>>>>>>> b73a949 (Lab 10 finished, db wireframe added to milestones folder)
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
<<<<<<< HEAD
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
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        // Check if the response text contains the "Invalid username" error message
        if (res.text && res.text.includes('Invalid username.')) {
          // User doesn't exist, proceed to register
          request.execute(server)
            .post('/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'password' })
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
  it('Does not create a user without a password passed', (done) => {
    request.execute(server)
      .post('/register')
      .send({ username: 'testuser', email: 'test@example.com' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        assert.include(res.text, 'Registration failed. Username or email might already be taken.');
        done();
      });
  });
  it('Does not create a user without an email passed', (done) => {
    request.execute(server)
      .post('/register')
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        assert.include(res.text, 'Registration failed. Username or email might already be taken.');
        done();
      });
  });
  it('Does not create a user without a username passed', (done) => {
    request.execute(server)
      .post('/register')
      .send({ email: 'test@example.com', password: 'password' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        assert.include(res.text, 'Registration failed. Username or email might already be taken.');
=======
describe('Testing Add User API', () => {
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .redirects(0) //This is necessary because the test returns status 200 otherwise. Idk why.
      .send({username: 'buh', email: 'boo@gmail.com', password: 'beach20'})
      .end((err, res) => {
        expect(res).to.have.status(302); //Test that the response is positive by checking for a redirect code.
        done();
      });
  });
   it('Negative : /register. Checking invalid name', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 20, email: 'bogus', password: 5})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.include('Registration failed'); //Test that the negative response re-renders the page with the error message in hbs 
>>>>>>> b73a949 (Lab 10 finished, db wireframe added to milestones folder)
        done();
      });
  });
});
<<<<<<< HEAD
=======



>>>>>>> b73a949 (Lab 10 finished, db wireframe added to milestones folder)
// ********************************************************************************