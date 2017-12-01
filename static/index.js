/* global gapi:false */
window.addEventListener('load', init);

function init() {
  keepLoadingRandom();
}

async function keepLoadingRandom() {
  if (!runningTests) await loadRandom();
  setTimeout(keepLoadingRandom, 1000);
}

function onSignIn(googleUser) { // eslint-disable-line no-unused-vars
  if (runningTests) {
    resolveGlobalPromise();
    return;
  }

  const profile = googleUser.getBasicProfile();
  const els = document.querySelectorAll('.auth');
  for (const el of els) {
    el.classList.add('logged-in');
    el.querySelector('.name').textContent = profile.getName();
  }
  loadRoles();
}

async function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  await auth2.signOut();

  const els = document.querySelectorAll('.auth');
  for (const el of els) {
    el.classList.remove('logged-in');
    el.querySelector('.name').textContent = 'logged out';
  }
}


async function loadRoles() {
  if (runningTests) return; // ignoring
  const el = document.querySelector('.auth .roles');
  el.textContent = 'loading…';

  const response = await callAPI('GET', '/api/user/roles');

  if (!response.ok) {
    // handle the error
    el.textContent = 'error: ' + response.status;
    return;
  }

  // handle the response
  try {
    const data = await response.json();
    if (data.length) {
      el.textContent = data.join(', ');
    } else {
      el.textContent = 'none';
    }
  } catch (e) {
    el.textContent = 'error: ' + e;
    console.error(e);
  }
}


async function register() { // eslint-disable-line no-unused-vars
  if (runningTests) return; // ignoring
  const el = document.querySelector('.auth .register-status');
  try {
    el.textContent = 'requesting…';

    const response = await callAPI('POST', '/api/user/request');

    if (!response.ok) {
      // handle the error
      el.textContent = 'error: ' + response.status;
      return;
    }

    // handle the response
    el.textContent = 'done, status ' + response.status;
  } catch (e) {
    el.textContent = 'error: ' + e;
    console.error(e);
  }
}


async function loadRandom() {
  if (runningTests) return; // ignoring
  const el = document.querySelector('.random .currvalue');
  try {
    el.textContent = 'loading…';

    const response = await callAPI('GET', '/api/random');

    if (!response.ok) {
      // handle the error
      el.textContent = 'error: ' + response.status;
      return;
    }

    // handle the response
    const data = await response.text();
    el.textContent = data;
  } catch (e) {
    el.textContent = 'error: ' + e;
    console.error(e);
  }
}


async function loadLists() {
  if (runningTests) return; // ignoring
  // load list of known users
  loadList(
    '/api/users',
    document.querySelector('.users.known'),
    (el, data) => {
      const template = el.querySelector('template');
      for (const user of data) {
        const li = document.importNode(template.content, true).children[0];
        li.querySelector('.email').textContent = user.email;
        const roles = user.roles.length ? user.roles.join(', ') : 'none';
        li.querySelector('.roles').textContent = roles;
        el.appendChild(li);
      }
    },
  );

  // load list of users requesting authorization
  loadList(
    '/api/user/request',
    document.querySelector('.users.requesting'),
    (el, data) => {
      const template = el.querySelector('template');
      for (const user of data) {
        const li = document.importNode(template.content, true).children[0];
        li.querySelector('.email').textContent = user;
        el.appendChild(li);
      }
    },
  );
}

async function loadList(path, el, populateList) {
  try {
    clearList(el);
    appendElement(el, 'li', 'loading…');
    const response = await callAPI('GET', path);

    if (!response.ok) {
      // handle the error
      clearList(el);
      appendElement(el, 'li', 'error: ' + response.status);
      return;
    }

    // handle the response
    const data = await response.json();
    clearList(el);
    if (data.length) {
      populateList(el, data);
    } else {
      appendElement(el, 'li', 'none');
    }
  } catch (e) {
    clearList(el);
    appendElement(el, 'li', 'error: ' + e);
    console.error(e);
  }
}


async function deleteUser(li, email) { // eslint-disable-line no-unused-vars
  if (runningTests) return; // ignoring
  try {
    li.textContent = 'deleting…';
    const response = await callAPI('DELETE', '/api/user/' + encodeURIComponent(email));
    if (response.ok) {
      loadLists();
    } else {
      li.textContent = 'error ' + response.status;
    }
  } catch (e) {
    li.textContent = 'error ' + e;
    console.error(e);
  }
}


async function approveUser(li, email) { // eslint-disable-line no-unused-vars
  if (runningTests) return; // ignoring
  try {
    li.textContent = 'approving…';
    const response = await callAPI('POST', '/api/user/approve', email);
    if (response.ok) {
      loadLists();
    } else {
      li.textContent = 'error ' + response.status;
    }
  } catch (e) {
    li.textContent = 'error ' + e;
    console.error(e);
  }
}


// removes all LI children of the given element (keeps any other children)
function clearList(list) {
  const toClear = Array.prototype.filter.call(list.children, (el) => el instanceof HTMLLIElement);
  for (const el of toClear) {
    el.remove();
  }
}

function appendElement(parent, elName, textContent) {
  const el = document.createElement(elName);
  el.textContent = textContent;
  parent.appendChild(el);
}


// a helper method that calls the API at the given path, with the given method and optional data
// it returns the fetch() response
// it gets the Google ID token
async function callAPI(method, path, data) {
  const idToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;

  const fetchOptions = {
    credentials: 'same-origin',
    method: method || 'GET',
    body: data,
    headers: { Authorization: 'Bearer ' + idToken },
  };

  return fetch(path, fetchOptions);
}

// react to computer sleeps, get a new token, because it seems gapi doesn't do this reliably
// eslint-disable-next-line max-len
// adapted from http://stackoverflow.com/questions/4079115/can-any-desktop-browsers-detect-when-the-computer-resumes-from-sleep/4080174#4080174
(function () {
  const CHECK_DELAY = 2000;
  let lastTime = Date.now();

  setInterval(() => {
    const currentTime = Date.now();
    if (currentTime > (lastTime + (CHECK_DELAY*2))) { // ignore small delays
      gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse();
    }
    lastTime = currentTime;
  }, CHECK_DELAY);
}());


// functions for automatic testing

function log(msg) {
  window.result.textContent += msg + '\n';
  if (log.scrolling) window.scrollTo(0, document.body.scrollHeight);
}

log.clear = () => {
  window.result.textContent = '';
  log.scrolling = false;
};

// set this to true in code after log.clear to start scrolling to bottom
log.scrolling = false;

// in a global variable, save the function that resolves a new promise
// then wait for the new promise until signin resolves it
let globalPromiseResolve;

function newGlobalPromise() {
  return new Promise((resolve) => { globalPromiseResolve = resolve; });
}

function resolveGlobalPromise() {
  if (globalPromiseResolve) {
    globalPromiseResolve();
    globalPromiseResolve = null;
  }
}

const TEXT_T = 'text/plain';
const JSON_T = 'application/json';

async function test(token, method, path, content, contentType, expStatus, expContentType) {
  const logExpStatus = expStatus == null ? '' : `(expects ${expStatus})`;
  log(`  test: ${method} ${path}  ${logExpStatus}`);

  // prepare fetch options
  const fetchOptions = {
    method,
    credentials: 'same-origin',
    headers: {},
  };

  if (token) {
    fetchOptions.headers.Authorization = 'Bearer ' + token;
  }

  if (content != null) {
    fetchOptions.body = content;
    fetchOptions.headers['Content-type'] = contentType;
  }

  const response = await fetch(path, fetchOptions);

  let pass = true;
  if (expStatus != null && response.status !== expStatus) {
    pass = false;
    log(`    expected status ${expStatus}, got ${response.status}`);
  }
  const type = response.headers.get('content-type');
  if (expContentType != null && !type.toUpperCase().startsWith(expContentType.toUpperCase())) {
    pass = false;
    log(`    expected content type "${expContentType}", got "${type}"`);
  }
  if (pass) {
    if (expStatus !== 200) log('    ok');
    return response;
  } else {
    throw new Error('failed');
  }
}

let runningTests = false;

// check that the response contains a number
async function testNumber(response) {
  const num = await response.text();
  if (!Number.isNaN(Number(num))) log('    ok, got a number ' + Number(num));
  else throw log('    expected a number');
}

// check that the response is an array and contains all the values in `arr`
// if `strictLength` is true, also check there are no other values
async function testUnorderedArray(response, arr, strictLength) {
  if (!arr.length) strictLength = true;
  const got = await response.json();
  if ((!strictLength || got.length === arr.length) &&
      arr.every((x) => got.includes(x))) {
    log('    ok, got ' + JSON.stringify(got));
  } else if (strictLength && arr.length) {
    throw log(`    expected ${JSON.stringify(arr)} - order does not matter, got ${JSON.stringify(got)}`);
  } else if (strictLength && arr.length === 0) {
    throw log(`    expected ${JSON.stringify(arr)}, got ${JSON.stringify(got)}`);
  } else {
    throw log(`    expected to include ${JSON.stringify(arr)}, got ${JSON.stringify(got)}`);
  }
}

// if `userObj` is not an array, check that the response is a user object like the one given
// if `userObj` is an array, we check that the response is an array that contains all the given users
async function testContainsUser(response, userObj) {
  let data = await response.json();
  let pass = true;
  if (Array.isArray(userObj) && !Array.isArray(data)) pass = false;
  else {
    if (!Array.isArray(userObj)) {
      userObj = [userObj];
      data = [data];
    }
    pass = userObj.every( // eslint-disable-line function-paren-newline
      (user) => data.find((x) => (x.email === user.email &&
                                  x.roles.length === user.roles.length &&
                                  user.roles.every((y) => x.roles.includes(y)))));
  }
  if (pass) {
    log(`    ok, inludes ${JSON.stringify(userObj)}`);
  } else {
    throw log(`    expected to include ${JSON.stringify(userObj)}, got ${JSON.stringify(data)}`);
  }
}

async function runTests() { // eslint-disable-line no-unused-vars
  if (runningTests) {
    log('tests still running, button ignored');
    return;
  }

  runningTests = true;
  log.clear();
  try {
    log('starting automatic tests');
    log('  first needs two sign-ins so we can get the short-lived id_tokens');
    await signOut();
    log('using the sign-in button, please sign in as ADMIN');
    await newGlobalPromise();
    const adminT = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
    const adminEmail = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail();
    log('  got ' + adminEmail);
    await signOut();

    log('using the sign-in button, please sign in as SOME OTHER USER');
    await newGlobalPromise();
    const userT = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
    const userEmail = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail();
    log('  got ' + userEmail);
    if (adminEmail === userEmail) throw log('failed: need to have two different users');
    await signOut();

    log.scrolling = true;
    log('\nstarting actual tests');
    let got;

    /* eslint-disable no-multi-spaces,comma-spacing */

    log('as nobody');

    got = await test(null  , 'GET',    '/api/random',       null, null, 401);
    got = await test(null  , 'GET',    '/api/user/roles',   null, null, 401);
    got = await test(null  , 'GET',    '/api/user/request', null, null, 401);
    got = await test(null  , 'POST',   '/api/user/request', null, null, 401);


    log('as admin');

    got = await test(adminT, 'GET',    '/api/random', null, null, 200, TEXT_T);
    await testNumber(got);
    got = await test(adminT, 'GET',    '/api/user/roles', null, null, 200, JSON_T);
    await testUnorderedArray(got, ['admin', 'user'], true);
    got = await test(adminT, 'GET',    '/api/user/request', null, null, 200, JSON_T);
    await testUnorderedArray(got, []);
    got = await test(adminT, 'GET',    '/api/users', null, null, 200, JSON_T);
    await testContainsUser(got, [{ email: adminEmail, roles: ['admin','user'] }]);

    // in case the user was already there, we delete it here so following tests work
    got = await test(adminT, 'DELETE', '/api/user/' + encodeURIComponent(userEmail), null, null, null);


    log('as another user');

    got = await test(userT , 'GET',    '/api/user/roles',   null, null, 200, JSON_T);
    await testUnorderedArray(got, []);
    got = await test(userT , 'GET',    '/api/random',       null, null, 403);
    got = await test(userT , 'POST',   '/api/user/request', null, null, 202);
    got = await test(userT , 'GET',    '/api/user/request', null, null, 403);
    got = await test(userT , 'GET',    '/api/users',        null, null, 403);


    log('as admin');

    got = await test(adminT, 'GET',    '/api/users', null, null, 200, JSON_T);
    await testContainsUser(got, [
      { email: adminEmail, roles: ['admin','user'] },
      { email: userEmail, roles: [] },
    ]);

    got = await test(adminT, 'GET',    '/api/user/request', null, null, 200, JSON_T);
    await testUnorderedArray(got, [userEmail]);
    got = await test(adminT, 'POST',   '/api/user/approve', userEmail, TEXT_T, 200, JSON_T);
    await testContainsUser(got, { email: userEmail, roles: ['user'] });

    got = await test(adminT, 'GET',    '/api/user/request', null, null, 200, JSON_T);
    await testUnorderedArray(got, []);

    got = await test(adminT, 'GET',    '/api/users', null, null, 200, JSON_T);
    await testContainsUser(got, [
      { email: adminEmail, roles: ['admin','user'] },
      { email: userEmail, roles: ['user'] },
    ]);


    log('as another user');

    got = await test(userT , 'GET',    '/api/user/roles', null, null, 200, JSON_T);
    await testUnorderedArray(got, ['user'], true);
    got = await test(userT , 'GET',    '/api/random', null, null, 200, TEXT_T);
    await testNumber(got);
    got = await test(userT , 'POST',   '/api/user/approve', 'ZZZ@a.b', TEXT_T, 403);


    log('as admin');

    got = await test(adminT, 'DELETE', '/api/user/' + encodeURIComponent(userEmail), null, null, 204);
    got = await test(adminT, 'GET',    '/api/users', null, null, 200, JSON_T);
    await testContainsUser(got, [{ email: adminEmail, roles: ['user','admin'] }]);


    log('as another user');

    got = await test(userT , 'GET',    '/api/user/roles', null, null, 200, JSON_T);
    await testUnorderedArray(got, []);
    got = await test(userT , 'GET',    '/api/random', null, null, 403);


    log('logged out');

    got = await test(null  , 'GET',    '/api/random', null, null, 401);
    got = await test(null  , 'GET',    '/api/users', null, null, 401);


    log('all OK');
  } catch (e) {
    if (e) {
      log(`error ${e}\n  for details see browser console`);
      console.error(e);
    }
    log('stopped on first failure');
    log('expecting to run with a server with only the admin user there');
    log('restart your server and try again?');
  }
  runningTests = false;
}
