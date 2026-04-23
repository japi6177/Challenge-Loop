// ********************** Initialize server **********************************

const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttpPlugin = require('chai-http').default || require('chai-http');
const { request } = require('chai-http');

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

  it('Returns the unified login page element', done => {
    request.execute(server)
      .get('/login')
      .end((err, res) => {
        expect(res).to.have.status(200);
        assert.include(res.text, 'Enter the <span style="color: var(--primary);">Loop</span>');
        done();
      });
  });
/*
  it('Email-first JWT Authentication Workflow', (done) => {
    const agent = request.agent(server);
    const dynamicEmail = `test${Date.now()}@example.com`;
    
    // 1. Submit email (not existing) -> Should redirect to /register
    agent
      .post('/email-login')
      .send({ email: dynamicEmail })
      .redirects(0)
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.header.location).to.include('/register');
        
        // 2. Submit username to register
        agent
          .post('/register')
          .send({ username: `testuser_${Date.now()}`, email: dynamicEmail })
          .redirects(0)
          .end((err2, res2) => {
            expect(res2).to.have.status(302);
            expect(res2.header.location).to.equal('/verify-code');
            
            // 3. Verify the static code 123456 to trigger Db insert
            agent
              .post('/verify-code')
              .send({ code: '123456' })
              .redirects(0)
              .end((err3, res3) => {
                expect(res3).to.have.status(302);
                expect(res3.header.location).to.equal('/home');
                
                // 4. Test normal login flow now that user exists
                agent
                  .post('/email-login')
                  .send({ email: dynamicEmail })
                  .redirects(0)
                  .end((err4, res4) => {
                     expect(res4).to.have.status(302);
                     expect(res4.header.location).to.equal('/verify-code');

                     // 5. Verify the login code
                     agent
                       .post('/verify-code')
                       .send({ code: '123456' })
                       .redirects(0)
                       .end((err5, res5) => {
                          expect(res5).to.have.status(302);
                          expect(res5.header.location).to.equal('/home');

                          // 6. Tear down via endpoint
                          agent
                            .post('/profile/delete-account')
                            .redirects(0)
                            .end((err6, res6) => {
                               expect(res6).to.have.status(302);
                               expect(res6.header.location).to.include('/login');
                               done();
                            });
                       });
                  });
              });
          });
      });
  });
  */
});

