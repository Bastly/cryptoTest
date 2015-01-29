var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "subscriber"});
var sodium = require('libsodium-wrappers');
var zmq = require('zmq')
  , pubsock = zmq.socket('pub')
  , subsock = zmq.socket('sub');

var other_ip = "192.168.1.113";
var other_port = "3000";
var cypher_channel =  'cyphertext';
var keys_channel =  'keys';

var other_pub_key = sodium.crypto_box_keypair();
var my_keys = sodium.crypto_box_keypair();
var nonce_length = sodium.crypto_box_NONCEBYTES;
var dummy_nonce = sodium.randombytes_buf(nonce_length);
var dummy_msg = sodium.crypto_box_easy("lasssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssalaa", dummy_nonce, other_pub_key.publicKey, my_keys.privateKey);
var gathered = false;

subsock.connect('tcp://' + other_ip + ':' + other_port);
subsock.subscribe(cypher_channel);
subsock.subscribe(keys_channel);
log.info('Subscriber connected to ' + other_ip + ':' + other_port);

subsock.on('message', function(topic, message) {
  log.info('received a message related to:', topic.toString());
  if(topic.toString() == keys_channel){
	gathered = true;
	var pub_key = JSON.parse(message);
	other_pub_key.publicKey.set(pub_key)
//	log.info("other pub key gathered");
//	console.log(other_pub_key);
  }
  if(topic.toString() == cypher_channel){
	if(gathered){
		log.info("cypher text gathered... decripting");
		var msg = JSON.parse(message);
		dummy_msg.set(msg.cyphertext);
		var tmp_msg = dummy_msg.subarray(0, msg.cyphertext.length);
		dummy_nonce.set(msg.nonce);
		var dec = sodium.crypto_box_open_easy(tmp_msg, dummy_nonce, other_pub_key.publicKey, my_keys.privateKey, 'text');
		log.info('cypher_text gotted!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
		log.info(dec);
	}
  }
});


pubsock.bindSync('tcp://*:3000');
log.info('Publisher bound to *: 3000');


setInterval(function(){
	if(gathered){
		var message = "hola mundo!";
		var nonce_length = sodium.crypto_box_NONCEBYTES;
		var nonce = sodium.randombytes_buf(nonce_length);
		var encrypted = sodium.crypto_box_easy(message, nonce, other_pub_key.publicKey, my_keys.privateKey);
		pubsock.send([cypher_channel, JSON.stringify({nonce:nonce, cyphertext:encrypted})]);
	}
}, 400);


setInterval(function(){
        //log.info('sending public key');
        //console.log(my_keys.publicKey);
        //log.info(my_keys.publicKey.length);
        pubsock.send([keys_channel, JSON.stringify(my_keys.publicKey)]);
}, 5000);


