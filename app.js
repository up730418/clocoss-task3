const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const googleauth = require('simple-google-openid');

//Setup admin user
let userRoles = [{ email: 'up730418@myport.ac.uk', roles: ['user', 'admin'] }];

// you can put your client ID here
app.use(googleauth('637021493194-nncq03bpm7am8odjsl69ibceoutch5k4.apps.googleusercontent.com'));
 
// you can put your realm here instead of 'jwt'
// return 'Not authorized' if we don't have a user
app.use('/api', googleauth.guardMiddleware({ realm: 'jwt' }));
 
//Return a random number if user is authorised else 403
app.get('/api/random', (req, res) => {
  if (checkUser(req)) {
     res.set('Content-Type', 'text/plain');
     res.send(Math.random().toString());
  } else {
    res.sendStatus(403);
  }
});

//Return the current users roles
app.get('/api/user/roles', (req, res) => {
  const currentUser = userRoles.find((user) => { return user.email == req.user.emails[0].value; });
  res.send(currentUser? currentUser.roles : []);
});

//Show user requests to admin else 403
app.get('/api/user/request', (req, res) => {
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
app.get('/api/users', (req, res) => {
  if (checkAdmin(req)) {
    res.send(userRoles);
  } else {
    res.sendStatus(403);
  }
});

//Request to be added as a user if already requested send 403
app.post('/api/user/request', bodyParser.text(), (req, res) => {
  const userExists = userRoles.find((user) => {return user.email == req.user.emails[0].value})
  if(!userExists) {
    userRoles.push({"email": req.user.emails[0].value, "roles": []})
    res.sendStatus(202);
  } else {
    res.sendStatus(403);
  }
});

//Allow user from post body access if admin
app.post('/api/user/approve', bodyParser.text(), (req, res) => {
  if (checkAdmin(req)) {
    let userToUpdate = userRoles.find((user) => {return user.email == req.body});
    userToUpdate.roles = ['user'];
    res.send(userToUpdate);
  } else {
    res.sendStatus(403);
  }
});

//Delete user $id if admin is requesting
app.delete('/api/user/:id', (req, res) => {
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
// this will serve the HTML file shown below
app.use(express.static('static'));
 
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
