const express = require('express');
const bodyParser = require('body-parser');
const request = require('request')
const app = express();
const apiaiApp = require('apiai');
const api = apiaiApp('124002d5fe8f471ea94fca91022425dc');
const Promise = require('promise')

var genres_list = [
	{"id":28,"name":"Action"},{"id":12,"name":"Adventure"},{"id":16,"name":"Animation"},
	{"id":35,"name":"Comedy"},{"id":80,"name":"Crime"},{"id":99,"name":"Documentary"},{"id":18,"name":"Drama"},
	{"id":10751,"name":"Family"},{"id":14,"name":"Fantasy"},{"id":36,"name":"History"},{"id":27,"name":"Horror"},
	{"id":10402,"name":"Music"},{"id":9648,"name":"Mystery"},{"id":10749,"name":"Romance"},{"id":878,"name":"Science Fiction"},
	{"id":10770,"name":"TV Movie"},{"id":53,"name":"Thriller"},{"id":10752,"name":"War"},{"id":37,"name":"Western"}
]

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
          sendMessageAI(event);
        }
		else if (event.postback && event.postback.payload) {
            sendPostback(event)
        }
      });
    });
    res.status(200).end();
  }
});

var token = "EAASYIgowOGwBAIyBelSxIsUeEZAwpZASkSyYV9I5FzBNRI3g4b39ULf1uIWyQrRdbsM8ZCiDaaHt5gaSfQzlrKCHjH5joQIZCNYlGOh7UIzaKYZAyDFLNaCd2cw06BdVFCCXpEY4uZAl4ZCKAnOjke06ZBJA8swdqYLxg9e643mI8QZDZD"

function sendPostback(event) {
  let sender = event.sender.id;
  let payload = event.postback.payload;

		if (payload.charAt(0) == "m"){
			//sendMessage(similarStuff(payload,sender))	//Non-blocking/Async problem
			similarStuff(payload.substr(1,payload.length),sender, 3).then(attachData => {
				sendMessage(attachData, sender)
			})
			.catch( error => {
				console.error("Got an error: ", error)
			})
			
		}
		else if (payload.charAt(0) == "s"){
			similarStuff(payload.substr(1,payload.length),sender, 4).then(attachData => {
				sendMessage(attachData, sender)
			})
			.catch( error => {
				console.error("Got an error: ", error)
			})
		}
		else{
			requestPOSTFB(sender, payload.substr(0,639))
		}
}

function sendMessage(attachData, sender) {
	
	requestPOSTFB(sender,"", attachData)
	
}

function sendMessageAI(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = api.textRequest(text, {
    sessionId: 'ssd' // use any arbitrary id
  });

  apiai.on('response', (response) => {
    // Got a response from api.ai. Let's POST to Facebook Messenger
		 
		 var aiText = ""
		 var aiPoster = null
		 
		 if (response.result.fulfillment.data == null){
			aiText = response.result.fulfillment.speech;
		 }
		 else{
			//For attachments
			aiPoster = response.result.fulfillment.data;
		 }
		
		requestPOSTFB(sender, aiText, aiPoster)
		
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

function requestPOSTFB(sender, text, attachData = null){	//Generic function for making POST requests to FB Messenger
	request(
	{
	  url: 'https://graph.facebook.com/v2.6/me/messages',
	  qs: {access_token: token},
	  method: 'POST',
	  json: {
		recipient: {id: sender},
		message: { 		//Either message or attachment
			text: text,
			attachment : attachData
			},
		//sender_action:"typing_on"	
	  }
	}
	, (error, response) => {
	  if (error) {
		  console.log('Error sending message: ', error);
	  } else if (response.body.error) {
		  console.log('Error: ', response.body.error);
	  }
	})
}

		
function requestPromise(url, json){	//Generic function for making GET requests to APIs
	return new Promise(function (resolve, reject){
		request(
		{url: url,
		json: json}
		, (error, response, body)=> {
		  if (!error && response.statusCode === 200) {
			resolve(body)
		  } else {
			if (error){
				reject(error)
			}
			else{
				reject(response.statusCode)
			}
		  }
		})	
	})
}

/*
* Check for wrong actions being called
* Check for errors to stop crashes
* Replies are lagging a bit
*/

app.post('/ai', (req, res) => {	//apiai requires json format return
  
  if (req.body.result.action === 'textSearchMovies') {
	var name = req.body.result.parameters['any']	//Program crashes if name is incorrect
	//console.log(name)
    var url = "https://api.themoviedb.org/3/search/movie?api_key=6332c91e1508b1fd86ed1653c1cc478e&query=" + name
	
	requestPromise(url,true).then(body =>{
		results = body.results[0]
		id = body.results[0].id
		
		var url_credits = "https://api.themoviedb.org/3/movie/" + id + "/credits?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		
		requestPromise(url_credits,true).then(function (body){
			
			var result = allInformation(body, results, 1)
			return res.json(result);
		})
		.catch( error => {
			console.error("Got an error: ", error)
			})
		})
		.catch( error => {	//Need to check if error checking is right
			console.error("Got an error: ", error)
		})
	}
	else if (req.body.result.action === 'textSearchTV'){
		var name = req.body.result.parameters['any']	//Program crashes if name is incorrect
		//console.log(name)
		var url = "https://api.themoviedb.org/3/search/tv?api_key=6332c91e1508b1fd86ed1653c1cc478e&query=" + name
		
		requestPromise(url,true).then(body =>{
			results = body.results[0]
			id = body.results[0].id
			
			var url_credits = "https://api.themoviedb.org/3/tv/" + id + "/credits?api_key=6332c91e1508b1fd86ed1653c1cc478e"
			
			requestPromise(url_credits,true).then(function (body){
				
				var result = allInformation(body, results, 2)
				return res.json(result);

			})
			.catch( error => {	//Need to check if error checking is right
				console.error("Got an error: ", error)
			})
		})
		.catch( error => {	//Need to check if error checking is right
			console.error("Got an error: ", error)
		})		
	}
	
	else if (req.body.result.action === 'latest_movies'){
		var url = "https://api.themoviedb.org/3/movie/now_playing?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		
		requestPromise(url,true).then(function (body){
		results = body.results
		
		var attachData = attachmentData()
		
		for (var i=0; i<10; i++){	//I think this will take time - not that much
			attachData.payload.elements[i] = allInformation(body, results[i], 3)
		}
		
		return res.json({
			//  speech: text,
			 // displayText: text,
			  data: attachData,
			  source: 'latest_movies'});
		})
		.catch( error => {
			console.error("Got an error: ", error)
		})
	
	}
	else if (req.body.result.action === 'top10movies'){
		
		var url = "https://api.themoviedb.org/3/movie/top_rated?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		
		requestPromise(url,true).then(body =>{
		results = body.results
		
		var attachData = attachmentData()
		
		for (var i=0; i<10; i++){	//I think this will take time - not that much
			attachData.payload.elements[i] = allInformation(body, results[i], 3)
		}
		
		return res.json({
			//  speech: text,
			 // displayText: text,
			  data: attachData,
			  source: 'top10movies'});
		})
		.catch( error => {	//Need to check if this is right
			console.error("Got an error: ", error)
		})
	}
	else if (req.body.result.action === 'top10series'){	//Results not that good
	
		var url = "https://api.themoviedb.org/3/tv/top_rated?api_key=6332c91e1508b1fd86ed1653c1cc478e"

		requestPromise(url,true).then(function (body){
		
			results = body.results
			
			var attachData = attachmentData()
			
			for (var i=0; i<10; i++){	
				attachData.payload.elements[i] = allInformation(body, results[i], 4)
			}
			
			return res.json({
				 // speech: text,
				 // displayText: text,
				  data: attachData,
				  source: 'top10series'
			});
		})
		.catch( error => {
			console.error("Got an error: ", error)
		})
	}
})

function attachmentData(){
	return {	type : 	"template",
				payload : {
					template_type:"generic",					
					elements: []
				}
			}
}

function allInformation(body, results, state){	//state: 1,3 - Movies, 2,4 - Series
	var image = results.poster_path
	var image_url = "https://image.tmdb.org/t/p/w500" + image 
	
	if (state == 1 || state == 2){
		var cast = body.cast	
		var text_cast = "Cast: "
		var n = cast.length
		if (cast.length > 10){
			n = 10
		}
		for (i=0;i<n;i++){
			text_cast += "\n" + cast[i].character + " by " + cast[i].name
		}	
	}	
	
	if (state == 2 || state == 4){
		var text = "First Air Date: " + results.first_air_date + "\nRating: " 
					+ results.vote_average + "/10" + "\nGenre: "
	}
	else{		
		var text = "Release Date: " + results.release_date + "\nRating: " 
			+ results.vote_average + "/10" + "\nGenre: "	
	}
	
	//text = text.substr(0,639)	
	
	var genre_ids = results.genre_ids
	var c = 0
	var genre_names = []
	/*Check if call is optimum or this loop*/
	for (var i=0; i< genre_ids.length ; i++){
		for (var j=0; j< genres_list.length ; j++){
			if (genres_list[j].id == genre_ids[i]){
				genre_names[c++] = genres_list[j].name
				break
			}
		}
	}	
	
	for (i=0;i<genre_names.length;i++){
		if (i == genre_names.length - 1 ){
			text += genre_names[i]
		}
		else{
			text += genre_names[i] + ", "	
		}
	}
	
	var summary = "\nSummary: " + results.overview
	
	if (state == 1 || state == 2){
		if (state == 1){//This could cause problems, think of alternatives
			similar = "m"+results.id	//m - movies, s - series
		}
		else{
			similar = "s"+results.id
		}
		var attachData = {
		type : 	"template",
		payload : {
			template_type:"generic",					
			elements: [{
				title: results.title,	
				//subtitle: subtitle,		//subtitle has 80 chars limit	//Genres also not fitting
				subtitle: text.substr(0,79),
				image_url: image_url,
				buttons:[{		//Control again goes to start as we receive a new message
					type: "postback",
					title: "Show Summary",		//payload has 1000 chars limit
					payload: summary.substr(0,999)		//Postback message 
				},
				{
					type: "postback",
					title: "Show Cast",
					payload: text_cast//.substr(0,999)
				},
				{
					type: "postback",
					title: "Show Similar",	
					payload: similar	//Need to branch here for movies and series
				}
				]
			}
				]
			}
		}
		if (state == 2){
			attachData.payload.elements[0].title = results.name
		}
		
		//console.log(attachData.payload.elements[0])
	}
	else{	//top movies or series
		if (state == 4){
			title = results.name
			summary = title + ": " + results.overview
		}
		else{
			title = results.title
			summary = results.title + ": " + results.overview
		}
		
		var semiAttachData = {
		title: title,	
		//subtitle: subtitle,		//subtitle has 80 chars limit	//Genres also not fitting
		subtitle: text.substr(0,79),
		image_url: image_url,
		buttons:[{		//Control again goes to start as we receive a new message
			type: "postback",
			title: "Show Summary",		//payload has 1000 chars limit
			payload: summary.substr(0,999)		//Postback message 
		}]
		}
		return semiAttachData	
	}
	
	var res = {
	  speech: text,
	  displayText: text,
	  data : attachData,
	  source: 'General' //Will change it later
	}
	
	return res
}
		
function similarStuff(id, sender, state){
	return new Promise(function (resolve, reject){
		if (state == 3){
			var url_similar = "https://api.themoviedb.org/3/movie/" + id + "/similar?api_key=6332c91e1508b1fd86ed1653c1cc478e"
		}
		else{
			var url_similar = "https://api.themoviedb.org/3/tv/" + id + "/similar?api_key=6332c91e1508b1fd86ed1653c1cc478e"	
		}
		
		requestPromise(url_similar,true).then(function (body){
		
			var results = body.results	
			
			var attachData = attachmentData()
				
			for (var i=0; i<10; i++){	
				attachData.payload.elements[i] = allInformation(body, results[i], state)
			}
			resolve(attachData) 
	})	
	})
	.catch( error => {	//Need to check if error checking is right
		console.error("Got an error: ", error)
	})	
}
