// ********************** Initialize server **********************************


const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Testing Add User API', () => {
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .redirects(0) //This is necessary because the test returns status 200 otherwise. Idk why.
      .send({username: 'buh' + Date.now(), email: 'boo' + Date.now() + '@gmail.com', password: 'beach20'})
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

describe('Testing Create Challenge API', () => {
  it('negative : /create-challenge without auth redirects to login', done => {
    chai
      .request(server)
      .post('/create-challenge')
      .redirects(0)
      .send({
         category_id: 1,
         title: 'Test',
         description: 'Desc',
         start_date: '2025-01-01T12:00',
         end_date: '2025-01-07T12:00',
         entry_type: 1,
         period_target: 1,
         metric_name: 'test',
         number_of_intervals: 1
      })
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.header.location).to.include('/login');
        done();
      });
  });

  it('positive : /create-challenge with auth', done => {
    const agent = chai.request.agent(server);
    // First, register a new user to ensure we have an active session
    agent
      .post('/register')
      .redirects(0)
      .send({username: 'challengeCreator' + Date.now(), email: 'creator' + Date.now() + '@example.com', password: 'password123'})
      .end((err, res) => {
        expect(res).to.have.status(302, "Registration step failed, stopping test early.");
        
        agent
          .post('/create-challenge')
          .redirects(0)
          .send({
             category_id: 1,
             title: 'Test Challenge',
             description: 'Test description',
             start_date: '2025-01-01T12:00',
             end_date: '2025-01-07T12:00',
             entry_type: 1,
             period_target: 1,
             metric_name: 'test',
             number_of_intervals: 7
          })
          .end((err2, res2) => {
            expect(res2).to.have.status(302); // Redirect to discover on success
            expect(res2.header.location).to.include('/discover');
            agent.close();
            done();
          });
      });
  });
});
