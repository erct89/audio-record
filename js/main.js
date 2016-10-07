const mimesTipes = [{mime: 'audio/ogg', subfix:'oga'}, {mime:'audio/webm;codecs="opus"', subfix:'opus'}];
var video;
var dataElement;
var btnOn;
var btnRecStart;
var btnPause;
var btnStop;
var lnkDown;
var lstRecords;

var mimeType = {mime: '', subfix:''};
var constraints;
var mediaStream;
var mediaRecorder;
var recordsObjects;
var chuncks;
var count;

window.onload = init;

function init() {
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	window.MediaStream = window.MediaStream || webkitMediaStream;

	video = document.getElementById('player');
	dataElement = document.getElementById('dataElement');
	btnOn = document.getElementById('on');
	btnRecStart = document.getElementById('rec');
	btnPause = document.getElementById('pause');
	btnStop = document.getElementById('stop');
	lnkDown = document.getElementById('download');
	lstRecords = document.getElementById('recList');

	recordsObjects = [];
	chuncks = [];
	count = 0;
	
	//Establecimiento de las clases por defecto.
	btnOn.classList.remove('hide');
	btnRecStart.classList.add('hide', 'disabled');
	btnPause.classList.add('hide', 'disabled');
	btnStop.classList.add('hide', 'disabled');
	lnkDown.classList.add('hide', 'disabled');

	//Anadir manejadors
	btnOn.addEventListener('click',onClickEncender);
	btnRecStart.addEventListener('click',onClickGrabar);
	btnPause.addEventListener('click',onClickPausar);
	btnStop.addEventListener('click',onClickParar);

	//Generando las restricciones según el navegador usado.
	switch(getBrowser()){
		case 'Chrome':
			constraints = {"audio": true, "video": false};//Chrome		
			break;
		case 'Firefox':
			constraints = {audio: true,	video: false}; //Firefox
			break;
		default:
			log("Su navegador no soporta Media Record");
		break;
	}
}

//Handlers de los botones On Y Off.
function onClickEncender(){
	if(btnOn.innerHTML === 'On' && !mediaStream){
		starMediaDevices(function(){
			btnOn.innerHTML = 'Off';
			btnRecStart.classList.remove('hide','disabled');
			btnPause.classList.remove('hide');
			btnStop.classList.remove('hide');
		},function(err){
			log(err);
		});
	}else if(btnOn.innerHTML ==='Off' && mediaStream){
		stopMediaStream(function(){
			btnOn.innerHTML = 'On';
			btnRecStart.classList.add('hide', 'disabled');
			btnPause.classList.add('hide', 'disabled');
			btnStop.classList.add('hide', 'disabled');
		},function(err){
			log(err);
		});
	}
	lnkDown.classList.add('hide','disabled');
}

function starMediaDevices(successCallback,errorCallBack){
	let success = (typeof(successCallback) ==='function')? successCallback : function(){};
	let error = (typeof(errorCallBack) === 'function')? errorCallBack : function(){};

	console.log("Debug: Obteniendo la camara.");

	if(navigator.getUserMedia){
		navigator.getUserMedia(constraints,startDevices,errorCallBack);
		success();
	}else{
		error('Su navegador nos soporta el getUserMedia');
	}
}

function stopMediaStream(successCallback,errorCallBack){
	let success = (typeof(successCallback) ==='function')? successCallback : function(){};
	let error = (typeof(errorCallBack) === 'function')? errorCallBack : function(){};

	if(mediaStream){
		log('<p>Apagando la camara...</p>');
		
		video.pause();
		video.src = "";

		for(mST of mediaStream.getTracks()){
			console.log(mST);
			mST.stop();
		}
		mediaStream = null;
		success();
	}else{
		error('No se ha recibido ningun MediaStream');
	}
}

//Handlers de los botones de Grabar, Pausa, Parar.
function onClickGrabar() {
	if(MediaRecorder || navigator.getUserMedia){
		if(!mediaRecorder){
			startGrabacion(mediaStream);
		}else if(mediaRecorder.state === 'pause'){
			mediaRecorder.start();
		}
		btnPause.classList.remove('disabled');
		btnStop.classList.remove('disabled');
	}else{
		log("<p>Su navegador no soporta MediaRecorder</p>"
			+"<p>Actualice su navegador a Firefox or Chrome</p>");
	}
}
function onClickPausar(){
	mediaRecorder.pause();
	btnPause.classList.add('disabled');
	btnStop.classList.remove('disable');
	btnRecStart.classList.remove('disabled');
}
function onClickParar() {
	mediaRecorder.stop();
	btnPause.classList.add('disabled');
	btnStop.classList.add('disabled');
	btnRecStart.classList.remove('disabled');
	lnkDown.classList.remove('hide','disabled');
}

//Metodos para el inicio de la camara.
function startDevices(stream){
	if(stream){
		mediaStream = stream;
		video.src = window.URL.createObjectURL(mediaStream);
	}else{
		log('<p>El stream recibido esta vacío.</p>');
	}
}

//Metodos para empezar a grabar, pausar y parar.
function startGrabacion(stream){
	log("<p>Enpezando a grabar ...</p>");

	if(typeof MediaRecorder.isTypeSupported === 'function' && (stream instanceof MediaStream)){
		mimesTipes.forEach(function(mt){
			if(MediaRecorder.isTypeSupported(mt.mime)){
				mimeType = mt;
			}
		});

		mediaRecorder = new MediaRecorder(stream);
	}else{
		log('<p>Actualmente su navegador no soporta isTypeSupported.</p>');
		mediaRecorder = new MediaRecorder(stream);
	}

	mediaRecorder.start(10);
	//video.src = window.URL.createObjectURL(stream); 
 
	mediaRecorder.ondataavailable = function(event){
		log('<p>Data available ...</p>');
		
		if(event.size !== 0){
			var reader = new FileReader();
		    //File reader is for some reason asynchronous
		    reader.onloadend = function () {
		      console.log(reader.result);
		    }
		    //This starts the conversion
		    reader.readAsBinaryString(event.data);

			chuncks.push(event.data);
		}
	}
	mediaRecorder.onerror = function(error){
		log('<p>Error: ' + error + '</p>')

	}
	mediaRecorder.onstart = function(event){
		log('<p>Start & state: '+ mediaRecorder.state +'<p>');
		btnRecStart.classList.add('disabled');
		btnPause.classList.remove('disabled');
		btnStop.classList.remove('disabled');
	}
	mediaRecorder.onstop = function(){
		console.log('Numero de grabaciones' + recordsObjects.length);
		log('<p>Stopped $ state: '+ mediaRecorder.state +'</p>');

		var recordO = {};
		recordO.blob = new Blob(chuncks,{type: mimeType.mime});
		recordO.id = new Date().getTime();
		recordO.name = generateString('','audio',mimeType.subfix,{top:'_',bottom:'.'});
		
		recordsObjects.push(recordO);
		chuncks = [];


		lnkDown.href = window.URL.createObjectURL(recordO.blob);
		//var namefile = "video_"+(Math.random()*10000000)+".webm";
		lnkDown.classList.remove('hide','disabled');
		lnkDown.download = recordO.name;
		lnkDown.name = recordO.name;

		mediaRecorder = null;
		updateList(recordO);
	}
	mediaRecorder.onpause = function () {
		log("<p>Pause & state: "+ mediaRecorder.state +"</p>");
	}
	mediaRecorder.onresume = function(){
		log('<p>Resumed  & state = ' + mediaRecorder.state +"</p>");
	}

	mediaRecorder.onwarning = function(warning){
		log('<p>Warning: ' + warning +"</p>");
	}
}

function updateList(recordObject){	
		var li = document.createElement('li');
		var a = document.createElement('a');
		a.innerHTML = recordObject.name;
		a.href = window.URL.createObjectURL(recordObject.blob);
		a.download = recordObject.name;
		a.name = recordObject.name;
		a.id = recordObject.id;
		li.appendChild(a);
		lstRecords.appendChild(li);
}

function errorCallBack(err){
	log("<p>navigator.getUserMedia error: "+ err +"</p>");
}

//Funcion para generar un string con un prefijo, un subfijo y con separadores;
//@param seeder (function) = new Date().getTime;
//@param prefix (string) = '_';
//@param subfix (string) = '';
//@param separator (object) = {top:'_',bottom:''};  
function generateString(seeder,prefix,subfix,separator){
	var _separator = { top: "", bottom: ""};
	var _seeder = (typeof seeder === "function")? seeder(): new Date().getTime().toString();
	_seeder = (typeof _seeder === "string")? _seeder: "";
	prefix = (typeof prefix === "string")? prefix: "";
	subfix = (typeof subfix === "string")? subfix: "";
	switch(typeof separator){
		case "string":
			_separator.top = _separator.bottom = separator;
		break;
		case "object":
			_separator.top = (typeof separator.top === "string")?separator.top :"";
			_separator.bottom = (typeof separator.bottom === "string")? separator.bottom :"";
		break;
	}
	
	return prefix + _separator.top + _seeder + _separator.bottom + subfix;
}

function log(message){
	dataElement.innerHTML = message;
}

//Obtener el navegador.
function getBrowser(){
	var nVer = navigator.appVersion;
	var nAgt = navigator.userAgent;
	var browserName  = navigator.appName;
	var fullVersion  = ''+parseFloat(navigator.appVersion);
	var majorVersion = parseInt(navigator.appVersion,10);
	var nameOffset,verOffset,ix;

	// In Opera, the true version is after "Opera" or after "Version"
	if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
	 browserName = "Opera";
	 fullVersion = nAgt.substring(verOffset+6);
	 if ((verOffset=nAgt.indexOf("Version"))!=-1)
	   fullVersion = nAgt.substring(verOffset+8);
	}
	// In MSIE, the true version is after "MSIE" in userAgent
	else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
	 browserName = "Microsoft Internet Explorer";
	 fullVersion = nAgt.substring(verOffset+5);
	}
	// In Chrome, the true version is after "Chrome"
	else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
	 browserName = "Chrome";
	 fullVersion = nAgt.substring(verOffset+7);
	}
	// In Safari, the true version is after "Safari" or after "Version"
	else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
	 browserName = "Safari";
	 fullVersion = nAgt.substring(verOffset+7);
	 if ((verOffset=nAgt.indexOf("Version"))!=-1)
	   fullVersion = nAgt.substring(verOffset+8);
	}
	// In Firefox, the true version is after "Firefox"
	else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
	 browserName = "Firefox";
	 fullVersion = nAgt.substring(verOffset+8);
	}
	// In most other browsers, "name/version" is at the end of userAgent
	else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) <
		   (verOffset=nAgt.lastIndexOf('/')) )
	{
	 browserName = nAgt.substring(nameOffset,verOffset);
	 fullVersion = nAgt.substring(verOffset+1);
	 if (browserName.toLowerCase()==browserName.toUpperCase()) {
	  browserName = navigator.appName;
	 }
	}
	// trim the fullVersion string at semicolon/space if present
	if ((ix=fullVersion.indexOf(";"))!=-1)
	   fullVersion=fullVersion.substring(0,ix);
	if ((ix=fullVersion.indexOf(" "))!=-1)
	   fullVersion=fullVersion.substring(0,ix);

	majorVersion = parseInt(''+fullVersion,10);
	if (isNaN(majorVersion)) {
	 fullVersion  = ''+parseFloat(navigator.appVersion);
	 majorVersion = parseInt(navigator.appVersion,10);
	}


	return browserName;
}