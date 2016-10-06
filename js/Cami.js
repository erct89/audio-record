//Inicializar la libreria.
/*
Cami.init = function(errorCallBack){
	let um = null //UserMedia.
	let error = (typeof(errorCallBack)==='function')?errorCallBack:Cami.noob;
	if(navigator){
		if(navigator.mediaDevices){
			um = navigator.mediaDevices.getUserMedia || navigator.mediaDevices.mozGetUserMedia
		}
	}else{
		error('Su navegador no soporta el api mediaDevices. Use Chrome o Firefox.');
	}

	return um;
}*/
//Objetos staticos para el objeto Cami.
Cami.nav = navigator;
Cami.nav.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;

Cami.getBrowser = function getBrowser(){
	let nVer = navigator.appVersion;
	let nAgt = navigator.userAgent;
	let browserName  = navigator.appName;
	let fullVersion  = ''+parseFloat(navigator.appVersion);
	let majorVersion = parseInt(navigator.appVersion,10);
	let nameOffset,verOffset,ix;

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

//Constructor de la libreria Cami.js
function Cami(optionsParam){
	let that = this;
	let options = (typeof(optionsParam) === 'object')? optionsParam : {};
	let successCB = (typeof(options.success) === 'function')? options.success.bind(this) : noob;
	let errorCB = (typeof(options.error) === 'function')? options.error.bind(this) : noob;
	let infoCB = (typeof(options.info) === 'function')? options.info.bind(this) : noob;
	let warningCB = (typeof(options.warn) === 'function')? options.warn.bind(this) : noob;
	let constraints = null;
	let mediaStream = null;
	let mediaRecorder = null;
	let recordsObjects = [];
	let chuncks = [];
	let objectBlob = null;

	successCB();

	//PUBLIC METHODS
	//Retorna el objeto de restricciones.
	that.getConstraints = function(){
		return constraints;
	}
	that.getBlob = function (){
		return objectBlob;
	}

	//Encender Camara 'onCam', apagar 'offCam'
	that.onCam = function(constraints, successCallback, errorCallBack){
		constraints = (typeof(constraints) === 'object')? constraints : {};
		let success = (typeof(successCallback) === 'function')? successCallback : noob;
		let error = (typeof(errorCallBack) === 'function')? errorCallBack : errorCB;

		if(Cami.nav.getUserMedia){ //Existe soporte para la Api MediaStream
			if(!mediaStream){ //No existe ya un flujo de video.
				Cami.nav.getUserMedia(constraints,
					function(stream){
						mediaStream = stream;
						success(mediaStream);
					}, function(err){
						mediaStream = null;
						error(err);
					});
			}else{
				error('It exists a stream.');
			}
		}else{
			error(Cami.getBrowser() + ' not support MediaStream API: Last version of Chrome or Firefox.');
		}

		return mediaStream;
	}
	that.offCam = function(callback){
		let success = (typeof(callback) === 'function') ? callback : successCB;
		//Apagar todo la grabacion si existe y apagar el mediaStream si existe.
		that.recStop();
		closeMediaStream();
		success();
	}

	//Grabar camara y micro 'recInit', parar grabacion 'recStop' y pausar grabación 'recPause'.
	that.recInit = function(callbacks, timeSlice){
		let codecs;
		let timeslice = timeSlice;
		callbacks = callbacks || {};
		callbacks.onStart = (typeof callbacks.onStart === 'function')?callbacks.onStart : noob;
		callbacks.onStop = (typeof callbacks.onStop === 'function')?callbacks.onStop : noob;
		callbacks.onPause = (typeof callbacks.onPause === 'function')?callbacks.onPause : noob;
		callbacks.onDataAvailable = (typeof callbacks.onDataAvailable === 'function')?callbacks.onDataAvailable : oob;
		callbacks.onError = (typeof callbacks.onError === 'function')?callbacks.onError : noob;
		callbacks.onWarning = (typeof callbacks.onWarning === 'function')?callbacks.onWarning :noob;
		callbacks.onResume = (typeof callbacks.onResume === 'function')?callbacks.onResume:noob;

		if(MediaRecorder){
			if(typeof MediaRecorder.isTypeSupported === 'function' && (mediaStream instanceof MediaStream)){
				if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9')){
					codecs = {mimeType:'video/webm;codecs=vp9'}
				}else if(MediaRecorder.isTypeSupported('video/webm;codecs=vp8')){
					codecs = {mimeType:'video/webm;codecs=vp8'}
				}
				infoCB('The codecs using in for recording is: ' + codecs);
				mediaRecorder = new MediaRecorder(stream,codecs);
			}else{
				infoCB('Currently your browse dont support isTypeSupported.</p>');
				mediaRecorder = new MediaRecorder(stream);
			}

			//Lo prometido es deuda y iniciamos el resument.
			mediaRecorder.start(timeslice);
		
			mediaRecorder.onstart = function(event){successCB('Success ['+new Date().getTime()+']: start recording!'); callbacks.onStart(event);};		
			mediaRecorder.onerror = function(err){errorCB('Error ['+new Date().getTime()+'] in Record: \n'+err); callbacks.onError(err);};
			mediaRecorder.onpause = function(event){infoCB('Info ['+new Date().getTime()+']: Pause mediaRecorder.'); callbacks.onPause(event);};
			mediaRecorder.onresume = function(event){infoCB('Info ['+new Date().getTime()+']: Record Event Resume.'); callbacks.onResume(event)};

			//Hay que guardar cada pedazo de datos recibido. Y pasamos los datos recibidos a el manejador.
			mediaRecorder.ondataavailable = function(event){
				infoCB('Info ['+new Date().getTime()+']: MediaRecorder data available.'); 

				if(event.size !== 0){
					chuncks.push(event.data);
					callbacks.onDataAvailable(event.data);
				}
			};

			//Guardar Componer un objeto Blob con todos los datos para despues crear un video.
			mediaRecorder.onstop = function(event){
				let objBlob;
				infoCB('Info ['+new Date().getTime()+']: Stop recording.'); 

				if(chuncks){
					objectBlob = new Blob(chuncks,'video/webm');

					chuncks = []
					mediaRecorder = null;
					mediaStream = null;
					callbacks.onStop(objectBlob);
				}				
			};
		}else{
			errorCB('Does no exit MediaStream object: execute onCam');
		}
	}
	that.recStop = function(callback){
		if(mediaRecorder){
			mediaRecorder.stop();
		}
	}
	that.recPause = function(callback){
		if(mediaRecorder){
			mediaRecorder.pause();
		}
	}

	function noob(){};
	
	function closeMediaStream(){
		//Existe mediaStream.
		if(mediaStream){
			//Apagando los MediaStreamTracks.
			if(mediaStream.getTracks){
				infoCB('Closing Stream: using MediaStream.getTracks()[x].stop().');
				for(mediaStreamTracks of mediaStream.getTracks()){
					mediaStreamTracks.stop();
				}
			}else{
				infoCB('Closing Stream: using MediaStream.stop().');
				mediaStream.stop();
			}
			mediaStream = null;
		}else{
			infoCB('Currently there is no stream.');
		}
	}
}
