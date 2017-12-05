const express = require('express');
const app = express();

// this will serve the HTML file shown below
app.use(express.static('static'));

app.use('/api', require('./api'));
 
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
