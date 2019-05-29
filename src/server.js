const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const { exec } = require('child_process');
const process = require('process');
const fs = require('fs');
var myldap = require('./basicAuth.js');

// Process Info //

process.title = 'node aurora-server';

fs.writeFile('aurora.pid', process.pid, function(err){
    if (err) throw err;
});

// Frontend Client Configuration //

client_conf = JSON.parse(fs.readFileSync('../conf/frontend.conf', 'utf8'))
static_dir = client_conf.staticDir		// Directory for all static html/css files and other assests like images
templates_dir = client_conf.templatesDir	// Directory for all templates which are html files that contain dynamic content (javascript vars that the backend server can change)

// App Server Configuration //

const port = 8000;

app.use(express.static(static_dir));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('views', templates_dir);
app.set('view engine', 'ejs');

// for now, save user state in app (must change after demo)
var app_state_user = "Portal Login";

// GET requests for web pages //

app.get('/', function (req, res){
    res.render('index', {error:""});
});

app.get('/login', function (req, res){
    res.render('login', {error:""});
});

app.get('/portal', function (req, res){
    res.render('login', {error:""});
    //res.render('portal', {user:"Portal Login", stdout:""});
});

app.get('/demo', function (req,res){
    res.render('compute-demo', {user: "", stdout: ""});
});

// POST requests for other API calls //

app.post('/auth', function(req, res){
    myldap.init();
    var usr = req.body.username;
    var pass = req.body.password;
    myldap.auth(usr, pass, function(passed){
        if(passed){
            console.log("LDAP Auth worked");
            res.render('portal', {user: usr, stdout:""});
            app_state_user = usr;
        }else{
            console.log("Failed to auth");
            res.render('login', {error: "failed to authenticate"});
        }
    });
});

app.get('/compute', function(req, res){
    exec('/usr/local/src/aurora/Job_Level0_Demo.sh', function(err, stdout, stderr){
        if(err){
            console.log(err);
            res.render('portal', {user: app_state_user, stdout: "Job submission failed."});
            return;
        }
	else{
            console.log(stdout);
            res.render('portal', {user: app_state_user, stdout: stdout});
        }
    });
});

//app.get('/run', function(req, res){
//    exec('/usr/local/src/aurora/Job_Level0_Demo.sh', function(err, stdout, stderr){
//        if(err){
//            console.log(err);
//            res.render('portal', {user: app_state_user, stdout: "Job submission failed."});
//            return;
//        }
//	else{
//            console.log(stdout);
//            res.render('portal', {user: app_state_user, stdout: stdout});
//        }
//    });
//});

// Start App Server //

app.listen(port, function (){
    console.log('Server started. Listening on '+port);
});

