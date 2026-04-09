// ********************** Initialize server **********************************


const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
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
        done();
      });
  });
});
