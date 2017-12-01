const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const googleauth = require('simple-google-openid');
const roles = ['admin','user'];
let userRoles = [{"email": "up730418@myport.ac.ukzz", "roles": []}, {"email": "up730418@myport.ac.uk", "roles": ['user','admin']},];

// you can put your client ID here
app.use(googleauth('637021493194-nncq03bpm7am8odjsl69ibceoutch5k4.apps.googleusercontent.com'));
 
// you can put your realm here instead of 'jwt'
// return 'Not authorized' if we don't have a user
app.use('/api', googleauth.guardMiddleware({realm: 'jwt'}));
 
app.get('/api/protected', function (req, res) {
  if (req.user.displayName) {
    res.send('Hello ' + req.user.displayName + '!');
  } else {
    res.send('Hello stranger!');
  }
 
  console.log('successful authorized request by ' + req.user.emails[0].value);
});

app.get('/api/random', function (req, res) {
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
	if(currentUser.roles.includes("user") || result.roles.includes("admin")){
	
		res.send((Math.random()).toString());
	} else {
		res.sendStatus(403);
	}
});

app.get('/api/user/roles', function (req, res) {
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
	res.send(currentUser? currentUser.roles : []);
});

app.get('/api/user/request', function (req, res) {
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
	if(currentUser.roles.includes("admin")){

		const userRequest = userRoles.filter((user) => { return user.roles.length == 0 });
		let userIds = [];
		userRequest.forEach((user) => { userIds.push(user.email) });
		res.send(userIds);
         
        } else {
                res.sendStatus(403);
        }
});

app.post('/api/user/request', bodyParser.text(), function (req, res) {
	const userExists = userRoles.find((user) => {return user.email == req.user.emails[0].value})
	if(!userExists) {
		userRoles.push({"email": req.user.emails[0].value, "roles": []})
		res.sendStatus(202);
	} else {
		res.sendStatus(403);
	}

});

app.post('/api/user/approve', bodyParser.text(), function (req, res) {
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
        if(currentUser.roles.includes("admin")){
		console.log(req.body);
		let userToUpdate = userRoles.find((user) => {return user.email == req.body.email});
		userToUpdate.roles =  req.body.roles;
		res.send(userToUpdate);
	
	} else {
                res.sendStatus(403);
        }
});

app.delete('/api/user/:id(\\w+)',  function (req, res) {
	const currentUser = userRoles.find((user) => {return user.email == req.user.emails[0].value});
        if(currentUser.roles.includes("admin")){
		userRoles = userRoles.filter((user) => {return user.email !== req.params.id}
	} else {
                res.sendStatus(403);
        }
});
 
// this will serve the HTML file shown below
app.use(express.static('static'));
 
const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log(`Example app listening on port ${PORT}!`);
});
