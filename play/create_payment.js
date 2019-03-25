/*jslint node: true */
"use strict";
var headlessWallet = require('../start.js');
var eventBus = require('ocore/event_bus.js');

function onError(err){
	throw Error(err);
}

function createPayment(){
	var composer = require('ocore/composer.js');
	var network = require('ocore/network.js');
	var callbacks = composer.getSavingCallbacks({
		ifNotEnoughFunds: onError,
		ifError: onError,
	/*	preCommitCb: function (conn, objJoint, handle){ //In this optional callback you can add SQL queries to be executed atomically with the payment
						conn.query("UPDATE my_table SET status='paid' WHERE transaction_id=?",[transaction_id]);
						handle();
					},*/
		ifOk: function(objJoint){
			network.broadcastJoint(objJoint);
		}
	});
	
	var from_address = "Q56WQ4GE5ECEIMD24QTCABDPZJHABAHJ";
	var payee_address = "LS3PUAGJ2CEYBKWPODVV72D3IWWBXNXO";
	var arrOutputs = [
		{address: from_address, amount: 0},      // the change
		{address: payee_address, amount: 1000}  // the receiver
	];
	composer.composePaymentJoint([from_address], arrOutputs, headlessWallet.signer, callbacks);
}

eventBus.on('headless_wallet_ready', createPayment);

["or",["and",[["sig",{"pubkey":"A0i1IBbWd5EYE4BzcfOofSNp2tJgYsC2Fzqrh6c9FOGw"}],["not",["has definition change",["this address","any"]]]],["sig",{"pubkey":"A+I+vBmqlEEfYUVX3T3aROQXm9pyc2CGJBcni8xhoXwj"}]]]