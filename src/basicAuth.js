var fs = require('fs');
var ldap = require('ldapjs');

var conf;
var new_request;

// LDAP Auth Configuration //

exports.init = function(){
    // Pull in LDAP configuration file
    conf = JSON.parse(fs.readFileSync('../conf/ldap.conf', 'utf8'));
    
    // Put LDAP conf info into Auth request
    new_request = {
        body: {
            serverUrl: conf.ldap.serverUrl,
            readerDN: conf.ldap.readerDN,
            readerPwd: conf.ldap.readerPwd,
            suffix: conf.ldap.suffix
        }
    };
};

exports.auth = function(usr, pass, callback){
    // Add user creds to Auth request
    new_request.body.username = usr;
    new_request.body.password = pass;

    var req = new_request;
    var result = "";    // To send back to the client
    var bool = false;   // auth pass/fail to send to client
    
    var client = ldap.createClient({ // Create ldap client
    	url: req.body.serverUrl
    });
    
    client.bind(req.body.readerDN, req.body.readerPwd, function(err) { // Bind as ldap reader
    	if (err) {
    		result += "Reader bind failed " + err;
    		//res.send(result);
    		return;
    	}
    	
    	result += "Reader bind succeeded\n";
    	
    	var filter = `(uid=${req.body.username})`;
    	
    	result += `LDAP filter: ${filter}\n`;
    	
    	client.search(req.body.suffix, {filter:filter, scope:"sub"},
    		(err, searchRes) => { // Search for user as ldap reader
    			var searchList = [];
    			
    			if (err) {
    				result += "Search failed " + err;
    				//res.send(result);
    				return;
    			}
    			
    			searchRes.on("searchEntry", (entry) => {
    				result += "Found entry: " + entry + "\n";
    				searchList.push(entry);
    			});
    
    			searchRes.on("error", (err) => {
    				result += "Search failed with " + err;
    				//res.send(result);
                                console.log(result);
    			});
    			
    			searchRes.on("end", (retVal) => {
    				result += "Search results length: " + searchList.length + "\n";
    				for(var i=0; i<searchList.length; i++) 
    					result += "DN:" + searchList[i].objectName + "\n";
    				result += "Search retval:" + retVal + "\n";					
    				
    				if (searchList.length === 1) { // If user is found, verify given password			
    					client.bind(searchList[0].objectName, req.body.password, function(err) {
    						if (err) 
    							result += "Bind with real credential error: " + err;
    						else{ // Auth successfull
    							result += "Bind with real credential is a success";
                                                        bool = true;
                                                }
    						//res.send(bool);	
    	                                        console.log(result);
						callback(bool);
    					});  // client.bind (real credential)
    					
    					
    				} else { // if (searchList.length === 1)
    					result += "No unique user to bind";
    					//res.send(result);
    	                                console.log(result);
					callback(bool);
    				}
    
    			});   // searchRes.on("end",...)
    			
    	});   // client.search
    
    }); // client.bind  (reader account)
};	
