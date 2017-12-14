const express = require('express');
const app = express();

// This will serve the HTML files from static
app.use(express.static('static'));

// This will use teh api module
app.use('/api', require('./api'));
 
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
