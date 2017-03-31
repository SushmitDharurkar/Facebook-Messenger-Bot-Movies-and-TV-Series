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

app.post('/ai', (req, res) => {	//apiai requires json format return
  if (req.body.result.action === 'textSearchMovies') {
	var name = req.body.result.parameters['given-name']
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
})
/*
function textSearchMovies(sender, name){
	

	request(
		{url: url,
		json: true}
	, (error, response, body)=> {
	  if (!error && response.statusCode === 200) {
		results = body.results[0]
		id = body.results[0].id
		var url_credits = "https://api.themoviedb.org/3/movie/" + id + "/credits?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		
		request(
		{url: url_credits,
		json: true}
		, (error, response, body)=> {	// There is a limit on the size of the message 640 characters
		  if (!error && response.statusCode === 200) {
			image = results.poster_path
			image_url = "https://image.tmdb.org/t/p/w500" + image  
			  
			cast = body.cast		
			text = "Title: " + results.title + "\nRelease Date: " + results.release_date + "\nRating: " 
					+ results.vote_average + "/10" + "\nSummary: "+results.overview + "\nCast: "
			subtitle = "\nRelease Date: " + results.release_date + "\nRating: " 
					+ results.vote_average + "/10"		
			for (i=0;i<cast.length;i++){
				text += "\n" + cast[i].character + " by " + cast[i].name
			}		
			text = text.substr(0,639)
			messageData = {
				text:text
			}
			attachData = {
				type : 	"template",
				payload : {
					template_type:"generic",					
					elements: [{
						title: name,
						//subtitle: subtitle,
						subtitle: text.substr(0,79),
						image_url: image_url
                    }]
				}
			}	
			request({
				url: 'https://graph.facebook.com/v2.6/me/messages',
				qs: {access_token:token},
				method: 'POST',
				json: {
					recipient: {id:sender},
					message:{
						attachment : attachData,
					} 
				}
			}, function(error, response, body) {
				if (error) {
					console.log('Error sending messages: ', error)
				} else if (response.body.error) {
					console.log('Error: ', response.body.error)
				}
			})		
			
		  } else {
			console.log("Got an error: ", error, ", status code: ", response.statusCode)
		  }
		})		
	  } else {
		console.log("Got an error: ", error, ", status code: ", response.statusCode)
	  }
	})	
}*/