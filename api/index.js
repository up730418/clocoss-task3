const express = require('express');
const bodyParser = require('body-parser');
const googleauth = require('simple-google-openid');
const api = express.Router();
module.exports = api;

//Setup admin user
let userRoles = [{ email: 'up730418@myport.ac.uk', roles: ['user', 'admin'] }];

// you can put your client ID here
api.use(googleauth('637021493194-nncq03bpm7am8odjsl69ibceoutch5k4.apps.googleusercontent.com'));
 
// you can put your realm here instead of 'jwt'
// return 'Not authorized' if we don't have a user
api.use('*', googleauth.guardMiddleware({ realm: 'jwt' }));
 
//Return a random number if user is authorised else 403
api.get('/random', (req, res) => {
  if (checkUser(req)) {
     res.set('Content-Type', 'text/plain');
     res.send(Math.random().toString());
  } else {
    res.sendStatus(403);
  }
});

//Return the current users roles
api.get('/user/roles', (req, res) => {
  const currentUser = userRoles.find((user) => { return user.email == req.user.emails[0].value; });
  res.send(currentUser? currentUser.roles : []);
});

//Show user requests to admin else 403
api.get('/user/request', (req, res) => {
  if (checkAdmin(req)) {
    const userRequest = userRoles.filter((user) => { return user.roles.length == 0 });
    let userIds = [];
    userRequest.forEach((user) => { userIds.push(user.email) });
    res.send(userIds);

  } else {
    res.sendStatus(403);
  }
});

//Return a list of user and roles if an admin is requesting
api.get('/users', (req, res) => {
  if (checkAdmin(req)) {
    res.send(userRoles);
  } else {
    res.sendStatus(403);
  }
});

//Request to be added as a user if already requested send 403
api.post('/user/request', bodyParser.text(), (req, res) => {
  const userExists = userRoles.find((user) => {return user.email == req.user.emails[0].value})
  if(!userExists) {
    userRoles.push({"email": req.user.emails[0].value, "roles": []})
    res.sendStatus(202);
  } else {
    res.sendStatus(403);
  }
});

//Allow user from post body access if admin
api.post('/user/approve', bodyParser.text(), (req, res) => {
  if (checkAdmin(req)) {
    let userToUpdate = userRoles.find((user) => {return user.email == req.body});
    userToUpdate.roles = ['user'];
    res.send(userToUpdate);
  } else {
    res.sendStatus(403);
  }
});

//Delete user $id if admin is requesting
api.delete('/user/:id', (req, res) => {
  if (checkAdmin(req)) {
    userRoles = userRoles.filter((user) => { return user.email !== req.params.id; });
    res.sendStatus(204);
  } else {
    res.sendStatus(403);
  }
});

//Check if user has user or admin roles
function checkUser(req) {
  const currentUser = userRoles.find((user) => { return user.email == req.user.emails[0].value; });
  if (currentUser !== undefined && (currentUser.roles.includes('user') || currentUser.roles.includes('admin'))) {
    return true;
  } else {
    return false;
  }
} 

//Check if user is admin
function checkAdmin(req) {
  const currentUser = userRoles.find((user) => { return user.email == req.user.emails[0].value; });
  if (currentUser !== undefined && currentUser.roles.includes('admin')) {
    return true;
  } else {
    return false;
  }
}
