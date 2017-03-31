const express = require('express');
const bodyParser = require('body-parser');
const request = require('request')
const app = express();
const apiaiApp = require('apiai');
const api = apiaiApp('124002d5fe8f471ea94fca91022425dc');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  //console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

var token = "EAASYIgowOGwBAIyBelSxIsUeEZAwpZASkSyYV9I5FzBNRI3g4b39ULf1uIWyQrRdbsM8ZCiDaaHt5gaSfQzlrKCHjH5joQIZCNYlGOh7UIzaKYZAyDFLNaCd2cw06BdVFCCXpEY4uZAl4ZCKAnOjke06ZBJA8swdqYLxg9e643mI8QZDZD"

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = api.textRequest(text, {
    sessionId: 'tabby_cat' // use any arbitrary id
  });

  apiai.on('response', (response) => {
    // Got a response from api.ai. Let's POST to Facebook Messenger
		 let aiText = response.result.fulfillment.speech;

		request({
		  url: 'https://graph.facebook.com/v2.6/me/messages',
		  qs: {access_token: token},
		  method: 'POST',
		  json: {
			recipient: {id: sender},
			message: {text: aiText}
		  }
		}, (error, response) => {
		  if (error) {
			  console.log('Error sending message: ', error);
		  } else if (response.body.error) {
			  console.log('Error: ', response.body.error);
		  }
		});
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

/*
* Check for wrong actions being called
* Check for errors to stop crashes
*/

app.post('/ai', (req, res) => {	//apiai requires json format return
  if (req.body.result.action === 'textSearchMovies') {
	var name = req.body.result.parameters['any']	//Program crashes if name is incorrect
	console.log(name)
    var url = "https://api.themoviedb.org/3/search/movie?api_key=6332c91e1508b1fd86ed1653c1cc478e&query=" + name

    request(
		{url: url,
		json: true}
	, (err, response, body) => {
      if (!err && response.statusCode == 200) {
		results = body.results[0]
		text = "Title: " + results.title + "\nRelease Date: " + results.release_date + "\nRating: " 
					+ results.vote_average + "/10" + "\nSummary: "+results.overview
        return res.json({
          speech: text,
          displayText: text,
          source: 'textSearchMovies'});
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I did not find the movie.'}});
      }
	  })
	}
	else if (req.body.result.action === 'top10'){
		
		var url = "https://api.themoviedb.org/3/movie/top_rated?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		
		request(
		{url: url,
		json: true}
	, (err, response, body) => {
      if (!err && response.statusCode == 200) {
		results = body.results
		text = ""
		for (i=0;i<10;i++){
			n = i+1
			text += "\n" + n + ": "+ results[i].title
		}
        return res.json({
          speech: text,
          displayText: text,
          source: 'top10'});
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I did not find the movie.'}});
      }
	  })

	}
})
/*
var topMovies = "https://api.themoviedb.org/3/movie/top_rated?api_key=6332c91e1508b1fd86ed1653c1cc478e"

*/