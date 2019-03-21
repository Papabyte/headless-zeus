"use strict";
var fs = require('fs');
var crypto = require('crypto');
var util = require('util');
var constants = require('ocore/constants.js');
var desktopApp = require('ocore/desktop_app.js');
var appDataDir = desktopApp.getAppDataDir();
var path = require('path');


var conf = require('ocore/conf.js');
var objectHash = require('ocore/object_hash.js');
var db = require('ocore/db.js');
var eventBus = require('ocore/event_bus.js');
var ecdsaSig = require('ocore/signature.js');
var readline = require('readline');
var aes256 = require('aes256');


var count_files = 0;
var keys_filename;

var xPrivKey;
var arrDefinition;
var signing_path;
var address;

fs.readdirSync(appDataDir).forEach(file => {
	if (file.indexOf(".prod") > -1){
		count_files++;
		keys_filename = file;
	}
	console.log(file);
  });

if (count_files == 0)
	throw Error('no .prod key file found in ' + appDataDir);

if (count_files > 1)
	throw Error('more than one .prod key file found in ' + appDataDir);	

if (!conf.bSingleAddress)
	throw Error('zeus wallet is only for single address');	

setTimeout(function(){

	fs.readFile(appDataDir + '/' +  keys_filename, 'utf8', function(err, data){
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			//terminal: true
		});

		if (err) 
			throw Error('failed to read key');

		initConfJson(rl, function(){
			rl.question("Passphrase: ", function(passphrase){
				var device = require('ocore/device.js');

				var zeus_data = JSON.parse(data);
				xPrivKey = Buffer.from(aes256.decrypt(passphrase, zeus_data.encrypted_data),'base64');
				arrDefinition = zeus_data.keys_set_properties.arrDefinition;
				signing_path = zeus_data.keys_set_properties.prod_key_signing_path;
				address = zeus_data.keys_set_properties.address;

				device.setDeviceName(conf.deviceName);
				device.setDeviceHub(conf.hub);
		//	console.log("====== my device address: "+my_device_address);
			//	console.log("====== my device pubkey: "+my_device_pubkey);
			
				
				console.log("====== my single address: " + address);
	

				if (conf.permanent_pairing_secret)
					console.log("====== my pairing code: "+my_device_pubkey+"@"+conf.hub+"#"+conf.permanent_pairing_secret);
				if (conf.bLight){
					var light_wallet = require('ocore/light_wallet.js');
					light_wallet.setLightVendorHost(conf.hub);
				}
				eventBus.emit('headless_wallet_ready');
				setTimeout(replaceConsoleLog, 1000);


			});

		});

	});

}, 1000);



function initConfJson(rl, onDone){
	var userConfFile = appDataDir + '/conf.json';
	var confJson = null;
	try {
		confJson = require(userConfFile);
	}
	catch(e){
	}
	if (conf.deviceName && conf.deviceName !== 'Headless') // already set in conf.js or conf.json
		return confJson ? onDone() : writeJson(userConfFile, {}, onDone);
	// continue if device name not set
	if (!confJson)
		confJson = {};
	var suggestedDeviceName = require('os').hostname() || 'Headless';
	rl.question("Please name this device ["+suggestedDeviceName+"]: ", function(deviceName){
		if (!deviceName)
			deviceName = suggestedDeviceName;
		confJson.deviceName = deviceName;
		writeJson(userConfFile, confJson, function(){
			console.log('Device name saved to '+userConfFile+', you can edit it later if you like.\n');
			onDone();
		});
	});
}



var signer = {
	readSigningPaths: function(conn, address, handleLengthsBySigningPaths){
		handleLengthsBySigningPaths({signing_path: constants.SIG_LENGTH});
	},
	readDefinition: function(conn, address, handleDefinition){
			handleDefinition(null, arrDefinition);
	},
	sign: function(objUnsignedUnit, assocPrivatePayloads, address, signing_path, handleSignature){
			var buf_to_sign = objectHash.getUnitHashToSign(objUnsignedUnit);
			handleSignature(null, ecdsaSig.sign(buf_to_sign, xPrivKey));
	}
};

function replaceConsoleLog(){
	var log_filename = conf.LOG_FILENAME || (appDataDir + '/log.txt');
	var writeStream = fs.createWriteStream(log_filename);
	console.log('---------------');
	console.log('From this point, output will be redirected to '+log_filename);
	console.log("To release the terminal, type Ctrl-Z, then 'bg'");
	console.log = function(){
		writeStream.write(Date().toString()+': ');
		writeStream.write(util.format.apply(null, arguments) + '\n');
	};
	console.warn = console.log;
	console.info = console.log;
}


exports.signer = signer;
exports.setupChatEventHandlers = ()=>{};
