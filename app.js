const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const googleauth = require('simple-google-openid');
const roles = ['admin','user'];
let userRoles = [{"email": "up730418@myport.ac.uk", "roles": ['user','admin']},];
let userRequests = [];

// you can put your client ID here
app.use(googleauth('637021493194-nncq03bpm7am8odjsl69ibceoutch5k4.apps.googleusercontent.com'));
 
// you can put your realm here instead of 'jwt'
// return 'Not authorized' if we don't have a user
app.use('/api', googleauth.guardMiddleware({realm: 'jwt'}));
 
app.get('/api/random', function (req, res) {
	
	if(checkUser(req)) {

		res.send(Math.random().toString());
	} else {
		res.sendStatus(403);
	}
});

app.get('/api/user/roles', function (req, res) {
	
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
	res.send(currentUser? currentUser.roles : []);
});

app.get('/api/user/request', function (req, res) {
	
	if(checkAdmin(req)){
		
		res.send(userRequests);
         
        } else {
                res.sendStatus(403);
        }
});

app.get('/api/users', function (req, res) {
	
	if(checkAdmin(req)){
		res.send(userRoles);
	} else {
		res.sendStatus(403);
	}
});

app.post('/api/user/request', bodyParser.text(), function (req, res) {
	const userRequested = userRequests.includes(req.user.emails[0].value);
	const userExists = userRoles.find((user) => {return user.email == req.user.emails[0].value});
	if(!userExists && !userRequested) {
		userRequests.push(req.user.emails[0].value);
		res.sendStatus(202);
	} else {
		res.sendStatus(403);
	}

});

app.post('/api/user/approve', bodyParser.text(), function (req, res) {

        if(checkAdmin(req)){
		
		userToAdd = {"email": req.body, "roles": ['user']};
		userRoles.push(userToAdd);
		
		userRequests.splice(userRequests.indexOf(req.body, 1));
		
		res.send(userToAdd);
	
	} else {
                res.sendStatus(403);
        }
});

app.delete('/api/user/:id',  function (req, res) {
        
	if(checkAdmin(req)){
		userRoles = userRoles.filter((user) => {return user.email !== req.params.id});
		res.sendStatus(204);
	} else {
                res.sendStatus(403);
        }
});

function checkUser(req) {
	
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
        if(currentUser !== undefined && (currentUser.roles.includes("user") || currentUser.roles.includes("admin"))){
              return true;
        } else {
		return false;
	}
} 

function checkAdmin(req) {
	
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
        if(currentUser.roles.includes("admin")){
		return true;
	} else {
		return false;
	}

}
// this will serve the HTML file shown below
app.use(express.static('static'));
 
const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log(`Example app listening on port ${PORT}!`);
});
