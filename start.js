"use strict";
var fs = require('fs');
var util = require('util');
var constants = require('ocore/constants.js');
var desktopApp = require('ocore/desktop_app.js');
var appDataDir = desktopApp.getAppDataDir();
var path = require('path');
var validationUtils = require("ocore/validation_utils.js");

var conf = require('ocore/conf.js');
var objectHash = require('ocore/object_hash.js');
var db = require('ocore/db.js');
var eventBus = require('ocore/event_bus.js');
var ecdsaSig = require('ocore/signature.js');
var readline = require('readline');
var aes256 = require('aes256');


var count_files = 0;
var keys_filename;

var privKey;
var arrDefinition;
var signing_path;
var zeus_address;

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

db.query("SELECT address FROM my_addresses", function (rows){
	if (rows.length > 1 )
		throw Error('more than 1 address in my_addresses table');
	zeus_address = rows[0] ? rows[0].address : null;

});

function checkObjFromFile(obj){
	if (typeof obj.keys_set_properties != "object")
		throw Error("Error in key file: no keys_set_properties");	
	if (!validationUtils.isValidBase64(obj.encrypted_data))
		throw Error("Error in key file: encrypted_data doesn't exist or is not valid");	
	if (!validationUtils.isValidAddress(obj.keys_set_properties.address))
		throw Error("Error in key file: address doesn't exist or is not valid");
}


//for a new setup, we need to insert the address in my_address table and create a dummy wallet due to foreign key constraint.
//our signer doesn't use my_address but ocore requires it to emit event when a transaction happens or to subscribe from vendor if light node
function createWalletAndAddressInDB(address, handle){

	db.takeConnectionFromPool(function(conn) {
		var arrQueries = [];
		conn.addQuery(arrQueries, "BEGIN");
		conn.addQuery(arrQueries, "INSERT INTO wallets (wallet, account, definition_template) VALUES ('wallet_0',0,'[]')");
		conn.addQuery(arrQueries, "INSERT INTO my_address (address, wallet, is_change, address_index, definition) VALUES (?, 'wallet_0', 0, 0, definition)");
		conn.addQuery(arrQueries, "COMMIT");
		async.series(arrQueries, function() {
			conn.release();
			handle();
		});
	});
}

setTimeout(function(){

	fs.readFile(appDataDir + '/' +  keys_filename, 'utf8', function(err, data){
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			//terminal: true
		});

		if (err) 
			throw Error('failed to read key');

		initConfJson(function(){
			rl.question("Passphrase: ", function(passphrase){
				var device = require('ocore/device.js');
				var zeus_data = JSON.parse(data);

				checkObjFromFile(zeus_data);

				if (zeus_address &&  zeus_address != zeus_data.keys_set_properties.address)
					throw Error("Error: this key file isn't not for this node. Expected address: " + zeus_address + " Address found in key file: " + zeus_data.keys_set_properties.address);

				const decrypted_string = aes256.decrypt(passphrase.trim(), zeus_data.encrypted_data);
				const arrData = decrypted_string.split("-");
				if (arrData.length != 2 || arrData[1] != objectHash.getChash160(arrData[0]))
					throw Error("Error: incorrect passphrase");
				privKey = Buffer.from(arrData[0], 'base64');

				arrDefinition = zeus_data.keys_set_properties.arrDefinition;
				signing_path = zeus_data.keys_set_properties.prod_key_signing_path;



		//		device.setDeviceName(conf.deviceName);
				device.setDeviceHub(conf.hub);
			
				console.log("====== chash definition: " + JSON.stringify(arrDefinition));
				console.log("====== my single address: " + zeus_address);
	

				if (conf.permanent_pairing_secret)
					console.log("WARNING: This node run with a Zeus address primarly intended for oracles and witnesses, features are limited: no device address, no pairing with other device and you can send a transaction only by using the composer.\n Functions in wallet.js and wallet_defined_by_keys.js WON'T work.");
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



function initConfJson(onDone){
	var userConfFile = appDataDir + '/conf.json';
	var confJson = null;
	try {
		confJson = require(userConfFile);
	}
	catch(e){
	}
		return confJson ? onDone() : writeJson(userConfFile, {}, onDone);
}



var signer = {
	readSigningPaths: function(conn, address, handleLengthsBySigningPaths){
		if (address != zeus_address)
			throw Error("Error: signing path requested for wrong address: " + address);
		var obj = {};
		obj["r.0.0"]= constants.SIG_LENGTH;
		handleLengthsBySigningPaths(obj);
	},
	readDefinition: function(conn, address, handleDefinition){
		if (address != zeus_address)
			throw Error("Error: definition requested for wrong address: " + address);
		handleDefinition(null, arrDefinition);
	},
	sign: function(objUnsignedUnit, assocPrivatePayloads, address, signing_path, handleSignature){
			if (address != zeus_address)
				throw Error("Error: signature requested for wrong address: " + address);
			var buf_to_sign = objectHash.getUnitHashToSign(objUnsignedUnit);
			handleSignature(null, ecdsaSig.sign(buf_to_sign, privKey));
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
